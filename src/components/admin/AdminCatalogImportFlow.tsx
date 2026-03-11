'use client';

import { useMemo, useState } from 'react';

import { classNames } from '@/css/classnames';
import type {
  ImportColumnMapping,
  ImportFieldKey,
  ImportPreviewPayload,
  ImportReportPayload,
  RowValidationError,
  ValidationResultPayload,
} from '@/features/admin-import/types';
import { importFieldKeys } from '@/features/admin-import/types';
import { requiredImportFields } from '@/features/admin-import/mapping';

import styles from './admin.module.css';

type ApiResponse<T> =
  | { ok: true; payload: T }
  | { ok: false; error: string };

const fieldLabels: Record<ImportFieldKey, string> = {
  slug: 'Слаг',
  title: 'Название',
  short_description: 'Короткое описание',
  description: 'Описание',
  price: 'Цена',
  compare_at_price: 'Старая цена',
  currency: 'Валюта',
  status: 'Статус',
  is_featured: 'Рекомендуемый',
  stock_quantity: 'Остаток',
  category: 'Категория',
  collection: 'Подборка',
  image_url: 'Ссылка на изображение',
  image_alt: 'Описание изображения (alt)',
  image_sort_order: 'Порядок изображения',
  image_is_primary: 'Главное изображение',
};

const fieldHints: Partial<Record<ImportFieldKey, string>> = {
  slug: 'Адрес карточки. Только строчные латинские буквы, цифры и дефисы.',
  status: 'Допустимые значения: draft, active, archived',
  is_featured: 'Допустимые значения: true/false, yes/no, 1/0',
  image_is_primary: 'Допустимые значения: true/false, yes/no, 1/0',
  category: 'Использует существующую категорию или создает новую при импорте',
  collection: 'Можно указывать несколько значений через запятую',
  image_url: 'Полная ссылка на изображение, начиная с http:// или https://',
};

async function callImportApi<T>(url: string, body: FormData): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, { method: 'POST', body, credentials: 'include' });
    const payload = (await response.json().catch(() => null)) as { ok: true; [key: string]: unknown } | { ok: false; error?: string } | null;

    if (!response.ok || !payload || payload.ok === false) {
      return {
        ok: false,
        error: payload && !payload.ok ? payload.error || 'Не удалось выполнить запрос импорта.' : 'Не удалось выполнить запрос импорта.',
      };
    }

    const { ok: _ok, ...rest } = payload;
    return { ok: true, payload: rest as T };
  } catch {
    return { ok: false, error: 'Сетевая ошибка при обращении к API импорта.' };
  }
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminCatalogImportFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewPayload | null>(null);
  const [mapping, setMapping] = useState<ImportColumnMapping>({});
  const [validation, setValidation] = useState<ValidationResultPayload | null>(null);
  const [report, setReport] = useState<ImportReportPayload | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const currentErrors: RowValidationError[] = report?.errors ?? validation?.errors ?? [];
  const hasBlockingMappingErrors = currentErrors.some((error) => error.rowNumber === 0);
  const canValidate = Boolean(file && preview && !isValidating && !isImporting);
  const canImport = Boolean(file && preview && validation && validation.summary.validRows > 0 && !hasBlockingMappingErrors && !isImporting);

  const orderedFields = useMemo(
    () => [...requiredImportFields, ...importFieldKeys.filter((key) => !requiredImportFields.includes(key))],
    [],
  );

  const resetFlow = () => {
    setPreview(null);
    setMapping({});
    setValidation(null);
    setReport(null);
    setGlobalError(null);
  };

  const handleLoadPreview = async () => {
    if (!file || isLoadingPreview) {
      return;
    }

    setIsLoadingPreview(true);
    setGlobalError(null);
    setValidation(null);
    setReport(null);

    const formData = new FormData();
    formData.set('file', file);
    const result = await callImportApi<{ preview: ImportPreviewPayload }>('/api/admin/import/preview', formData);

    if (!result.ok) {
      setGlobalError(result.error);
      setIsLoadingPreview(false);
      return;
    }

    setPreview(result.payload.preview);
    setMapping(result.payload.preview.suggestedMapping ?? {});
    setIsLoadingPreview(false);
  };

  const handleValidate = async () => {
    if (!file || !preview || !canValidate) {
      return;
    }

    setIsValidating(true);
    setGlobalError(null);
    setValidation(null);
    setReport(null);

    const formData = new FormData();
    formData.set('file', file);
    formData.set('mapping', JSON.stringify(mapping));

    const result = await callImportApi<{ validation: ValidationResultPayload & { hasBlockingErrors?: boolean } }>('/api/admin/import/validate', formData);

    if (!result.ok) {
      setGlobalError(result.error);
      setIsValidating(false);
      return;
    }

    setValidation(result.payload.validation);
    setIsValidating(false);
  };

  const handleImport = async () => {
    if (!file || !preview || !canImport) {
      return;
    }

    setIsImporting(true);
    setGlobalError(null);

    const formData = new FormData();
    formData.set('file', file);
    formData.set('mapping', JSON.stringify(mapping));

    const result = await callImportApi<{ report: ImportReportPayload }>('/api/admin/import/execute', formData);

    if (!result.ok) {
      setGlobalError(result.error);
      setIsImporting(false);
      return;
    }

    setReport(result.payload.report);
    setIsImporting(false);
  };

  const handleMappingChange = (field: ImportFieldKey, value: string) => {
    setMapping((previous) => {
      const next = { ...previous };
      if (!value) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
    setValidation(null);
    setReport(null);
  };

  const downloadReport = () => {
    if (!report) {
      return;
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mainstore-import-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={styles.adminCard}>
      <h2 className={styles.adminCardTitle}>Импорт каталога из Excel</h2>
      <p className={styles.adminCardSub}>
        Загрузка файла, предпросмотр, сопоставление колонок, проверка и безопасный импорт.
      </p>

      <div className={styles.importStageList}>
        <p className={styles.importStageItem}>1. Загрузите Excel-файл</p>
        <p className={styles.importStageItem}>2. Проверьте лист и колонки</p>
        <p className={styles.importStageItem}>3. Запустите валидацию</p>
        <p className={styles.importStageItem}>4. Импортируйте только валидные строки</p>
      </div>

      <div className={styles.adminForm}>
        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Файл Excel (XLSX, XLS, XLSM, XLTX)</span>
          <input type="file" accept=".xlsx,.xls,.xlsm,.xltx" className={styles.adminInput} onChange={(event) => { const nextFile = event.target.files?.[0] ?? null; setFile(nextFile); resetFlow(); }} />
          <span className={styles.adminFieldHint}>
            Поддерживаемые форматы не менялись: XLSX, XLS, XLSM и XLTX.
          </span>
        </label>

        <div className={styles.adminActions}>
          <a href="/api/admin/import/template" className={styles.adminActionLink} aria-label="Скачать шаблон Excel для импорта">
            Скачать шаблон (.xlsx)
          </a>
          {(preview || validation || report || globalError) && (
            <button type="button" className={styles.adminSecondaryButton} onClick={resetFlow}>
              Начать заново
            </button>
          )}
        </div>

        {file && <p className={styles.adminCardSub}>Выбран файл: {file.name} ({formatBytes(file.size)})</p>}

        <button type="button" className={styles.adminPrimaryButton} onClick={handleLoadPreview} disabled={!file || isLoadingPreview || isValidating || isImporting} aria-label="Загрузить предпросмотр импорта">
          {isLoadingPreview ? 'Готовим предпросмотр...' : 'Показать предпросмотр'}
        </button>
      </div>

      {globalError && <p className={styles.adminError}>{globalError}</p>}

      {preview && (
        <section className={styles.importSection}>
          <h3 className={styles.adminCardTitle}>Предпросмотр</h3>
          <p className={styles.adminCardSub}>
            Лист: {preview.sheetName} · Найдено строк: {preview.totalRows}
            {preview.truncatedRowsCount > 0 ? ` (ограничено, пропущено ${preview.truncatedRowsCount} строк)` : ''}
          </p>

          <div className={styles.importPreviewTableWrap}>
            <table className={styles.importPreviewTable}>
              <thead>
                <tr>
                  <th>Строка</th>
                  {preview.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    {preview.columns.map((column) => (
                      <td key={`${row.rowNumber}-${column}`}>{row.values[column] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {preview && (
        <section className={styles.importSection}>
          <h3 className={styles.adminCardTitle}>Сопоставление колонок</h3>
          <p className={styles.adminCardSub}>
            Обязательные поля помечены звездочкой. Если столбец не нужен, оставьте значение
            {' '}&quot;Не выбрано&quot;.
          </p>
          <div className={styles.importMappingGrid}>
            {orderedFields.map((field) => {
              const isRequired = requiredImportFields.includes(field);
              return (
                <label key={field} className={styles.adminField}>
                  <span className={styles.adminLabel}>{fieldLabels[field]}{isRequired ? ' *' : ''}</span>
                  <select className={styles.adminSelect} value={mapping[field] ?? ''} disabled={isValidating || isImporting} onChange={(event) => handleMappingChange(field, event.target.value)} aria-label={`Сопоставить колонку для поля ${fieldLabels[field]}`}>
                    <option value="">Не выбрано</option>
                    {preview.columns.map((column) => (
                      <option key={`${field}-${column}`} value={column}>{column}</option>
                    ))}
                  </select>
                  {fieldHints[field] && <span className={styles.importFieldHint}>{fieldHints[field]}</span>}
                </label>
              );
            })}
          </div>

          <button type="button" className={styles.adminPrimaryButton} onClick={handleValidate} disabled={!canValidate || isLoadingPreview} aria-label="Проверить строки импорта">
            {isValidating ? 'Проверяем...' : 'Проверить строки'}
          </button>
        </section>
      )}

      {validation && !report && (
        <section className={styles.importSection}>
          <h3 className={styles.adminCardTitle}>Итоги проверки</h3>
          <div className={styles.importSummaryGrid}>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Всего строк</p><p className={styles.importSummaryValue}>{validation.summary.totalRows}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Валидных строк</p><p className={styles.importSummaryValue}>{validation.summary.validRows}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Строк с ошибками</p><p className={styles.importSummaryValue}>{validation.summary.rowsWithErrors}</p></article>
          </div>

          <div className={hasBlockingMappingErrors ? styles.adminCalloutWarn : styles.adminCallout}>
            <p className={styles.adminCalloutTitle}>
              {hasBlockingMappingErrors ? 'Сначала исправьте сопоставление колонок' : 'Проверка завершена'}
            </p>
            <p className={styles.adminCalloutText}>
              {hasBlockingMappingErrors
                ? 'Пока есть ошибки маппинга, импорт запускать нельзя.'
                : 'Импорт обработает только валидные строки. Ошибки ниже помогут быстро поправить файл.'}
            </p>
          </div>

          {currentErrors.length > 0 && (
            <div className={styles.importErrorList}>
              {currentErrors.map((error, index) => (
                <p key={`${error.rowNumber}-${error.field}-${index}`} className={styles.adminError}>
                  {error.rowNumber === 0 ? `Маппинг: ${error.message}` : `Строка ${error.rowNumber} (${error.field}): ${error.message}`}
                </p>
              ))}
            </div>
          )}

          <button type="button" className={styles.adminPrimaryButton} onClick={handleImport} disabled={!canImport || isValidating} aria-label="Импортировать валидные строки">
            {isImporting ? 'Импортируем...' : 'Импортировать валидные строки'}
          </button>
        </section>
      )}

      {report && (
        <section className={styles.importSection}>
          <h3 className={styles.adminCardTitle}>Результат импорта</h3>
          <div className={styles.importSummaryGrid}>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Создано товаров</p><p className={styles.importSummaryValue}>{report.summary.createdProducts}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Обновлено товаров</p><p className={styles.importSummaryValue}>{report.summary.updatedProducts}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Пропущено строк</p><p className={styles.importSummaryValue}>{report.summary.skippedRows}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Ошибок импорта</p><p className={styles.importSummaryValue}>{report.summary.importErrors}</p></article>
          </div>

          <div className={styles.importSummaryGrid}>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Создано категорий</p><p className={styles.importSummaryValue}>{report.summary.createdCategories}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Создано подборок</p><p className={styles.importSummaryValue}>{report.summary.createdCollections}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Создано изображений</p><p className={styles.importSummaryValue}>{report.summary.createdImages}</p></article>
            <article className={styles.importSummaryItem}><p className={styles.importSummaryLabel}>Обновлено изображений</p><p className={styles.importSummaryValue}>{report.summary.updatedImages}</p></article>
          </div>

          <div className={report.summary.importErrors > 0 ? styles.adminCalloutWarn : styles.adminCallout}>
            <p className={styles.adminCalloutTitle}>
              {report.summary.importErrors > 0 ? 'Импорт завершен с ошибками' : 'Импорт завершен'}
            </p>
            <p className={styles.adminCalloutText}>
              {report.summary.importErrors > 0
                ? 'Проверьте список ошибок и при необходимости повторите загрузку после исправлений.'
                : 'Каталог обновлен. При необходимости можно скачать отчет и сразу перейти к повторной проверке.'}
            </p>
          </div>

          {report.errors.length > 0 && (
            <div className={styles.importErrorList}>
              {report.errors.map((error, index) => (
                <p key={`${error.rowNumber}-${error.field}-${index}`} className={styles.adminError}>
                  {error.rowNumber === 0 ? `Маппинг: ${error.message}` : `Строка ${error.rowNumber} (${error.field}): ${error.message}`}
                </p>
              ))}
            </div>
          )}

          <div className={styles.adminActions}>
            <button type="button" className={styles.adminActionButton} onClick={downloadReport} aria-label="Скачать отчет импорта">Скачать отчет JSON</button>
            <button type="button" className={classNames(styles.adminActionButton, styles.importSecondaryAction)} onClick={() => { setValidation(null); setReport(null); setGlobalError(null); }} aria-label="Запустить проверку заново">Вернуться к проверке</button>
          </div>
        </section>
      )}
    </section>
  );
}

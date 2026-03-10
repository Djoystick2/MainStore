import { AdminScreen } from '@/components/admin/AdminScreen';
import { AdminCatalogImportFlow } from '@/components/admin/AdminCatalogImportFlow';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreSection } from '@/components/store/StoreSection';

export default function AdminImportPage() {
  return (
    <AdminScreen title="Импорт каталога" subtitle="Загрузка Excel, проверка строк и безопасный импорт">
      <StoreSection title="Импорт Excel">
        <AdminCatalogImportFlow />
      </StoreSection>
      <StoreSection title="Поддерживаемые форматы">
        <section className={adminStyles.adminCard}>
          <h2 className={adminStyles.adminCardTitle}>Типы файлов</h2>
          <p className={adminStyles.adminCardSub}>XLSX, XLS, XLSM, XLTX</p>
          <p className={adminStyles.adminCardSub}>
            Импорт работает по схеме preview-first. Запись в базу происходит только после явного подтверждения.
          </p>
        </section>
      </StoreSection>
    </AdminScreen>
  );
}

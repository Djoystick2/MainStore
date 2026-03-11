# Hotfix: Theme Contrast and Safe Area Layout

## Исходные проблемы

- В light theme часть storefront surfaces оставалась тёмной после предыдущих волн, а текст и ценовые зоны не всегда переключались на контрастный светлый/light-compatible вид.
- Верхний sticky header и верхний контент могли залезать под статические элементы Telegram Mini App.
- Fullscreen preference пыталась агрессивно переводить Mini App в fullscreen уже на старте, что повышало риск нестабильного layout на части Telegram-клиентов.

## Источник регрессий

### Theme contrast regression

- Shared light-theme block в storefront не перекрывал несколько product/detail/review surfaces, которые были затемнены поздними стилями.
- В результате в светлой теме оставались тёмные карточки с недостаточно адаптированным текстом и ценовыми зонами.

### Safe-area / fullscreen overlap regression

- `viewport.bindCssVars()` публикует safe-area переменные в формате `--tg-viewport-*`, а shared globals продолжали читать устаревшие `--tg-safe-area-*`.
- Из-за этого `--store-safe-area-top` не подхватывал фактические Telegram viewport/content safe area values.
- Дополнительно fullscreen preference автоматически вызывала `requestFullscreen()` после старта при сохранённом флаге, что делало верхний layout менее предсказуемым.

## Внесённые изменения

### Safe area and fullscreen stability

- Исправлены shared safe-area tokens в `src/app/_assets/globals.css`:
  - добавлен приоритет для `--tg-viewport-content-safe-area-inset-*`
  - добавлен fallback на `--tg-viewport-safe-area-inset-*`
  - сохранены старые fallback-переменные и `env(safe-area-inset-*)`
- Скорректировано поведение fullscreen preference в `src/components/Root/StoreUiPreferencesProvider.tsx`:
  - на старте приложение использует безопасный `expand` как базовый режим
  - автоматический `requestFullscreen()` на mount убран
  - fullscreen теперь запрашивается только после явного включения режима пользователем
  - выход из fullscreen при переключении обратно в стандартный режим сохранён

### Theme contrast hotfix

- Доведены light-theme overrides в `src/components/store/store.module.css` для проблемных storefront surfaces:
  - mini shelves
  - price/review summary cards
  - detail/support/specification/review blocks
  - option/shortcut chips
  - loading blocks
  - compare/old price text
- Текст и secondary metadata на этих поверхностях приведены к корректному light-theme контрасту.

### Profile controls

- Обновлён текст и UX блока настроек отображения в `src/components/store/ProfileDisplayPreferences.tsx`.
- Формулировки режима экрана переведены в безопасный сценарий `Раскрытый режим`, без обещания принудительного fullscreen на каждом запуске.

## Затронутые файлы

- `src/app/_assets/globals.css`
- `src/components/Root/StoreUiPreferencesProvider.tsx`
- `src/components/store/ProfileDisplayPreferences.tsx`
- `src/components/store/store.module.css`

## Проверки

- `pnpm run lint` — успешно
- `pnpm run build` — успешно

Во время `lint` и `build` были только информационные предупреждения `baseline-browser-mapping`.

## Остаточные follow-ups

- При необходимости можно отдельно пройтись по реальному Telegram клиенту и верифицировать значения `content safe area` на нескольких платформах, но для hotfix это не требует дополнительного архитектурного изменения.
- Если позже потребуется более агрессивный fullscreen flow, его лучше делать только как opt-in сценарий с device/client-specific проверкой, а не как обязательное действие на старте.

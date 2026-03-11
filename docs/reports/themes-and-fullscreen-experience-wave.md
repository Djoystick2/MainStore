# Themes + Fullscreen Experience Wave

## Исходные проблемы

- В storefront и частично в admin оставались зоны со слабой читаемостью на тёмной теме, включая текстовые блоки и служебные подписи.
- В проекте не было стабильной пользовательской системы из двух тем с сохранением выбора между открытиями приложения.
- В профиле не было явного пользовательского управления темой и режимом экрана.
- Telegram Mini App не пытался системно раскрываться на максимум при запуске, а fullscreen/expanded режим не был вынесен в отдельный пользовательский control.
- Layout не был явно адаптирован под safe areas и expanded/fullscreen режим через общие tokens.

## Выбранный подход

- Вынести пользовательские display-preferences в отдельный client-provider, не смешивая их с Telegram session/bootstrap и бизнес-логикой storefront/admin.
- Оставить тёмную тему как базовую, но добавить полноценный светлый override-слой на уровне global/store/admin CSS.
- Сохранять пользовательскую тему и fullscreen-preference в `localStorage`, а активную тему выставлять через `data-store-theme` до гидрации.
- Для Telegram viewport использовать безопасный порядок:
  - всегда делать `expand` при старте;
  - fullscreen запрашивать только через отдельную preference и только если клиент поддерживает API;
  - на unsupported клиентах падать обратно в максимально раскрытый режим.

## Внесенные изменения

- Добавлен bootstrap-скрипт темы в `src/app/layout.tsx`, чтобы сохраненная тема подхватывалась до гидрации.
- Добавлен client-provider `src/components/Root/StoreUiPreferencesProvider.tsx`:
  - хранит пользовательскую тему;
  - хранит fullscreen-preference;
  - синхронизирует `data-store-theme`, `data-store-expanded`, `data-store-fullscreen`;
  - обновляет Telegram chrome colors;
  - пытается раскрыть Mini App и, при необходимости, запросить fullscreen.
- `src/components/Root/Root.tsx` переведен на пользовательскую тему для `AppRoot`, вместо жесткой привязки только к Telegram `miniApp.isDark`.
- `src/core/init.ts` теперь делает `viewport.expand.ifAvailable()` сразу после mount viewport.
- В профиле добавлен новый блок `Тема и экран` через `src/components/store/ProfileDisplayPreferences.tsx` и подключение в `src/app/profile/page.tsx`.
- В `src/app/_assets/globals.css` добавлены:
  - dual-theme tokens;
  - left/right safe areas;
  - shell width/padding tokens;
  - expanded/fullscreen layout vars.
- В `src/components/store/store.module.css` добавлены:
  - profile controls styles;
  - dark readability overrides для проблемных текстовых зон;
  - большой light-theme override для storefront surfaces, текста, CTA и bottom nav;
  - safe-area aware paddings и shell width для fullscreen/expanded usage.
- В `src/components/admin/admin.module.css` добавлен light-theme compatibility слой для карточек, lead-blocks, форм и callouts.

## Затронутые файлы

- `src/app/_assets/globals.css`
- `src/app/layout.tsx`
- `src/app/profile/page.tsx`
- `src/components/Root/Root.tsx`
- `src/components/Root/StoreUiPreferencesProvider.tsx`
- `src/components/store/ProfileDisplayPreferences.tsx`
- `src/components/store/store.module.css`
- `src/components/admin/admin.module.css`
- `src/core/init.ts`

## Результаты проверок

- `pnpm run lint` — успешно.
- `pnpm run build` — успешно.
- В обоих прогонах остались только информационные предупреждения `baseline-browser-mapping`.

## Остаточные ограничения / follow-ups

- Реальный fullscreen в Telegram зависит от поддержки клиента; на unsupported клиентах используется безопасный fallback в максимально раскрытый режим.
- Бизнес-логика storefront/admin, Telegram bootstrap/session/runtime/back behavior, import flow, payment sandbox foundation и Excel support `XLSX` / `XLS` / `XLSM` / `XLTX` не менялись.
- До реального payment-block можно отдельно пройти уже руками device-QA по двум темам в нескольких Telegram клиентах, но для текущей волны архитектурный exception не понадобился.

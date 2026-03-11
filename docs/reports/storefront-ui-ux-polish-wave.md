# Storefront UI/UX polish wave

## Исходные UX/UI проблемы

- Главная страница была рабочей, но слишком технической по тону: лишний текст, слабая иерархия, недостаточно витринная подача блоков.
- Каталог визуально перегружал мобильный экран одинаковым grid-подходом и на верхнем уровне, и внутри уже выбранных разделов.
- Product/storefront surfaces были менее цельными по плотности, microcopy и второстепенным пояснениям, чем остальные стабилизированные поверхности.
- Часть storefront copy оставалась слишком сухой или неудачной для витринного сценария, особенно в banners/shelves/empty-state related текстах.

## Внесённые изменения

- Главная витрина:
  - упрощён hero-copy и усилена визуальная иерархия;
  - quick links стали понятнее по подписям;
  - секции и collection rail получили более спокойные и витринные формулировки;
  - empty/data notice copy стала короче и дружелюбнее.
- Каталог:
  - верхний уровень дополнен наглядными category tiles;
  - для более глубоких состояний включён упрощённый list-mode карточек вместо постоянной двухколоночной сетки;
  - упрощены search/filter copy и empty-state тексты;
  - подборки сохранены как горизонтальный rail без перегруза.
- Product/storefront surfaces:
  - product detail copy стала чище и дружелюбнее;
  - предупреждения/availability/panel wording стали понятнее;
  - related section и CTA вторичного уровня выровнены по тону.
- Shared storefront polish:
  - добавлен list layout в `ProductCard`;
  - обновлены badge/copy для stock/favorite/share related UI;
  - добавлены CSS-состояния для active category tiles и компактного mobile-friendly list mode.

## Затронутые файлы

- `src/app/page.tsx`
- `src/app/catalog/page.tsx`
- `src/app/products/[productId]/page.tsx`
- `src/app/favorites/page.tsx`
- `src/components/store/ProductCard.tsx`
- `src/components/store/StoreMiniShelfSection.tsx`
- `src/components/store/FavoriteToggleButton.tsx`
- `src/components/store/ProductShareButton.tsx`
- `src/components/store/store.module.css`
- `src/features/storefront/marketing.ts`

## Что намеренно не менялось

- Telegram runtime/bootstrap/session hardening
- checkout/orders/profile/admin flows
- Excel import pipeline и поддержка `XLSX/XLS/XLSM/XLTX`
- payment sandbox foundation и provider-specific payment integration
- catalog/admin/import архитектура
- крупный redesign или тяжёлый visual churn вне storefront polish

## Результаты проверок

- `pnpm run lint` — passed
- `pnpm run build` — passed

Неблокирующее предупреждение:

- `baseline-browser-mapping` устарел; это не остановило `lint` и `build`

## Остаточные follow-ups

- Нужен короткий manual pass в реальном Telegram Mini App на мобильном экране для оценки плотности нового catalog list-mode и hero/rail ритма.
- Если позже появятся реальные merchandising assets, можно отдельно усилить home banners/collections без изменения текущей навигационной структуры.

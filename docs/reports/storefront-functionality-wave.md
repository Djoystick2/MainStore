# Storefront Functionality Wave

## Что изменено

- Усилен `storefront data layer`: товары теперь получают `stockState`, `stockQuantity`, `categoryTitle`, `collections`, `media`, `popularityScore`.
- `popularProducts` и home mini-shelves переведены с условного fallback-порядка на реальный discovery signal из `favorites`, `cart_items`, `order_items`.
- Каталог получил более сильный browsing UX:
  - `search`
  - quick filters
  - `sort`
  - ясные empty/no-match states
- Карточка товара стала информативнее:
  - media gallery
  - availability state
  - category / collections context
  - cleaner fact block
- `ProductCard` упрощён визуально, но теперь лучше подсказывает category и проблемное наличие.
- `AddToCartButton` умеет безопасно блокироваться на storefront уровне для `out_of_stock`.

## Files changed

- `src/app/catalog/page.tsx`
- `src/app/products/[productId]/page.tsx`
- `src/components/store/AddToCartButton.tsx`
- `src/components/store/ProductCard.tsx`
- `src/components/store/store.module.css`
- `src/components/store/types.ts`
- `src/features/storefront/data.ts`

## Checks run

- `pnpm run lint`
- `pnpm run build`

## Remaining risks / leftovers

- `popularProducts` считается по существующим данным `favorites/cart/order_items`. Это реальный сигнал, но не полноценная merchandising analytics модель.
- Filter `Можно заказать` intentionally excludes only `out_of_stock`. Товары с неизвестным `stock_quantity` не скрываются, чтобы не ломать реальный каталог, где остатки могут быть не заполнены.
- Home mini-shelves теперь используют real pricing/discovery data, но для richer promo logic по-прежнему нет отдельного promo management source.
- `baseline-browser-mapping` warning остаётся неблокирующим и не связан с этой wave.

## Exact commands required from the user

- Ничего дополнительно запускать не нужно, если достаточно текущих `lint/build`.
- Для ручной проверки:
  - `pnpm run dev`

# Checkout And Order Hardening Wave

## Что изменено

- Усилен customer-side `checkout`:
  - clearer sections
  - inline validation
  - safer delivery data collection
  - stronger summary block
- Усилен post-checkout flow:
  - clearer created-order state
  - better explanation of payment/order separation
- Усилены customer orders surfaces:
  - richer order history cards
  - clearer payment/order status visibility
  - next-action block on order detail
  - safe `reorder` action
- Добавлен backend `reorder` route без изменения payment foundation.
- Server-side checkout validation теперь возвращает более точные validation codes.

## Files changed

- `src/app/api/store/checkout/place-order/route.ts`
- `src/app/api/store/checkout/start-payment/route.ts`
- `src/app/api/store/orders/[orderId]/reorder/route.ts`
- `src/app/checkout/page.tsx`
- `src/app/orders/page.tsx`
- `src/app/orders/[orderId]/page.tsx`
- `src/components/store/CheckoutForm.tsx`
- `src/components/store/OrderRepeatAction.tsx`
- `src/components/store/store.module.css`
- `src/features/orders/data.ts`
- `src/features/payments/service.ts`

## Checks run

- `pnpm run lint`
- `pnpm run build`

## Remaining risks / leftovers

- Реальный provider integration всё ещё intentionally not connected; flow остаётся на existing payment foundation / sandbox.
- `reorder` добавляет доступные позиции в текущую корзину, а не создаёт отдельный новый order draft.
- `reorder` пропускает deleted / inactive / explicit out-of-stock products, но товары с `stock_quantity = null` остаются reorderable по текущей совместимой логике.
- Delivery model по-прежнему practical и не превращён в full shipping system.
- `baseline-browser-mapping` warning остаётся неблокирующим.

## Exact commands required from the user

- Ничего обязательно не требуется.
- Для ручной проверки:
  - `pnpm run dev`

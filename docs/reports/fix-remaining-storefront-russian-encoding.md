# Fix Remaining Storefront Russian Encoding

## Root cause
- Оставшиеся mojibake-строки находились в самих storefront UI literals, в первую очередь на `profile` и `orders` поверхностях.
- Источник был локальный: поврежденные строковые литералы в `TSX`, а не шрифт, не Telegram runtime, не bootstrap/auth и не глобальная проблема кириллицы.
- Проверка показала, что исправленные файлы читаются как `UTF-8`, поэтому проблема была именно в уже испорченном содержимом строк.

## Screens and components affected
- `Profile`
- `Orders`
- `Order detail`
- related order/profile storefront copy

## Where the broken strings were found
- [src/app/profile/page.tsx](/h:/Work/MainStore/src/app/profile/page.tsx)
- [src/app/orders/page.tsx](/h:/Work/MainStore/src/app/orders/page.tsx)
- [src/app/orders/[orderId]/page.tsx](/h:/Work/MainStore/src/app/orders/[orderId]/page.tsx)

## Checked but no source change was needed
- [src/app/profile/loading.tsx](/h:/Work/MainStore/src/app/profile/loading.tsx)
- [src/app/orders/loading.tsx](/h:/Work/MainStore/src/app/orders/loading.tsx)
- [src/app/orders/[orderId]/loading.tsx](/h:/Work/MainStore/src/app/orders/[orderId]/loading.tsx)
- [src/components/store/OrderPaymentAction.tsx](/h:/Work/MainStore/src/components/store/OrderPaymentAction.tsx)
- [src/components/store/OrderRepeatAction.tsx](/h:/Work/MainStore/src/components/store/OrderRepeatAction.tsx)

## What was restored
- Titles, subtitles and helper copy on profile/orders pages
- Order status labels and hints
- Empty/error/retry/loading states
- Order detail delivery/summary labels
- CTA labels and inline error/success messages for payment/reorder actions

## Examples of restored copy
- `Профиль`
- `Мои заказы`
- `Заказ`
- `Доставка`
- `Сводка`
- `История заказов`
- `Комментарий к заказу`
- `Продолжить оплату`
- `Повторить заказ`
- `Открыть корзину`

## What was intentionally not changed
- Checkout fix from the previous wave
- Telegram bootstrap/auth hardening
- Excel import pipeline
- Payment sandbox foundation
- Admin and import surfaces

## UTF-8 validation
- `src/app/profile/page.tsx` -> `UTF8_OK`
- `src/app/profile/loading.tsx` -> `UTF8_OK`
- `src/app/orders/page.tsx` -> `UTF8_OK`
- `src/app/orders/loading.tsx` -> `UTF8_OK`
- `src/app/orders/[orderId]/page.tsx` -> `UTF8_OK`
- `src/app/orders/[orderId]/loading.tsx` -> `UTF8_OK`
- `src/components/store/OrderPaymentAction.tsx` -> `UTF8_OK`
- `src/components/store/OrderRepeatAction.tsx` -> `UTF8_OK`

## Verification
- `pnpm run lint` -> passed
- `pnpm run build` -> passed
- Remaining non-blocking warning: `baseline-browser-mapping` data is outdated

## Residual note
- В целевом storefront-скане после правок типичные mojibake-последовательности на profile/orders поверхностях больше не обнаружены; оставшиеся совпадения при поиске относятся к нормальной кириллице вроде `Роль`.

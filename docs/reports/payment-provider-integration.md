# Payment Provider Integration

## What Was Changed

- Reused the existing payment foundation instead of replacing it.
- Added a registry-based provider layer in `src/features/payments/providers/registry.ts`.
- Removed direct `sandbox` coupling from the core payment service where provider lookup and webhook handling happen.
- Added safer provider resolution for checkout start and payment retry flows.
- Added provider mismatch protection for webhook-driven payment status updates.
- Generalized Telegram payment back navigation from `/pay/sandbox/*` to `/pay/*`.
- Updated `.env.example` and `README.md` to reflect the current payment foundation and provider-ready extension path.

## Files Changed

- `.env.example`
- `README.md`
- `src/app/api/payments/webhook/[provider]/route.ts`
- `src/app/api/store/checkout/place-order/route.ts`
- `src/app/api/store/checkout/start-payment/route.ts`
- `src/app/api/store/orders/[orderId]/payment/route.ts`
- `src/components/store/CheckoutForm.tsx`
- `src/components/store/OrderPaymentAction.tsx`
- `src/features/payments/env.ts`
- `src/features/payments/index.ts`
- `src/features/payments/service.ts`
- `src/features/payments/providers/registry.ts`
- `src/features/telegram/navigation.ts`

## Checks Run

- `pnpm run lint` ✅
- `pnpm run build` ✅

## Remaining Risks / Leftovers

- A real production provider was not wired in this pass because no concrete provider was specified, and fabricating provider API behavior would violate the task restriction.
- The current registered adapter set still contains only `sandbox`.
- To complete real provider integration safely, the next pass needs:
  - one named provider,
  - official API/docs,
  - required secrets,
  - callback/webhook contract,
  - expected redirect flow for Telegram Mini App.
- Build output still shows the existing non-blocking `baseline-browser-mapping` warning.

## Exact Commands Required From The User

- No mandatory repository command is required after this pass.
- To proceed with a real provider integration, the minimal required exception is to allow targeting one конкретный payment provider and provide its official integration contract and secrets outside the repository.

# Telegram Mini App Hardening + Release Stabilization Wave

## Scope
- Telegram Mini App launch/runtime/bootstrap hardening before release.
- Stabilization of protected customer/admin surfaces without architectural churn.
- Preservation of existing catalog/admin/import/payment-foundation flows.

## Initial risks
- `isTelegramMiniAppRuntime()` relied on `window.Telegram?.WebApp` only, which was too narrow for early launch timing and some Telegram launch paths.
- Protected screens could still reach mixed states where real Telegram launches looked like `unauthorized` while bootstrap was still recovering.
- Admin `no_session` UI was not bootstrap-aware and could present a false “нужна сессия Telegram” screen even while Mini App bootstrap was already in progress.
- Retry flow around session bootstrap mostly depended on same-page navigation and did not force a fresh server reread on retry.
- Product share flow inside Telegram relied on `window.open`, which is less stable inside Mini App webviews than Telegram-aware link opening.

## Changes made
- Hardened Telegram runtime detection in [src/features/telegram/navigation.ts](/h:/Work/MainStore/src/features/telegram/navigation.ts):
  - kept `window.Telegram?.WebApp`
  - added `TelegramWebviewProxy`
  - added launch-parameter detection from URL/hash
  - added `retrieveLaunchParams()` fallback
- Hardened bootstrap timing in [src/components/auth/TelegramSessionBootstrap.tsx](/h:/Work/MainStore/src/components/auth/TelegramSessionBootstrap.tsx):
  - added bounded wait for missing `initData`
  - introduced explicit `init_data_unavailable` failure path for real Telegram runtime without launch data
  - made retry also trigger `router.refresh()` so server components reread session state immediately
  - aligned unauthorized helper messages with runtime-aware failure handling
- Tightened protected fallback logic in [src/components/auth/TelegramSessionRequiredState.tsx](/h:/Work/MainStore/src/components/auth/TelegramSessionRequiredState.tsx):
  - failure state now works for real Telegram runtime even when `initData` never materializes
  - copy differentiates launch-data timeout from regular bootstrap failure
- Made admin no-access state bootstrap-aware in [src/components/admin/AdminNoAccessState.tsx](/h:/Work/MainStore/src/components/admin/AdminNoAccessState.tsx):
  - distinguishes waiting/failed Telegram bootstrap from true external access
  - avoids showing a misleading plain no-session message during active Mini App recovery
- Removed mixed unauthorized summary screens by returning early from:
  - [src/app/cart/page.tsx](/h:/Work/MainStore/src/app/cart/page.tsx)
  - [src/app/orders/page.tsx](/h:/Work/MainStore/src/app/orders/page.tsx)
- Stabilized Telegram share/open flow in [src/components/store/ProductShareButton.tsx](/h:/Work/MainStore/src/components/store/ProductShareButton.tsx):
  - uses Telegram-aware `openLink(...)` instead of `window.open(...)` inside Mini App runtime

## Intentionally not changed
- Excel import pipeline and supported formats `XLSX`, `XLS`, `XLSM`, `XLTX`.
- Catalog/admin/import data model and operational flows.
- Payment provider-specific integration.
- Payment sandbox foundation and order/payment architecture.
- Existing storefront UX direction and the current Russian localization strategy outside touched hardening copy.

## Files touched
- [src/features/telegram/navigation.ts](/h:/Work/MainStore/src/features/telegram/navigation.ts)
- [src/components/auth/TelegramSessionBootstrap.tsx](/h:/Work/MainStore/src/components/auth/TelegramSessionBootstrap.tsx)
- [src/components/auth/TelegramSessionRequiredState.tsx](/h:/Work/MainStore/src/components/auth/TelegramSessionRequiredState.tsx)
- [src/components/admin/AdminNoAccessState.tsx](/h:/Work/MainStore/src/components/admin/AdminNoAccessState.tsx)
- [src/app/cart/page.tsx](/h:/Work/MainStore/src/app/cart/page.tsx)
- [src/app/orders/page.tsx](/h:/Work/MainStore/src/app/orders/page.tsx)
- [src/components/store/ProductShareButton.tsx](/h:/Work/MainStore/src/components/store/ProductShareButton.tsx)

## Verification
- `pnpm run lint`
  - passed
  - non-blocking warning remained: `baseline-browser-mapping` data is outdated
- `pnpm run build`
  - passed
  - production build completed successfully

## Residual risks / follow-ups
- Live Telegram launch/reopen behavior still needs manual verification in a real Telegram client against the deployed Mini App URL. Local CLI checks cannot simulate actual Telegram `initData` delivery and reopen timing end-to-end.
- If Telegram launch is configured outside `web_app`, no bootstrap will happen and browser fallback remains expected behavior.
- Any environment-side issues in Vercel/Supabase/Telegram Bot configuration can still surface as bootstrap failures, but UI now exposes them more reliably as Telegram-runtime failures instead of generic external fallback.

## Limitation requiring an exception
- Limitation:
  - I cannot verify the real Telegram client launch path, reopen flow, and runtime-delivered `initData` from this local environment.
- What must be done beyond current limits:
  - open the deployed Mini App from the Telegram bot/menu button in a real Telegram client and retest `/cart`, `/orders`, `/profile`, `/checkout`, `/pay/sandbox/[attemptId]`, and `/admin`
- Minimal exception needed:
  - one manual production verification pass inside Telegram after deploy

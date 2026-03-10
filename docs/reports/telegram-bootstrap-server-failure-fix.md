# Telegram Bootstrap Server Failure Fix

## Root cause
- После предыдущего pass клиент уже корректно видел Telegram runtime и отправлял bootstrap request, но server bootstrap всё ещё мог падать в profile/session creation path.
- Хрупкое место было в `src/features/auth/profile.ts`: для Telegram-пользователя создавался `auth.users` через `auth.admin.createUser` с synthetic email `tg-<id>@telegram.mainstore.local`.
- Такой `.local` email не является надёжной production-опорой для Supabase Auth и мог валить `createUser`, из-за чего profile upsert не завершался, `ms_session` не ставился и приватные экраны оставались без server session.
- Дополнительно реальный server failure reason скрывался: клиент показывал общий bootstrap-aware fallback без точного `reason`, поэтому `env`/verification/upsert ошибки было трудно отличить друг от друга.

## What was changed
- Заменён synthetic email для `auth.admin.createUser` на валидный reserved domain: `tg-<id>@mainstore.example.com`.
- `upsertProfileFromTelegramIdentity()` теперь возвращает стабильные `reason` codes и safe `details` для server-side диагностики.
- `/api/auth/telegram/bootstrap` теперь отдаёт `reason` в JSON response для всех основных fail-веток.
- В bootstrap route добавлен server log для profile upsert failures.
- `TelegramSessionBootstrap` теперь читает `reason` из response и хранит его как error code.
- `TelegramSessionRequiredState` теперь показывает безопасный диагностический код вида `Код: auth_user_create_failed` вместо полностью немого generic fail state.
- Предыдущий fix с `router.refresh()` и bootstrap-aware waiting state сохранён.

## Files changed
- `src/features/auth/profile.ts`
- `src/app/api/auth/telegram/bootstrap/route.ts`
- `src/components/auth/TelegramSessionBootstrap.tsx`
- `src/components/auth/TelegramSessionRequiredState.tsx`
- `src/components/Root/Root.tsx`
- `src/app/profile/page.tsx`
- `src/app/favorites/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/orders/page.tsx`
- `src/app/orders/[orderId]/page.tsx`
- `src/app/pay/sandbox/[attemptId]/page.tsx`
- `src/components/store/AddToCartButton.tsx`
- `src/components/store/FavoriteToggleButton.tsx`
- `src/components/store/CartItemControls.tsx`
- `src/components/store/CheckoutForm.tsx`
- `src/components/store/OrderPaymentAction.tsx`
- `src/components/store/OrderRepeatAction.tsx`
- `src/components/store/SandboxPaymentActions.tsx`

## Checks run
- `pnpm run lint`
- `pnpm run build`

## Exact commands or external steps required from the user
1. Задеплоить текущие изменения на `https://main-store.vercel.app`.
2. В Vercel проверить production `env`:
   - `TELEGRAM_BOT_TOKEN`
   - `APP_SESSION_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. В BotFather убедиться, что `Menu Button` / `Open Store` открывает именно `web_app` на `https://main-store.vercel.app`.
4. Открыть Mini App из Telegram и, если bootstrap снова не завершится, зафиксировать новый код ошибки из UI (`hash_verification_failed`, `telegram_bot_token_missing`, `auth_user_create_failed`, `profile_upsert_failed` и т.д.).

## Remaining risks / leftovers
- Если production `TELEGRAM_BOT_TOKEN` неверный или не совпадает с ботом, UI теперь покажет `hash_verification_failed` или `telegram_bot_token_missing`; это уже внешний config issue.
- Если в Supabase есть нестандартные ограничения на `auth.admin.createUser` или `profiles`, UI теперь покажет код сбоя вместо общей фразы.
- В `lint/build` остаётся неблокирующее предупреждение `baseline-browser-mapping`.

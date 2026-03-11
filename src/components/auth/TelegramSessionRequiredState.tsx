'use client';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';

import { useTelegramSessionBootstrapState } from './TelegramSessionBootstrap';

interface TelegramSessionRequiredStateProps {
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackActionLabel?: string;
  fallbackActionHref?: string;
  retryHref: string;
}

export function TelegramSessionRequiredState({
  fallbackTitle,
  fallbackDescription,
  fallbackActionLabel,
  fallbackActionHref,
  retryHref,
}: TelegramSessionRequiredStateProps) {
  const { status, hasInitData, isTelegramRuntime, error } = useTelegramSessionBootstrapState();

  if (hasInitData && (status === 'pending' || status === 'ready')) {
    return (
      <StoreEmptyState
        title="Проверяем сессию Telegram"
        description="Личный раздел откроется автоматически, как только подтвердится сессия Mini App."
      />
    );
  }

  if (isTelegramRuntime && status === 'failed') {
    const failureDescription =
      error === 'init_data_unavailable'
        ? 'Mini App открыт в Telegram, но данные запуска не загрузились вовремя. Обновите экран или откройте магазин заново из бота.'
        : error
          ? `Mini App открыт из Telegram, но серверная сессия не создалась. Код: ${error}.`
          : 'Mini App открыт из Telegram, но серверная сессия не создалась. Обновите экран или откройте магазин заново из бота.';

    return (
      <StoreEmptyState
        title="Не удалось подтвердить сессию Telegram"
        description={failureDescription}
        actionLabel="Обновить экран"
        actionHref={retryHref}
      />
    );
  }

  if (isTelegramRuntime && status === 'idle') {
    return (
      <StoreEmptyState
        title="Подключаем Telegram"
        description="Ждём данные запуска от Telegram. Если экран не обновится автоматически, перезапустите Mini App из бота."
        actionLabel="Обновить экран"
        actionHref={retryHref}
      />
    );
  }

  return (
    <StoreEmptyState
      title={fallbackTitle}
      description={fallbackDescription}
      actionLabel={fallbackActionLabel}
      actionHref={fallbackActionHref}
    />
  );
}

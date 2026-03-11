'use client';

import Link from 'next/link';

import { useTelegramSessionBootstrapState } from '@/components/auth/TelegramSessionBootstrap';

import styles from './admin.module.css';

interface AdminNoAccessStateProps {
  reason: 'no_session' | 'forbidden';
}

function getNoSessionCopy(input: {
  status: 'idle' | 'pending' | 'ready' | 'failed';
  hasInitData: boolean;
  isTelegramRuntime: boolean;
  error: string | null;
}): { title: string; description: string; actionLabel: string } {
  if (input.hasInitData && (input.status === 'pending' || input.status === 'ready')) {
    return {
      title: 'Проверяем сессию Telegram',
      description:
        'Админка откроется автоматически, как только подтвердится сессия Mini App.',
      actionLabel: 'Обновить экран',
    };
  }

  if (input.isTelegramRuntime && input.status === 'idle') {
    return {
      title: 'Подключаем Telegram',
      description:
        'Ждём данные запуска от Telegram. Если экран не обновится автоматически, перезапустите Mini App из бота.',
      actionLabel: 'Обновить экран',
    };
  }

  if (input.isTelegramRuntime && input.status === 'failed') {
    const description =
      input.error === 'init_data_unavailable'
        ? 'Mini App открыт в Telegram, но данные запуска не загрузились вовремя. Обновите экран или откройте магазин заново из бота.'
        : input.error
          ? `Mini App открыт из Telegram, но серверная сессия не создалась. Код: ${input.error}.`
          : 'Mini App открыт из Telegram, но серверная сессия не создалась. Обновите экран или откройте магазин заново из бота.';

    return {
      title: 'Не удалось подтвердить сессию Telegram',
      description,
      actionLabel: 'Обновить экран',
    };
  }

  return {
    title: 'Для админки нужна сессия Telegram',
    description: 'Откройте MainStore внутри Telegram под аккаунтом с ролью администратора.',
    actionLabel: 'На витрину',
  };
}

export function AdminNoAccessState({ reason }: AdminNoAccessStateProps) {
  const { status, hasInitData, isTelegramRuntime, error } = useTelegramSessionBootstrapState();

  const copy =
    reason === 'no_session'
      ? getNoSessionCopy({ status, hasInitData, isTelegramRuntime, error })
      : {
          title: 'Нет доступа к админке',
          description: 'У вашего профиля пока нет роли администратора.',
          actionLabel: 'На витрину',
        };

  const actionHref =
    reason === 'no_session' && (isTelegramRuntime || hasInitData) ? '/admin' : '/';

  return (
    <section className={styles.adminNoAccess}>
      <h2 className={styles.adminNoAccessTitle}>{copy.title}</h2>
      <p className={styles.adminNoAccessText}>{copy.description}</p>
      <Link href={actionHref} className={styles.adminNoAccessAction} aria-label={copy.actionLabel}>
        {copy.actionLabel}
      </Link>
    </section>
  );
}

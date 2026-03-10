import Link from 'next/link';

import styles from './admin.module.css';

interface AdminNoAccessStateProps {
  reason: 'no_session' | 'forbidden';
}

export function AdminNoAccessState({ reason }: AdminNoAccessStateProps) {
  const title =
    reason === 'no_session'
      ? 'Для админки нужна сессия Telegram'
      : 'Нет доступа к админке';
  const description =
    reason === 'no_session'
      ? 'Откройте MainStore внутри Telegram под аккаунтом с ролью администратора.'
      : 'У вашего профиля пока нет роли администратора.';

  return (
    <section className={styles.adminNoAccess}>
      <h2 className={styles.adminNoAccessTitle}>{title}</h2>
      <p className={styles.adminNoAccessText}>{description}</p>
      <Link href="/" className={styles.adminNoAccessAction} aria-label="Вернуться на витрину">
        На витрину
      </Link>
    </section>
  );
}

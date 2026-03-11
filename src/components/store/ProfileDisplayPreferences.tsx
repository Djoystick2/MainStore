'use client';

import { classNames } from '@/css/classnames';

import { useStoreUiPreferences } from '@/components/Root/StoreUiPreferencesProvider';

import styles from './store.module.css';

export function ProfileDisplayPreferences() {
  const {
    theme,
    setTheme,
    fullscreenEnabled,
    setFullscreenEnabled,
    isExpanded,
    isFullscreen,
    isFullscreenSupported,
  } = useStoreUiPreferences();

  const screenStatus = isFullscreen
    ? 'Полный экран активен'
    : isExpanded
      ? 'Mini App раскрыт на весь доступный экран'
      : 'Используется стандартная высота';

  const screenHint = isFullscreenSupported
    ? 'Если клиент Telegram поддерживает fullscreen, этот режим можно закрепить и использовать без лишних полей.'
    : 'Если fullscreen API недоступен, приложение будет открываться в максимально раскрытом режиме.';

  return (
    <div className={styles.profilePreferences}>
      <article className={styles.profilePreferenceCard}>
        <div className={styles.profilePreferenceInfo}>
          <p className={styles.profilePreferenceLabel}>Тема интерфейса</p>
          <p className={styles.profilePreferenceHint}>
            Переключайте витрину и админку между мягкой тёмной и светлой темой без потери читаемости.
          </p>
        </div>
        <div className={styles.profilePreferenceButtons} role="tablist" aria-label="Выбор темы интерфейса">
          <button
            type="button"
            className={classNames(
              styles.profilePreferenceButton,
              theme === 'dark' && styles.profilePreferenceButtonActive,
            )}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            Тёмная
          </button>
          <button
            type="button"
            className={classNames(
              styles.profilePreferenceButton,
              theme === 'light' && styles.profilePreferenceButtonActive,
            )}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >
            Светлая
          </button>
        </div>
      </article>

      <article className={styles.profilePreferenceCard}>
        <div className={styles.profilePreferenceInfo}>
          <p className={styles.profilePreferenceLabel}>Режим экрана</p>
          <p className={styles.profilePreferenceHint}>{screenHint}</p>
          <p className={styles.profilePreferenceStatus}>{screenStatus}</p>
        </div>
        <div className={styles.profilePreferenceButtons} role="tablist" aria-label="Выбор режима экрана">
          <button
            type="button"
            className={classNames(
              styles.profilePreferenceButton,
              !fullscreenEnabled && styles.profilePreferenceButtonActive,
            )}
            onClick={() => setFullscreenEnabled(false)}
            aria-pressed={!fullscreenEnabled}
          >
            Стандартный
          </button>
          <button
            type="button"
            className={classNames(
              styles.profilePreferenceButton,
              fullscreenEnabled && styles.profilePreferenceButtonActive,
            )}
            onClick={() => setFullscreenEnabled(true)}
            aria-pressed={fullscreenEnabled}
          >
            {isFullscreenSupported ? 'На весь экран' : 'Раскрытый режим'}
          </button>
        </div>
      </article>
    </div>
  );
}

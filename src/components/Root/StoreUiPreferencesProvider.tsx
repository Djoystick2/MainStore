'use client';

import { miniApp, useSignal, viewport } from '@tma.js/sdk-react';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export type StoreTheme = 'dark' | 'light';

interface StoreUiPreferencesContextValue {
  theme: StoreTheme;
  setTheme: (theme: StoreTheme) => void;
  fullscreenEnabled: boolean;
  setFullscreenEnabled: (enabled: boolean) => void;
  isExpanded: boolean;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
}

const STORE_THEME_KEY = 'mainstore:theme';
const STORE_FULLSCREEN_KEY = 'mainstore:fullscreen-enabled';

const StoreUiPreferencesContext = createContext<StoreUiPreferencesContextValue | null>(null);

function isStoreTheme(value: string | null | undefined): value is StoreTheme {
  return value === 'dark' || value === 'light';
}

function readStoredTheme(fallbackTheme: StoreTheme): StoreTheme {
  if (typeof window === 'undefined') {
    return fallbackTheme;
  }

  try {
    const storedTheme = window.localStorage.getItem(STORE_THEME_KEY);
    return isStoreTheme(storedTheme) ? storedTheme : fallbackTheme;
  } catch {
    return fallbackTheme;
  }
}

function readStoredFullscreenPreference(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const storedPreference = window.localStorage.getItem(STORE_FULLSCREEN_KEY);
    if (storedPreference === 'false') {
      return false;
    }
    if (storedPreference === 'true') {
      return true;
    }
  } catch {
    // Ignore storage failures and keep the safe default.
  }

  return true;
}

function applyThemeToDocument(theme: StoreTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.storeTheme = theme;
  document.documentElement.style.colorScheme = theme;
}

function isFullscreenSupported(): boolean {
  try {
    return Boolean(
      viewport.requestFullscreen.isSupported?.() &&
      viewport.requestFullscreen.isAvailable?.(),
    );
  } catch {
    return false;
  }
}

function syncViewportAttributes(input: { isExpanded: boolean; isFullscreen: boolean }): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.storeExpanded = input.isExpanded ? 'true' : 'false';
  document.documentElement.dataset.storeFullscreen = input.isFullscreen ? 'true' : 'false';
}

function applyTelegramChrome(theme: StoreTheme): void {
  const chromeColor = theme === 'dark' ? '#050608' : '#f4f6fb';

  miniApp.setBgColor.ifAvailable(chromeColor);
  miniApp.setHeaderColor.ifAvailable(chromeColor);
  miniApp.setBottomBarColor.ifAvailable(chromeColor);
}

export function StoreUiPreferencesProvider({ children }: PropsWithChildren) {
  const telegramPrefersDark = Boolean(useSignal(miniApp.isDark));
  const runtimeIsExpanded = Boolean(useSignal(viewport.isExpanded));
  const runtimeIsFullscreen = Boolean(useSignal(viewport.isFullscreen));
  const fullscreenPreferenceInitializedRef = useRef(false);
  const previousFullscreenEnabledRef = useRef<boolean>(readStoredFullscreenPreference());
  const [theme, setThemeState] = useState<StoreTheme>(() => {
    const fallbackTheme = telegramPrefersDark ? 'dark' : 'light';

    if (typeof document !== 'undefined') {
      const documentTheme = document.documentElement.dataset.storeTheme;
      if (isStoreTheme(documentTheme)) {
        return documentTheme;
      }
    }

    return readStoredTheme(fallbackTheme);
  });
  const [fullscreenEnabled, setFullscreenEnabledState] = useState<boolean>(() => (
    readStoredFullscreenPreference()
  ));
  const fullscreenSupported = isFullscreenSupported();

  useEffect(() => {
    applyThemeToDocument(theme);
    applyTelegramChrome(theme);

    try {
      window.localStorage.setItem(STORE_THEME_KEY, theme);
    } catch {
      // Ignore storage failures and keep the active runtime theme.
    }
  }, [theme]);

  useEffect(() => {
    syncViewportAttributes({
      isExpanded: runtimeIsExpanded,
      isFullscreen: runtimeIsFullscreen,
    });
  }, [runtimeIsExpanded, runtimeIsFullscreen]);

  useEffect(() => {
    viewport.expand.ifAvailable();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_FULLSCREEN_KEY, String(fullscreenEnabled));
    } catch {
      // Ignore storage failures and keep the active runtime preference.
    }

    const previousFullscreenEnabled = previousFullscreenEnabledRef.current;
    previousFullscreenEnabledRef.current = fullscreenEnabled;

    if (!fullscreenPreferenceInitializedRef.current) {
      fullscreenPreferenceInitializedRef.current = true;
      if (fullscreenEnabled) {
        viewport.expand.ifAvailable();
        return;
      }

      if (runtimeIsFullscreen) {
        viewport.exitFullscreen.ifAvailable();
      }
      return;
    }

    if (fullscreenEnabled && !previousFullscreenEnabled) {
      if (fullscreenSupported) {
        viewport.requestFullscreen.ifAvailable();
        return;
      }

      viewport.expand.ifAvailable();
      return;
    }

    if (!fullscreenEnabled && previousFullscreenEnabled && runtimeIsFullscreen) {
      viewport.exitFullscreen.ifAvailable();
    }
  }, [fullscreenEnabled, fullscreenSupported, runtimeIsFullscreen]);

  const setTheme = (nextTheme: StoreTheme) => {
    setThemeState(nextTheme);
  };

  const setFullscreenEnabled = (enabled: boolean) => {
    setFullscreenEnabledState(enabled);
  };

  return (
    <StoreUiPreferencesContext.Provider
      value={{
        theme,
        setTheme,
        fullscreenEnabled,
        setFullscreenEnabled,
        isExpanded: runtimeIsExpanded,
        isFullscreen: runtimeIsFullscreen,
        isFullscreenSupported: fullscreenSupported,
      }}
    >
      {children}
    </StoreUiPreferencesContext.Provider>
  );
}

export function useStoreUiPreferences(): StoreUiPreferencesContextValue {
  const context = useContext(StoreUiPreferencesContext);

  if (!context) {
    throw new Error('useStoreUiPreferences must be used within StoreUiPreferencesProvider');
  }

  return context;
}

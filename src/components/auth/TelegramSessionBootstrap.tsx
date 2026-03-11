'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useRouter } from 'next/navigation';
import { useRawInitData } from '@tma.js/sdk-react';

import { isTelegramMiniAppRuntime } from '@/features/telegram/navigation';

type TelegramSessionBootstrapStatus = 'idle' | 'pending' | 'ready' | 'failed';

const INIT_DATA_WAIT_TIMEOUT_MS = 2500;

interface TelegramSessionBootstrapContextValue {
  status: TelegramSessionBootstrapStatus;
  hasInitData: boolean;
  isTelegramRuntime: boolean;
  error: string | null;
  retry: () => void;
}

const TelegramSessionBootstrapContext =
  createContext<TelegramSessionBootstrapContextValue | null>(null);

function isMockInitData(rawInitData: string): boolean {
  const params = new URLSearchParams(rawInitData);
  return params.get('hash') === 'some-hash';
}

function TelegramSessionBootstrapEffect({
  onStateChange,
}: {
  onStateChange: (
    next: Pick<TelegramSessionBootstrapContextValue, 'status' | 'error' | 'hasInitData' | 'isTelegramRuntime'>,
  ) => void;
}) {
  const router = useRouter();
  const rawInitData = useRawInitData();
  const attemptedKeyRef = useRef<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const hasInitData = Boolean(rawInitData && !isMockInitData(rawInitData));
  const isTelegramRuntime = hasInitData || isTelegramMiniAppRuntime();

  useEffect(() => {
    onStateChange({
      status: hasInitData ? 'pending' : 'idle',
      error: null,
      hasInitData,
      isTelegramRuntime,
    });
  }, [hasInitData, isTelegramRuntime, onStateChange]);

  useEffect(() => {
    if (hasInitData || !isTelegramRuntime) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onStateChange({
        status: 'failed',
        error: 'init_data_unavailable',
        hasInitData: false,
        isTelegramRuntime: true,
      });
    }, INIT_DATA_WAIT_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [hasInitData, isTelegramRuntime, onStateChange, retryToken]);

  useEffect(() => {
    if (!rawInitData || isMockInitData(rawInitData)) {
      return;
    }

    const attemptKey = `${retryToken}:${rawInitData}`;
    if (attemptedKeyRef.current === attemptKey) {
      return;
    }

    attemptedKeyRef.current = attemptKey;
    onStateChange({
      status: 'pending',
      error: null,
      hasInitData: true,
      isTelegramRuntime: true,
    });

    void (async () => {
      try {
        const response = await fetch('/api/auth/telegram/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ initDataRaw: rawInitData }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string; reason?: string; details?: string[] }
            | null;
          const errorMessage = payload?.reason ?? payload?.error ?? `HTTP ${response.status}`;

          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[MainStore] Telegram session bootstrap failed',
              errorMessage,
              payload?.details ?? [],
            );
          }

          onStateChange({
            status: 'failed',
            error: errorMessage,
            hasInitData: true,
            isTelegramRuntime: true,
          });
          return;
        }

        onStateChange({
          status: 'ready',
          error: null,
          hasInitData: true,
          isTelegramRuntime: true,
        });
        router.refresh();
      } catch {
        onStateChange({
          status: 'failed',
          error: 'network_error',
          hasInitData: true,
          isTelegramRuntime: true,
        });
      }
    })();
  }, [onStateChange, rawInitData, retryToken, router]);

  useEffect(() => {
    const retryHandler = () => {
      setRetryToken((current) => current + 1);
      router.refresh();
    };

    window.addEventListener('ms:telegram-session-retry', retryHandler);
    return () => window.removeEventListener('ms:telegram-session-retry', retryHandler);
  }, [router]);

  return null;
}

export function TelegramSessionBootstrap({ children }: PropsWithChildren) {
  const [state, setState] = useState<TelegramSessionBootstrapContextValue>({
    status: 'idle',
    hasInitData: false,
    isTelegramRuntime: false,
    error: null,
    retry: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ms:telegram-session-retry'));
      }
    },
  });

  const contextValue = useMemo<TelegramSessionBootstrapContextValue>(
    () => ({
      ...state,
      retry: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('ms:telegram-session-retry'));
        }
      },
    }),
    [state],
  );

  const handleStateChange = useCallback(
    (
      next: Pick<
        TelegramSessionBootstrapContextValue,
        'status' | 'error' | 'hasInitData' | 'isTelegramRuntime'
      >,
    ) => {
      setState((current) => ({
        ...current,
        ...next,
      }));
    },
    [],
  );

  return (
    <TelegramSessionBootstrapContext.Provider value={contextValue}>
      <TelegramSessionBootstrapEffect onStateChange={handleStateChange} />
      {children}
    </TelegramSessionBootstrapContext.Provider>
  );
}

export function useTelegramSessionBootstrapState(): TelegramSessionBootstrapContextValue {
  const context = useContext(TelegramSessionBootstrapContext);

  if (!context) {
    return {
      status: 'idle',
      hasInitData: false,
      isTelegramRuntime: false,
      error: null,
      retry: () => undefined,
    };
  }

  return context;
}

export function useTelegramUnauthorizedMessage(defaultMessage: string): string {
  const { status, hasInitData, isTelegramRuntime } = useTelegramSessionBootstrapState();

  if (hasInitData && (status === 'pending' || status === 'ready')) {
    return 'Проверяем сессию Telegram. Повторите действие через пару секунд.';
  }

  if (isTelegramRuntime && status === 'failed') {
    return 'Не удалось подтвердить сессию Telegram. Обновите экран или откройте магазин заново из бота.';
  }

  if (isTelegramRuntime && status === 'idle') {
    return 'Ждём данные запуска Telegram. Повторите действие через пару секунд.';
  }

  return defaultMessage;
}

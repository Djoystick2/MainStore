import type { PaymentProvider } from '@/types/db';

import type { PaymentProviderAdapter } from './base';
import { sandboxPaymentProvider } from './sandbox';

type RuntimePaymentProvider = Exclude<PaymentProvider, 'legacy'>;

const REGISTERED_PAYMENT_PROVIDERS = [sandboxPaymentProvider] as const satisfies readonly PaymentProviderAdapter[];

const PAYMENT_PROVIDER_MAP = new Map<RuntimePaymentProvider, PaymentProviderAdapter>(
  REGISTERED_PAYMENT_PROVIDERS.map((adapter) => [adapter.provider, adapter]),
);

export function listRegisteredPaymentProviders(): RuntimePaymentProvider[] {
  return [...PAYMENT_PROVIDER_MAP.keys()];
}

export function isRegisteredPaymentProvider(value: string): value is RuntimePaymentProvider {
  return PAYMENT_PROVIDER_MAP.has(value as RuntimePaymentProvider);
}

export function getRegisteredPaymentProviderAdapter(
  provider: string | RuntimePaymentProvider,
): PaymentProviderAdapter | null {
  return PAYMENT_PROVIDER_MAP.get(provider as RuntimePaymentProvider) ?? null;
}

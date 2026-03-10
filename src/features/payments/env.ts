import type { PaymentProvider } from '@/types/db';

import { isRegisteredPaymentProvider, listRegisteredPaymentProviders } from './providers/registry';

type RuntimePaymentProvider = Exclude<PaymentProvider, 'legacy'>;

export interface ConfiguredPaymentProviderResult {
  ok: boolean;
  providerRaw: string | null;
  supportedProviders: RuntimePaymentProvider[];
  provider?: RuntimePaymentProvider;
}

export function resolveConfiguredPaymentProvider(): ConfiguredPaymentProviderResult {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase() ?? null;
  const supportedProviders = listRegisteredPaymentProviders();

  if (!raw) {
    return {
      ok: true,
      providerRaw: null,
      supportedProviders,
      provider: supportedProviders[0] ?? 'sandbox',
    };
  }

  if (isRegisteredPaymentProvider(raw)) {
    return {
      ok: true,
      providerRaw: raw,
      supportedProviders,
      provider: raw,
    };
  }

  return {
    ok: false,
    providerRaw: raw,
    supportedProviders,
  };
}

export function getRuntimePaymentProvider(): Exclude<PaymentProvider, 'legacy'> {
  const result = resolveConfiguredPaymentProvider();
  if (result.ok && result.provider) {
    return result.provider;
  }

  throw new Error(
    `Unsupported PAYMENT_PROVIDER: ${result.providerRaw ?? 'empty'}. Supported: ${result.supportedProviders.join(', ')}`,
  );
}

export function getPaymentWebhookSecretOptional(provider: RuntimePaymentProvider): string | null {
  switch (provider) {
    case 'sandbox':
      return process.env.PAYMENT_SANDBOX_WEBHOOK_SECRET?.trim() || null;
    default:
      return null;
  }
}

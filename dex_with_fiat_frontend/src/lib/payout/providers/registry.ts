import type { PayoutProvider, PayoutProviderName } from './types';
import { paystackProvider } from './paystackProvider';

const providers: Record<PayoutProviderName, PayoutProvider> = {
  paystack: paystackProvider,
};

export function getPayoutProvider(name?: string): PayoutProvider {
  const providerName = (name ||
    process.env.PAYOUT_PROVIDER ||
    'paystack') as PayoutProviderName;

  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unsupported payout provider: ${providerName}`);
  }

  return provider;
}

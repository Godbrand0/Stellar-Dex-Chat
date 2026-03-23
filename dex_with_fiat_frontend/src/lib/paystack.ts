import axios from 'axios';
import {
  convertCryptoToFiat as realConvertCryptoToFiat,
  convertFiatToCrypto as realConvertFiatToCrypto,
} from './cryptoPriceService';

// const PAYSTACK_BASE_URL = 'https://api.paystack.co'; // Unused but kept for reference

export interface Bank {
  id: number;
  name: string;
  code: string;
  longcode?: string;
  gateway?: string;
  pay_with_bank?: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountVerification {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export interface TransferRecipient {
  active: boolean;
  createdAt: string;
  currency: string;
  domain: string;
  id: number;
  integration: number;
  name: string;
  recipient_code: string;
  type: string;
  updatedAt: string;
  is_deleted: boolean;
  details: {
    authorization_code: string | null;
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
  };
}

export interface Transfer {
  reference: string;
  integration: number;
  domain: string;
  amount: number;
  currency: string;
  source: string;
  reason: string;
  recipient: number;
  status: string;
  transfer_code: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

class PaystackService {
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: Record<string, unknown>,
  ) {
    try {
      const response = await axios({
        method,
        url: endpoint,
        data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          'Paystack API Error:',
          error.response?.data || error.message,
        );
        throw new Error(
          error.response?.data?.message || 'Paystack API request failed',
        );
      } else {
        console.error('Paystack API Error:', error);
        throw new Error('Paystack API request failed');
      }
    }
  }

  async listBanks(): Promise<Bank[]> {
    const response = await this.makeRequest('/api/banks');
    return response.data || [];
  }

  async verifyAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<AccountVerification> {
    const response = await this.makeRequest('/api/verify-account', 'POST', {
      accountNumber,
      bankCode,
    });

    if (!response.success) {
      throw new Error(response.message || 'Account verification failed');
    }

    return response.data;
  }

  async createRecipient(
    bankCode: string,
    accountNumber: string,
    accountName: string,
  ): Promise<string> {
    const response = await this.makeRequest('/api/create-recipient', 'POST', {
      type: 'nuban',
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to create recipient');
    }

    return response.data.recipient_code;
  }

  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reason: string = 'Crypto withdrawal',
  ): Promise<Transfer> {
    const response = await this.makeRequest('/api/initiate-transfer', 'POST', {
      source: 'balance',
      reason,
      amount: amount, // Amount in Naira (API will convert to kobo)
      recipient: recipientCode,
      reference: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to initiate transfer');
    }

    return response.data;
  }

  // Convert crypto amount to fiat based on real-time rates
  async convertCryptoToFiat(
    tokenSymbol: string,
    amount: number,
    fiatCurrency: string = 'NGN',
  ): Promise<number> {
    try {
      // Use real crypto price service
      return await realConvertCryptoToFiat(tokenSymbol, amount, fiatCurrency);
    } catch (error) {
      console.error('Error getting real-time prices, using fallback:', error);

      // Fallback to static rates if the service is unavailable
      const fallbackRates: Record<string, Record<string, number>> = {
        ETH: { NGN: 6500000, USD: 4000, EUR: 3700, GBP: 3200 },
        STRK: { NGN: 1300, USD: 0.8, EUR: 0.74, GBP: 0.64 },
        USDC: { NGN: 1650, USD: 1, EUR: 0.92, GBP: 0.8 },
        USDT: { NGN: 1650, USD: 1, EUR: 0.92, GBP: 0.8 },
      };

      const rate =
        fallbackRates[tokenSymbol.toUpperCase()]?.[
          fiatCurrency.toUpperCase()
        ] || 0;
      return amount * rate;
    }
  }

  async convertFiatToCrypto(
    fiatAmount: number,
    tokenSymbol: string,
    fiatCurrency: string = 'NGN',
  ): Promise<number> {
    try {
      // Use real crypto price service
      return await realConvertFiatToCrypto(
        fiatAmount,
        tokenSymbol,
        fiatCurrency,
      );
    } catch (error) {
      console.error(
        'Error getting real-time prices for fiat conversion, using fallback:',
        error,
      );

      // Fallback calculation
      const fiatValue = await this.convertCryptoToFiat(
        tokenSymbol,
        1,
        fiatCurrency,
      );
      return fiatAmount / fiatValue;
    }
  }
}

export const paystackService = new PaystackService();

// Export convenience functions
export const listBanks = () => paystackService.listBanks();
export const verifyAccount = (accountNumber: string, bankCode: string) =>
  paystackService.verifyAccount(accountNumber, bankCode);
export const createRecipient = (
  bankCode: string,
  accountNumber: string,
  accountName: string,
) => paystackService.createRecipient(bankCode, accountNumber, accountName);
export const initiateTransfer = (
  amount: number,
  recipientCode: string,
  reason?: string,
) => paystackService.initiateTransfer(amount, recipientCode, reason);
export const convertCryptoToFiat = (
  tokenSymbol: string,
  amount: number,
  fiatCurrency?: string,
) => paystackService.convertCryptoToFiat(tokenSymbol, amount, fiatCurrency);
export const convertFiatToCrypto = (
  fiatAmount: number,
  tokenSymbol: string,
  fiatCurrency?: string,
) => paystackService.convertFiatToCrypto(fiatAmount, tokenSymbol, fiatCurrency);

export default paystackService;

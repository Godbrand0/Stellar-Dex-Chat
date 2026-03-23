// Types for the DEX Chat Interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    transactionData?: TransactionData;
    suggestedActions?: SuggestedAction[];
    confirmationRequired?: boolean;
    autoTriggerTransaction?: boolean;
    conversationCount?: number;
  };
}

// Chat session types for history
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastUpdated: Date;
  walletAddress?: string;
}

export interface ChatHistoryState {
  currentSessionId: string | null;
  sessions: ChatSession[];
}

export interface TransactionData {
  type: 'fiat_conversion';
  tokenIn?: string;
  amountIn?: string;
  fiatAmount?: string;
  fiatCurrency?: string;
  recipient?: string;
  transactionId?: string;
  txHash?: string; // Transaction hash for completed transactions
}

export interface SuggestedAction {
  id: string;
  type:
    | 'confirm_fiat'
    | 'connect_wallet'
    | 'approve_token'
    | 'check_portfolio'
    | 'market_rates'
    | 'learn_more'
    | 'cancel';
  label: string;
  data?: Record<string, unknown>;
  priority?: boolean;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  logoUrl?: string;
}

export interface UserPreferences {
  defaultSlippage: number;
  preferredTokens: string[];
  fiatCurrency: string;
  autoConfirmTransactions: boolean;
}

export interface AIAnalysisResult {
  intent:
    | 'fiat_conversion'
    | 'query'
    | 'portfolio'
    | 'technical_support'
    | 'unknown';
  confidence: number;
  extractedData: Partial<TransactionData>;
  requiredQuestions: string[];
  suggestedResponse: string;
}

// Paystack Types
export interface BankAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferCode?: string; // Paystack transfer code
}

export interface PaystackTransfer {
  amount: number;
  recipientCode: string;
  reason: string;
  reference: string;
}

// Stellar Wallet
export interface StellarWalletConnection {
  address: string;
  publicKey: string;
  isConnected: boolean;
  network?: string;
  networkUrl?: string;
}

export interface FiatTransactionParams {
  token: string;
  amount: string;
  fiatAmount: string;
  transactionId: string;
  bankAccount?: BankAccount;
}

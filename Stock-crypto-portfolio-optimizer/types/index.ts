// Core Crypto Types
export interface Cryptocurrency {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_30d: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: Roi | null;
  last_updated: string;
  sparkline_in_7d: SparklineData;
  image: string;
  market_cap_rank: number;
  price_change_24h: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  price_change_percentage_1y_in_currency: number;
  price_change_24h_in_currency: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  total_volume_24h: number;
  total_volume_24h_in_currency: number;
}

export interface Roi {
  times: number;
  currency: string;
  percentage: number;
}

export interface SparklineData {
  price: number[];
}

// Transaction Types
export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  cryptocurrency: string;
  timestamp: Date;
  status: TransactionStatus;
  fee: number;
  signature: string;
  blockNumber: number;
  confirmations: number;
  metadata?: TransactionMetadata;
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled';

export interface TransactionMetadata {
  merchantId?: string;
  orderId?: string;
  description?: string;
  tags?: string[];
  category?: string;
}

// AI Recommendation Types
export interface CryptoRecommendation {
  cryptocurrency: Cryptocurrency;
  recommendationType: RecommendationType;
  confidence: number;
  reasoning: string[];
  riskLevel: RiskLevel;
  expectedReturn: number;
  timeHorizon: TimeHorizon;
  alternatives: Cryptocurrency[];
  timestamp: Date;
}

export type RecommendationType = 'spend' | 'invest' | 'hold' | 'avoid';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type TimeHorizon = 'short' | 'medium' | 'long';

// User Types
export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  preferences: UserPreferences;
  portfolio: Portfolio;
  transactionHistory: Transaction[];
  createdAt: Date;
  lastActive: Date;
}

export interface UserPreferences {
  riskTolerance: RiskLevel;
  preferredCryptocurrencies: string[];
  notificationSettings: NotificationSettings;
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  transactionAlerts: boolean;
  priceAlerts: boolean;
  recommendationAlerts: boolean;
}

// Portfolio Types
export interface Portfolio {
  id: string;
  userId: string;
  totalValue: number;
  totalValueChange24h: number;
  totalValueChangePercentage24h: number;
  holdings: Holding[];
  performance: PortfolioPerformance;
  lastUpdated: Date;
}

export interface Holding {
  cryptocurrency: Cryptocurrency;
  amount: number;
  value: number;
  valueChange24h: number;
  valueChangePercentage24h: number;
  averageBuyPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface PortfolioPerformance {
  totalReturn: number;
  totalReturnPercentage: number;
  dailyReturn: number;
  dailyReturnPercentage: number;
  weeklyReturn: number;
  weeklyReturnPercentage: number;
  monthlyReturn: number;
  monthlyReturnPercentage: number;
  yearlyReturn: number;
  yearlyReturnPercentage: number;
}

// Merchant Types
export interface Merchant {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website?: string;
  walletAddress: string;
  acceptedCryptocurrencies: string[];
  settings: MerchantSettings;
  transactions: Transaction[];
  analytics: MerchantAnalytics;
  createdAt: Date;
}

export interface MerchantSettings {
  autoConvert: boolean;
  conversionCurrency: string;
  minimumTransactionAmount: number;
  maximumTransactionAmount: number;
  webhookUrl?: string;
  notificationSettings: NotificationSettings;
}

export interface MerchantAnalytics {
  totalTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  mostPopularCryptocurrency: string;
  conversionRate: number;
  customerCount: number;
  revenueByCryptocurrency: Record<string, number>;
}

// Market Data Types
export interface MarketData {
  totalMarketCap: number;
  totalVolume: number;
  marketCapChangePercentage24h: number;
  volumeChangePercentage24h: number;
  marketDominance: Record<string, number>;
  trendingCryptocurrencies: Cryptocurrency[];
  fearGreedIndex: number;
  lastUpdated: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface PriceUpdateMessage extends WebSocketMessage {
  type: 'price_update';
  data: {
    cryptocurrency: string;
    price: number;
    change24h: number;
    changePercentage24h: number;
  };
}

export interface TransactionUpdateMessage extends WebSocketMessage {
  type: 'transaction_update';
  data: Transaction;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Configuration Types
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  solana: {
    rpcUrl: string;
    network: 'mainnet' | 'devnet' | 'testnet';
  };
  features: {
    aiRecommendations: boolean;
    merchantTools: boolean;
    portfolioTracking: boolean;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
}

// Utility Types
export type SortDirection = 'asc' | 'desc';
export type SortField = 'price' | 'market_cap' | 'volume' | 'change_24h' | 'name';

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

export interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  categories?: string[];
  riskLevels?: RiskLevel[];
}

export interface SearchOptions {
  query: string;
  filters?: FilterOptions;
  sort?: SortOptions;
  page?: number;
  limit?: number;
} 
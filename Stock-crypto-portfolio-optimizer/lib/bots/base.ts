/**
 * Base Bot Architecture
 * 
 * Defines core interfaces and base classes for all data-fetching bots
 */

export type BotCategory = 
  | 'price'
  | 'liquidity'
  | 'onchain'
  | 'derivatives'
  | 'news'
  | 'regulatory'
  | 'anomaly'
  | 'whale'
  | 'tokenomics'
  | 'stablecoin';

export type Severity = 'low' | 'medium' | 'high';
export type Confidence = 'low' | 'medium' | 'high' | 'very_high';

/**
 * Core metrics that can influence RAMHD dominance scoring
 * These are PRIMARY inputs to the recommendation algorithm
 */
export interface CoreMetrics {
  price?: number;
  volatility?: number;
  liquidity?: number;
  spread?: number;
  depth?: number;
  volume?: number;
  fees?: number;
  congestion?: number;
  failureRate?: number;
}

/**
 * Secondary signals that CANNOT directly influence core scoring
 * These are used ONLY for:
 * - Event-driven tail-risk adjustment
 * - Pareto exclusion (hard blocks)
 * - Explainability (why a token was penalized)
 */
export interface SecondarySignals {
  eventFlags?: EventFlag[];
  sentimentScore?: number;
  whaleActivity?: WhaleActivity[];
  regulatoryRisk?: RegulatoryRisk;
  anomalyDetected?: boolean;
  newsImpact?: NewsImpact;
}

/**
 * Event flag for binary exclusion/gating
 */
export interface EventFlag {
  type: 'exploit' | 'regulatory' | 'depeg' | 'delisting' | 'outage' | 'insolvency' | 'other';
  severity: Severity;
  confirmed: boolean;
  affectedAssets: string[];
  timestamp: Date;
  source: string;
  description: string;
}

/**
 * Whale activity signal
 */
export interface WhaleActivity {
  type: 'inflow' | 'outflow' | 'large_transfer';
  amount: number;
  amountUsd: number;
  asset: string;
  timestamp: Date;
  source: string;
}

/**
 * Regulatory risk assessment
 */
export interface RegulatoryRisk {
  level: 'none' | 'low' | 'medium' | 'high' | 'blocked';
  reasons: string[];
  affectedAssets: string[];
  hardBlock: boolean; // If true, asset MUST be excluded
}

/**
 * News impact assessment
 */
export interface NewsImpact {
  sentiment: 'positive' | 'neutral' | 'negative';
  relevance: number; // 0-1
  keywords: string[];
  summary: string;
  source: string;
  timestamp: Date;
}

/**
 * Standardized bot output
 */
export interface BotOutput {
  botId: string;
  botCategory: BotCategory;
  timestamp: Date;
  horizon?: string; // e.g., '1h', '24h', '7d'
  assets: string[]; // Asset symbols this output applies to
  chain?: string;
  venue?: string;
  
  // Confidence in this output
  confidence: Confidence;
  
  // Core metrics (primary inputs)
  coreMetrics: CoreMetrics;
  
  // Secondary signals (gating/explainability only)
  secondarySignals: SecondarySignals;
  
  // Raw data for debugging/audit
  rawData?: any;
  
  // Errors/warnings
  errors?: string[];
  warnings?: string[];
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  costTier: 'free' | 'paid' | 'free_and_paid' | 'internal';
  roles: {
    core_pricing: boolean;
    pareto_constraints: boolean;
    contextual_bandit: boolean;
    secondary_signal: boolean;
  };
  config: {
    baseUrl?: string;
    apiKeyEnvVar?: string;
    rateLimit?: number;
    rateLimitWindow?: string;
    scrapingEnabled?: boolean;
  };
}

/**
 * Base Bot class
 * All bots must extend this class
 */
export abstract class BaseBot {
  protected botId: string;
  protected botCategory: BotCategory;
  protected dataSources: DataSourceConfig[];
  protected cache: Map<string, { data: any; timestamp: number }> = new Map();
  protected cacheTimeout: number = 5 * 60 * 1000; // 5 minutes default

  constructor(botId: string, botCategory: BotCategory, dataSources: DataSourceConfig[]) {
    this.botId = botId;
    this.botCategory = botCategory;
    this.dataSources = dataSources.filter(ds => ds.enabled);
  }

  /**
   * Fetch data from all configured sources
   * Must be implemented by each bot
   */
  abstract fetch(assets: string[], options?: any): Promise<BotOutput>;

  /**
   * Validate that output follows secondary signal gating rules
   */
  protected validateOutput(output: BotOutput): void {
    // Check that secondary signals are properly separated
    const hasSecondarySignals = Object.keys(output.secondarySignals).length > 0;
    
    if (hasSecondarySignals) {
      // Ensure secondary signals don't leak into core metrics
      // This is a type-level guarantee, but we can add runtime checks
      
      // If this bot is marked as secondary_signal only, it should NOT populate core metrics
      const isSecondaryOnly = this.dataSources.every(ds => 
        ds.roles.secondary_signal && 
        !ds.roles.core_pricing && 
        !ds.roles.pareto_constraints
      );
      
      if (isSecondaryOnly && Object.keys(output.coreMetrics).length > 0) {
        throw new Error(
          `Bot ${this.botId} is marked as secondary_signal only but populated core metrics. ` +
          `This violates secondary signal gating rules.`
        );
      }
    }
  }

  /**
   * Get cached data
   */
  protected getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data
   */
  protected setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get API key from environment
   */
  protected getApiKey(envVar: string): string | undefined {
    return process.env[envVar];
  }

  /**
   * Check if data source is enabled
   */
  protected isSourceEnabled(sourceId: string): boolean {
    return this.dataSources.some(ds => ds.id === sourceId && ds.enabled);
  }

  /**
   * Get enabled sources by category
   */
  protected getEnabledSources(category?: string): DataSourceConfig[] {
    if (!category) {
      return this.dataSources;
    }
    return this.dataSources.filter(ds => ds.category === category);
  }
}

/**
 * Rate limiter utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  async checkLimit(sourceId: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(sourceId) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(sourceId, validRequests);
    return true;
  }

  async waitForSlot(sourceId: string, limit: number, windowMs: number): Promise<void> {
    while (!(await this.checkLimit(sourceId, limit, windowMs))) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter();


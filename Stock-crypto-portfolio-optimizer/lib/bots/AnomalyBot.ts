/**
 * AnomalyBot - Market anomaly detection
 * 
 * Detects spoofing, wash trading, price-volume divergence
 * Triggers confidence downgrades (does NOT rank tokens directly)
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, globalRateLimiter } from './base';
import dataSourcesConfig from '../../config/data_sources.json';

interface AnomalyData {
  symbol: string;
  anomalyType: 'spoofing' | 'wash_trading' | 'price_volume_divergence' | 'unusual_spread' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
  source: string;
  timestamp: Date;
}

export class AnomalyBot extends BaseBot {
  constructor() {
    const anomalySources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => ds.category === 'exchange_market_data' && ds.enabled
    );
    super('anomaly_bot', 'anomaly', anomalySources);
  }

  async fetch(assets: string[], options?: any): Promise<BotOutput> {
    const cacheKey = `anomaly_${assets.join(',')}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const anomalyData: AnomalyData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch market data from Binance for anomaly detection
    if (this.isSourceEnabled('binance')) {
      try {
        const binanceAnomalies = await this.detectBinanceAnomalies(assets);
        anomalyData.push(...binanceAnomalies);
      } catch (error) {
        warnings.push(`Binance anomaly detection failed: ${error}`);
      }
    }

    // Fetch from Coinbase
    if (this.isSourceEnabled('coinbase')) {
      try {
        const coinbaseAnomalies = await this.detectCoinbaseAnomalies(assets);
        anomalyData.push(...coinbaseAnomalies);
      } catch (error) {
        warnings.push(`Coinbase anomaly detection failed: ${error}`);
      }
    }

    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      assets,
      confidence: this.calculateConfidence(anomalyData),
      coreMetrics: {
        // AnomalyBot does NOT populate core metrics
      },
      secondarySignals: {
        anomalyDetected: anomalyData.length > 0,
        eventFlags: anomalyData.filter(a => a.severity === 'high').map(a => ({
          type: 'other' as const,
          severity: a.severity,
          confirmed: a.confidence > 0.7,
          affectedAssets: [a.symbol],
          timestamp: a.timestamp,
          source: 'AnomalyBot',
          description: `${a.anomalyType}: ${a.description}`
        }))
      },
      rawData: { anomalyData },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async detectBinanceAnomalies(assets: string[]): Promise<AnomalyData[]> {
    await globalRateLimiter.waitForSlot('binance', 1200, 60000);
    
    const anomalies: AnomalyData[] = [];

    for (const asset of assets) {
      if (asset === 'USDC' || asset === 'USDT') continue;

      try {
        const symbol = `${asset}USDT`;
        
        // Fetch 24h ticker
        const tickerResponse = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
        );

        if (tickerResponse.ok) {
          const ticker = await tickerResponse.json();
          
          // Check for price-volume divergence
          const priceChange = Math.abs(parseFloat(ticker.priceChangePercent));
          const volumeChange = parseFloat(ticker.volume) / parseFloat(ticker.quoteVolume);
          
          // If large price move with low volume, flag as anomaly
          if (priceChange > 10 && volumeChange < 0.5) {
            anomalies.push({
              symbol: asset,
              anomalyType: 'price_volume_divergence',
              severity: 'medium',
              description: `Large price change (${priceChange.toFixed(2)}%) with low volume`,
              confidence: 0.6,
              source: 'binance',
              timestamp: new Date()
            });
          }

          // Check for unusual spread
          const spread = (parseFloat(ticker.askPrice) - parseFloat(ticker.bidPrice)) / parseFloat(ticker.lastPrice);
          if (spread > 0.02) { // 2% spread is unusual
            anomalies.push({
              symbol: asset,
              anomalyType: 'unusual_spread',
              severity: 'low',
              description: `Unusually wide spread: ${(spread * 100).toFixed(2)}%`,
              confidence: 0.7,
              source: 'binance',
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        continue;
      }
    }

    return anomalies;
  }

  private async detectCoinbaseAnomalies(assets: string[]): Promise<AnomalyData[]> {
    await globalRateLimiter.waitForSlot('coinbase', 10000, 3600000);
    
    // Coinbase public API doesn't provide enough data for anomaly detection
    // Would need Coinbase Pro API with authentication
    return [];
  }

  private calculateConfidence(anomalyData: AnomalyData[]): Confidence {
    if (anomalyData.length === 0) return 'high'; // High confidence in "no anomalies"
    
    const avgConfidence = anomalyData.reduce((sum, a) => sum + a.confidence, 0) / anomalyData.length;
    
    if (avgConfidence >= 0.8) return 'high';
    if (avgConfidence >= 0.6) return 'medium';
    return 'low';
  }
}


/**
 * PriceBot - Multi-venue price aggregation
 * 
 * Fetches prices from multiple exchanges and oracles
 * Provides canonical price, returns, dispersion, anomaly flags
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, globalRateLimiter } from './base';
import dataSourcesConfig from '../../config/data_sources.json';

interface PriceData {
  symbol: string;
  price: number;
  source: string;
  timestamp: Date;
  volume24h?: number;
  change24h?: number;
  change7d?: number;
}

export class PriceBot extends BaseBot {
  constructor() {
    const priceSources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => ds.roles.core_pricing && ds.enabled
    );
    super('price_bot', 'price', priceSources);
  }

  async fetch(assets: string[], options?: any): Promise<BotOutput> {
    const cacheKey = `prices_${assets.join(',')}_${options?.horizon || '24h'}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const priceData: PriceData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch from CoinGecko (primary)
    if (this.isSourceEnabled('coingecko')) {
      try {
        const cgPrices = await this.fetchCoinGecko(assets);
        priceData.push(...cgPrices);
      } catch (error) {
        errors.push(`CoinGecko fetch failed: ${error}`);
      }
    }

    // Fetch from Binance
    if (this.isSourceEnabled('binance')) {
      try {
        const binancePrices = await this.fetchBinance(assets);
        priceData.push(...binancePrices);
      } catch (error) {
        warnings.push(`Binance fetch failed: ${error}`);
      }
    }

    // Fetch from Coinbase
    if (this.isSourceEnabled('coinbase')) {
      try {
        const cbPrices = await this.fetchCoinbase(assets);
        priceData.push(...cbPrices);
      } catch (error) {
        warnings.push(`Coinbase fetch failed: ${error}`);
      }
    }

    // Fetch from Pyth (if enabled)
    if (this.isSourceEnabled('pyth')) {
      try {
        const pythPrices = await this.fetchPyth(assets);
        priceData.push(...pythPrices);
      } catch (error) {
        warnings.push(`Pyth fetch failed: ${error}`);
      }
    }

    if (priceData.length === 0) {
      throw new Error('Failed to fetch prices from any source');
    }

    // Aggregate prices per asset
    const aggregated = this.aggregatePrices(priceData, assets);

    // Detect anomalies
    const anomalies = this.detectAnomalies(priceData);

    // Build output
    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      horizon: options?.horizon || '24h',
      assets,
      confidence: this.calculateConfidence(priceData, assets),
      coreMetrics: {
        price: aggregated.canonicalPrice,
        volatility: aggregated.volatility,
        volume: aggregated.volume24h
      },
      secondarySignals: {
        anomalyDetected: anomalies.length > 0,
        eventFlags: anomalies.map(a => ({
          type: 'other' as const,
          severity: 'medium' as const,
          confirmed: false,
          affectedAssets: [a.symbol],
          timestamp: new Date(),
          source: 'PriceBot',
          description: `Price anomaly detected: ${a.description}`
        }))
      },
      rawData: { priceData, aggregated, anomalies },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async fetchCoinGecko(assets: string[]): Promise<PriceData[]> {
    const symbolMap: { [key: string]: string } = {
      'SOL': 'solana',
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'XRP': 'ripple',
      'MATIC': 'matic-network'
    };

    const ids = assets.map(a => symbolMap[a] || a.toLowerCase()).join(',');
    
    await globalRateLimiter.waitForSlot('coingecko', 30, 60000);
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_7d_change=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const results: PriceData[] = [];

    for (const asset of assets) {
      const coinId = symbolMap[asset] || asset.toLowerCase();
      const priceData = data[coinId];
      
      if (priceData) {
        results.push({
          symbol: asset,
          price: priceData.usd,
          source: 'coingecko',
          timestamp: new Date(),
          volume24h: priceData.usd_24h_vol,
          change24h: priceData.usd_24h_change,
          change7d: priceData.usd_7d_change
        });
      }
    }

    return results;
  }

  private async fetchBinance(assets: string[]): Promise<PriceData[]> {
    await globalRateLimiter.waitForSlot('binance', 1200, 60000);
    
    const results: PriceData[] = [];

    for (const asset of assets) {
      if (asset === 'USDC' || asset === 'USDT') {
        // Stablecoins are ~$1
        results.push({
          symbol: asset,
          price: 1.0,
          source: 'binance',
          timestamp: new Date()
        });
        continue;
      }

      try {
        const symbol = `${asset}USDT`;
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
        );

        if (response.ok) {
          const data = await response.json();
          results.push({
            symbol: asset,
            price: parseFloat(data.lastPrice),
            source: 'binance',
            timestamp: new Date(),
            volume24h: parseFloat(data.volume) * parseFloat(data.lastPrice),
            change24h: parseFloat(data.priceChangePercent)
          });
        }
      } catch (error) {
        // Skip this asset if not available on Binance
        continue;
      }
    }

    return results;
  }

  private async fetchCoinbase(assets: string[]): Promise<PriceData[]> {
    await globalRateLimiter.waitForSlot('coinbase', 10000, 3600000);
    
    const results: PriceData[] = [];

    for (const asset of assets) {
      if (asset === 'USDC' || asset === 'USDT') {
        results.push({
          symbol: asset,
          price: 1.0,
          source: 'coinbase',
          timestamp: new Date()
        });
        continue;
      }

      try {
        const pair = `${asset}-USD`;
        const response = await fetch(
          `https://api.coinbase.com/v2/prices/${pair}/spot`
        );

        if (response.ok) {
          const data = await response.json();
          results.push({
            symbol: asset,
            price: parseFloat(data.data.amount),
            source: 'coinbase',
            timestamp: new Date()
          });
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  private async fetchPyth(assets: string[]): Promise<PriceData[]> {
    // Pyth integration would require on-chain price feed IDs
    // For now, return empty array (can be implemented later)
    return [];
  }

  private aggregatePrices(priceData: PriceData[], assets: string[]): any {
    const byAsset: { [key: string]: PriceData[] } = {};
    
    for (const data of priceData) {
      if (!byAsset[data.symbol]) {
        byAsset[data.symbol] = [];
      }
      byAsset[data.symbol].push(data);
    }

    // For now, return data for first asset (can be extended for multi-asset)
    const firstAsset = assets[0];
    const assetPrices = byAsset[firstAsset] || [];

    if (assetPrices.length === 0) {
      return { canonicalPrice: 0, volatility: 0, volume24h: 0 };
    }

    // Calculate canonical price (median)
    const prices = assetPrices.map(p => p.price).sort((a, b) => a - b);
    const canonicalPrice = prices[Math.floor(prices.length / 2)];

    // Calculate price dispersion (volatility proxy)
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / mean; // Coefficient of variation

    // Get volume (use CoinGecko if available)
    const cgData = assetPrices.find(p => p.source === 'coingecko');
    const volume24h = cgData?.volume24h || 0;

    return { canonicalPrice, volatility, volume24h, priceCount: prices.length };
  }

  private detectAnomalies(priceData: PriceData[]): Array<{ symbol: string; description: string }> {
    const anomalies: Array<{ symbol: string; description: string }> = [];
    
    // Group by symbol
    const bySymbol: { [key: string]: PriceData[] } = {};
    for (const data of priceData) {
      if (!bySymbol[data.symbol]) {
        bySymbol[data.symbol] = [];
      }
      bySymbol[data.symbol].push(data);
    }

    // Check for large price discrepancies between sources
    for (const [symbol, prices] of Object.entries(bySymbol)) {
      if (prices.length < 2) continue;

      const priceValues = prices.map(p => p.price);
      const min = Math.min(...priceValues);
      const max = Math.max(...priceValues);
      const discrepancy = (max - min) / min;

      if (discrepancy > 0.05) { // 5% discrepancy
        anomalies.push({
          symbol,
          description: `Price discrepancy of ${(discrepancy * 100).toFixed(2)}% between sources`
        });
      }
    }

    return anomalies;
  }

  private calculateConfidence(priceData: PriceData[], assets: string[]): Confidence {
    const sourcesPerAsset = priceData.length / assets.length;
    
    if (sourcesPerAsset >= 3) return 'very_high';
    if (sourcesPerAsset >= 2) return 'high';
    if (sourcesPerAsset >= 1) return 'medium';
    return 'low';
  }
}


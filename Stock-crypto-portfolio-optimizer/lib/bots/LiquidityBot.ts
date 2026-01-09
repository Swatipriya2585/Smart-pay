/**
 * LiquidityBot - Liquidity and order book analysis
 * 
 * Fetches order book depth, spreads, and slippage estimates
 * Provides liquidity feasibility checks for transaction sizes
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, globalRateLimiter } from './base';
import dataSourcesConfig from '../../config/data_sources.json';

interface LiquidityData {
  symbol: string;
  spread: number; // Bid-ask spread as percentage
  depth: number; // Order book depth in USD
  slippageEstimate: number; // Expected slippage for given size
  source: string;
  timestamp: Date;
}

export class LiquidityBot extends BaseBot {
  constructor() {
    const liquiditySources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => (ds.category === 'exchange_market_data' || ds.category === 'liquidity_microstructure') && ds.enabled
    );
    super('liquidity_bot', 'liquidity', liquiditySources);
  }

  async fetch(assets: string[], options?: { transactionSize?: number }): Promise<BotOutput> {
    const cacheKey = `liquidity_${assets.join(',')}_${options?.transactionSize || 0}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const liquidityData: LiquidityData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch from Binance order books
    if (this.isSourceEnabled('binance')) {
      try {
        const binanceData = await this.fetchBinanceLiquidity(assets, options?.transactionSize);
        liquidityData.push(...binanceData);
      } catch (error) {
        warnings.push(`Binance liquidity fetch failed: ${error}`);
      }
    }

    // Fetch from Coinbase order books
    if (this.isSourceEnabled('coinbase')) {
      try {
        const coinbaseData = await this.fetchCoinbaseLiquidity(assets, options?.transactionSize);
        liquidityData.push(...coinbaseData);
      } catch (error) {
        warnings.push(`Coinbase liquidity fetch failed: ${error}`);
      }
    }

    if (liquidityData.length === 0) {
      // Fallback: use estimated liquidity based on volume
      liquidityData.push(...this.estimateLiquidity(assets));
    }

    // Aggregate liquidity metrics
    const aggregated = this.aggregateLiquidity(liquidityData, assets);

    // Check feasibility for transaction size
    const feasible = this.checkFeasibility(aggregated, options?.transactionSize || 0);

    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      assets,
      confidence: this.calculateConfidence(liquidityData, assets),
      coreMetrics: {
        liquidity: aggregated.depth,
        spread: aggregated.spread,
        // Slippage is a core execution risk metric
      },
      secondarySignals: {
        eventFlags: feasible ? [] : [{
          type: 'other' as const,
          severity: 'medium' as const,
          confirmed: true,
          affectedAssets: assets,
          timestamp: new Date(),
          source: 'LiquidityBot',
          description: `Insufficient liquidity for transaction size $${options?.transactionSize || 0}`
        }]
      },
      rawData: { liquidityData, aggregated, feasible },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async fetchBinanceLiquidity(assets: string[], transactionSize?: number): Promise<LiquidityData[]> {
    await globalRateLimiter.waitForSlot('binance', 1200, 60000);
    
    const results: LiquidityData[] = [];

    for (const asset of assets) {
      if (asset === 'USDC' || asset === 'USDT') {
        // Stablecoins have minimal spread
        results.push({
          symbol: asset,
          spread: 0.001, // 0.1%
          depth: 10000000, // $10M depth estimate
          slippageEstimate: 0.001,
          source: 'binance',
          timestamp: new Date()
        });
        continue;
      }

      try {
        const symbol = `${asset}USDT`;
        const response = await fetch(
          `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`
        );

        if (response.ok) {
          const data = await response.json();
          
          // Calculate spread
          const bestBid = parseFloat(data.bids[0]?.[0] || 0);
          const bestAsk = parseFloat(data.asks[0]?.[0] || 0);
          const midPrice = (bestBid + bestAsk) / 2;
          const spread = midPrice > 0 ? (bestAsk - bestBid) / midPrice : 0;

          // Calculate depth (sum of first 10 levels)
          const bidDepth = data.bids.slice(0, 10).reduce((sum: number, level: any) => {
            return sum + (parseFloat(level[0]) * parseFloat(level[1]));
          }, 0);
          const askDepth = data.asks.slice(0, 10).reduce((sum: number, level: any) => {
            return sum + (parseFloat(level[0]) * parseFloat(level[1]));
          }, 0);
          const depth = (bidDepth + askDepth) / 2;

          // Estimate slippage for transaction size
          const slippageEstimate = transactionSize 
            ? this.calculateSlippage(data.asks, transactionSize, midPrice)
            : spread;

          results.push({
            symbol: asset,
            spread,
            depth,
            slippageEstimate,
            source: 'binance',
            timestamp: new Date()
          });
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  private async fetchCoinbaseLiquidity(assets: string[], transactionSize?: number): Promise<LiquidityData[]> {
    await globalRateLimiter.waitForSlot('coinbase', 10000, 3600000);
    
    const results: LiquidityData[] = [];

    for (const asset of assets) {
      if (asset === 'USDC' || asset === 'USDT') {
        results.push({
          symbol: asset,
          spread: 0.001,
          depth: 10000000,
          slippageEstimate: 0.001,
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
          // Coinbase doesn't provide order book via public API
          // Use estimated spread based on asset type
          const spread = this.estimateSpread(asset);
          
          results.push({
            symbol: asset,
            spread,
            depth: 1000000, // Estimate $1M depth
            slippageEstimate: spread * 1.5,
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

  private estimateLiquidity(assets: string[]): LiquidityData[] {
    // Fallback estimates based on asset type
    return assets.map(asset => {
      const isStablecoin = asset === 'USDC' || asset === 'USDT';
      const isMajor = ['BTC', 'ETH', 'SOL', 'BNB'].includes(asset);

      return {
        symbol: asset,
        spread: isStablecoin ? 0.001 : isMajor ? 0.005 : 0.01,
        depth: isStablecoin ? 10000000 : isMajor ? 5000000 : 1000000,
        slippageEstimate: isStablecoin ? 0.001 : isMajor ? 0.01 : 0.02,
        source: 'estimated',
        timestamp: new Date()
      };
    });
  }

  private calculateSlippage(orderBook: any[], transactionSize: number, midPrice: number): number {
    let remaining = transactionSize;
    let totalCost = 0;

    for (const level of orderBook) {
      const price = parseFloat(level[0]);
      const quantity = parseFloat(level[1]);
      const levelValue = price * quantity;

      if (remaining <= levelValue) {
        totalCost += remaining;
        remaining = 0;
        break;
      } else {
        totalCost += levelValue;
        remaining -= levelValue;
      }
    }

    if (remaining > 0) {
      // Not enough liquidity
      return 0.1; // 10% slippage estimate
    }

    const avgPrice = totalCost / transactionSize;
    return Math.abs(avgPrice - midPrice) / midPrice;
  }

  private estimateSpread(asset: string): number {
    const spreadMap: { [key: string]: number } = {
      'BTC': 0.002,
      'ETH': 0.003,
      'SOL': 0.005,
      'BNB': 0.005,
      'ADA': 0.008,
      'DOGE': 0.01,
      'XRP': 0.008,
      'MATIC': 0.01
    };

    return spreadMap[asset] || 0.015; // Default 1.5%
  }

  private aggregateLiquidity(liquidityData: LiquidityData[], assets: string[]): any {
    const byAsset: { [key: string]: LiquidityData[] } = {};
    
    for (const data of liquidityData) {
      if (!byAsset[data.symbol]) {
        byAsset[data.symbol] = [];
      }
      byAsset[data.symbol].push(data);
    }

    // For first asset
    const firstAsset = assets[0];
    const assetLiquidity = byAsset[firstAsset] || [];

    if (assetLiquidity.length === 0) {
      return { spread: 0, depth: 0, slippageEstimate: 0 };
    }

    // Use best (lowest) spread
    const spread = Math.min(...assetLiquidity.map(l => l.spread));
    
    // Use highest depth
    const depth = Math.max(...assetLiquidity.map(l => l.depth));
    
    // Use average slippage estimate
    const slippageEstimate = assetLiquidity.reduce((sum, l) => sum + l.slippageEstimate, 0) / assetLiquidity.length;

    return { spread, depth, slippageEstimate, sourceCount: assetLiquidity.length };
  }

  private checkFeasibility(aggregated: any, transactionSize: number): boolean {
    if (transactionSize === 0) return true;
    
    // Check if depth is sufficient (at least 2x transaction size)
    return aggregated.depth >= transactionSize * 2;
  }

  private calculateConfidence(liquidityData: LiquidityData[], assets: string[]): Confidence {
    const realDataCount = liquidityData.filter(d => d.source !== 'estimated').length;
    const sourcesPerAsset = realDataCount / assets.length;
    
    if (sourcesPerAsset >= 2) return 'high';
    if (sourcesPerAsset >= 1) return 'medium';
    return 'low';
  }
}


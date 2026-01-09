/**
 * WhaleFlowBot - Whale activity tracking
 * 
 * Monitors large transfers and exchange flows
 * Must be capped, never dominant (secondary signal only)
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, WhaleActivity, globalRateLimiter } from './base';
import dataSourcesConfig from '../../config/data_sources.json';

interface WhaleTransfer {
  symbol: string;
  amount: number;
  amountUsd: number;
  from: string;
  to: string;
  type: 'exchange_inflow' | 'exchange_outflow' | 'large_transfer';
  timestamp: Date;
  source: string;
}

export class WhaleFlowBot extends BaseBot {
  constructor() {
    const whaleSources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => (ds.category === 'whale_tracking' || ds.category === 'onchain_flows') && ds.enabled
    );
    super('whale_flow_bot', 'whale', whaleSources);
  }

  async fetch(assets: string[], options?: { lookbackHours?: number }): Promise<BotOutput> {
    const lookbackHours = options?.lookbackHours || 24;
    const cacheKey = `whale_${assets.join(',')}_${lookbackHours}h`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const whaleTransfers: WhaleTransfer[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch from Whale Alert
    if (this.isSourceEnabled('whale_alert')) {
      try {
        const whaleAlertData = await this.fetchWhaleAlert(assets, lookbackHours);
        whaleTransfers.push(...whaleAlertData);
      } catch (error) {
        warnings.push(`Whale Alert fetch failed: ${error}`);
      }
    }

    // Analyze whale activity
    const analysis = this.analyzeWhaleActivity(whaleTransfers, assets);

    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      horizon: `${lookbackHours}h`,
      assets,
      confidence: this.calculateConfidence(whaleTransfers),
      coreMetrics: {
        // WhaleFlowBot does NOT populate core metrics
        // This is enforced by secondary signal gating
      },
      secondarySignals: {
        whaleActivity: whaleTransfers.map(t => ({
          type: t.type === 'exchange_inflow' ? 'inflow' 
            : t.type === 'exchange_outflow' ? 'outflow' 
            : 'large_transfer',
          amount: t.amount,
          amountUsd: t.amountUsd,
          asset: t.symbol,
          timestamp: t.timestamp,
          source: t.source
        })),
        eventFlags: analysis.significantPressure ? [{
          type: 'other' as const,
          severity: 'medium' as const,
          confirmed: true,
          affectedAssets: analysis.assetsWithPressure,
          timestamp: new Date(),
          source: 'WhaleFlowBot',
          description: analysis.description
        }] : []
      },
      rawData: { whaleTransfers, analysis },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async fetchWhaleAlert(assets: string[], lookbackHours: number): Promise<WhaleTransfer[]> {
    const apiKey = this.getApiKey('WHALE_ALERT_API_KEY');
    if (!apiKey) {
      return []; // Whale Alert requires API key
    }

    await globalRateLimiter.waitForSlot('whale_alert', 60, 60000);
    
    try {
      const startTime = Math.floor((Date.now() - lookbackHours * 3600000) / 1000);
      const endTime = Math.floor(Date.now() / 1000);
      
      const response = await fetch(
        `https://api.whale-alert.io/v1/transactions?api_key=${apiKey}&start=${startTime}&end=${endTime}&min_value=1000000`
      );

      if (response.ok) {
        const data = await response.json();
        
        return (data.transactions || [])
          .filter((tx: any) => {
            const symbol = tx.symbol?.toUpperCase();
            return assets.includes(symbol);
          })
          .map((tx: any) => {
            const isExchangeInflow = tx.to?.owner_type === 'exchange';
            const isExchangeOutflow = tx.from?.owner_type === 'exchange';
            
            let type: WhaleTransfer['type'] = 'large_transfer';
            if (isExchangeInflow) type = 'exchange_inflow';
            else if (isExchangeOutflow) type = 'exchange_outflow';

            return {
              symbol: tx.symbol?.toUpperCase(),
              amount: parseFloat(tx.amount),
              amountUsd: parseFloat(tx.amount_usd),
              from: tx.from?.address || 'unknown',
              to: tx.to?.address || 'unknown',
              type,
              timestamp: new Date(tx.timestamp * 1000),
              source: 'whale_alert'
            };
          });
      }
    } catch (error) {
      // Fall through
    }

    return [];
  }

  private analyzeWhaleActivity(transfers: WhaleTransfer[], assets: string[]): any {
    const inflowByAsset: { [key: string]: number } = {};
    const outflowByAsset: { [key: string]: number } = {};

    for (const transfer of transfers) {
      if (transfer.type === 'exchange_inflow') {
        inflowByAsset[transfer.symbol] = (inflowByAsset[transfer.symbol] || 0) + transfer.amountUsd;
      } else if (transfer.type === 'exchange_outflow') {
        outflowByAsset[transfer.symbol] = (outflowByAsset[transfer.symbol] || 0) + transfer.amountUsd;
      }
    }

    // Calculate net flow and identify assets with significant pressure
    const assetsWithPressure: string[] = [];
    const pressureDescriptions: string[] = [];

    for (const asset of assets) {
      const inflow = inflowByAsset[asset] || 0;
      const outflow = outflowByAsset[asset] || 0;
      const netFlow = inflow - outflow;

      // Significant if net flow > $10M
      if (Math.abs(netFlow) > 10000000) {
        assetsWithPressure.push(asset);
        
        if (netFlow > 0) {
          pressureDescriptions.push(`${asset}: $${(netFlow / 1000000).toFixed(1)}M net inflow (selling pressure)`);
        } else {
          pressureDescriptions.push(`${asset}: $${(Math.abs(netFlow) / 1000000).toFixed(1)}M net outflow (accumulation)`);
        }
      }
    }

    return {
      significantPressure: assetsWithPressure.length > 0,
      assetsWithPressure,
      description: pressureDescriptions.join('; ') || 'No significant whale activity detected',
      inflowByAsset,
      outflowByAsset
    };
  }

  private calculateConfidence(transfers: WhaleTransfer[]): Confidence {
    if (transfers.length === 0) return 'low';
    
    const realDataCount = transfers.filter(t => t.source !== 'estimated').length;
    
    if (realDataCount >= 10) return 'high';
    if (realDataCount >= 5) return 'medium';
    return 'low';
  }
}


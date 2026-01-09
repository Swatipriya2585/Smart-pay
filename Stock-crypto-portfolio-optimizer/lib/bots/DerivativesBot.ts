/**
 * DerivativesBot - Derivatives market analysis
 * 
 * Fetches implied volatility, funding rates, liquidations
 * Provides tail-risk indicators from derivatives markets
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, globalRateLimiter } from './base';
import dataSourcesConfig from '../../config/data_sources.json';

interface DerivativesData {
  symbol: string;
  impliedVolatility?: number; // Annualized IV
  fundingRate?: number; // Current funding rate
  openInterest?: number; // Open interest in USD
  liquidations24h?: number; // Liquidations in last 24h (USD)
  longShortRatio?: number; // Long/short ratio
  source: string;
  timestamp: Date;
}

export class DerivativesBot extends BaseBot {
  constructor() {
    const derivativesSources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => (ds.category === 'options_derivatives' || ds.category === 'derivatives_analytics') && ds.enabled
    );
    super('derivatives_bot', 'derivatives', derivativesSources);
  }

  async fetch(assets: string[], options?: any): Promise<BotOutput> {
    const cacheKey = `derivatives_${assets.join(',')}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const derivativesData: DerivativesData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch from Deribit (options data)
    if (this.isSourceEnabled('deribit')) {
      try {
        const deribitData = await this.fetchDeribit(assets);
        derivativesData.push(...deribitData);
      } catch (error) {
        warnings.push(`Deribit fetch failed: ${error}`);
      }
    }

    // Fetch from Coinglass (funding rates, liquidations)
    if (this.isSourceEnabled('coinglass')) {
      try {
        const coinglassData = await this.fetchCoinglass(assets);
        derivativesData.push(...coinglassData);
      } catch (error) {
        warnings.push(`Coinglass fetch failed: ${error}`);
      }
    }

    if (derivativesData.length === 0) {
      // Use estimated data
      derivativesData.push(...this.estimateDerivativesData(assets));
    }

    // Analyze tail risk
    const tailRiskAnalysis = this.analyzeTailRisk(derivativesData);

    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      assets,
      confidence: this.calculateConfidence(derivativesData),
      coreMetrics: {
        // Derivatives data is primarily for tail-risk, not core pricing
      },
      secondarySignals: {
        eventFlags: tailRiskAnalysis.highRisk ? [{
          type: 'other' as const,
          severity: 'high' as const,
          confirmed: true,
          affectedAssets: tailRiskAnalysis.highRiskAssets,
          timestamp: new Date(),
          source: 'DerivativesBot',
          description: tailRiskAnalysis.description
        }] : []
      },
      rawData: { derivativesData, tailRiskAnalysis },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async fetchDeribit(assets: string[]): Promise<DerivativesData[]> {
    await globalRateLimiter.waitForSlot('deribit', 20, 1000);
    
    const results: DerivativesData[] = [];

    for (const asset of assets) {
      // Deribit only supports BTC and ETH
      if (asset !== 'BTC' && asset !== 'ETH') continue;

      try {
        const currency = asset;
        const response = await fetch(
          `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.result && data.result.length > 0) {
            // Calculate average IV from ATM options
            const atmOptions = data.result.filter((opt: any) => {
              const strike = opt.underlying_price;
              return Math.abs(opt.strike - strike) / strike < 0.05; // Within 5% of spot
            });

            if (atmOptions.length > 0) {
              const avgIV = atmOptions.reduce((sum: number, opt: any) => 
                sum + (opt.mark_iv || 0), 0) / atmOptions.length;

              results.push({
                symbol: asset,
                impliedVolatility: avgIV,
                source: 'deribit',
                timestamp: new Date()
              });
            }
          }
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  private async fetchCoinglass(assets: string[]): Promise<DerivativesData[]> {
    const apiKey = this.getApiKey('COINGLASS_API_KEY');
    if (!apiKey) {
      return []; // Coinglass requires API key
    }

    await globalRateLimiter.waitForSlot('coinglass', 100, 60000);
    
    const results: DerivativesData[] = [];

    for (const asset of assets) {
      try {
        // Fetch funding rate
        const fundingResponse = await fetch(
          `https://open-api.coinglass.com/public/v2/funding?symbol=${asset}`,
          {
            headers: {
              'coinglassSecret': apiKey
            }
          }
        );

        if (fundingResponse.ok) {
          const fundingData = await fundingResponse.json();
          
          if (fundingData.success && fundingData.data) {
            const avgFundingRate = fundingData.data.uMarginList?.reduce((sum: number, item: any) => 
              sum + parseFloat(item.rate || 0), 0) / (fundingData.data.uMarginList?.length || 1);

            // Fetch liquidations
            const liqResponse = await fetch(
              `https://open-api.coinglass.com/public/v2/liquidation?symbol=${asset}&timeType=1`,
              {
                headers: {
                  'coinglassSecret': apiKey
                }
              }
            );

            let liquidations24h = 0;
            if (liqResponse.ok) {
              const liqData = await liqResponse.json();
              if (liqData.success && liqData.data) {
                liquidations24h = parseFloat(liqData.data.totalLiquidation || 0);
              }
            }

            results.push({
              symbol: asset,
              fundingRate: avgFundingRate,
              liquidations24h,
              source: 'coinglass',
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  private estimateDerivativesData(assets: string[]): DerivativesData[] {
    return assets.map(asset => {
      const isMajor = ['BTC', 'ETH'].includes(asset);
      const isStablecoin = ['USDC', 'USDT'].includes(asset);

      return {
        symbol: asset,
        impliedVolatility: isStablecoin ? 0.05 : isMajor ? 0.6 : 0.8, // Annualized
        fundingRate: 0.0001, // 0.01% per 8h
        openInterest: isMajor ? 10000000000 : 1000000000, // $10B or $1B
        liquidations24h: isMajor ? 100000000 : 10000000, // $100M or $10M
        longShortRatio: 1.0,
        source: 'estimated',
        timestamp: new Date()
      };
    });
  }

  private analyzeTailRisk(derivativesData: DerivativesData[]): any {
    const highRiskAssets: string[] = [];
    const reasons: string[] = [];

    for (const data of derivativesData) {
      // Check for extreme funding rates (indicates overleveraged positions)
      if (data.fundingRate && Math.abs(data.fundingRate) > 0.001) {
        highRiskAssets.push(data.symbol);
        reasons.push(`${data.symbol}: Extreme funding rate ${(data.fundingRate * 100).toFixed(3)}%`);
      }

      // Check for high liquidations
      if (data.liquidations24h && data.openInterest) {
        const liqRatio = data.liquidations24h / data.openInterest;
        if (liqRatio > 0.05) { // More than 5% of OI liquidated
          if (!highRiskAssets.includes(data.symbol)) {
            highRiskAssets.push(data.symbol);
          }
          reasons.push(`${data.symbol}: High liquidation ratio ${(liqRatio * 100).toFixed(2)}%`);
        }
      }

      // Check for elevated IV (volatility spike)
      if (data.impliedVolatility && data.impliedVolatility > 1.0) {
        if (!highRiskAssets.includes(data.symbol)) {
          highRiskAssets.push(data.symbol);
        }
        reasons.push(`${data.symbol}: Elevated IV ${(data.impliedVolatility * 100).toFixed(0)}%`);
      }
    }

    return {
      highRisk: highRiskAssets.length > 0,
      highRiskAssets,
      description: reasons.join('; ') || 'No significant tail risk detected'
    };
  }

  private calculateConfidence(derivativesData: DerivativesData[]): Confidence {
    const realDataCount = derivativesData.filter(d => d.source !== 'estimated').length;
    
    if (realDataCount >= 2) return 'high';
    if (realDataCount >= 1) return 'medium';
    return 'low';
  }
}


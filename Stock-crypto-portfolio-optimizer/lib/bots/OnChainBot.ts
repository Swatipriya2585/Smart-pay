/**
 * OnChainBot - On-chain metrics and execution risk
 * 
 * Fetches blockchain fees, congestion, confirmation times
 * Provides ground-truth execution risk data
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, globalRateLimiter } from './base';
import dataSourcesConfig from '../../config/data_sources.json';

interface OnChainData {
  chain: string;
  gasPrice?: number; // In native units (gwei for ETH, lamports for SOL)
  gasPriceUsd?: number;
  congestionLevel: 'low' | 'medium' | 'high';
  avgConfirmationTime?: number; // In seconds
  failureRate?: number; // Percentage
  tps?: number; // Transactions per second
  source: string;
  timestamp: Date;
}

export class OnChainBot extends BaseBot {
  constructor() {
    const onChainSources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => ds.category === 'chain_explorer' && ds.enabled
    );
    super('onchain_bot', 'onchain', onChainSources);
  }

  async fetch(assets: string[], options?: { chains?: string[] }): Promise<BotOutput> {
    const chains = options?.chains || this.inferChains(assets);
    const cacheKey = `onchain_${chains.join(',')}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const onChainData: OnChainData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch Ethereum data
    if (chains.includes('ethereum') && this.isSourceEnabled('etherscan')) {
      try {
        const ethData = await this.fetchEthereumData();
        onChainData.push(ethData);
      } catch (error) {
        warnings.push(`Ethereum data fetch failed: ${error}`);
      }
    }

    // Fetch Solana data
    if (chains.includes('solana') && this.isSourceEnabled('solscan')) {
      try {
        const solData = await this.fetchSolanaData();
        onChainData.push(solData);
      } catch (error) {
        warnings.push(`Solana data fetch failed: ${error}`);
      }
    }

    if (onChainData.length === 0) {
      // Use estimated data
      onChainData.push(...this.estimateOnChainData(chains));
    }

    // Aggregate metrics
    const aggregated = this.aggregateOnChainData(onChainData);

    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      assets,
      chain: chains[0],
      confidence: this.calculateConfidence(onChainData),
      coreMetrics: {
        fees: aggregated.avgFeeUsd,
        congestion: this.congestionToNumber(aggregated.congestionLevel),
        failureRate: aggregated.failureRate
      },
      secondarySignals: {
        eventFlags: aggregated.congestionLevel === 'high' ? [{
          type: 'outage' as const,
          severity: 'medium' as const,
          confirmed: true,
          affectedAssets: assets,
          timestamp: new Date(),
          source: 'OnChainBot',
          description: `High network congestion on ${chains.join(', ')}`
        }] : []
      },
      rawData: { onChainData, aggregated },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async fetchEthereumData(): Promise<OnChainData> {
    const apiKey = this.getApiKey('ETHERSCAN_API_KEY');
    
    await globalRateLimiter.waitForSlot('etherscan', 5, 1000);
    
    try {
      const response = await fetch(
        `https://api.etherscan.io/api?module=gastracker&action=gasoracle${apiKey ? `&apikey=${apiKey}` : ''}`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === '1') {
          const gasPrice = parseFloat(data.result.SafeGasPrice); // In gwei
          const ethPrice = 2000; // Estimate (should fetch from PriceBot)
          const gasPriceUsd = (gasPrice * 21000 * ethPrice) / 1e9; // Standard transfer cost

          // Estimate congestion based on gas price
          let congestionLevel: 'low' | 'medium' | 'high' = 'low';
          if (gasPrice > 50) congestionLevel = 'high';
          else if (gasPrice > 20) congestionLevel = 'medium';

          return {
            chain: 'ethereum',
            gasPrice,
            gasPriceUsd,
            congestionLevel,
            avgConfirmationTime: 15, // ~15 seconds per block
            failureRate: 0.01, // 1% estimate
            source: 'etherscan',
            timestamp: new Date()
          };
        }
      }
    } catch (error) {
      // Fall through to estimate
    }

    return this.estimateEthereumData();
  }

  private async fetchSolanaData(): Promise<OnChainData> {
    const apiKey = this.getApiKey('SOLSCAN_API_KEY');
    
    await globalRateLimiter.waitForSlot('solscan', 300, 60000);
    
    try {
      // Solscan doesn't have a direct gas price API
      // We'll use Solana RPC to get recent performance samples
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getRecentPerformanceSamples',
          params: [10]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const samples = data.result || [];
        
        if (samples.length > 0) {
          // Calculate average TPS
          const avgTps = samples.reduce((sum: number, s: any) => sum + (s.numTransactions / s.samplePeriodSecs), 0) / samples.length;
          
          // Estimate congestion based on TPS (Solana can handle ~65k TPS)
          let congestionLevel: 'low' | 'medium' | 'high' = 'low';
          if (avgTps > 40000) congestionLevel = 'high';
          else if (avgTps > 20000) congestionLevel = 'medium';

          // Solana fees are very low (~0.000005 SOL = $0.0001 at $20/SOL)
          const solPrice = 130; // Estimate
          const gasPriceUsd = 0.000005 * solPrice;

          return {
            chain: 'solana',
            gasPrice: 5000, // lamports
            gasPriceUsd,
            congestionLevel,
            avgConfirmationTime: 0.4, // ~400ms
            failureRate: 0.05, // 5% estimate (Solana has higher failure rate)
            tps: avgTps,
            source: 'solana_rpc',
            timestamp: new Date()
          };
        }
      }
    } catch (error) {
      // Fall through to estimate
    }

    return this.estimateSolanaData();
  }

  private estimateEthereumData(): OnChainData {
    return {
      chain: 'ethereum',
      gasPrice: 30, // gwei
      gasPriceUsd: 5, // $5 estimate
      congestionLevel: 'medium',
      avgConfirmationTime: 15,
      failureRate: 0.01,
      source: 'estimated',
      timestamp: new Date()
    };
  }

  private estimateSolanaData(): OnChainData {
    return {
      chain: 'solana',
      gasPrice: 5000, // lamports
      gasPriceUsd: 0.0007, // Very low
      congestionLevel: 'low',
      avgConfirmationTime: 0.4,
      failureRate: 0.05,
      tps: 3000,
      source: 'estimated',
      timestamp: new Date()
    };
  }

  private estimateOnChainData(chains: string[]): OnChainData[] {
    return chains.map(chain => {
      if (chain === 'ethereum') return this.estimateEthereumData();
      if (chain === 'solana') return this.estimateSolanaData();
      
      // Default estimate
      return {
        chain,
        gasPriceUsd: 1,
        congestionLevel: 'medium' as const,
        avgConfirmationTime: 10,
        failureRate: 0.02,
        source: 'estimated',
        timestamp: new Date()
      };
    });
  }

  private inferChains(assets: string[]): string[] {
    const chains = new Set<string>();
    
    for (const asset of assets) {
      if (asset === 'ETH' || asset === 'USDC' || asset === 'USDT') {
        chains.add('ethereum');
      }
      if (asset === 'SOL') {
        chains.add('solana');
      }
      if (asset === 'BNB') {
        chains.add('bsc');
      }
    }

    return Array.from(chains);
  }

  private aggregateOnChainData(onChainData: OnChainData[]): any {
    if (onChainData.length === 0) {
      return { avgFeeUsd: 0, congestionLevel: 'low', failureRate: 0 };
    }

    const avgFeeUsd = onChainData.reduce((sum, d) => sum + (d.gasPriceUsd || 0), 0) / onChainData.length;
    
    // Use worst congestion level
    const congestionLevels = onChainData.map(d => d.congestionLevel);
    const congestionLevel = congestionLevels.includes('high') ? 'high' 
      : congestionLevels.includes('medium') ? 'medium' 
      : 'low';
    
    const failureRate = onChainData.reduce((sum, d) => sum + (d.failureRate || 0), 0) / onChainData.length;

    return { avgFeeUsd, congestionLevel, failureRate };
  }

  private congestionToNumber(level: 'low' | 'medium' | 'high'): number {
    const map = { low: 0.2, medium: 0.5, high: 0.9 };
    return map[level];
  }

  private calculateConfidence(onChainData: OnChainData[]): Confidence {
    const realDataCount = onChainData.filter(d => d.source !== 'estimated').length;
    
    if (realDataCount >= 2) return 'high';
    if (realDataCount >= 1) return 'medium';
    return 'low';
  }
}


/**
 * Bot Orchestrator - Coordinates all bots and enforces gating rules
 * 
 * Runs all enabled bots, enforces secondary signal gating,
 * applies hard blocks, and generates final recommendations
 */

import { BotOutput, EventFlag, RegulatoryRisk } from './base';
import { PriceBot } from './PriceBot';
import { LiquidityBot } from './LiquidityBot';
import { OnChainBot } from './OnChainBot';
import { DerivativesBot } from './DerivativesBot';
import { NewsBot } from './NewsBot';
import { RegulatoryBot } from './RegulatoryBot';
import { AnomalyBot } from './AnomalyBot';
import { WhaleFlowBot } from './WhaleFlowBot';

export interface OrchestratorInput {
  assets: string[];
  transactionAmount?: number;
  chains?: string[];
  lookbackHours?: number;
}

export interface OrchestratorOutput {
  timestamp: Date;
  assets: string[];
  
  // Core metrics (for scoring)
  coreMetrics: {
    price: { [asset: string]: number };
    volatility: { [asset: string]: number };
    liquidity: { [asset: string]: number };
    spread: { [asset: string]: number };
    fees: { [asset: string]: number };
    congestion: { [asset: string]: number };
  };
  
  // Secondary signals (gating/explainability only)
  secondarySignals: {
    eventFlags: EventFlag[];
    regulatoryRisk: RegulatoryRisk | null;
    newsImpact: any;
    whaleActivity: any[];
    anomaliesDetected: boolean;
  };
  
  // Exclusions (Pareto + hard blocks)
  excludedAssets: {
    asset: string;
    reason: string;
    source: string;
  }[];
  
  // Bot outputs (for debugging/audit)
  botOutputs: {
    [botId: string]: BotOutput;
  };
  
  // Confidence scores
  confidence: {
    overall: 'low' | 'medium' | 'high' | 'very_high';
    byBot: { [botId: string]: string };
  };
}

export class BotOrchestrator {
  private priceBot: PriceBot;
  private liquidityBot: LiquidityBot;
  private onChainBot: OnChainBot;
  private derivativesBot: DerivativesBot;
  private newsBot: NewsBot;
  private regulatoryBot: RegulatoryBot;
  private anomalyBot: AnomalyBot;
  private whaleFlowBot: WhaleFlowBot;

  constructor() {
    this.priceBot = new PriceBot();
    this.liquidityBot = new LiquidityBot();
    this.onChainBot = new OnChainBot();
    this.derivativesBot = new DerivativesBot();
    this.newsBot = new NewsBot();
    this.regulatoryBot = new RegulatoryBot();
    this.anomalyBot = new AnomalyBot();
    this.whaleFlowBot = new WhaleFlowBot();
  }

  /**
   * Run all bots and aggregate outputs
   */
  async run(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const { assets, transactionAmount, chains, lookbackHours = 24 } = input;

    // Run all bots in parallel
    const [
      priceOutput,
      liquidityOutput,
      onChainOutput,
      derivativesOutput,
      newsOutput,
      regulatoryOutput,
      anomalyOutput,
      whaleFlowOutput
    ] = await Promise.all([
      this.priceBot.fetch(assets).catch(this.handleBotError('PriceBot')),
      this.liquidityBot.fetch(assets, { transactionAmount }).catch(this.handleBotError('LiquidityBot')),
      this.onChainBot.fetch(assets, { chains }).catch(this.handleBotError('OnChainBot')),
      this.derivativesBot.fetch(assets).catch(this.handleBotError('DerivativesBot')),
      this.newsBot.fetch(assets, { lookbackHours }).catch(this.handleBotError('NewsBot')),
      this.regulatoryBot.fetch(assets).catch(this.handleBotError('RegulatoryBot')),
      this.anomalyBot.fetch(assets).catch(this.handleBotError('AnomalyBot')),
      this.whaleFlowBot.fetch(assets, { lookbackHours }).catch(this.handleBotError('WhaleFlowBot'))
    ]);

    // Aggregate core metrics
    const coreMetrics = this.aggregateCoreMetrics(assets, {
      priceOutput,
      liquidityOutput,
      onChainOutput
    });

    // Aggregate secondary signals
    const secondarySignals = this.aggregateSecondarySignals({
      derivativesOutput,
      newsOutput,
      regulatoryOutput,
      anomalyOutput,
      whaleFlowOutput
    });

    // Apply exclusions (regulatory hard blocks + confirmed negative events)
    const excludedAssets = this.applyExclusions(assets, secondarySignals);

    // Calculate confidence
    const confidence = this.calculateConfidence({
      priceOutput,
      liquidityOutput,
      onChainOutput,
      derivativesOutput,
      newsOutput,
      regulatoryOutput,
      anomalyOutput,
      whaleFlowOutput
    });

    return {
      timestamp: new Date(),
      assets,
      coreMetrics,
      secondarySignals,
      excludedAssets,
      botOutputs: {
        price_bot: priceOutput,
        liquidity_bot: liquidityOutput,
        onchain_bot: onChainOutput,
        derivatives_bot: derivativesOutput,
        news_bot: newsOutput,
        regulatory_bot: regulatoryOutput,
        anomaly_bot: anomalyOutput,
        whale_flow_bot: whaleFlowOutput
      },
      confidence
    };
  }

  /**
   * Aggregate core metrics from primary bots
   * ONLY price, liquidity, and on-chain bots can contribute
   */
  private aggregateCoreMetrics(
    assets: string[],
    outputs: { priceOutput: BotOutput; liquidityOutput: BotOutput; onChainOutput: BotOutput }
  ): OrchestratorOutput['coreMetrics'] {
    const metrics: OrchestratorOutput['coreMetrics'] = {
      price: {},
      volatility: {},
      liquidity: {},
      spread: {},
      fees: {},
      congestion: {}
    };

    for (const asset of assets) {
      // Price and volatility from PriceBot
      metrics.price[asset] = outputs.priceOutput.coreMetrics.price || 0;
      metrics.volatility[asset] = outputs.priceOutput.coreMetrics.volatility || 0;

      // Liquidity and spread from LiquidityBot
      metrics.liquidity[asset] = outputs.liquidityOutput.coreMetrics.liquidity || 0;
      metrics.spread[asset] = outputs.liquidityOutput.coreMetrics.spread || 0;

      // Fees and congestion from OnChainBot
      metrics.fees[asset] = outputs.onChainOutput.coreMetrics.fees || 0;
      metrics.congestion[asset] = outputs.onChainOutput.coreMetrics.congestion || 0;
    }

    return metrics;
  }

  /**
   * Aggregate secondary signals
   * These CANNOT influence core scoring
   */
  private aggregateSecondarySignals(outputs: {
    derivativesOutput: BotOutput;
    newsOutput: BotOutput;
    regulatoryOutput: BotOutput;
    anomalyOutput: BotOutput;
    whaleFlowOutput: BotOutput;
  }): OrchestratorOutput['secondarySignals'] {
    const allEventFlags: EventFlag[] = [];

    // Collect event flags from all bots
    for (const output of Object.values(outputs)) {
      if (output.secondarySignals.eventFlags) {
        allEventFlags.push(...output.secondarySignals.eventFlags);
      }
    }

    return {
      eventFlags: allEventFlags,
      regulatoryRisk: outputs.regulatoryOutput.secondarySignals.regulatoryRisk || null,
      newsImpact: outputs.newsOutput.secondarySignals.newsImpact,
      whaleActivity: outputs.whaleFlowOutput.secondarySignals.whaleActivity || [],
      anomaliesDetected: outputs.anomalyOutput.secondarySignals.anomalyDetected || false
    };
  }

  /**
   * Apply exclusions (Pareto + hard blocks)
   * CRITICAL: Regulatory hard blocks override everything
   */
  private applyExclusions(
    assets: string[],
    secondarySignals: OrchestratorOutput['secondarySignals']
  ): OrchestratorOutput['excludedAssets'] {
    const excluded: OrchestratorOutput['excludedAssets'] = [];

    // 1. Regulatory hard blocks (highest priority)
    if (secondarySignals.regulatoryRisk?.hardBlock) {
      for (const asset of secondarySignals.regulatoryRisk.affectedAssets) {
        if (assets.includes(asset)) {
          excluded.push({
            asset,
            reason: 'Regulatory hard block',
            source: 'RegulatoryBot'
          });
        }
      }
    }

    // 2. Confirmed high-severity negative events
    const confirmedHighSeverityEvents = secondarySignals.eventFlags.filter(
      flag => flag.confirmed && flag.severity === 'high' && 
      ['exploit', 'insolvency', 'delisting'].includes(flag.type)
    );

    for (const event of confirmedHighSeverityEvents) {
      for (const asset of event.affectedAssets) {
        if (assets.includes(asset) && !excluded.some(e => e.asset === asset)) {
          excluded.push({
            asset,
            reason: `Confirmed ${event.type}: ${event.description}`,
            source: event.source
          });
        }
      }
    }

    return excluded;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(outputs: { [key: string]: BotOutput }): OrchestratorOutput['confidence'] {
    const byBot: { [key: string]: string } = {};
    const confidenceScores: number[] = [];

    for (const [botId, output] of Object.entries(outputs)) {
      byBot[botId] = output.confidence;
      
      // Convert to numeric
      const score = { low: 1, medium: 2, high: 3, very_high: 4 }[output.confidence];
      confidenceScores.push(score);
    }

    // Overall confidence is average
    const avgScore = confidenceScores.reduce((sum, s) => sum + s, 0) / confidenceScores.length;
    
    let overall: 'low' | 'medium' | 'high' | 'very_high' = 'low';
    if (avgScore >= 3.5) overall = 'very_high';
    else if (avgScore >= 2.5) overall = 'high';
    else if (avgScore >= 1.5) overall = 'medium';

    return { overall, byBot };
  }

  /**
   * Error handler for bot failures
   */
  private handleBotError(botName: string) {
    return (error: any): BotOutput => {
      console.error(`${botName} failed:`, error);
      
      // Return empty output
      return {
        botId: botName.toLowerCase().replace('bot', '_bot'),
        botCategory: 'price' as any,
        timestamp: new Date(),
        assets: [],
        confidence: 'low',
        coreMetrics: {},
        secondarySignals: {},
        errors: [error.message || String(error)]
      };
    };
  }
}

// Singleton instance
export const botOrchestrator = new BotOrchestrator();


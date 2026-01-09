/**
 * RegulatoryBot - Compliance and regulatory monitoring
 * 
 * Checks SEC enforcement, OFAC sanctions, compliance status
 * Provides HARD BLOCK overrides for non-compliant assets
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, RegulatoryRisk, globalRateLimiter } from './base';
import dataSourcesConfig from '../../config/data_sources.json';

interface RegulatoryData {
  asset: string;
  sanctioned: boolean;
  secAction: boolean;
  complianceIssue: boolean;
  description: string;
  source: string;
  timestamp: Date;
}

export class RegulatoryBot extends BaseBot {
  // Hardcoded sanctions list (should be updated from OFAC API)
  private static SANCTIONED_ASSETS = new Set([
    // Add known sanctioned assets here
    // Example: 'TORNADO' (Tornado Cash)
  ]);

  // Assets with known SEC actions
  private static SEC_ACTION_ASSETS = new Set([
    // Add assets with SEC enforcement actions
    // Example: 'XRP' (historically had SEC case)
  ]);

  constructor() {
    const regulatorySources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => ds.category === 'regulatory' && ds.enabled
    );
    super('regulatory_bot', 'regulatory', regulatorySources);
  }

  async fetch(assets: string[], options?: any): Promise<BotOutput> {
    const cacheKey = `regulatory_${assets.join(',')}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const regulatoryData: RegulatoryData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check OFAC sanctions
    if (this.isSourceEnabled('ofac_sanctions')) {
      try {
        const ofacData = await this.checkOFAC(assets);
        regulatoryData.push(...ofacData);
      } catch (error) {
        warnings.push(`OFAC check failed: ${error}`);
      }
    }

    // Check SEC enforcement
    if (this.isSourceEnabled('sec_crypto')) {
      try {
        const secData = await this.checkSEC(assets);
        regulatoryData.push(...secData);
      } catch (error) {
        warnings.push(`SEC check failed: ${error}`);
      }
    }

    // If no data fetched, use hardcoded lists
    if (regulatoryData.length === 0) {
      regulatoryData.push(...this.checkHardcodedLists(assets));
    }

    // Generate regulatory risk assessment
    const riskAssessment = this.assessRegulatoryRisk(regulatoryData, assets);

    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      assets,
      confidence: this.calculateConfidence(regulatoryData),
      coreMetrics: {
        // RegulatoryBot does NOT populate core metrics
      },
      secondarySignals: {
        regulatoryRisk: riskAssessment,
        eventFlags: riskAssessment.hardBlock ? [{
          type: 'regulatory' as const,
          severity: 'high' as const,
          confirmed: true,
          affectedAssets: riskAssessment.affectedAssets,
          timestamp: new Date(),
          source: 'RegulatoryBot',
          description: riskAssessment.reasons.join('; ')
        }] : []
      },
      rawData: { regulatoryData, riskAssessment },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async checkOFAC(assets: string[]): Promise<RegulatoryData[]> {
    await globalRateLimiter.waitForSlot('ofac_sanctions', 10, 60000);
    
    // Note: Real implementation would fetch from OFAC API
    // For now, use hardcoded list
    return this.checkHardcodedLists(assets).filter(d => d.sanctioned);
  }

  private async checkSEC(assets: string[]): Promise<RegulatoryData[]> {
    await globalRateLimiter.waitForSlot('sec_crypto', 10, 1000);
    
    // Note: Real implementation would scrape SEC enforcement page
    // For now, use hardcoded list
    return this.checkHardcodedLists(assets).filter(d => d.secAction);
  }

  private checkHardcodedLists(assets: string[]): RegulatoryData[] {
    return assets.map(asset => {
      const sanctioned = RegulatoryBot.SANCTIONED_ASSETS.has(asset);
      const secAction = RegulatoryBot.SEC_ACTION_ASSETS.has(asset);
      const complianceIssue = sanctioned || secAction;

      let description = '';
      if (sanctioned) description = 'Asset is on OFAC sanctions list';
      else if (secAction) description = 'Asset has active SEC enforcement action';
      else description = 'No known regulatory issues';

      return {
        asset,
        sanctioned,
        secAction,
        complianceIssue,
        description,
        source: 'hardcoded_list',
        timestamp: new Date()
      };
    });
  }

  private assessRegulatoryRisk(regulatoryData: RegulatoryData[], assets: string[]): RegulatoryRisk {
    const blockedAssets: string[] = [];
    const highRiskAssets: string[] = [];
    const reasons: string[] = [];

    for (const data of regulatoryData) {
      if (data.sanctioned) {
        blockedAssets.push(data.asset);
        reasons.push(`${data.asset}: ${data.description}`);
      } else if (data.secAction) {
        highRiskAssets.push(data.asset);
        reasons.push(`${data.asset}: ${data.description}`);
      }
    }

    // Determine overall risk level
    let level: RegulatoryRisk['level'] = 'none';
    if (blockedAssets.length > 0) {
      level = 'blocked';
    } else if (highRiskAssets.length > 0) {
      level = 'high';
    }

    return {
      level,
      reasons: reasons.length > 0 ? reasons : ['No regulatory issues detected'],
      affectedAssets: [...blockedAssets, ...highRiskAssets],
      hardBlock: blockedAssets.length > 0 // HARD BLOCK for sanctioned assets
    };
  }

  private calculateConfidence(regulatoryData: RegulatoryData[]): Confidence {
    const realDataCount = regulatoryData.filter(d => d.source !== 'hardcoded_list').length;
    
    if (realDataCount >= 2) return 'high';
    if (realDataCount >= 1) return 'medium';
    return 'low';
  }
}


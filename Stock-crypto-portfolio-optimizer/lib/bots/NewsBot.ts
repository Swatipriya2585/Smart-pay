/**
 * NewsBot - News scraping and sentiment analysis
 * 
 * Scrapes crypto news from multiple sources
 * Uses keyword detection for event classification
 * Produces BINARY EXCLUSION FLAGS ONLY (no numeric sentiment leakage)
 */

import { BaseBot, BotOutput, DataSourceConfig, Confidence, EventFlag, NewsImpact, globalRateLimiter } from './base';
import { keywordMatcher, EventClassification } from '../utils/keywordMatcher';
import dataSourcesConfig from '../../config/data_sources.json';

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  source: string;
  timestamp: Date;
  classification?: EventClassification;
}

export class NewsBot extends BaseBot {
  constructor() {
    const newsSources = (dataSourcesConfig.sources as DataSourceConfig[]).filter(
      ds => (ds.category === 'news_media' || ds.category === 'news_aggregation') && ds.enabled
    );
    super('news_bot', 'news', newsSources);
  }

  async fetch(assets: string[], options?: { lookbackHours?: number }): Promise<BotOutput> {
    const lookbackHours = options?.lookbackHours || 24;
    const cacheKey = `news_${assets.join(',')}_${lookbackHours}h`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const articles: NewsArticle[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Fetch from CryptoPanic (aggregator)
    if (this.isSourceEnabled('cryptopanic')) {
      try {
        const cryptoPanicArticles = await this.fetchCryptoPanic(assets, lookbackHours);
        articles.push(...cryptoPanicArticles);
      } catch (error) {
        warnings.push(`CryptoPanic fetch failed: ${error}`);
      }
    }

    // Scrape from CoinDesk
    if (this.isSourceEnabled('coindesk')) {
      try {
        const coinDeskArticles = await this.scrapeCoinDesk(assets);
        articles.push(...coinDeskArticles);
      } catch (error) {
        warnings.push(`CoinDesk scrape failed: ${error}`);
      }
    }

    // Scrape from The Block
    if (this.isSourceEnabled('theblock')) {
      try {
        const theBlockArticles = await this.scrapeTheBlock(assets);
        articles.push(...theBlockArticles);
      } catch (error) {
        warnings.push(`The Block scrape failed: ${error}`);
      }
    }

    // Classify all articles using keyword matcher
    for (const article of articles) {
      const classification = keywordMatcher.classifyEvent(
        article.summary,
        article.title
      );
      if (classification) {
        article.classification = classification;
      }
    }

    // Filter to only articles with classifications
    const classifiedArticles = articles.filter(a => a.classification);

    // Generate event flags (BINARY EXCLUSION ONLY)
    const eventFlags = this.generateEventFlags(classifiedArticles, assets);

    // Generate news impact (for explainability)
    const newsImpact = this.generateNewsImpact(classifiedArticles);

    const output: BotOutput = {
      botId: this.botId,
      botCategory: this.botCategory,
      timestamp: new Date(),
      horizon: `${lookbackHours}h`,
      assets,
      confidence: this.calculateConfidence(classifiedArticles),
      coreMetrics: {
        // NewsBot does NOT populate core metrics
        // This is enforced by secondary signal gating
      },
      secondarySignals: {
        eventFlags,
        newsImpact
      },
      rawData: { articles: classifiedArticles },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    this.validateOutput(output);
    this.setCachedData(cacheKey, output);
    return output;
  }

  private async fetchCryptoPanic(assets: string[], lookbackHours: number): Promise<NewsArticle[]> {
    const apiKey = this.getApiKey('CRYPTOPANIC_API_KEY');
    
    await globalRateLimiter.waitForSlot('cryptopanic', 100, 60000);
    
    try {
      const filter = assets.length > 0 ? `&currencies=${assets.join(',')}` : '';
      const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey || 'free'}${filter}&public=true`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        return (data.results || []).slice(0, 20).map((item: any) => ({
          title: item.title || '',
          summary: item.title || '', // CryptoPanic doesn't provide summaries
          url: item.url || '',
          source: item.source?.title || 'cryptopanic',
          timestamp: new Date(item.published_at || Date.now())
        }));
      }
    } catch (error) {
      // Fall through
    }

    return [];
  }

  private async scrapeCoinDesk(assets: string[]): Promise<NewsArticle[]> {
    await globalRateLimiter.waitForSlot('coindesk', 10, 60000);
    
    // Note: Real scraping would use a library like cheerio or puppeteer
    // For now, return mock data structure
    // In production, implement actual scraping
    
    return [];
  }

  private async scrapeTheBlock(assets: string[]): Promise<NewsArticle[]> {
    await globalRateLimiter.waitForSlot('theblock', 10, 60000);
    
    // Note: Real scraping would use a library like cheerio or puppeteer
    // For now, return mock data structure
    // In production, implement actual scraping
    
    return [];
  }

  /**
   * Generate event flags for binary exclusion
   * CRITICAL: These are ONLY for Pareto exclusion, NOT for scoring
   */
  private generateEventFlags(articles: NewsArticle[], requestedAssets: string[]): EventFlag[] {
    const flags: EventFlag[] = [];
    const seenEvents = new Set<string>();

    for (const article of articles) {
      if (!article.classification) continue;

      const classification = article.classification;

      // Only create flags for negative events
      if (classification.severity === 'low') continue;

      // Only create flags for confirmed events or high severity
      if (!classification.confirmed && classification.severity !== 'high') continue;

      // Determine affected assets (intersection with requested assets)
      const affectedAssets = classification.affectedAssets.length > 0
        ? classification.affectedAssets.filter(a => requestedAssets.includes(a))
        : requestedAssets; // If no specific assets, apply to all

      if (affectedAssets.length === 0) continue;

      // Deduplicate events
      const eventKey = `${classification.eventType}_${affectedAssets.join('_')}`;
      if (seenEvents.has(eventKey)) continue;
      seenEvents.add(eventKey);

      flags.push({
        type: this.mapEventType(classification.eventType),
        severity: classification.severity,
        confirmed: classification.confirmed,
        affectedAssets,
        timestamp: article.timestamp,
        source: `NewsBot:${article.source}`,
        description: `${article.title} - ${classification.summary}`
      });
    }

    return flags;
  }

  /**
   * Generate news impact for explainability
   * This is NOT used for scoring, only for explaining decisions
   */
  private generateNewsImpact(articles: NewsArticle[]): NewsImpact | undefined {
    if (articles.length === 0) return undefined;

    // Calculate overall sentiment (for explainability only)
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    const allKeywords = new Set<string>();

    for (const article of articles) {
      if (!article.classification) continue;

      const keywords = article.classification.keywords;
      keywords.forEach(kw => allKeywords.add(kw));

      // Count sentiment based on keyword impact
      const hasNegative = keywords.some(kw => {
        const kwData = keywordMatcher['keywords'].find((k: any) => k.term === kw);
        return kwData?.impact === 'negative';
      });

      const hasPositive = keywords.some(kw => {
        const kwData = keywordMatcher['keywords'].find((k: any) => k.term === kw);
        return kwData?.impact === 'positive';
      });

      if (hasNegative) negativeCount++;
      else if (hasPositive) positiveCount++;
      else neutralCount++;
    }

    const totalCount = positiveCount + negativeCount + neutralCount;
    const sentiment = negativeCount > positiveCount * 1.5 ? 'negative'
      : positiveCount > negativeCount * 1.5 ? 'positive'
      : 'neutral';

    const relevance = Math.min(1.0, articles.length / 10);

    return {
      sentiment,
      relevance,
      keywords: Array.from(allKeywords).slice(0, 10),
      summary: `Analyzed ${articles.length} articles: ${positiveCount} positive, ${negativeCount} negative, ${neutralCount} neutral`,
      source: 'NewsBot',
      timestamp: new Date()
    };
  }

  private mapEventType(eventType: string): EventFlag['type'] {
    const map: { [key: string]: EventFlag['type'] } = {
      'exploit': 'exploit',
      'regulatory': 'regulatory',
      'depeg': 'depeg',
      'delisting': 'delisting',
      'outage': 'outage',
      'insolvency': 'insolvency'
    };

    return map[eventType] || 'other';
  }

  private calculateConfidence(articles: NewsArticle[]): Confidence {
    const classifiedCount = articles.filter(a => a.classification).length;
    
    if (classifiedCount >= 10) return 'high';
    if (classifiedCount >= 5) return 'medium';
    if (classifiedCount >= 1) return 'low';
    return 'low';
  }
}


/**
 * Keyword Matcher for Crypto Impact Scoring
 * 
 * Detects keywords in news/text and classifies events
 */

import keywordsConfig from '../../config/crypto_keywords.json';

export interface KeywordMatch {
  term: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high';
  impact: 'positive' | 'neutral' | 'negative';
  categories: string[];
  position: number; // Position in text
}

export interface EventClassification {
  eventType: string;
  severity: 'low' | 'medium' | 'high';
  confirmed: boolean; // Conservative default: false
  affectedAssets: string[]; // Extracted from text
  keywords: string[];
  confidence: number; // 0-1
  summary: string;
}

export class KeywordMatcher {
  private keywords: any[];

  constructor() {
    this.keywords = keywordsConfig.keywords;
  }

  /**
   * Match keywords in text
   */
  matchKeywords(text: string): KeywordMatch[] {
    const lowerText = text.toLowerCase();
    const matches: KeywordMatch[] = [];

    for (const keyword of this.keywords) {
      const term = keyword.term.toLowerCase();
      const position = lowerText.indexOf(term);

      if (position !== -1) {
        matches.push({
          term: keyword.term,
          eventType: keyword.eventType,
          severity: keyword.severity,
          impact: keyword.impact,
          categories: keyword.categories,
          position
        });
      }
    }

    // Sort by position (earlier matches first)
    return matches.sort((a, b) => a.position - b.position);
  }

  /**
   * Classify event based on keyword matches
   */
  classifyEvent(text: string, title?: string): EventClassification | null {
    const fullText = `${title || ''} ${text}`.toLowerCase();
    const matches = this.matchKeywords(fullText);

    if (matches.length === 0) {
      return null;
    }

    // Determine primary event type (most severe + most frequent)
    const eventTypeCounts: { [key: string]: number } = {};
    const eventTypeSeverity: { [key: string]: string } = {};

    for (const match of matches) {
      eventTypeCounts[match.eventType] = (eventTypeCounts[match.eventType] || 0) + 1;
      
      // Keep highest severity for each event type
      if (!eventTypeSeverity[match.eventType] || 
          this.severityScore(match.severity) > this.severityScore(eventTypeSeverity[match.eventType] as any)) {
        eventTypeSeverity[match.eventType] = match.severity;
      }
    }

    // Find most significant event type
    let primaryEventType = '';
    let maxScore = 0;

    for (const [eventType, count] of Object.entries(eventTypeCounts)) {
      const severity = eventTypeSeverity[eventType];
      const score = count * this.severityScore(severity as any);
      
      if (score > maxScore) {
        maxScore = score;
        primaryEventType = eventType;
      }
    }

    const severity = eventTypeSeverity[primaryEventType] as 'low' | 'medium' | 'high';

    // Extract affected assets (look for common crypto symbols)
    const affectedAssets = this.extractAssets(fullText);

    // Determine if event is confirmed (look for confirmation keywords)
    const confirmed = this.isConfirmed(fullText, matches);

    // Calculate confidence based on number of matches and severity
    const confidence = Math.min(1.0, (matches.length * 0.2) + (this.severityScore(severity) * 0.3));

    return {
      eventType: primaryEventType,
      severity,
      confirmed,
      affectedAssets,
      keywords: matches.map(m => m.term),
      confidence,
      summary: this.generateSummary(primaryEventType, severity, affectedAssets, matches)
    };
  }

  /**
   * Extract crypto asset symbols from text
   */
  private extractAssets(text: string): string[] {
    const assets: string[] = [];
    const commonSymbols = [
      'BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB', 'ADA', 'DOGE', 'XRP', 'MATIC',
      'AVAX', 'DOT', 'LINK', 'UNI', 'ATOM', 'LTC', 'BCH', 'XLM', 'ALGO', 'VET'
    ];

    const words = text.toUpperCase().split(/\s+/);

    for (const symbol of commonSymbols) {
      // Look for symbol as standalone word or with $ prefix
      if (words.includes(symbol) || words.includes(`$${symbol}`)) {
        assets.push(symbol);
      }
    }

    // Also check for full names
    const nameMap: { [key: string]: string } = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'cardano': 'ADA',
      'dogecoin': 'DOGE',
      'ripple': 'XRP',
      'polygon': 'MATIC',
      'avalanche': 'AVAX',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'uniswap': 'UNI',
      'cosmos': 'ATOM',
      'litecoin': 'LTC'
    };

    for (const [name, symbol] of Object.entries(nameMap)) {
      if (text.includes(name) && !assets.includes(symbol)) {
        assets.push(symbol);
      }
    }

    return assets;
  }

  /**
   * Check if event is confirmed (not just rumor/speculation)
   */
  private isConfirmed(text: string, matches: KeywordMatch[]): boolean {
    // Conservative default: false
    // Only mark as confirmed if we see confirmation keywords
    const confirmationKeywords = [
      'confirmed', 'official', 'announced', 'statement', 'press release',
      'admitted', 'verified', 'disclosed', 'reported by'
    ];

    const speculationKeywords = [
      'rumor', 'alleged', 'reportedly', 'unconfirmed', 'speculation',
      'may', 'might', 'could', 'possibly', 'potentially'
    ];

    const hasConfirmation = confirmationKeywords.some(kw => text.includes(kw));
    const hasSpeculation = speculationKeywords.some(kw => text.includes(kw));

    // If high severity event, require explicit confirmation
    const hasHighSeverity = matches.some(m => m.severity === 'high');
    if (hasHighSeverity) {
      return hasConfirmation && !hasSpeculation;
    }

    // For medium/low severity, confirmation keywords are enough
    return hasConfirmation || (!hasSpeculation && matches.length >= 3);
  }

  /**
   * Generate summary description
   */
  private generateSummary(
    eventType: string,
    severity: string,
    affectedAssets: string[],
    matches: KeywordMatch[]
  ): string {
    const assetStr = affectedAssets.length > 0 
      ? ` affecting ${affectedAssets.join(', ')}` 
      : '';

    const keywordStr = matches.slice(0, 3).map(m => m.term).join(', ');

    return `${severity.toUpperCase()} severity ${eventType} event${assetStr}. Keywords: ${keywordStr}`;
  }

  /**
   * Convert severity to numeric score
   */
  private severityScore(severity: 'low' | 'medium' | 'high'): number {
    const map = { low: 1, medium: 2, high: 3 };
    return map[severity];
  }

  /**
   * Get all keywords for a category
   */
  getKeywordsByCategory(category: string): any[] {
    return this.keywords.filter(kw => kw.categories.includes(category));
  }

  /**
   * Get all keywords for an event type
   */
  getKeywordsByEventType(eventType: string): any[] {
    return this.keywords.filter(kw => kw.eventType === eventType);
  }
}

// Singleton instance
export const keywordMatcher = new KeywordMatcher();


import { Cryptocurrency, CryptoRecommendation, RecommendationType, RiskLevel, TimeHorizon } from '@/types';
import axios from 'axios';

export interface MarketAnalysis {
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
  support: number;
  resistance: number;
  riskScore: number;
}

export interface RecommendationFactors {
  priceStability: number;
  marketCap: number;
  volume: number;
  recentPerformance: number;
  volatility: number;
  correlation: number;
}

export class AIRecommendationService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '';
    this.baseUrl = 'https://api.coingecko.com/api/v3';
  }

  // Get spending recommendation based on current market conditions
  async getSpendingRecommendation(
    userCryptocurrencies: Cryptocurrency[],
    amount: number,
    userRiskTolerance: RiskLevel = 'medium'
  ): Promise<CryptoRecommendation> {
    try {
      // Analyze each cryptocurrency for spending suitability
      const analyses = await Promise.all(
        userCryptocurrencies.map(crypto => this.analyzeCryptocurrency(crypto))
      );

      // Score each cryptocurrency for spending
      const scoredCryptos = analyses.map((analysis, index) => ({
        cryptocurrency: userCryptocurrencies[index],
        analysis,
        score: this.calculateSpendingScore(analysis, userRiskTolerance, amount)
      }));

      // Sort by score and get the best recommendation
      scoredCryptos.sort((a, b) => b.score - a.score);
      const bestCrypto = scoredCryptos[0];

      // Generate reasoning
      const reasoning = this.generateSpendingReasoning(bestCrypto.analysis, bestCrypto.cryptocurrency);

      // Get alternatives
      const alternatives = scoredCryptos.slice(1, 4).map(item => item.cryptocurrency);

      return {
        cryptocurrency: bestCrypto.cryptocurrency,
        recommendationType: 'spend',
        confidence: Math.min(bestCrypto.score * 100, 95),
        reasoning,
        riskLevel: this.calculateRiskLevel(bestCrypto.analysis.riskScore),
        expectedReturn: this.calculateExpectedReturn(bestCrypto.analysis),
        timeHorizon: 'short',
        alternatives,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting spending recommendation:', error);
      throw new Error('Failed to generate spending recommendation');
    }
  }

  // Get investment recommendation for next crypto to acquire
  async getInvestmentRecommendation(
    availableCryptocurrencies: Cryptocurrency[],
    userRiskTolerance: RiskLevel = 'medium',
    investmentAmount: number
  ): Promise<CryptoRecommendation> {
    try {
      // Analyze all available cryptocurrencies
      const analyses = await Promise.all(
        availableCryptocurrencies.map(crypto => this.analyzeCryptocurrency(crypto))
      );

      // Score each cryptocurrency for investment
      const scoredCryptos = analyses.map((analysis, index) => ({
        cryptocurrency: availableCryptocurrencies[index],
        analysis,
        score: this.calculateInvestmentScore(analysis, userRiskTolerance, investmentAmount)
      }));

      // Sort by score and get the best recommendation
      scoredCryptos.sort((a, b) => b.score - a.score);
      const bestCrypto = scoredCryptos[0];

      // Generate reasoning
      const reasoning = this.generateInvestmentReasoning(bestCrypto.analysis, bestCrypto.cryptocurrency);

      // Get alternatives
      const alternatives = scoredCryptos.slice(1, 4).map(item => item.cryptocurrency);

      return {
        cryptocurrency: bestCrypto.cryptocurrency,
        recommendationType: 'invest',
        confidence: Math.min(bestCrypto.score * 100, 95),
        reasoning,
        riskLevel: this.calculateRiskLevel(bestCrypto.analysis.riskScore),
        expectedReturn: this.calculateExpectedReturn(bestCrypto.analysis),
        timeHorizon: 'medium',
        alternatives,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting investment recommendation:', error);
      throw new Error('Failed to generate investment recommendation');
    }
  }

  // Analyze a single cryptocurrency
  private async analyzeCryptocurrency(crypto: Cryptocurrency): Promise<MarketAnalysis> {
    try {
      // Calculate volatility (standard deviation of price changes)
      const volatility = this.calculateVolatility(crypto);

      // Determine trend
      const trend = this.determineTrend(crypto);

      // Calculate momentum
      const momentum = this.calculateMomentum(crypto);

      // Calculate support and resistance levels
      const support = this.calculateSupportLevel(crypto);
      const resistance = this.calculateResistanceLevel(crypto);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(crypto, volatility);

      return {
        volatility,
        trend,
        momentum,
        support,
        resistance,
        riskScore
      };
    } catch (error) {
      console.error('Error analyzing cryptocurrency:', error);
      throw new Error('Failed to analyze cryptocurrency');
    }
  }

  // Calculate volatility based on price changes
  private calculateVolatility(crypto: Cryptocurrency): number {
    const priceChanges = [
      crypto.price_change_percentage_1h_in_currency || 0,
      crypto.price_change_percentage_24h_in_currency || 0,
      crypto.price_change_percentage_7d_in_currency || 0,
      crypto.price_change_percentage_30d_in_currency || 0
    ];

    const mean = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const variance = priceChanges.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / priceChanges.length;
    
    return Math.sqrt(variance);
  }

  // Determine market trend
  private determineTrend(crypto: Cryptocurrency): 'bullish' | 'bearish' | 'neutral' {
    const shortTerm = crypto.price_change_percentage_1h_in_currency || 0;
    const mediumTerm = crypto.price_change_percentage_24h_in_currency || 0;
    const longTerm = crypto.price_change_percentage_7d_in_currency || 0;

    const averageChange = (shortTerm + mediumTerm + longTerm) / 3;

    if (averageChange > 2) return 'bullish';
    if (averageChange < -2) return 'bearish';
    return 'neutral';
  }

  // Calculate momentum
  private calculateMomentum(crypto: Cryptocurrency): number {
    const shortTerm = crypto.price_change_percentage_1h_in_currency || 0;
    const mediumTerm = crypto.price_change_percentage_24h_in_currency || 0;
    
    // Weight recent changes more heavily
    return (shortTerm * 0.7) + (mediumTerm * 0.3);
  }

  // Calculate support level (simplified)
  private calculateSupportLevel(crypto: Cryptocurrency): number {
    return crypto.current_price * 0.95; // 5% below current price
  }

  // Calculate resistance level (simplified)
  private calculateResistanceLevel(crypto: Cryptocurrency): number {
    return crypto.current_price * 1.05; // 5% above current price
  }

  // Calculate risk score
  private calculateRiskScore(crypto: Cryptocurrency, volatility: number): number {
    const marketCapRisk = Math.max(0, 1 - (crypto.market_cap / 1000000000)); // Higher risk for smaller market cap
    const volumeRisk = Math.max(0, 1 - (crypto.total_volume / 10000000)); // Higher risk for lower volume
    const volatilityRisk = Math.min(1, volatility / 10); // Higher risk for higher volatility

    return (marketCapRisk + volumeRisk + volatilityRisk) / 3;
  }

  // Calculate spending score
  private calculateSpendingScore(
    analysis: MarketAnalysis,
    riskTolerance: RiskLevel,
    amount: number
  ): number {
    const volatilityScore = Math.max(0, 1 - analysis.volatility / 5); // Lower volatility is better for spending
    const stabilityScore = analysis.trend === 'neutral' ? 1 : 0.5; // Neutral trend is better for spending
    const riskScore = Math.max(0, 1 - analysis.riskScore);

    // Weight factors based on risk tolerance
    const weights = this.getRiskToleranceWeights(riskTolerance);
    
    return (
      volatilityScore * weights.volatility +
      stabilityScore * weights.stability +
      riskScore * weights.risk
    );
  }

  // Calculate investment score
  private calculateInvestmentScore(
    analysis: MarketAnalysis,
    riskTolerance: RiskLevel,
    amount: number
  ): number {
    const momentumScore = analysis.momentum > 0 ? Math.min(1, analysis.momentum / 5) : 0;
    const trendScore = analysis.trend === 'bullish' ? 1 : analysis.trend === 'neutral' ? 0.5 : 0;
    const riskScore = this.getRiskAdjustedScore(analysis.riskScore, riskTolerance);

    const weights = this.getRiskToleranceWeights(riskTolerance);
    
    return (
      momentumScore * weights.momentum +
      trendScore * weights.trend +
      riskScore * weights.risk
    );
  }

  // Get risk tolerance weights
  private getRiskToleranceWeights(riskTolerance: RiskLevel) {
    switch (riskTolerance) {
      case 'low':
        return { volatility: 0.5, stability: 0.3, risk: 0.2, momentum: 0.2, trend: 0.3 };
      case 'medium':
        return { volatility: 0.4, stability: 0.3, risk: 0.3, momentum: 0.3, trend: 0.4 };
      case 'high':
        return { volatility: 0.2, stability: 0.2, risk: 0.6, momentum: 0.4, trend: 0.5 };
      case 'extreme':
        return { volatility: 0.1, stability: 0.1, risk: 0.8, momentum: 0.5, trend: 0.6 };
      default:
        return { volatility: 0.4, stability: 0.3, risk: 0.3, momentum: 0.3, trend: 0.4 };
    }
  }

  // Get risk-adjusted score
  private getRiskAdjustedScore(riskScore: number, riskTolerance: RiskLevel): number {
    switch (riskTolerance) {
      case 'low':
        return Math.max(0, 1 - riskScore * 2);
      case 'medium':
        return Math.max(0, 1 - riskScore * 1.5);
      case 'high':
        return Math.max(0, 1 - riskScore);
      case 'extreme':
        return Math.max(0, 1 - riskScore * 0.5);
      default:
        return Math.max(0, 1 - riskScore * 1.5);
    }
  }

  // Calculate expected return
  private calculateExpectedReturn(analysis: MarketAnalysis): number {
    const baseReturn = analysis.momentum * 0.5;
    const trendBonus = analysis.trend === 'bullish' ? 0.1 : analysis.trend === 'bearish' ? -0.1 : 0;
    const volatilityAdjustment = analysis.volatility * 0.1;
    
    return Math.max(-0.5, Math.min(0.5, baseReturn + trendBonus + volatilityAdjustment));
  }

  // Calculate risk level
  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore < 0.25) return 'low';
    if (riskScore < 0.5) return 'medium';
    if (riskScore < 0.75) return 'high';
    return 'extreme';
  }

  // Generate spending reasoning
  private generateSpendingReasoning(analysis: MarketAnalysis, crypto: Cryptocurrency): string[] {
    const reasons: string[] = [];

    if (analysis.volatility < 2) {
      reasons.push(`${crypto.name} shows low volatility, making it stable for spending`);
    }

    if (analysis.trend === 'neutral') {
      reasons.push(`Price trend is stable, reducing risk of value loss`);
    }

    if (analysis.riskScore < 0.3) {
      reasons.push(`Low risk profile compared to other cryptocurrencies`);
    }

    if (crypto.market_cap > 1000000000) {
      reasons.push(`Large market cap provides stability and liquidity`);
    }

    if (crypto.total_volume > 10000000) {
      reasons.push(`High trading volume ensures easy conversion`);
    }

    return reasons.length > 0 ? reasons : [`${crypto.name} is the most suitable option based on current market conditions`];
  }

  // Generate investment reasoning
  private generateInvestmentReasoning(analysis: MarketAnalysis, crypto: Cryptocurrency): string[] {
    const reasons: string[] = [];

    if (analysis.momentum > 0) {
      reasons.push(`Positive momentum indicates upward price movement`);
    }

    if (analysis.trend === 'bullish') {
      reasons.push(`Bullish trend suggests potential for growth`);
    }

    if (analysis.riskScore < 0.5) {
      reasons.push(`Acceptable risk level for potential returns`);
    }

    if (crypto.market_cap < 1000000000) {
      reasons.push(`Smaller market cap offers higher growth potential`);
    }

    if (crypto.price_change_percentage_24h > 5) {
      reasons.push(`Recent strong performance indicates market interest`);
    }

    return reasons.length > 0 ? reasons : [`${crypto.name} shows the best risk-reward profile for investment`];
  }

  // Get market sentiment analysis
  async getMarketSentiment(): Promise<{
    fearGreedIndex: number;
    overallSentiment: 'fear' | 'greed' | 'neutral';
    trendingTopics: string[];
  }> {
    try {
      // This would typically call a sentiment analysis API
      // For now, return mock data
      return {
        fearGreedIndex: 65,
        overallSentiment: 'greed',
        trendingTopics: ['Bitcoin ETF', 'DeFi', 'NFTs', 'Layer 2']
      };
    } catch (error) {
      console.error('Error getting market sentiment:', error);
      return {
        fearGreedIndex: 50,
        overallSentiment: 'neutral',
        trendingTopics: []
      };
    }
  }
}

// Create singleton instance
export const aiRecommendationService = new AIRecommendationService(); 
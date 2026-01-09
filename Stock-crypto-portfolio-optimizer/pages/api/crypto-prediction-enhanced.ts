/**
 * Enhanced Crypto Prediction API with Bot Architecture
 * 
 * Uses BotOrchestrator to fetch data from multiple sources
 * Enforces secondary signal gating
 * Provides recommendations with full audit trail
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { botOrchestrator } from '@/lib/bots/BotOrchestrator';

interface PredictionRequest {
  walletAddress?: string;
  holdings?: Array<{ symbol: string; amount: number; avgPrice: number }>;
  transactionAmount: number;
  purpose?: string;
}

interface PredictionResponse {
  success: boolean;
  recommendation?: {
    useSymbol: string;
    useAmount: number;
    reasons: string[];
    score: number;
    alternatives: Array<{ symbol: string; amount: number; score: number }>;
    holdSymbols: string[];
  };
  analysis?: {
    technical: string;
    sentiment: string;
    prediction: string;
  };
  botData?: {
    coreMetrics: any;
    secondarySignals: any;
    excludedAssets: any;
    confidence: any;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PredictionResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { walletAddress, holdings, transactionAmount, purpose = 'transaction' } = req.body as PredictionRequest;

    // Validate input
    if (!transactionAmount || transactionAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid transaction amount is required'
      });
    }

    // Get holdings
    let portfolioHoldings = holdings || [];
    
    if (walletAddress && !holdings) {
      // TODO: Fetch from wallet
      return res.status(400).json({
        success: false,
        error: 'Wallet fetching not yet implemented. Please provide holdings array.'
      });
    }

    if (portfolioHoldings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No holdings provided'
      });
    }

    // Extract asset symbols
    const assets = portfolioHoldings.map(h => h.symbol);

    // Run bot orchestrator
    const botOutput = await botOrchestrator.run({
      assets,
      transactionAmount,
      lookbackHours: 24
    });

    // Filter out excluded assets
    const excludedSymbols = new Set(botOutput.excludedAssets.map(e => e.asset));
    const availableHoldings = portfolioHoldings.filter(h => !excludedSymbols.has(h.symbol));

    if (availableHoldings.length === 0) {
      return res.status(400).json({
        success: false,
        error: `All assets excluded: ${botOutput.excludedAssets.map(e => `${e.asset} (${e.reason})`).join(', ')}`
      });
    }

    // Score each available holding
    const scoredHoldings = availableHoldings.map(holding => {
      const symbol = holding.symbol;
      
      // Get core metrics
      const price = botOutput.coreMetrics.price[symbol] || 0;
      const volatility = botOutput.coreMetrics.volatility[symbol] || 0;
      const liquidity = botOutput.coreMetrics.liquidity[symbol] || 0;
      const spread = botOutput.coreMetrics.spread[symbol] || 0;
      const fees = botOutput.coreMetrics.fees[symbol] || 0;
      const congestion = botOutput.coreMetrics.congestion[symbol] || 0;

      // Calculate score (prefer low volatility, high liquidity, low fees)
      let score = 0;
      const reasons: string[] = [];

      // Factor 1: Volatility (prefer low for spending)
      if (volatility < 0.02) {
        score += 5;
        reasons.push(`✅ Low volatility (${(volatility * 100).toFixed(2)}%)`);
      } else if (volatility > 0.05) {
        score -= 3;
        reasons.push(`⚠️ High volatility (${(volatility * 100).toFixed(2)}%)`);
      }

      // Factor 2: Liquidity (prefer high)
      if (liquidity > transactionAmount * 10) {
        score += 3;
        reasons.push(`✅ High liquidity`);
      } else if (liquidity < transactionAmount * 2) {
        score -= 2;
        reasons.push(`⚠️ Low liquidity for transaction size`);
      }

      // Factor 3: Spread (prefer low)
      if (spread < 0.005) {
        score += 2;
        reasons.push(`✅ Tight spread (${(spread * 100).toFixed(2)}%)`);
      } else if (spread > 0.02) {
        score -= 2;
        reasons.push(`⚠️ Wide spread (${(spread * 100).toFixed(2)}%)`);
      }

      // Factor 4: Fees (prefer low)
      if (fees < 1) {
        score += 2;
        reasons.push(`✅ Low fees ($${fees.toFixed(2)})`);
      } else if (fees > 5) {
        score -= 2;
        reasons.push(`⚠️ High fees ($${fees.toFixed(2)})`);
      }

      // Factor 5: Congestion (prefer low)
      if (congestion < 0.3) {
        score += 1;
        reasons.push(`✅ Low network congestion`);
      } else if (congestion > 0.7) {
        score -= 2;
        reasons.push(`⚠️ High network congestion`);
      }

      // Factor 6: Secondary signals (for explainability only)
      const hasNegativeNews = botOutput.secondarySignals.eventFlags.some(
        flag => flag.affectedAssets.includes(symbol) && flag.severity === 'medium'
      );
      if (hasNegativeNews) {
        reasons.push(`ℹ️ Recent negative news (see details)`);
      }

      const currentValue = holding.amount * price;

      return {
        holding,
        score,
        reasons,
        price,
        currentValue
      };
    });

    // Filter holdings with enough value
    const feasibleHoldings = scoredHoldings.filter(
      sh => sh.currentValue >= transactionAmount
    );

    if (feasibleHoldings.length === 0) {
      return res.status(400).json({
        success: false,
        error: `No single holding has enough value ($${transactionAmount.toFixed(2)} needed)`
      });
    }

    // Sort by score (highest = best to use)
    feasibleHoldings.sort((a, b) => b.score - a.score);

    const best = feasibleHoldings[0];
    const amountNeeded = transactionAmount / best.price;

    // Generate AI analysis if available
    let aiAnalysis;
    if (process.env.OPENAI_API_KEY) {
      aiAnalysis = await getAIAnalysis(botOutput, best.holding.symbol, transactionAmount);
    }

    return res.status(200).json({
      success: true,
      recommendation: {
        useSymbol: best.holding.symbol,
        useAmount: amountNeeded,
        reasons: best.reasons,
        score: best.score,
        alternatives: feasibleHoldings.slice(1, 3).map(sh => ({
          symbol: sh.holding.symbol,
          amount: transactionAmount / sh.price,
          score: sh.score
        })),
        holdSymbols: scoredHoldings
          .filter(sh => sh.score < 0)
          .map(sh => sh.holding.symbol)
      },
      analysis: aiAnalysis,
      botData: {
        coreMetrics: botOutput.coreMetrics,
        secondarySignals: {
          eventFlags: botOutput.secondarySignals.eventFlags,
          regulatoryRisk: botOutput.secondarySignals.regulatoryRisk,
          newsImpact: botOutput.secondarySignals.newsImpact
        },
        excludedAssets: botOutput.excludedAssets,
        confidence: botOutput.confidence
      }
    });

  } catch (error) {
    console.error('Enhanced crypto prediction error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

async function getAIAnalysis(botOutput: any, recommendedSymbol: string, amount: number) {
  if (!process.env.OPENAI_API_KEY) return undefined;

  const newsContext = botOutput.secondarySignals.newsImpact?.summary || 'No recent news';
  const excludedContext = botOutput.excludedAssets.length > 0
    ? `Excluded: ${botOutput.excludedAssets.map((e: any) => `${e.asset} (${e.reason})`).join(', ')}`
    : 'No exclusions';

  const prompt = `Analyze this crypto transaction recommendation:

Recommended: ${recommendedSymbol} for $${amount}
Confidence: ${botOutput.confidence.overall}

News Context: ${newsContext}
${excludedContext}

Provide brief analysis (max 150 words):
1. Technical assessment
2. Market sentiment
3. Final recommendation`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a cryptocurrency analysis expert. Provide concise, actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    return {
      technical: aiResponse.split('\n')[0] || '',
      sentiment: aiResponse.split('\n')[1] || '',
      prediction: aiResponse.split('\n')[2] || ''
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return undefined;
  }
}


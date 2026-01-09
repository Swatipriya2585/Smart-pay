/**
 * Crypto Prediction API
 * 
 * Integrates the AI-powered crypto portfolio optimizer with connected wallet data
 * Provides predictions on which crypto to use for transactions
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';

// Import your crypto prediction logic
// Note: We'll adapt the Python logic to TypeScript
interface CryptoHolding {
  symbol: string;
  amount: number;
  avgPrice: number;
  currentPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPct?: number;
}

interface PredictionRequest {
  walletAddress?: string;
  holdings?: CryptoHolding[];
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
    alternatives: Array<{
      symbol: string;
      amount: number;
      score: number;
    }>;
    holdSymbols: string[];
  };
  analysis?: {
    technical: string;
    sentiment: string;
    prediction: string;
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

    // Get holdings from wallet if address provided
    let portfolioHoldings: CryptoHolding[] = holdings || [];
    
    if (walletAddress && !holdings) {
      try {
        portfolioHoldings = await getWalletHoldings(walletAddress);
      } catch (error) {
        console.error('Error fetching wallet holdings:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to fetch wallet holdings'
        });
      }
    }

    if (portfolioHoldings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No holdings provided. Either provide wallet address or holdings array.'
      });
    }

    // Fetch current prices for all holdings
    const holdingsWithPrices = await enrichHoldingsWithPrices(portfolioHoldings);

    // Run prediction algorithm
    const prediction = await analyzeCryptoPortfolio(
      holdingsWithPrices,
      transactionAmount,
      purpose
    );

    // Get AI analysis if OpenAI key is available
    let aiAnalysis;
    if (process.env.OPENAI_API_KEY) {
      aiAnalysis = await getAIAnalysis(holdingsWithPrices, transactionAmount, purpose);
    }

    return res.status(200).json({
      success: true,
      recommendation: prediction,
      analysis: aiAnalysis
    });

  } catch (error) {
    console.error('Crypto prediction error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

/**
 * Get wallet holdings from Solana blockchain
 */
async function getWalletHoldings(walletAddress: string): Promise<CryptoHolding[]> {
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  );

  const publicKey = new PublicKey(walletAddress);
  
  // Get SOL balance
  const balance = await connection.getBalance(publicKey);
  const solBalance = balance / 1e9; // Convert lamports to SOL

  const holdings: CryptoHolding[] = [];

  if (solBalance > 0) {
    holdings.push({
      symbol: 'SOL',
      amount: solBalance,
      avgPrice: 0 // We don't have historical purchase price from blockchain
    });
  }

  // TODO: Get SPL token balances
  // This would require fetching all token accounts for the wallet
  
  return holdings;
}

/**
 * Enrich holdings with current prices from CoinGecko
 */
async function enrichHoldingsWithPrices(holdings: CryptoHolding[]): Promise<CryptoHolding[]> {
  const symbolMap: { [key: string]: string } = {
    'SOL': 'solana',
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDC': 'usd-coin',
    'USDT': 'tether'
  };

  const symbols = holdings.map(h => symbolMap[h.symbol] || h.symbol.toLowerCase()).join(',');
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbols}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`
    );
    
    const prices = await response.json();

    return holdings.map(holding => {
      const coinId = symbolMap[holding.symbol] || holding.symbol.toLowerCase();
      const priceData = prices[coinId];
      
      if (priceData) {
        const currentPrice = priceData.usd;
        const currentValue = holding.amount * currentPrice;
        const costBasis = holding.avgPrice > 0 ? holding.amount * holding.avgPrice : currentValue;
        const profitLoss = currentValue - costBasis;
        const profitLossPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

        return {
          ...holding,
          currentPrice,
          currentValue,
          profitLoss,
          profitLossPct,
          change24h: priceData.usd_24h_change || 0,
          change7d: priceData.usd_7d_change || 0
        };
      }
      
      return holding;
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return holdings;
  }
}

/**
 * Analyze crypto portfolio and provide recommendation
 * This implements the scoring algorithm from your Python code
 */
async function analyzeCryptoPortfolio(
  holdings: CryptoHolding[],
  transactionAmount: number,
  purpose: string
) {
  const scores: Array<{
    symbol: string;
    score: number;
    reasons: string[];
    data: CryptoHolding;
  }> = [];

  for (const holding of holdings) {
    if (!holding.currentValue || holding.currentValue < transactionAmount) {
      continue; // Skip if not enough value
    }

    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Recent performance (prefer declining assets)
    const change24h = (holding as any).change24h || 0;
    if (change24h < -5) {
      score += 5;
      reasons.push(`📉 Declining 24h (-${Math.abs(change24h).toFixed(1)}%)`);
    } else if (change24h < -2) {
      score += 3;
      reasons.push(`📉 Declining 24h (-${Math.abs(change24h).toFixed(1)}%)`);
    } else if (change24h > 5) {
      score -= 5;
      reasons.push(`📈 Rising 24h (+${change24h.toFixed(1)}%) - HOLD`);
    }

    // Factor 2: Weekly trend
    const change7d = (holding as any).change7d || 0;
    if (change7d < -10) {
      score += 3;
      reasons.push(`📉 Weak weekly trend (-${Math.abs(change7d).toFixed(1)}%)`);
    } else if (change7d > 10) {
      score -= 3;
      reasons.push(`📈 Strong weekly trend (+${change7d.toFixed(1)}%) - HOLD`);
    }

    // Factor 3: Current profit/loss (prefer to use losers)
    if (holding.profitLossPct && holding.profitLossPct < -10) {
      score += 2;
      reasons.push(`💸 Currently at loss (-${Math.abs(holding.profitLossPct).toFixed(1)}%)`);
    } else if (holding.profitLossPct && holding.profitLossPct > 20) {
      score -= 2;
      reasons.push(`💰 Strong profit (+${holding.profitLossPct.toFixed(1)}%) - HOLD`);
    }

    scores.push({
      symbol: holding.symbol,
      score,
      reasons,
      data: holding
    });
  }

  if (scores.length === 0) {
    throw new Error(`No single holding has enough value ($${transactionAmount.toFixed(2)} needed)`);
  }

  // Sort by score (highest = best to use)
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const amountNeeded = transactionAmount / (best.data.currentPrice || 1);

  return {
    useSymbol: best.symbol,
    useAmount: amountNeeded,
    reasons: best.reasons,
    score: best.score,
    alternatives: scores.slice(1, 3).map(s => ({
      symbol: s.symbol,
      amount: transactionAmount / (s.data.currentPrice || 1),
      score: s.score
    })),
    holdSymbols: scores.filter(s => s.score < 0).map(s => s.symbol)
  };
}

/**
 * Get AI analysis using OpenAI
 */
async function getAIAnalysis(
  holdings: CryptoHolding[],
  transactionAmount: number,
  purpose: string
) {
  if (!process.env.OPENAI_API_KEY) {
    return undefined;
  }

  const holdingsStr = holdings
    .map(h => `${h.symbol}: ${h.amount.toFixed(4)} @ $${h.currentPrice?.toFixed(2) || 'N/A'}`)
    .join(', ');

  const prompt = `Analyze this crypto portfolio for a $${transactionAmount} ${purpose}:

Portfolio: ${holdingsStr}

Provide brief analysis of:
1. Technical trends (price momentum)
2. Sentiment (market conditions)
3. Prediction (which to use vs hold)

Keep response under 200 words.`;

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
        max_tokens: 300,
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


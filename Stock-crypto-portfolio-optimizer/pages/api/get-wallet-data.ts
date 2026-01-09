import type { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseService } from '@/services/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { publicKey } = req.query;

    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ 
        error: 'publicKey parameter is required' 
      });
    }

    // Get wallet data from database
    const walletData = await DatabaseService.getWalletData(publicKey);

    if (!walletData) {
      return res.status(404).json({
        success: false,
        error: 'Wallet data not found',
        message: 'No wallet data found for the provided public key'
      });
    }

    // Get additional portfolio data
    const portfolio = await DatabaseService.getUserPortfolio(walletData.userId);
    const holdings = await DatabaseService.getUserHoldings(walletData.userId);

    console.log('Wallet data retrieved successfully:', walletData);

    return res.status(200).json({
      success: true,
      message: 'Wallet data retrieved successfully',
      data: {
        wallet: walletData,
        portfolio,
        holdings
      }
    });

  } catch (error) {
    console.error('Error retrieving wallet data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve wallet data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
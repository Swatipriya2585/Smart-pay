import type { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseService } from '@/services/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { publicKey, phoneNumber, balance, usdValue } = req.body;

    // Validate required fields
    if (!publicKey || !phoneNumber || balance === undefined || usdValue === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: publicKey, phoneNumber, balance, usdValue' 
      });
    }

    // Validate data types
    if (typeof balance !== 'number' || typeof usdValue !== 'number') {
      return res.status(400).json({ 
        error: 'balance and usdValue must be numbers' 
      });
    }

    if (balance < 0 || usdValue < 0) {
      return res.status(400).json({ 
        error: 'balance and usdValue must be positive numbers' 
      });
    }

    // Save wallet data to database
    const walletData = await DatabaseService.savePhantomWalletData(
      publicKey,
      phoneNumber,
      balance,
      usdValue
    );

    console.log('Wallet data saved successfully:', walletData);

    return res.status(200).json({
      success: true,
      message: 'Wallet data saved successfully',
      data: walletData
    });

  } catch (error) {
    console.error('Error saving wallet data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save wallet data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fromAddress, toAddress, amount, memo } = req.body;

    // Validate required fields
    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromAddress, toAddress, amount'
      });
    }

    // Validate Solana addresses
    const addressRegex = /^[1-9A-HJ-NP-Za-km-z]{44}$/;
    if (!addressRegex.test(fromAddress) || !addressRegex.test(toAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana address format'
      });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    console.log('🚀 Starting Solana transaction:', {
      from: fromAddress,
      to: toAddress,
      amount: numAmount,
      memo
    });

    // Connect to Solana mainnet
    const connection = new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // Create public key objects
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(toAddress);

    // Check sender balance
    const balance = await connection.getBalance(fromPubkey);
    const balanceInSOL = balance / LAMPORTS_PER_SOL;
    
    console.log('💰 Sender balance:', balanceInSOL, 'SOL');

    if (balanceInSOL < numAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Create transaction
    const transaction = new Transaction();
    
    // Add transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: numAmount * LAMPORTS_PER_SOL
    });

    transaction.add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    console.log('📝 Transaction created:', {
      blockhash,
      feePayer: fromPubkey.toString()
    });

    // For now, we'll return a simulated transaction
    // In a real implementation, you would:
    // 1. Get the transaction signature from Phantom wallet
    // 2. Send the transaction to the network
    // 3. Wait for confirmation

    const simulatedTxHash = `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('✅ Transaction simulated successfully:', simulatedTxHash);

    // Simulate transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return res.status(200).json({
      success: true,
      data: {
        txHash: simulatedTxHash,
        amount: numAmount,
        fromAddress,
        toAddress,
        memo,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        fee: 0.000005 // Standard Solana transaction fee
      }
    });

  } catch (error) {
    console.error('❌ Error sending Solana transaction:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
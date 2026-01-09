import { NextApiRequest, NextApiResponse } from 'next';
import { solanaTransactionService } from '@/services/solana-transaction';
import { PublicKey } from '@solana/web3.js';
import { createRobustConnection } from '@/utils/solana-rpc';

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

    // Validate addresses
    try {
      new PublicKey(fromAddress);
      new PublicKey(toAddress);
    } catch (error) {
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
        error: 'Invalid amount. Must be a positive number'
      });
    }

    // Test RPC connection first
    try {
      await createRobustConnection();
    } catch (error) {
      console.error('❌ RPC connection failed:', error);
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Solana network. Please try again later.'
      });
    }

    // Initialize transaction service
    await solanaTransactionService.initialize();

    // Create transaction
    const transaction = await solanaTransactionService.createTransferTransaction(
      fromAddress,
      toAddress,
      numAmount,
      memo
    );

    // Validate transaction
    const validation = await solanaTransactionService.validateTransaction(
      transaction,
      fromAddress,
      numAmount
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Estimate fee
    const estimatedFee = await solanaTransactionService.estimateTransactionFee(transaction);

    // Serialize transaction for client-side signing
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    console.log('✅ Transaction created successfully:', {
      from: fromAddress,
      to: toAddress,
      amount: `${numAmount} SOL`,
      fee: `${estimatedFee / 1e9} SOL`,
      memo: memo || 'N/A'
    });

    return res.status(200).json({
      success: true,
      transaction: serializedTransaction.toString('base64'),
      estimatedFee: estimatedFee / 1e9, // Convert to SOL
      message: 'Transaction created successfully. Please sign with your wallet.'
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 
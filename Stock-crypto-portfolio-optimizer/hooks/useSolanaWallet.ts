import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

export interface SolanaTransaction {
  signature: string;
  blockhash: string;
  amount: number;
  from: string;
  to: string;
  memo?: string;
  timestamp: number;
}

export const useSolanaWallet = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, disconnect, select, wallet } = useWallet();
  
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<SolanaTransaction[]>([]);

  // Get wallet balance
  const getBalance = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);
      
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      setBalance(solBalance);
      
      console.log('💰 Wallet balance:', solBalance, 'SOL');
    } catch (err) {
      console.error('Error getting balance:', err);
      setError('Failed to get wallet balance');
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  // Send SOL transaction
  const sendSOL = useCallback(async (
    toAddress: string,
    amount: number,
    memo?: string
  ): Promise<SolanaTransaction> => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      // Validate address
      const toPublicKey = new PublicKey(toAddress);
      
      // Validate amount
      if (amount <= 0 || amount > balance) {
        throw new Error('Invalid amount');
      }

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPublicKey,
        lamports: amount * LAMPORTS_PER_SOL,
      });

      // Create transaction
      const transaction = new Transaction();
      transaction.add(transferInstruction);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('🚀 Sending transaction:', {
        from: publicKey.toString(),
        to: toAddress,
        amount,
        memo,
        blockhash
      });

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature);
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed to confirm');
      }

      console.log('✅ Transaction confirmed:', signature);

      // Create transaction record
      const transactionRecord: SolanaTransaction = {
        signature,
        blockhash,
        amount,
        from: publicKey.toString(),
        to: toAddress,
        memo,
        timestamp: Date.now()
      };

      // Update recent transactions
      setRecentTransactions(prev => [transactionRecord, ...prev.slice(0, 9)]);
      
      // Update balance
      await getBalance();

      return transactionRecord;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      console.error('❌ Transaction failed:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, balance, getBalance]);

  // Get recent transactions
  const getRecentTransactions = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      
      const transactions: SolanaTransaction[] = [];
      
      for (const sig of signatures) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (tx && tx.meta) {
            // Extract transaction details
            const instructions = tx.transaction.message.instructions;
            for (const instruction of instructions) {
              if (instruction.programId.equals(SystemProgram.programId)) {
                const transferData = SystemProgram.transfer.decode(instruction);
                if (transferData) {
                  transactions.push({
                    signature: sig.signature,
                    blockhash: sig.blockhash || '',
                    amount: transferData.lamports / LAMPORTS_PER_SOL,
                    from: transferData.fromPubkey.toString(),
                    to: transferData.toPubkey.toString(),
                    timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now()
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Error processing transaction:', err);
        }
      }

      setRecentTransactions(transactions);
      
    } catch (err) {
      console.error('Error getting recent transactions:', err);
      setError('Failed to get recent transactions');
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  // Estimate transaction fee
  const estimateFee = useCallback(async (
    toAddress: string,
    amount: number
  ): Promise<number> => {
    if (!publicKey) return 0;

    try {
      const toPublicKey = new PublicKey(toAddress);

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPublicKey,
        lamports: amount * LAMPORTS_PER_SOL,
      });

      const transaction = new Transaction();
      transaction.add(transferInstruction);

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const fee = await connection.getFeeForMessage(
        transaction.compileMessage(),
        blockhash
      );

      return fee.value || 0;
    } catch (err) {
      console.error('Error estimating fee:', err);
      // Return default fee
      return 0.000005 * LAMPORTS_PER_SOL;
    }
  }, [connection, publicKey]);

  // Validate Solana address
  const isValidAddress = useCallback((address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Auto-refresh balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      getBalance();
      getRecentTransactions();
    } else {
      setBalance(0);
      setRecentTransactions([]);
    }
  }, [connected, publicKey, getBalance, getRecentTransactions]);

  return {
    // Wallet state
    publicKey,
    connected,
    balance,
    loading,
    error,
    recentTransactions,
    
    // Wallet actions
    sendSOL,
    getBalance,
    getRecentTransactions,
    estimateFee,
    isValidAddress,
    disconnect,
    select,
    wallet,
    
    // Clear error
    clearError: () => setError(null)
  };
}; 
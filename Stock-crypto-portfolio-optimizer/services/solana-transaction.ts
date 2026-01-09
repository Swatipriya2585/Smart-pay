import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL, 
  Commitment,
  VersionedTransaction,
  TransactionMessage,
  SendOptions,
  RpcResponseAndContext,
  SignatureResult
} from '@solana/web3.js';
import { 
  createConnection, 
  sendSolanaTransaction, 
  confirmTransaction, 
  getTransactionStatus,
  createRobustConnection,
  exponentialBackoff 
} from '@/utils/solana-rpc';

// Transaction configuration
const TRANSACTION_CONFIG = {
  maxRetries: 5,
  confirmationCommitment: 'confirmed' as Commitment,
  preflightCommitment: 'confirmed' as Commitment,
  skipPreflight: false,
  maxSupportedTransactionVersion: 0,
  timeout: 30000, // 30 seconds
};

// Transaction status types
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'expired';

// Transaction result interface
export interface TransactionResult {
  signature: string;
  status: TransactionStatus;
  error?: any;
  slot?: number;
  confirmations?: number;
  fee?: number;
}

// Transaction options interface
export interface TransactionOptions {
  skipPreflight?: boolean;
  preflightCommitment?: Commitment;
  maxRetries?: number;
  timeout?: number;
  feePayer?: PublicKey;
}

export class SolanaTransactionService {
  private connection: Connection;

  constructor(connection?: Connection) {
    this.connection = connection || createConnection('https://api.mainnet-beta.solana.com');
  }

  // Set connection (useful for switching endpoints)
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  // Get current connection
  getConnection(): Connection {
    return this.connection;
  }

  // Create a SOL transfer transaction
  async createSolTransferTransaction(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number, // in SOL
    feePayer: PublicKey,
    memo?: string
  ): Promise<Transaction> {
    console.log(`🔧 Creating SOL transfer transaction...`);
    console.log(`   From: ${fromPublicKey.toString()}`);
    console.log(`   To: ${toPublicKey.toString()}`);
    console.log(`   Amount: ${amount} SOL`);
    console.log(`   Fee payer: ${feePayer.toString()}`);

    try {
      // Create transaction
      const transaction = new Transaction();

      // Add transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      });

      transaction.add(transferInstruction);

      // Add memo if provided
      if (memo) {
        const { MemoProgram } = await import('@solana/spl-memo');
        const memoInstruction = MemoProgram.createMemo({
          signers: [fromPublicKey],
          memo: memo,
        });
        transaction.add(memoInstruction);
      }

      // Get recent blockhash
      console.log(`📡 Getting recent blockhash...`);
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = feePayer;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      console.log(`✅ Transaction created successfully!`);
      console.log(`   Blockhash: ${blockhash}`);
      console.log(`   Last valid block height: ${lastValidBlockHeight}`);

      return transaction;
    } catch (error) {
      console.error(`❌ Failed to create SOL transfer transaction:`, error);
      throw new Error(`Failed to create SOL transfer transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send and confirm a transaction with comprehensive error handling
  async sendAndConfirmTransaction(
    transaction: Transaction,
    signers: any[] = [],
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const {
      skipPreflight = TRANSACTION_CONFIG.skipPreflight,
      preflightCommitment = TRANSACTION_CONFIG.preflightCommitment,
      maxRetries = TRANSACTION_CONFIG.maxRetries,
      timeout = TRANSACTION_CONFIG.timeout
    } = options;

    console.log(`🚀 Sending and confirming transaction...`);
    console.log(`   Skip preflight: ${skipPreflight}`);
    console.log(`   Preflight commitment: ${preflightCommitment}`);
    console.log(`   Max retries: ${maxRetries}`);
    console.log(`   Timeout: ${timeout}ms`);

    try {
      // Validate transaction
      if (!transaction.recentBlockhash) {
        throw new Error('Transaction missing recent blockhash');
      }

      if (!transaction.feePayer) {
        throw new Error('Transaction missing fee payer');
      }

      // Serialize transaction for logging
      const serializedTx = transaction.serialize().toString('base64');
      console.log(`📝 Transaction serialized (base64): ${serializedTx.substring(0, 100)}...`);

      // Send transaction with exponential backoff
      const signature = await exponentialBackoff(
        async () => {
          console.log(`📡 Sending transaction...`);
          
          const sendOptions: SendOptions = {
            skipPreflight,
            preflightCommitment,
            maxRetries: 1, // We handle retries ourselves
          };

          return await this.connection.sendTransaction(transaction, signers, sendOptions);
        },
        maxRetries
      );

      console.log(`✅ Transaction sent successfully!`);
      console.log(`   Signature: ${signature}`);

      // Confirm transaction with timeout
      const confirmed = await this.confirmTransactionWithTimeout(signature, timeout);

      if (confirmed) {
        // Get detailed transaction status
        const status = await getTransactionStatus(this.connection, signature);
        
        return {
          signature,
          status: status.status,
          slot: status.slot,
          confirmations: status.confirmations,
          error: status.error
        };
      } else {
        return {
          signature,
          status: 'expired',
          error: 'Transaction confirmation timeout'
        };
      }

    } catch (error) {
      console.error(`❌ Transaction sending failed:`, error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
        console.error(`   Error stack: ${error.stack}`);
      }

      return {
        signature: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Confirm transaction with timeout
  private async confirmTransactionWithTimeout(
    signature: string,
    timeout: number
  ): Promise<boolean> {
    console.log(`⏳ Confirming transaction with ${timeout}ms timeout...`);

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeout);
      });

      // Create confirmation promise
      const confirmationPromise = confirmTransaction(
        this.connection,
        signature,
        TRANSACTION_CONFIG.confirmationCommitment,
        TRANSACTION_CONFIG.maxRetries
      );

      // Race between timeout and confirmation
      return await Promise.race([confirmationPromise, timeoutPromise]);
    } catch (error) {
      console.error(`❌ Transaction confirmation failed:`, error);
      return false;
    }
  }

  // Send SOL with comprehensive error handling
  async sendSol(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number, // in SOL
    feePayer: PublicKey,
    memo?: string,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    console.log(`💰 Sending ${amount} SOL...`);
    console.log(`   From: ${fromPublicKey.toString()}`);
    console.log(`   To: ${toPublicKey.toString()}`);

    try {
      // Validate inputs
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (!fromPublicKey || !toPublicKey || !feePayer) {
        throw new Error('Invalid public keys provided');
      }

      // Check sender balance
      const balance = await this.connection.getBalance(fromPublicKey);
      const requiredAmount = Math.floor(amount * LAMPORTS_PER_SOL);
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance. Required: ${amount} SOL, Available: ${balance / LAMPORTS_PER_SOL} SOL`);
      }

      // Create transaction
      const transaction = await this.createSolTransferTransaction(
        fromPublicKey,
        toPublicKey,
        amount,
        feePayer,
        memo
      );

      // Send and confirm transaction
      const result = await this.sendAndConfirmTransaction(transaction, [], options);

      if (result.status === 'confirmed') {
        console.log(`✅ SOL transfer completed successfully!`);
        console.log(`   Signature: ${result.signature}`);
        console.log(`   Amount: ${amount} SOL`);
      } else {
        console.error(`❌ SOL transfer failed:`, result.error);
      }

      return result;

    } catch (error) {
      console.error(`❌ SOL transfer failed:`, error);
      
      return {
        signature: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get transaction details
  async getTransaction(signature: string): Promise<any> {
    try {
      console.log(`🔍 Getting transaction details: ${signature}`);
      
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: TRANSACTION_CONFIG.maxSupportedTransactionVersion
      });

      if (!transaction) {
        console.log(`⚠️ Transaction not found: ${signature}`);
        return null;
      }

      console.log(`✅ Transaction details retrieved`);
      console.log(`   Slot: ${transaction.slot}`);
      console.log(`   Block time: ${transaction.blockTime}`);
      console.log(`   Fee: ${transaction.meta?.fee}`);

      return transaction;
    } catch (error) {
      console.error(`❌ Failed to get transaction:`, error);
      return null;
    }
  }

  // Get recent transactions for an account
  async getRecentTransactions(
    publicKey: PublicKey,
    limit: number = 10
  ): Promise<any[]> {
    try {
      console.log(`🔍 Getting recent transactions for: ${publicKey.toString()}`);
      
      const signatures = await this.connection.getSignaturesForAddress(publicKey, {
        limit,
        commitment: 'confirmed'
      });

      console.log(`✅ Found ${signatures.length} recent transactions`);

      const transactions = [];
      for (const sig of signatures) {
        const transaction = await this.getTransaction(sig.signature);
        if (transaction) {
          transactions.push(transaction);
        }
      }

      return transactions;
    } catch (error) {
      console.error(`❌ Failed to get recent transactions:`, error);
      return [];
    }
  }

  // Estimate transaction fee
  async estimateTransactionFee(transaction: Transaction): Promise<number> {
    try {
      console.log(`💰 Estimating transaction fee...`);
      
      const { feeCalculator } = await this.connection.getRecentBlockhash();
      const fee = feeCalculator.lamportsPerSignature;
      
      console.log(`✅ Estimated fee: ${fee} lamports (${fee / LAMPORTS_PER_SOL} SOL)`);
      return fee;
    } catch (error) {
      console.error(`❌ Failed to estimate transaction fee:`, error);
      return 5000; // Default fee
    }
  }

  // Validate transaction before sending
  async validateTransaction(transaction: Transaction): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check for required fields
      if (!transaction.recentBlockhash) {
        errors.push('Transaction missing recent blockhash');
      }

      if (!transaction.feePayer) {
        errors.push('Transaction missing fee payer');
      }

      if (transaction.instructions.length === 0) {
        errors.push('Transaction has no instructions');
      }

      // Check fee payer balance
      if (transaction.feePayer) {
        const balance = await this.connection.getBalance(transaction.feePayer);
        const estimatedFee = await this.estimateTransactionFee(transaction);
        
        if (balance < estimatedFee) {
          errors.push(`Insufficient balance for fee. Required: ${estimatedFee} lamports, Available: ${balance} lamports`);
        }
      }

      // Simulate transaction if no errors so far
      if (errors.length === 0) {
        try {
          const simulation = await this.connection.simulateTransaction(transaction);
          
          if (simulation.value.err) {
            errors.push(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
          }
        } catch (simError) {
          errors.push(`Transaction simulation error: ${simError instanceof Error ? simError.message : 'Unknown error'}`);
        }
      }

      const valid = errors.length === 0;
      
      if (valid) {
        console.log(`✅ Transaction validation passed`);
      } else {
        console.error(`❌ Transaction validation failed:`, errors);
      }

      return { valid, errors };
    } catch (error) {
      console.error(`❌ Transaction validation error:`, error);
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  }
}

// Create singleton instance
export const solanaTransactionService = new SolanaTransactionService(); 
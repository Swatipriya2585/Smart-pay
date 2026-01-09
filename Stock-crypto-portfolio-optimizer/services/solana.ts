import { Connection, PublicKey, Transaction as SolanaTransaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Cryptocurrency, Transaction, TransactionStatus } from '@/types';

export class SolanaService {
  private connection: Connection;
  private network: 'mainnet' | 'devnet' | 'testnet';

  constructor(rpcUrl: string, network: 'mainnet' | 'devnet' | 'testnet' = 'mainnet') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.network = network;
  }

  // Get connection instance
  getConnection(): Connection {
    return this.connection;
  }

  // Get network type
  getNetwork(): string {
    return this.network;
  }

  // Get account balance
  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get account balance');
    }
  }

  // Get token balance
  async getTokenBalance(publicKey: PublicKey, tokenMint: PublicKey): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: tokenMint,
      });

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }

  // Send SOL transaction
  async sendSolTransaction(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    amount: number,
    feePayer: PublicKey
  ): Promise<string> {
    try {
      const transaction = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      const latestBlockhash = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = feePayer;

      // Note: This transaction needs to be signed by the wallet
      // The actual signing should be done by the wallet adapter
      return transaction.serialize().toString('base64');
    } catch (error) {
      console.error('Error creating SOL transaction:', error);
      throw new Error('Failed to create SOL transaction');
    }
  }

  // Send SPL token transaction
  async sendTokenTransaction(
    fromPublicKey: PublicKey,
    toPublicKey: PublicKey,
    tokenMint: PublicKey,
    amount: number,
    feePayer: PublicKey
  ): Promise<string> {
    try {
      // Get token accounts
      const fromTokenAccount = await this.getTokenAccount(fromPublicKey, tokenMint);
      const toTokenAccount = await this.getTokenAccount(toPublicKey, tokenMint);

      if (!fromTokenAccount) {
        throw new Error('Sender does not have a token account for this mint');
      }

      const transaction = new SolanaTransaction();

      // Create token account for recipient if it doesn't exist
      if (!toTokenAccount) {
        const createAccountInstruction = await this.createTokenAccountInstruction(
          toPublicKey,
          tokenMint,
          feePayer
        );
        transaction.add(createAccountInstruction);
      }

      // Add transfer instruction
      const transferInstruction = Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        fromTokenAccount,
        toTokenAccount || toPublicKey,
        fromPublicKey,
        [],
        amount
      );
      transaction.add(transferInstruction);

      const latestBlockhash = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = feePayer;

      return transaction.serialize().toString('base64');
    } catch (error) {
      console.error('Error creating token transaction:', error);
      throw new Error('Failed to create token transaction');
    }
  }

  // Get token account for a specific mint
  private async getTokenAccount(owner: PublicKey, mint: PublicKey): Promise<PublicKey | null> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(owner, {
        mint: mint,
      });

      return tokenAccounts.value.length > 0 ? tokenAccounts.value[0].pubkey : null;
    } catch (error) {
      console.error('Error getting token account:', error);
      return null;
    }
  }

  // Create token account instruction
  private async createTokenAccountInstruction(
    owner: PublicKey,
    mint: PublicKey,
    feePayer: PublicKey
  ) {
    // This is a simplified version - in a real implementation,
    // you would need to create the associated token account
    throw new Error('Token account creation not implemented');
  }

  // Get transaction status
  async getTransactionStatus(signature: string): Promise<TransactionStatus> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
      });

      if (!transaction) {
        return 'pending';
      }

      if (transaction.meta?.err) {
        return 'failed';
      }

      return 'confirmed';
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return 'pending';
    }
  }

  // Get transaction details
  async getTransaction(signature: string): Promise<Transaction | null> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
      });

      if (!transaction) {
        return null;
      }

      // Parse transaction details
      const parsedTransaction: Transaction = {
        id: signature,
        from: '', // Extract from transaction
        to: '', // Extract from transaction
        amount: 0, // Extract from transaction
        cryptocurrency: 'SOL', // Extract from transaction
        timestamp: new Date(transaction.blockTime! * 1000),
        status: transaction.meta?.err ? 'failed' : 'confirmed',
        fee: transaction.meta?.fee || 0,
        signature: signature,
        blockNumber: transaction.slot,
        confirmations: 1, // Calculate confirmations
      };

      return parsedTransaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  // Get recent transactions for an account
  async getRecentTransactions(publicKey: PublicKey, limit: number = 10): Promise<Transaction[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(publicKey, {
        limit: limit,
      });

      const transactions: Transaction[] = [];

      for (const sig of signatures) {
        const transaction = await this.getTransaction(sig.signature);
        if (transaction) {
          transactions.push(transaction);
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  // Validate public key
  static isValidPublicKey(publicKeyString: string): boolean {
    try {
      new PublicKey(publicKeyString);
      return true;
    } catch {
      return false;
    }
  }

  // Get estimated transaction fee
  async getEstimatedFee(): Promise<number> {
    try {
      const { feeCalculator } = await this.connection.getRecentBlockhash();
      return feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting estimated fee:', error);
      return 0.000005; // Default fee
    }
  }
}

// Common token mints
export const TOKEN_MINTS = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
};

// Create singleton instance
export const solanaService = new SolanaService(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'mainnet' | 'devnet' | 'testnet') || 'mainnet'
); 
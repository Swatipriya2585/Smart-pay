import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Keypair
} from '@solana/web3.js';

export class SolanaTransactionService {
  private connection: Connection;
  private network: 'mainnet-beta' | 'devnet' | 'testnet';

  constructor(network: 'mainnet-beta' | 'devnet' | 'testnet' = 'mainnet-beta') {
    this.network = network;
    this.connection = new Connection(
      network === 'mainnet-beta' 
        ? 'https://api.mainnet-beta.solana.com'
        : network === 'devnet'
        ? 'https://api.devnet.solana.com'
        : 'https://api.testnet.solana.com'
    );
  }

  /**
   * Get SOL balance for a wallet address
   */
  async getBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Create a transaction for sending SOL
   */
  async createSendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    memo?: string
  ): Promise<{ transaction: Transaction; blockhash: string }> {
    try {
      const fromPublicKey = new PublicKey(fromAddress);
      const toPublicKey = new PublicKey(toAddress);
      
      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: amount * LAMPORTS_PER_SOL,
      });

      // Create transaction
      const transaction = new Transaction();
      transaction.add(transferInstruction);

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      console.log('🚀 Created transaction:', {
        from: fromAddress,
        to: toAddress,
        amount,
        memo,
        blockhash
      });

      return {
        transaction,
        blockhash
      };

    } catch (error) {
      console.error('❌ Failed to create transaction:', error);
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send transaction using wallet adapter
   */
  async sendTransaction(
    transaction: Transaction,
    wallet: any
  ): Promise<{ signature: string; blockhash: string }> {
    try {
      // Sign and send transaction using wallet
      const signature = await wallet.sendTransaction(transaction, this.connection);
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature);
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed to confirm');
      }

      console.log('✅ Transaction confirmed:', signature);

      return {
        signature,
        blockhash: transaction.recentBlockhash!
      };

    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: string) {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw new Error('Failed to get transaction details');
    }
  }

  /**
   * Get recent transactions for a wallet
   */
  async getRecentTransactions(walletAddress: string, limit: number = 10) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      
      const transactions = await Promise.all(
        signatures.map(sig => this.getTransaction(sig.signature))
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw new Error('Failed to get recent transactions');
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(
    fromAddress: string,
    toAddress: string,
    amount: number
  ): Promise<number> {
    try {
      const fromPublicKey = new PublicKey(fromAddress);
      const toPublicKey = new PublicKey(toAddress);

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: amount * LAMPORTS_PER_SOL,
      });

      const transaction = new Transaction();
      transaction.add(transferInstruction);

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      const fee = await this.connection.getFeeForMessage(
        transaction.compileMessage(),
        blockhash
      );

      return fee.value || 0;
    } catch (error) {
      console.error('Error estimating fee:', error);
      // Return default fee
      return 0.000005 * LAMPORTS_PER_SOL;
    }
  }

  /**
   * Validate Solana address
   */
  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo() {
    try {
      const version = await this.connection.getVersion();
      const slot = await this.connection.getSlot();
      
      return {
        network: this.network,
        version,
        slot,
        endpoint: this.connection.rpcEndpoint
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      throw new Error('Failed to get network info');
    }
  }
} 
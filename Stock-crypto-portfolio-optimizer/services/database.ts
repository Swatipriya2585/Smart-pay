import { prisma } from '@/lib/prisma';

export interface WalletData {
  publicKey: string;
  phoneNumber: string;
  balance: number;
  usdValue: number;
  lastUpdated: Date;
}

export interface UserWalletData {
  userId: string;
  walletId: string;
  publicKey: string;
  phoneNumber: string;
  balance: number;
  usdValue: number;
  lastUpdated: Date;
}

export class DatabaseService {
  // Save or update Phantom wallet data
  static async savePhantomWalletData(
    publicKey: string,
    phoneNumber: string,
    balance: number,
    usdValue: number
  ): Promise<UserWalletData> {
    try {
      // First, check if SOL cryptocurrency exists, if not create it
      let solCrypto = await prisma.cryptocurrency.findUnique({
        where: { symbol: 'SOL' }
      });

      if (!solCrypto) {
        solCrypto = await prisma.cryptocurrency.create({
          data: {
            name: 'Solana',
            symbol: 'SOL',
            image: 'https://cryptologos.cc/logos/solana-sol-logo.png',
            currentPrice: 0,
            marketCap: 0,
            volume24h: 0,
            priceChange24h: 0
          }
        });
      }

      // Find or create user by phone number
      let user = await prisma.user.findFirst({
        where: { phone: phoneNumber }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `${phoneNumber}@cryptochain.local`, // Temporary email
            phone: phoneNumber,
            pin: 'hashed_pin_placeholder', // This should be properly hashed
            walletAddress: publicKey
          }
        });
      }

      // Find or create wallet
      let wallet = await prisma.wallet.findUnique({
        where: { publicKey }
      });

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            userId: user.id,
            walletType: 'phantom',
            publicKey,
            isActive: true
          }
        });
      }

      // Update or create crypto holding
      const cryptoHolding = await prisma.cryptoHolding.upsert({
        where: {
          walletId_cryptocurrencyId: {
            walletId: wallet.id,
            cryptocurrencyId: solCrypto.id
          }
        },
        update: {
          amount: balance,
          usdValue,
          lastUpdated: new Date()
        },
        create: {
          walletId: wallet.id,
          cryptocurrencyId: solCrypto.id,
          amount: balance,
          usdValue,
          lastUpdated: new Date()
        }
      });

      // Update cryptocurrency price
      await prisma.cryptocurrency.update({
        where: { id: solCrypto.id },
        data: {
          currentPrice: usdValue / balance || 0,
          lastUpdated: new Date()
        }
      });

      // Update or create portfolio
      await prisma.portfolio.upsert({
        where: { userId: user.id },
        update: {
          totalValue: usdValue,
          lastUpdated: new Date()
        },
        create: {
          userId: user.id,
          totalValue: usdValue,
          totalChange24h: 0,
          totalChange7d: 0,
          totalChange30d: 0,
          lastUpdated: new Date()
        }
      });

      console.log('Phantom wallet data saved to database:', {
        publicKey,
        balance,
        usdValue,
        lastUpdated: new Date()
      });

      return {
        userId: user.id,
        walletId: wallet.id,
        publicKey,
        phoneNumber,
        balance,
        usdValue,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error saving Phantom wallet data:', error);
      throw error;
    }
  }

  // Get wallet data by public key
  static async getWalletData(publicKey: string): Promise<UserWalletData | null> {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { publicKey },
        include: {
          user: true,
          holdings: {
            include: {
              cryptocurrency: true
            }
          }
        }
      });

      if (!wallet) {
        return null;
      }

      const solHolding = wallet.holdings.find(h => h.cryptocurrency.symbol === 'SOL');
      
      if (!solHolding) {
        return null;
      }

      return {
        userId: wallet.user.id,
        walletId: wallet.id,
        publicKey: wallet.publicKey,
        phoneNumber: wallet.user.phone || '',
        balance: Number(solHolding.amount),
        usdValue: Number(solHolding.usdValue),
        lastUpdated: solHolding.lastUpdated
      };

    } catch (error) {
      console.error('Error getting wallet data:', error);
      throw error;
    }
  }

  // Get user's portfolio data
  static async getUserPortfolio(userId: string) {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId },
        include: {
          user: {
            include: {
              wallets: {
                include: {
                  holdings: {
                    include: {
                      cryptocurrency: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      return portfolio;
    } catch (error) {
      console.error('Error getting user portfolio:', error);
      throw error;
    }
  }

  // Get all wallet holdings for a user
  static async getUserHoldings(userId: string) {
    try {
      const holdings = await prisma.cryptoHolding.findMany({
        where: {
          wallet: {
            userId
          }
        },
        include: {
          cryptocurrency: true,
          wallet: true
        }
      });

      return holdings;
    } catch (error) {
      console.error('Error getting user holdings:', error);
      throw error;
    }
  }

  // Update cryptocurrency prices from external API
  static async updateCryptocurrencyPrices() {
    try {
      // This would typically fetch from CoinGecko or similar API
      // For now, we'll just update SOL price
      const solCrypto = await prisma.cryptocurrency.findUnique({
        where: { symbol: 'SOL' }
      });

      if (solCrypto) {
        // You could fetch real-time price here
        // For now, we'll use a placeholder
        await prisma.cryptocurrency.update({
          where: { id: solCrypto.id },
          data: {
            lastUpdated: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error updating cryptocurrency prices:', error);
      throw error;
    }
  }

  // Get transaction history for a wallet
  static async getWalletTransactions(walletId: string) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { walletId },
        include: {
          cryptocurrency: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return transactions;
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      throw error;
    }
  }

  // Create a new transaction
  static async createTransaction(transactionData: {
    userId: string;
    walletId: string;
    cryptocurrencyId: string;
    transactionType: string;
    amount: number;
    usdValue: number;
    recipientAddress?: string;
    senderAddress?: string;
    transactionHash?: string;
    description?: string;
  }) {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          ...transactionData,
          status: 'confirmed'
        }
      });

      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
} 
interface SolanaPriceData {
  solana: {
    usd: number;
    usd_24h_change: number;
    usd_market_cap: number;
  };
}

export class SolanaPriceService {
  private static cache: { price: number; timestamp: number } | null = null;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async getSolanaPrice(): Promise<number> {
    try {
      // Check cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
        console.log('Using cached SOL price:', this.cache.price);
        return this.cache.price;
      }

      // Fetch from CoinGecko API
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SolanaPriceData = await response.json();
      const price = data.solana.usd;

      // Update cache
      this.cache = {
        price,
        timestamp: Date.now()
      };

      console.log('Fetched SOL price:', price);
      return price;
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      
      // Return cached price if available, otherwise fallback
      if (this.cache) {
        console.log('Using cached SOL price due to error:', this.cache.price);
        return this.cache.price;
      }
      
      // Fallback price (you can update this periodically)
      return 100.0;
    }
  }

  static async getSolanaPriceWithChange(): Promise<{ price: number; change24h: number }> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SolanaPriceData = await response.json();
      
      return {
        price: data.solana.usd,
        change24h: data.solana.usd_24h_change
      };
    } catch (error) {
      console.error('Error fetching SOL price with change:', error);
      return {
        price: 100.0,
        change24h: 0
      };
    }
  }

  static formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  static formatSOL(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(amount);
  }
} 
import { Cryptocurrency, MarketData, ApiResponse, PaginatedResponse } from '@/types';
import axios from 'axios';

export class MarketDataService {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '';
    this.baseUrl = 'https://api.coingecko.com/api/v3';
  }

  // Get top cryptocurrencies by market cap
  async getTopCryptocurrencies(limit: number = 100): Promise<Cryptocurrency[]> {
    try {
      const cacheKey = `top_cryptos_${limit}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: true,
          price_change_percentage: '1h,24h,7d,30d',
          x_cg_demo_api_key: this.apiKey
        }
      });

      const data = response.data.map((coin: any) => this.transformCoinData(coin));
      this.setCachedData(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching top cryptocurrencies:', error);
      throw new Error('Failed to fetch cryptocurrency data');
    }
  }

  // Get specific cryptocurrency by ID
  async getCryptocurrency(id: string): Promise<Cryptocurrency | null> {
    try {
      const cacheKey = `crypto_${id}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/coins/${id}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: true,
          x_cg_demo_api_key: this.apiKey
        }
      });

      const data = this.transformCoinData(response.data);
      this.setCachedData(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error(`Error fetching cryptocurrency ${id}:`, error);
      return null;
    }
  }

  // Search cryptocurrencies
  async searchCryptocurrencies(query: string): Promise<Cryptocurrency[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query,
          x_cg_demo_api_key: this.apiKey
        }
      });

      const coinIds = response.data.coins.slice(0, 10).map((coin: any) => coin.id);
      const cryptocurrencies = await Promise.all(
        coinIds.map(id => this.getCryptocurrency(id))
      );

      return cryptocurrencies.filter((crypto): crypto is Cryptocurrency => crypto !== null);
    } catch (error) {
      console.error('Error searching cryptocurrencies:', error);
      return [];
    }
  }

  // Get market overview data
  async getMarketOverview(): Promise<MarketData> {
    try {
      const cacheKey = 'market_overview';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/global`, {
        params: {
          x_cg_demo_api_key: this.apiKey
        }
      });

      const data = response.data.data;
      const marketData: MarketData = {
        totalMarketCap: data.total_market_cap.usd,
        totalVolume: data.total_volume.usd,
        marketCapChangePercentage24h: data.market_cap_change_percentage_24h_usd,
        volumeChangePercentage24h: data.total_volume.usd,
        marketDominance: data.market_cap_percentage,
        trendingCryptocurrencies: [],
        fearGreedIndex: 50, // Would need separate API call
        lastUpdated: new Date()
      };

      // Get trending cryptocurrencies
      const trendingResponse = await axios.get(`${this.baseUrl}/search/trending`, {
        params: {
          x_cg_demo_api_key: this.apiKey
        }
      });

      const trendingCoins = trendingResponse.data.coins.slice(0, 7);
      marketData.trendingCryptocurrencies = await Promise.all(
        trendingCoins.map(async (coin: any) => {
          const crypto = await this.getCryptocurrency(coin.item.id);
          return crypto || this.createMockCryptocurrency(coin.item);
        })
      );

      this.setCachedData(cacheKey, marketData);
      return marketData;
    } catch (error) {
      console.error('Error fetching market overview:', error);
      throw new Error('Failed to fetch market overview');
    }
  }

  // Get price history for a cryptocurrency
  async getPriceHistory(
    id: string,
    days: number = 7,
    currency: string = 'usd'
  ): Promise<{ prices: [number, number][]; market_caps: [number, number][]; total_volumes: [number, number][] }> {
    try {
      const cacheKey = `price_history_${id}_${days}_${currency}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/coins/${id}/market_chart`, {
        params: {
          vs_currency: currency,
          days,
          x_cg_demo_api_key: this.apiKey
        }
      });

      this.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching price history for ${id}:`, error);
      throw new Error('Failed to fetch price history');
    }
  }

  // Get exchange rates
  async getExchangeRates(baseCurrency: string = 'usd'): Promise<Record<string, number>> {
    try {
      const cacheKey = `exchange_rates_${baseCurrency}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/exchange_rates`, {
        params: {
          x_cg_demo_api_key: this.apiKey
        }
      });

      const rates = response.data.rates;
      this.setCachedData(cacheKey, rates);
      
      return rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return { usd: 1, eur: 0.85, gbp: 0.73 }; // Fallback rates
    }
  }

  // Get supported currencies
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const cacheKey = 'supported_currencies';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/simple/supported_vs_currencies`, {
        params: {
          x_cg_demo_api_key: this.apiKey
        }
      });

      this.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching supported currencies:', error);
      return ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud'];
    }
  }

  // Get trending cryptocurrencies
  async getTrendingCryptocurrencies(): Promise<Cryptocurrency[]> {
    try {
      const cacheKey = 'trending_cryptos';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await axios.get(`${this.baseUrl}/search/trending`, {
        params: {
          x_cg_demo_api_key: this.apiKey
        }
      });

      const trendingCoins = response.data.coins.slice(0, 7);
      const cryptocurrencies = await Promise.all(
        trendingCoins.map(async (coin: any) => {
          const crypto = await this.getCryptocurrency(coin.item.id);
          return crypto || this.createMockCryptocurrency(coin.item);
        })
      );

      const result = cryptocurrencies.filter((crypto): crypto is Cryptocurrency => crypto !== null);
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching trending cryptocurrencies:', error);
      return [];
    }
  }

  // Transform raw coin data to our interface
  private transformCoinData(coin: any): Cryptocurrency {
    return {
      id: coin.id,
      symbol: coin.symbol?.toUpperCase() || '',
      name: coin.name || '',
      current_price: coin.current_price || 0,
      market_cap: coin.market_cap || 0,
      total_volume: coin.total_volume || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      price_change_percentage_7d: coin.price_change_percentage_7d || 0,
      price_change_percentage_30d: coin.price_change_percentage_30d || 0,
      circulating_supply: coin.circulating_supply || 0,
      total_supply: coin.total_supply || 0,
      max_supply: coin.max_supply || null,
      ath: coin.ath || 0,
      ath_change_percentage: coin.ath_change_percentage || 0,
      ath_date: coin.ath_date || '',
      atl: coin.atl || 0,
      atl_change_percentage: coin.atl_change_percentage || 0,
      atl_date: coin.atl_date || '',
      roi: coin.roi || null,
      last_updated: coin.last_updated || new Date().toISOString(),
      sparkline_in_7d: {
        price: coin.sparkline_in_7d?.price || []
      },
      image: coin.image || '',
      market_cap_rank: coin.market_cap_rank || 0,
      price_change_24h: coin.price_change_24h || 0,
      price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency || 0,
      price_change_percentage_24h_in_currency: coin.price_change_percentage_24h_in_currency || 0,
      price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency || 0,
      price_change_percentage_30d_in_currency: coin.price_change_percentage_30d_in_currency || 0,
      price_change_percentage_1y_in_currency: coin.price_change_percentage_1y_in_currency || 0,
      price_change_24h_in_currency: coin.price_change_24h_in_currency || 0,
      market_cap_change_24h: coin.market_cap_change_24h || 0,
      market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h || 0,
      total_volume_24h: coin.total_volume_24h || 0,
      total_volume_24h_in_currency: coin.total_volume_24h_in_currency || 0
    };
  }

  // Create mock cryptocurrency for trending coins that fail to fetch
  private createMockCryptocurrency(coin: any): Cryptocurrency {
    return {
      id: coin.id,
      symbol: coin.symbol?.toUpperCase() || '',
      name: coin.name || '',
      current_price: coin.price_btc || 0,
      market_cap: 0,
      total_volume: 0,
      price_change_percentage_24h: 0,
      price_change_percentage_7d: 0,
      price_change_percentage_30d: 0,
      circulating_supply: 0,
      total_supply: 0,
      max_supply: null,
      ath: 0,
      ath_change_percentage: 0,
      ath_date: '',
      atl: 0,
      atl_change_percentage: 0,
      atl_date: '',
      roi: null,
      last_updated: new Date().toISOString(),
      sparkline_in_7d: { price: [] },
      image: coin.large || '',
      market_cap_rank: coin.market_cap_rank || 0,
      price_change_24h: 0,
      price_change_percentage_1h_in_currency: 0,
      price_change_percentage_24h_in_currency: 0,
      price_change_percentage_7d_in_currency: 0,
      price_change_percentage_30d_in_currency: 0,
      price_change_percentage_1y_in_currency: 0,
      price_change_24h_in_currency: 0,
      market_cap_change_24h: 0,
      market_cap_change_percentage_24h: 0,
      total_volume_24h: 0,
      total_volume_24h_in_currency: 0
    };
  }

  // Cache management
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
export const marketDataService = new MarketDataService(); 
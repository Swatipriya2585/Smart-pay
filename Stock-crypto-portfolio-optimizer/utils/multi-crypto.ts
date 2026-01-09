import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createRobustConnection, getSolanaBalance } from "./solana-rpc";

// Enhanced cryptocurrency balance interface
export interface CryptoBalance {
  symbol: string;
  name: string;
  balance: string;
  usdValue: string;
  price: number;
  change24h: number;
  network: string;
  contractAddress?: string;
  decimals: number;
  logoUrl?: string;
  walletAddress?: string; // Add wallet address for tracking
}

export interface WalletBalances {
  sol?: CryptoBalance;
  usdc?: CryptoBalance;
  usdt?: CryptoBalance;
  sui?: CryptoBalance;
  eth?: CryptoBalance;
  matic?: CryptoBalance;
  btc?: CryptoBalance;
  [key: string]: CryptoBalance | undefined;
}

// Multi-wallet address detection
export interface MultiWalletAddresses {
  solana?: string;
  sui?: string;
  ethereum?: string;
  polygon?: string;
  bitcoin?: string;
  [network: string]: string | undefined;
}

// Detect wallet addresses from Phantom wallet
export const detectWalletAddresses = async (): Promise<MultiWalletAddresses> => {
  const addresses: MultiWalletAddresses = {};
  
  try {
    console.log("🔍 Detecting wallet addresses across networks...");
    
    // Check if Phantom wallet is available
    if (typeof window !== 'undefined' && (window as any).phantom?.solana) {
      const phantom = (window as any).phantom.solana;
      
      if (phantom.isConnected && phantom.publicKey) {
        // Solana address
        addresses.solana = phantom.publicKey.toString();
        console.log("✅ Solana address detected:", addresses.solana);
      }
    }
    
    // Check for other wallet providers
    if (typeof window !== 'undefined') {
      // Check for SUI wallet
      if ((window as any).suiWallet) {
        try {
          const suiWallet = (window as any).suiWallet;
          if (suiWallet.accounts && suiWallet.accounts.length > 0) {
            addresses.sui = suiWallet.accounts[0].address;
            console.log("✅ SUI address detected:", addresses.sui);
          }
        } catch (error) {
          console.log("⚠️ SUI wallet not connected");
        }
      }
      
      // Check for MetaMask (Ethereum)
      if ((window as any).ethereum) {
        try {
          const ethereum = (window as any).ethereum;
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            addresses.ethereum = accounts[0];
            console.log("✅ Ethereum address detected:", addresses.ethereum);
          }
        } catch (error) {
          console.log("⚠️ MetaMask not connected");
        }
      }
      
      // Check for other popular wallets
      const walletProviders = [
        { name: 'sui', global: 'suiWallet' },
        { name: 'ethereum', global: 'ethereum' },
        { name: 'polygon', global: 'polygonWallet' },
        { name: 'bitcoin', global: 'bitcoinWallet' },
        { name: 'cosmos', global: 'cosmosWallet' },
        { name: 'polkadot', global: 'polkadotWallet' }
      ];
      
      for (const provider of walletProviders) {
        if ((window as any)[provider.global]) {
          try {
            const wallet = (window as any)[provider.global];
            if (wallet.accounts && wallet.accounts.length > 0) {
              addresses[provider.name] = wallet.accounts[0].address;
              console.log(`✅ ${provider.name} address detected:`, addresses[provider.name]);
            }
          } catch (error) {
            console.log(`⚠️ ${provider.name} wallet not connected`);
          }
        }
      }
    }
    
    // For testing purposes, if we have a Solana address, let's try some common patterns
    if (addresses.solana) {
      console.log("🔍 Attempting to derive other network addresses...");
      
      // This is for testing only - in reality, you'd need proper cross-chain address derivation
      // For now, we'll try to fetch balances from different networks using the Solana address
      // as a placeholder to see if there are any balances
      
      if (!addresses.sui) {
        addresses.sui = addresses.solana;
        console.log("⚠️ Using Solana address for SUI (testing only):", addresses.sui);
      }
      
      if (!addresses.ethereum) {
        addresses.ethereum = addresses.solana;
        console.log("⚠️ Using Solana address for Ethereum (testing only):", addresses.ethereum);
      }
    }
    
    console.log("🎯 Final detected addresses:", addresses);
    return addresses;
    
  } catch (error) {
    console.error("❌ Error detecting wallet addresses:", error);
    return addresses;
  }
};

// Fetch Ethereum balances (placeholder implementation)
export const getEthereumBalances = async (address: string): Promise<Partial<WalletBalances>> => {
  try {
    console.log("🔍 Fetching Ethereum balances for:", address);
    
    // This is a placeholder - in a real implementation, you'd use Web3.js or ethers.js
    // to fetch ETH and ERC-20 token balances from Ethereum mainnet
    
    // For now, return empty object (no balances found)
    console.log("⚠️ Ethereum balance fetching not implemented yet");
    return {};
    
  } catch (error) {
    console.error("❌ Error fetching Ethereum balances:", error);
    return {};
  }
};

// Enhanced multi-network balance fetching with multiple addresses
export const getAllCryptoBalancesMultiWallet = async (
  walletAddresses: MultiWalletAddresses
): Promise<Partial<WalletBalances>> => {
  console.log("🚀 Starting multi-wallet balance fetch for:", walletAddresses);
  console.log("🚀 Wallet addresses type:", typeof walletAddresses);
  console.log("🚀 Wallet addresses keys:", Object.keys(walletAddresses));
  
  const allBalances: Partial<WalletBalances> = {};
  console.log("🚀 Initial allBalances:", allBalances);
  
  // Fetch Solana balances
  if (walletAddresses.solana) {
    try {
      console.log("🔍 Fetching Solana balances for:", walletAddresses.solana);
      const solanaBalances = await getSolanaBalances(walletAddresses.solana);
      console.log("🔍 Raw Solana balances result:", solanaBalances);
      Object.assign(allBalances, solanaBalances);
      console.log("✅ Solana balances added:", Object.keys(solanaBalances));
      console.log("✅ All balances after Solana:", allBalances);
    } catch (error) {
      console.error("❌ Error fetching Solana balances:", error);
      console.error("❌ Error details:", error instanceof Error ? error.message : String(error));
    }
  }
  
  // Fetch SUI balances
  if (walletAddresses.sui) {
    try {
      console.log("🔍 Fetching SUI balances for:", walletAddresses.sui);
      const suiBalances = await getSuiBalances(walletAddresses.sui);
      Object.assign(allBalances, suiBalances);
      console.log("✅ SUI balances added:", Object.keys(suiBalances));
    } catch (error) {
      console.error("❌ Error fetching SUI balances:", error);
    }
  }
  
  // Fetch Ethereum balances
  if (walletAddresses.ethereum) {
    try {
      console.log("🔍 Fetching Ethereum balances for:", walletAddresses.ethereum);
      const ethereumBalances = await getEthereumBalances(walletAddresses.ethereum);
      Object.assign(allBalances, ethereumBalances);
      console.log("✅ Ethereum balances added:", Object.keys(ethereumBalances));
    } catch (error) {
      console.error("❌ Error fetching Ethereum balances:", error);
    }
  }
  
  // Fetch balances for any other networks
  for (const [network, address] of Object.entries(walletAddresses)) {
    if (network !== 'solana' && network !== 'sui' && network !== 'ethereum' && address) {
      try {
        console.log(`🔍 Fetching ${network} balances for:`, address);
        // For now, just log that we found the address
        console.log(`✅ ${network} address found:`, address);
      } catch (error) {
        console.error(`❌ Error fetching ${network} balances:`, error);
      }
    }
  }
  
  console.log("🎉 Multi-wallet balance fetch completed");
  console.log("💰 Total assets found:", Object.keys(allBalances));
  console.log("📊 Final balances:", allBalances);
  
  return allBalances;
};

// CoinGecko API for price data
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Enhanced price fetching with better error handling and fallbacks
export const getCryptoPrices = async (ids: string[]): Promise<Record<string, any>> => {
  try {
    console.log("🔍 Fetching prices for:", ids);
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn("⚠️ CoinGecko rate limit hit, using fallback prices");
        // Return fallback prices for common tokens
        const fallbackPrices: Record<string, any> = {};
        ids.forEach(id => {
          switch (id) {
            case 'solana':
              fallbackPrices[id] = { usd: 185.58, usd_24h_change: 1.93 };
              break;
            case 'sui':
              fallbackPrices[id] = { usd: 0.85, usd_24h_change: -2.1 };
              break;
            case 'usd-coin':
              fallbackPrices[id] = { usd: 1.00, usd_24h_change: 0.0 };
              break;
            case 'tether':
              fallbackPrices[id] = { usd: 1.00, usd_24h_change: 0.0 };
              break;
            case 'bonk':
              fallbackPrices[id] = { usd: 0.000023, usd_24h_change: 5.2 };
              break;
            case 'jupiter':
              fallbackPrices[id] = { usd: 0.85, usd_24h_change: -1.5 };
              break;
            default:
              fallbackPrices[id] = { usd: 0, usd_24h_change: 0 };
          }
        });
        console.log("✅ Using fallback prices:", fallbackPrices);
        return fallbackPrices;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Price data received:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch crypto prices:", error);
    // Return fallback prices on any error
    const fallbackPrices: Record<string, any> = {};
    ids.forEach(id => {
      switch (id) {
        case 'solana':
          fallbackPrices[id] = { usd: 185.58, usd_24h_change: 1.93 };
          break;
        case 'sui':
          fallbackPrices[id] = { usd: 0.85, usd_24h_change: -2.1 };
          break;
        case 'usd-coin':
          fallbackPrices[id] = { usd: 1.00, usd_24h_change: 0.0 };
          break;
        case 'tether':
          fallbackPrices[id] = { usd: 1.00, usd_24h_change: 0.0 };
          break;
        case 'bonk':
          fallbackPrices[id] = { usd: 0.000023, usd_24h_change: 5.2 };
          break;
        case 'jupiter':
          fallbackPrices[id] = { usd: 0.85, usd_24h_change: -1.5 };
          break;
        default:
          fallbackPrices[id] = { usd: 0, usd_24h_change: 0 };
      }
    });
    console.log("✅ Using fallback prices due to error:", fallbackPrices);
    return fallbackPrices;
  }
};

// Enhanced SPL token balance fetching
export const getSPLTokenBalance = async (
  connection: Connection,
  walletAddress: string,
  tokenMint: string,
  decimals: number = 6
): Promise<number> => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(tokenMint);
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { mint: mintPublicKey }
    );
    
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return balance || 0;
  } catch (error) {
    console.error("❌ Failed to fetch SPL token balance:", error);
    return 0;
  }
};

// Enhanced SPL tokens with more comprehensive list
export const SPL_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    coingeckoId: "usd-coin"
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    coingeckoId: "tether"
  },
  BONK: {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    coingeckoId: "bonk"
  },
  JUP: {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    coingeckoId: "jupiter"
  },
  RAY: {
    symbol: "RAY",
    name: "Raydium",
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
    coingeckoId: "raydium"
  },
  SRM: {
    symbol: "SRM",
    name: "Serum",
    mint: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt",
    decimals: 6,
    coingeckoId: "serum"
  }
};

// Enhanced Solana balance fetching with better error handling
export const getSolanaBalances = async (walletAddress: string): Promise<Partial<WalletBalances>> => {
  try {
    console.log("🔍 Fetching Solana balances for:", walletAddress);
    
    // Use the new robust balance fetching function
    const solBalance = await getSolanaBalance(walletAddress);
    console.log("✅ SOL Balance (SOL):", solBalance);
    
    // Get SPL token balances using robust connection
    const connection = await createRobustConnection();
    const publicKey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });
    
    const balances: Partial<WalletBalances> = {};
    
    // Add SOL balance
    const solPriceData = await getCryptoPrices(["solana"]);
    const solPrice = solPriceData?.solana?.usd || 185.58; // Fallback price
    const solChange24h = solPriceData?.solana?.usd_24h_change || 1.93; // Fallback change
    
    console.log("💰 SOL Price Data:", solPriceData);
    console.log("💰 SOL Price:", solPrice);
    console.log("💰 SOL Balance:", solBalance);
    console.log("💰 SOL USD Value:", solBalance * solPrice);
    
    balances.sol = {
      symbol: "SOL",
      name: "Solana",
      balance: solBalance.toFixed(4),
      usdValue: (solBalance * solPrice).toFixed(2),
      price: solPrice,
      change24h: solChange24h,
      network: "Solana",
      decimals: 9,
      logoUrl: "https://assets.coingecko.com/coins/images/4128/large/solana.png"
    };
    
    // Process SPL tokens
    const tokenIds = Object.values(SPL_TOKENS).map(token => token.coingeckoId);
    const tokenPrices = await getCryptoPrices(tokenIds);
    
    for (const account of tokenAccounts.value) {
      const mint = account.account.data.parsed.info.mint;
      const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
      
      if (balance > 0) {
        // Find token info
        const tokenInfo = Object.entries(SPL_TOKENS).find(([_, token]) => token.mint === mint);
        
        if (tokenInfo) {
          const [symbol, token] = tokenInfo;
          const price = tokenPrices[token.coingeckoId]?.usd || 0;
          const change24h = tokenPrices[token.coingeckoId]?.usd_24h_change || 0;
          
          balances[symbol.toLowerCase() as keyof WalletBalances] = {
            symbol: token.symbol,
            name: token.name,
            balance: balance.toFixed(token.decimals),
            usdValue: (balance * price).toFixed(2),
            price: price,
            change24h: change24h,
            network: "Solana",
            contractAddress: token.mint,
            decimals: token.decimals,
            logoUrl: `https://assets.coingecko.com/coins/images/large/${token.coingeckoId}.png`
          };
        }
      }
    }
    
    console.log("✅ Solana balances fetched:", balances);
    return balances;
    
  } catch (error) {
    console.error("❌ Error fetching Solana balances:", error);
    return {};
  }
};

// SUI Network balance fetching
export const getSuiBalances = async (walletAddress: string): Promise<Partial<WalletBalances>> => {
  try {
    console.log("🔍 Fetching SUI balances for:", walletAddress);
    
    // SUI RPC endpoint
    const suiRpcUrl = "https://fullnode.mainnet.sui.io:443";
    
    // Fetch SUI balance
    const response = await fetch(suiRpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_getBalance",
        params: [walletAddress]
      })
    });
    
    if (!response.ok) {
      throw new Error(`SUI RPC error: ${response.status}`);
    }
    
    const data = await response.json();
    const suiBalance = data.result?.totalBalance || 0;
    const suiBalanceInSUI = suiBalance / 1e9; // SUI has 9 decimals
    
    console.log("✅ SUI Balance (MIST):", suiBalance);
    console.log("✅ SUI Balance (SUI):", suiBalanceInSUI);
    
    // Get SUI price
    const suiPriceData = await getCryptoPrices(["sui"]);
    const suiPrice = suiPriceData?.sui?.usd || 0;
    const suiChange24h = suiPriceData?.sui?.usd_24h_change || 0;
    
    const balances: Partial<WalletBalances> = {};
    
    if (suiBalanceInSUI > 0) {
      balances.sui = {
        symbol: "SUI",
        name: "Sui",
        balance: suiBalanceInSUI.toFixed(4),
        usdValue: (suiBalanceInSUI * suiPrice).toFixed(2),
        price: suiPrice,
        change24h: suiChange24h,
        network: "Sui",
        decimals: 9,
        logoUrl: "https://assets.coingecko.com/coins/images/26375/large/sui.png"
      };
    }
    
    console.log("✅ SUI balances fetched:", balances);
    return balances;
    
  } catch (error) {
    console.error("❌ Error fetching SUI balances:", error);
    return {};
  }
};



// Enhanced multi-network balance fetching
export const getAllCryptoBalances = async (
  walletAddress: string, 
  networks: string[] = ["solana", "sui"]
): Promise<Partial<WalletBalances>> => {
  console.log("🚀 Starting multi-network balance fetch for:", walletAddress);
  console.log("🌐 Networks to check:", networks);
  
  const allBalances: Partial<WalletBalances> = {};
  
  for (const network of networks) {
    try {
      console.log(`🔍 Fetching ${network} balances...`);
      
      switch (network.toLowerCase()) {
        case "solana":
          const solanaBalances = await getSolanaBalances(walletAddress);
          Object.assign(allBalances, solanaBalances);
          console.log(`✅ Solana balances added:`, Object.keys(solanaBalances));
          break;
          
        case "sui":
          const suiBalances = await getSuiBalances(walletAddress);
          Object.assign(allBalances, suiBalances);
          console.log(`✅ SUI balances added:`, Object.keys(suiBalances));
          break;
          
        case "ethereum":
          const ethereumBalances = await getEthereumBalances(walletAddress);
          Object.assign(allBalances, ethereumBalances);
          console.log(`✅ Ethereum balances added:`, Object.keys(ethereumBalances));
          break;
          
        default:
          console.warn(`⚠️ Network ${network} not supported yet`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${network} balances:`, error);
    }
  }
  
  console.log("🎉 Multi-network balance fetch completed");
  console.log("💰 Total assets found:", Object.keys(allBalances));
  console.log("📊 Final balances:", allBalances);
  
  return allBalances;
};

// Enhanced balance formatting
export const formatBalance = (balance: number, decimals: number = 4): string => {
  if (balance === 0) return "0.0000";
  if (balance < 0.0001) return balance.toExponential(4);
  return balance.toFixed(decimals);
};

// Enhanced total portfolio value calculation
export const getTotalPortfolioValue = (balances: Partial<WalletBalances>): number => {
  const total = Object.values(balances).reduce((sum, balance) => {
    if (balance && parseFloat(balance.usdValue) > 0) {
      return sum + parseFloat(balance.usdValue);
    }
    return sum;
  }, 0);
  
  console.log("💰 Total portfolio value calculated:", total);
  return total;
};

// Enhanced portfolio summary
export const getPortfolioSummary = (balances: Partial<WalletBalances>) => {
  const totalValue = getTotalPortfolioValue(balances);
  const assets = Object.values(balances).filter(balance => 
    balance && parseFloat(balance.usdValue) > 0
  );
  
  const summary = {
    totalValue: totalValue.toFixed(2),
    assetCount: assets.length,
    assets: assets.map(balance => ({
      symbol: balance!.symbol,
      value: balance!.usdValue,
      percentage: totalValue > 0 ? ((parseFloat(balance!.usdValue) / totalValue) * 100).toFixed(2) : "0",
      network: balance!.network
    }))
  };
  
  console.log("📊 Portfolio summary:", summary);
  return summary;
};

// Network-specific balance fetching functions
export const getNetworkBalances = {
  solana: getSolanaBalances,
  sui: getSuiBalances,
  ethereum: getEthereumBalances
};

// Utility function to check if wallet has any balances
export const hasAnyBalances = (balances: Partial<WalletBalances>): boolean => {
  return Object.values(balances).some(balance => 
    balance && parseFloat(balance.usdValue) > 0
  );
};

// Get balance by symbol
export const getBalanceBySymbol = (balances: Partial<WalletBalances>, symbol: string): CryptoBalance | null => {
  const key = symbol.toLowerCase() as keyof WalletBalances;
  return balances[key] || null;
}; 
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

export interface PhantomProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
  publicKey?: PublicKey;
}

export interface WalletConnection {
  publicKey: string;
  phoneNumber: string;
  connectedAt: string;
  balance?: number;
}

// Detect Phantom wallet
export const getPhantomProvider = (): PhantomProvider | undefined => {
  if (typeof window !== 'undefined') {
    const provider = (window as any).phantom?.solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }
  return undefined;
};

// Connect to Phantom wallet
export const connectPhantom = async (): Promise<WalletConnection | null> => {
  try {
    const provider = getPhantomProvider();

    if (!provider) {
      throw new Error("Phantom wallet not found. Please install it from phantom.app");
    }

    // Connect to wallet
    const response = await provider.connect();
    const publicKey = response.publicKey.toString();
    
    console.log("Connected with public key:", publicKey);
    
    return {
      publicKey,
      phoneNumber: '', // Will be filled by the calling component
      connectedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Phantom connection error:", error);
    throw error;
  }
};

// ✅ GOLD STANDARD WAY: Accurate + Stable Balance Fetch Using `solana/web3.js`
export const getWalletBalanceAndValue = async (walletAddress: string) => {
  try {
    console.log("🔍 getWalletBalanceAndValue called with:", walletAddress);
    console.log("🔍 Wallet address type:", typeof walletAddress);
    console.log("🔍 Wallet address length:", walletAddress?.length);
    
    if (!walletAddress) {
      console.error("❌ Wallet address is empty or undefined");
      throw new Error("Wallet address is required");
    }

    if (typeof walletAddress !== 'string') {
      console.error("❌ Wallet address is not a string:", walletAddress);
      throw new Error("Wallet address must be a string");
    }

    console.log("🔍 Fetching balance for wallet:", walletAddress);

    // ✅ Connect to Solana mainnet
    console.log("🌐 Connecting to Solana mainnet-beta...");
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    console.log("✅ Connected to mainnet-beta");
    
    // Test connection
    try {
      const slot = await connection.getSlot();
      console.log("✅ Network connection test - Current slot:", slot);
    } catch (error) {
      console.error("❌ Network connection failed:", error);
      throw new Error("Failed to connect to Solana mainnet");
    }

    // ✅ Validate public key
    console.log("🔑 Creating PublicKey object...");
    const publicKey = new PublicKey(walletAddress);
    console.log("✅ Validated public key:", publicKey.toString());
    console.log("✅ PublicKey object created successfully");

    // ✅ Get SOL balance in lamports
    console.log("💰 Fetching balance from Solana network...");
    const lamports = await connection.getBalance(publicKey);
    const solBalance = lamports / 1e9;
    console.log("✅ SOL Balance (lamports):", lamports);
    console.log("✅ SOL Balance (SOL):", solBalance);
    console.log("✅ Balance calculation: lamports / 1e9 =", lamports, "/ 1e9 =", solBalance);
    
    // Check if balance is suspiciously low (might be devnet)
    if (lamports === 0) {
      console.warn("⚠️ WARNING: Balance is 0 lamports. This might indicate:");
      console.warn("   - Wallet is on devnet instead of mainnet");
      console.warn("   - Wallet address is incorrect");
      console.warn("   - Network connection issue");
    }

    // ✅ Get real-time SOL price from CoinGecko
    console.log("🔍 Fetching SOL price from CoinGecko...");
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    console.log("✅ CoinGecko response:", data);
    
    const solPrice = data?.solana?.usd || 0;
    console.log("✅ SOL Price (USD):", solPrice);

    // ✅ Final USD balance
    const usdBalance = solBalance * solPrice;
    console.log("✅ USD Balance calculation:", solBalance, "*", solPrice, "=", usdBalance);

    const result = {
      sol: solBalance.toFixed(4),
      usd: usdBalance.toFixed(2),
      price: solPrice
    };

    console.log("🎉 Final balance result:", result);
    console.log("🎉 Result type check - sol:", typeof result.sol, "usd:", typeof result.usd, "price:", typeof result.price);
    return result;

  } catch (error) {
    console.error("❌ Balance fetch error:", error instanceof Error ? error.message : String(error));
    console.error("❌ Full error object:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return {
      sol: "0.0000",
      usd: "0.00",
      price: 0
    };
  }
};

// Legacy functions for backward compatibility
export const getSolBalance = async (walletAddress: string): Promise<number> => {
  const result = await getWalletBalanceAndValue(walletAddress);
  return parseFloat(result.sol);
};

export const getSolPriceInUSD = async (): Promise<number> => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    return data?.solana?.usd || 0;
  } catch (error) {
    console.error("Failed to fetch SOL price:", error);
    return 0;
  }
};

export const getWalletBalances = async (walletAddress: string) => {
  return await getWalletBalanceAndValue(walletAddress);
};

export const getWalletBalance = async (publicKey: string, network: 'mainnet-beta' | 'devnet' | 'testnet' = 'mainnet-beta'): Promise<number> => {
  const result = await getWalletBalanceAndValue(publicKey);
  return parseFloat(result.sol);
};

// Disconnect wallet
export const disconnectPhantom = async (): Promise<void> => {
  try {
    const provider = getPhantomProvider();
    if (provider) {
      await provider.disconnect();
      console.log("Disconnected from Phantom wallet");
    }
  } catch (error) {
    console.error("Error disconnecting:", error);
    throw error;
  }
};

// Check if Phantom is installed
export const isPhantomInstalled = (): boolean => {
  return !!getPhantomProvider();
};

// Detect network and validate connection
export const detectNetworkAndValidate = async (walletAddress: string) => {
  try {
    console.log("🔍 Detecting network for wallet:", walletAddress);
    
    // Test mainnet connection
    const mainnetConnection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const mainnetSlot = await mainnetConnection.getSlot();
    const mainnetBalance = await mainnetConnection.getBalance(new PublicKey(walletAddress));
    
    console.log("✅ Mainnet connection successful");
    console.log("✅ Mainnet slot:", mainnetSlot);
    console.log("✅ Mainnet balance (lamports):", mainnetBalance);
    console.log("✅ Mainnet balance (SOL):", mainnetBalance / 1e9);
    
    // Test devnet connection for comparison
    const devnetConnection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const devnetSlot = await devnetConnection.getSlot();
    const devnetBalance = await devnetConnection.getBalance(new PublicKey(walletAddress));
    
    console.log("🔍 Devnet slot:", devnetSlot);
    console.log("🔍 Devnet balance (lamports):", devnetBalance);
    console.log("🔍 Devnet balance (SOL):", devnetBalance / 1e9);
    
    // Determine which network has the real balance
    if (mainnetBalance > 0) {
      console.log("✅ Wallet appears to be on MAINNET (has real SOL balance)");
      return { network: 'mainnet', balance: mainnetBalance / 1e9 };
    } else if (devnetBalance > 0) {
      console.log("⚠️ Wallet appears to be on DEVNET (has test SOL balance)");
      return { network: 'devnet', balance: devnetBalance / 1e9 };
    } else {
      console.log("❌ No balance found on either network");
      return { network: 'unknown', balance: 0 };
    }
    
  } catch (error) {
    console.error("❌ Network detection failed:", error);
    return { network: 'error', balance: 0 };
  }
};

// Get wallet info with balance
export const getWalletInfo = async (publicKey: string, phoneNumber: string): Promise<WalletConnection> => {
  try {
    const balances = await getWalletBalanceAndValue(publicKey);
    
    return {
      publicKey,
      phoneNumber,
      connectedAt: new Date().toISOString(),
      balance: parseFloat(balances.sol)
    };
  } catch (error) {
    console.error("Error getting wallet info:", error);
    // Return without balance if there's an error
    return {
      publicKey,
      phoneNumber,
      connectedAt: new Date().toISOString(),
      balance: 0
    };
  }
};

// Validate Solana address
export const validateSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Format address for display
export const formatAddress = (address: string, length: number = 6): string => {
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};

// Get network name
export const getNetworkName = (network: string): string => {
  switch (network) {
    case 'mainnet-beta':
      return 'Mainnet';
    case 'devnet':
      return 'Devnet';
    case 'testnet':
      return 'Testnet';
    default:
      return 'Unknown';
  }
}; 
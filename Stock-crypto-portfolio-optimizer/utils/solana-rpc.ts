import { Connection, PublicKey, clusterApiUrl, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction, Commitment } from '@solana/web3.js';

// Enhanced RPC endpoint configuration with proper Helius API integration
const RPC_CONFIG = {
  // Premium endpoints (with API keys - highest priority)
  premium: {
    helius: process.env.SOLANA_HELIUS_API_KEY ? 
      `https://rpc.helius.xyz/?api-key=${process.env.SOLANA_HELIUS_API_KEY}` : null,
    alchemy: process.env.SOLANA_ALCHEMY_API_KEY ? 
      `https://solana-mainnet.g.alchemy.com/v2/${process.env.SOLANA_ALCHEMY_API_KEY}` : null,
    quicknode: process.env.SOLANA_QUICKNODE_API_KEY ? 
      `https://solana-mainnet.g.quiknode.pro/${process.env.SOLANA_QUICKNODE_API_KEY}/` : null,
    triton: process.env.SOLANA_TRITON_API_KEY ? 
      `https://rpc.triton.one` : null,
  },
  
  // Reliable public endpoints (medium priority)
  public: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    clusterApiUrl('mainnet-beta')
  ],
  
  // Fallback endpoints (lowest priority)
  fallback: [
    'https://solana.public-rpc.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ]
};

// Endpoint health tracking
interface EndpointHealth {
  endpoint: string;
  lastCheck: number;
  isHealthy: boolean;
  latency: number;
  errorCount: number;
  lastError?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

const endpointHealth: Map<string, EndpointHealth> = new Map();

// Configuration
const REQUEST_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_RPC_TIMEOUT || '15000');
const MAX_RETRIES = parseInt(process.env.NEXT_PUBLIC_RPC_MAX_RETRIES || '5');
const HEALTH_CHECK_INTERVAL = parseInt(process.env.NEXT_PUBLIC_RPC_HEALTH_CHECK_INTERVAL || '30000');

// Exponential backoff configuration
const BACKOFF_CONFIG = {
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  factor: 2, // Double the delay each retry
};

// Build the endpoint list with priority ordering
function buildEndpointList(): string[] {
  const endpoints: string[] = [];
  
  // 1. Add premium endpoints that have API keys (highest priority)
  Object.values(RPC_CONFIG.premium).forEach(endpoint => {
    if (endpoint) {
      endpoints.push(endpoint);
      console.log(`🔑 Premium endpoint added: ${endpoint}`);
    }
  });
  
  // 2. Add reliable public endpoints
  endpoints.push(...RPC_CONFIG.public);
  console.log(`🌐 Public endpoints added: ${RPC_CONFIG.public.length} endpoints`);
  
  // 3. Add fallback endpoints
  endpoints.push(...RPC_CONFIG.fallback);
  console.log(`🔄 Fallback endpoints added: ${RPC_CONFIG.fallback.length} endpoints`);
  
  // If no premium endpoints are available, use only public and fallback
  if (endpoints.length === 0) {
    endpoints.push(...RPC_CONFIG.public, ...RPC_CONFIG.fallback);
  }
  
  console.log(`🔧 Built RPC endpoint list: ${endpoints.length} endpoints available`);
  endpoints.forEach((endpoint, index) => {
    const isPremium = Object.values(RPC_CONFIG.premium).includes(endpoint);
    const isPublic = RPC_CONFIG.public.includes(endpoint);
    const priority = isPremium ? 'Premium' : isPublic ? 'Public' : 'Fallback';
    console.log(`   ${index + 1}. ${endpoint} (${priority})`);
  });
  
  return endpoints;
}

const RPC_ENDPOINTS = buildEndpointList();

// Validate Solana wallet address with proper error handling
export function isValidSolanaAddress(address: string): boolean {
  try {
    const publicKey = new PublicKey(address);
    return PublicKey.isOnCurve(publicKey);
  } catch (error) {
    console.error('❌ Invalid Solana address validation failed:', error);
    return false;
  }
}

// Create connection with proper headers and configuration
export function createConnection(endpoint: string): Connection {
  console.log(`🔗 Creating Solana connection with endpoint: ${endpoint}`);
  
  // Determine if this is a Helius endpoint
  const isHelius = endpoint.includes('helius.xyz');
  const apiKey = process.env.SOLANA_HELIUS_API_KEY;
  
  const config: any = {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: REQUEST_TIMEOUT,
    disableRetryOnRateLimit: false,
    httpHeaders: {
      'User-Agent': 'CryptoChain/1.0.0',
      'Content-Type': 'application/json',
    }
  };

  // Add Helius API key to headers if using Helius endpoint
  if (isHelius && apiKey) {
    config.httpHeaders['api-key'] = apiKey;
    console.log(`🔑 Added Helius API key to headers for endpoint: ${endpoint}`);
  }
  
  return new Connection(endpoint, config);
}

// Exponential backoff retry function
async function exponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BACKOFF_CONFIG.baseDelay
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Check if it's a rate limit error
      const isRateLimit = error instanceof Error && 
        (error.message.includes('429') || 
         error.message.includes('Too many requests') ||
         error.message.includes('rate limit'));
      
      if (isRateLimit) {
        console.log(`⚠️ Rate limit hit, retrying with exponential backoff...`);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(BACKOFF_CONFIG.factor, attempt),
        BACKOFF_CONFIG.maxDelay
      );
      
      console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Enhanced connection testing with health tracking
export async function testConnection(connection: Connection, endpoint: string): Promise<boolean> {
  try {
    console.log(`🧪 Testing connection to: ${endpoint}`);
    const startTime = Date.now();
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), REQUEST_TIMEOUT);
    });
    
    // Create the actual request promise with exponential backoff
    const requestPromise = exponentialBackoff(() => connection.getBlockHeight());
    
    // Race between timeout and request
    const blockHeight = await Promise.race([requestPromise, timeoutPromise]) as number;
    const latency = Date.now() - startTime;
    
    // Update health tracking
    endpointHealth.set(endpoint, {
      endpoint,
      lastCheck: Date.now(),
      isHealthy: true,
      latency,
      errorCount: 0
    });
    
    console.log(`✅ Connection SUCCESS - Endpoint: ${endpoint}`);
    console.log(`   Block Height: ${blockHeight.toLocaleString()}`);
    console.log(`   Latency: ${latency}ms`);
    return true;
  } catch (error) {
    // Update health tracking with error
    const currentHealth = endpointHealth.get(endpoint) || {
      endpoint,
      lastCheck: 0,
      isHealthy: false,
      latency: 0,
      errorCount: 0
    };
    
    endpointHealth.set(endpoint, {
      ...currentHealth,
      lastCheck: Date.now(),
      isHealthy: false,
      errorCount: currentHealth.errorCount + 1,
      lastError: error instanceof Error ? error.message : 'Unknown error'
    });
    
    console.error(`❌ Connection FAILED - Endpoint: ${endpoint}`);
    console.error('   Error:', error instanceof Error ? error.message : error);
    
    return false;
  }
}

// Get the best available endpoint based on health
export function getBestEndpoint(): string {
  const healthyEndpoints = Array.from(endpointHealth.entries())
    .filter(([_, health]) => health.isHealthy)
    .sort((a, b) => a[1].latency - b[1].latency);
  
  if (healthyEndpoints.length > 0) {
    const bestEndpoint = healthyEndpoints[0][0];
    console.log(`🏆 Using best healthy endpoint: ${bestEndpoint} (${healthyEndpoints[0][1].latency}ms)`);
    return bestEndpoint;
  }
  
  // If no healthy endpoints, return the first available
  console.log(`⚠️ No healthy endpoints found, using first available: ${RPC_ENDPOINTS[0]}`);
  return RPC_ENDPOINTS[0];
}

// Enhanced balance fetching with intelligent endpoint selection
export async function getSolanaBalance(walletAddress: string): Promise<number> {
  console.log(`💰 Fetching SOL balance for address: ${walletAddress}`);
  
  // 1. Validate wallet address
  if (!isValidSolanaAddress(walletAddress)) {
    const error = new Error(`Invalid Solana wallet address: ${walletAddress}`);
    console.error('❌ Address validation failed:', error);
    throw error;
  }
  
  const publicKey = new PublicKey(walletAddress);
  let lastError: Error | null = null;
  
  // 2. Try endpoints in order of priority
  for (let attempt = 0; attempt < RPC_ENDPOINTS.length; attempt++) {
    const endpoint = RPC_ENDPOINTS[attempt];
    console.log(`\n🔄 Attempt ${attempt + 1}/${RPC_ENDPOINTS.length} - Using endpoint: ${endpoint}`);
    
    try {
      // Create connection
      const connection = createConnection(endpoint);
      
      // Test connection first with timeout
      const connectionTest = await testConnection(connection, endpoint);
      if (!connectionTest) {
        console.log(`⚠️ Connection test failed for ${endpoint}, trying next endpoint...`);
        continue;
      }
      
      // Get balance with exponential backoff retry logic
      const balance = await exponentialBackoff(async () => {
        console.log(`📊 Fetching balance from ${endpoint}...`);
        return await connection.getBalance(publicKey);
      });
      
      const solBalance = balance / LAMPORTS_PER_SOL;
      console.log(`✅ SUCCESS - Balance fetched from ${endpoint}`);
      console.log(`   Raw balance: ${balance} lamports`);
      console.log(`   SOL balance: ${solBalance} SOL`);
      return solBalance;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ FAILED - Endpoint ${endpoint} failed completely`);
      console.error('   Error:', error instanceof Error ? error.message : error);
      
      if (attempt < RPC_ENDPOINTS.length - 1) {
        console.log(`🔄 Switching to fallback endpoint...`);
      }
    }
  }
  
  // 3. All endpoints failed
  console.error(`\n💥 ALL ENDPOINTS FAILED`);
  console.error(`   Last error:`, lastError);
  
  const finalError = new Error(`Failed to fetch SOL balance from all endpoints. Last error: ${lastError?.message || 'Unknown error'}`);
  console.error('   Final error:', finalError);
  throw finalError;
}

// Enhanced transaction sending with proper error handling
export async function sendSolanaTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: any[] = [],
  options: {
    skipPreflight?: boolean;
    preflightCommitment?: Commitment;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const {
    skipPreflight = false,
    preflightCommitment = 'confirmed' as Commitment,
    maxRetries = MAX_RETRIES
  } = options;

  console.log(`🚀 Sending Solana transaction...`);
  console.log(`   Skip preflight: ${skipPreflight}`);
  console.log(`   Preflight commitment: ${preflightCommitment}`);
  console.log(`   Max retries: ${maxRetries}`);

  try {
    // Serialize transaction for logging
    const serializedTx = transaction.serialize().toString('base64');
    console.log(`📝 Transaction serialized (base64): ${serializedTx.substring(0, 100)}...`);

    // Send transaction with exponential backoff
    const signature = await exponentialBackoff(
      async () => {
        console.log(`📡 Sending transaction...`);
        return await connection.sendTransaction(transaction, signers, {
          skipPreflight,
          preflightCommitment,
          maxRetries: 1 // We handle retries ourselves
        });
      },
      maxRetries
    );

    console.log(`✅ Transaction sent successfully!`);
    console.log(`   Signature: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error(`❌ Transaction sending failed:`, error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`);
      console.error(`   Error stack: ${error.stack}`);
    }
    
    throw error;
  }
}

// Enhanced transaction confirmation with proper error handling
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed',
  maxRetries: number = MAX_RETRIES
): Promise<boolean> {
  console.log(`⏳ Confirming transaction: ${signature}`);
  console.log(`   Commitment: ${commitment}`);
  console.log(`   Max retries: ${maxRetries}`);

  try {
    const result = await exponentialBackoff(
      async () => {
        console.log(`🔍 Checking transaction status...`);
        return await connection.confirmTransaction(signature, commitment);
      },
      maxRetries
    );

    if (result.value.err) {
      console.error(`❌ Transaction failed:`, result.value.err);
      return false;
    }

    console.log(`✅ Transaction confirmed successfully!`);
    console.log(`   Slot: ${result.context.slot}`);
    return true;
  } catch (error) {
    console.error(`❌ Transaction confirmation failed:`, error);
    throw error;
  }
}

// Enhanced transaction status checking
export async function getTransactionStatus(
  connection: Connection,
  signature: string
): Promise<{
  status: 'pending' | 'confirmed' | 'failed';
  error?: any;
  slot?: number;
  confirmations?: number;
}> {
  try {
    console.log(`🔍 Getting transaction status: ${signature}`);
    
    const status = await exponentialBackoff(
      async () => {
        return await connection.getSignatureStatus(signature);
      },
      3
    );

    if (!status.value) {
      return { status: 'pending' };
    }

    if (status.value.err) {
      console.error(`❌ Transaction failed:`, status.value.err);
      return { 
        status: 'failed', 
        error: status.value.err,
        slot: status.context.slot
      };
    }

    console.log(`✅ Transaction status: ${status.value.confirmationStatus}`);
    return {
      status: status.value.confirmationStatus === 'confirmed' ? 'confirmed' : 'pending',
      slot: status.context.slot,
      confirmations: status.value.confirmations || 0
    };
  } catch (error) {
    console.error(`❌ Failed to get transaction status:`, error);
    return { status: 'pending' };
  }
}

// Create a robust connection that automatically handles fallbacks
export async function createRobustConnection(): Promise<Connection> {
  console.log(`🔧 Creating robust Solana connection...`);
  
  // First try to use the best known healthy endpoint
  const bestEndpoint = getBestEndpoint();
  if (bestEndpoint) {
    try {
      const connection = createConnection(bestEndpoint);
      const isWorking = await testConnection(connection, bestEndpoint);
      
      if (isWorking) {
        console.log(`✅ Using best endpoint: ${bestEndpoint}`);
        return connection;
      }
    } catch (error) {
      console.error(`❌ Best endpoint ${bestEndpoint} failed:`, error);
    }
  }
  
  // If best endpoint fails, try all endpoints
  for (let attempt = 0; attempt < RPC_ENDPOINTS.length; attempt++) {
    const endpoint = RPC_ENDPOINTS[attempt];
    console.log(`\n🔄 Testing endpoint ${attempt + 1}/${RPC_ENDPOINTS.length}: ${endpoint}`);
    
    try {
      const connection = createConnection(endpoint);
      const isWorking = await testConnection(connection, endpoint);
      
      if (isWorking) {
        console.log(`✅ Using endpoint: ${endpoint}`);
        return connection;
      }
    } catch (error) {
      console.error(`❌ Endpoint ${endpoint} failed:`, error);
    }
  }
  
  const error = new Error('No working RPC endpoints found');
  console.error('💥 No working endpoints found:', error);
  throw error;
}

// Test all endpoints and return results
export async function testAllEndpoints(): Promise<{ endpoint: string; working: boolean; latency?: number; error?: string }[]> {
  console.log(`🧪 Testing all RPC endpoints...`);
  const results = [];

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      const connection = createConnection(endpoint);
      const startTime = Date.now();
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), REQUEST_TIMEOUT);
      });
      
      // Create test promise with exponential backoff
      const testPromise = exponentialBackoff(() => connection.getBlockHeight());
      
      // Race between timeout and test
      const blockHeight = await Promise.race([testPromise, timeoutPromise]) as number;
      const latency = Date.now() - startTime;

      console.log(`✅ WORKING - Block height: ${blockHeight.toLocaleString()}, Latency: ${latency}ms`);
      results.push({ endpoint, working: true, latency });
    } catch (error) {
      console.error(`❌ FAILED - ${endpoint}:`, error);
      results.push({ 
        endpoint, 
        working: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return results;
}

// Get the best working endpoint
export async function getBestWorkingEndpoint(): Promise<string> {
  console.log(`🏆 Finding best working endpoint...`);
  const results = await testAllEndpoints();
  const workingEndpoints = results.filter(r => r.working);

  if (workingEndpoints.length === 0) {
    const error = new Error('No working RPC endpoints found');
    console.error('💥 No working endpoints found:', error);
    throw error;
  }

  // Sort by latency (fastest first)
  workingEndpoints.sort((a, b) => (a.latency || 0) - (b.latency || 0));
  const bestEndpoint = workingEndpoints[0].endpoint;
  
  console.log(`🏆 Best endpoint: ${bestEndpoint} (${workingEndpoints[0].latency}ms)`);
  return bestEndpoint;
}

// Get endpoint health status
export function getEndpointHealth(): Map<string, EndpointHealth> {
  return new Map(endpointHealth);
}

// Reset endpoint health (useful for testing)
export function resetEndpointHealth(): void {
  endpointHealth.clear();
  console.log('🔄 Endpoint health tracking reset');
}

// Legacy function for backward compatibility
export function createSolanaConnection(): Connection {
  return createConnection(RPC_ENDPOINTS[0]);
}

// Switch to next endpoint (for manual control)
export function switchToNextEndpoint(): string {
  const currentEndpointIndex = 0; // Always start with primary
  const newEndpoint = RPC_ENDPOINTS[currentEndpointIndex];
  console.log(`🔄 Switched to endpoint: ${newEndpoint}`);
  return newEndpoint;
} 
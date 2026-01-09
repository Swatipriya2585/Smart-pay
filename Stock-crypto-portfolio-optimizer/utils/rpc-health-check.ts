import { testAllEndpoints, getEndpointHealth, resetEndpointHealth, getBestWorkingEndpoint } from './solana-rpc';

// RPC Health Check and Monitoring Utility
export class RPCHealthMonitor {
  private static instance: RPCHealthMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): RPCHealthMonitor {
    if (!RPCHealthMonitor.instance) {
      RPCHealthMonitor.instance = new RPCHealthMonitor();
    }
    return RPCHealthMonitor.instance;
  }

  // Start continuous health monitoring
  async startMonitoring(intervalMs: number = 30000): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Health monitoring is already running');
      return;
    }

    console.log(`🔍 Starting RPC health monitoring (interval: ${intervalMs}ms)`);
    this.isMonitoring = true;

    // Initial health check
    await this.performHealthCheck();

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);
  }

  // Stop health monitoring
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 RPC health monitoring stopped');
  }

  // Perform a single health check
  async performHealthCheck(): Promise<void> {
    console.log('\n🔍 Performing RPC health check...');
    const startTime = Date.now();

    try {
      const results = await testAllEndpoints();
      const workingEndpoints = results.filter(r => r.working);
      const failedEndpoints = results.filter(r => !r.working);

      console.log(`\n📊 Health Check Results:`);
      console.log(`   ✅ Working endpoints: ${workingEndpoints.length}`);
      console.log(`   ❌ Failed endpoints: ${failedEndpoints.length}`);
      console.log(`   ⏱️  Check duration: ${Date.now() - startTime}ms`);

      if (workingEndpoints.length > 0) {
        console.log('\n🏆 Best performing endpoints:');
        workingEndpoints
          .sort((a, b) => (a.latency || 0) - (b.latency || 0))
          .slice(0, 3)
          .forEach((endpoint, index) => {
            console.log(`   ${index + 1}. ${endpoint.endpoint} (${endpoint.latency}ms)`);
          });
      }

      if (failedEndpoints.length > 0) {
        console.log('\n❌ Failed endpoints:');
        failedEndpoints.forEach(endpoint => {
          console.log(`   - ${endpoint.endpoint}: ${endpoint.error}`);
        });
      }

      // Get current health status
      const healthStatus = getEndpointHealth();
      console.log(`\n📈 Current health status: ${healthStatus.size} endpoints tracked`);

    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  // Get current health status
  getHealthStatus(): Map<string, any> {
    return getEndpointHealth();
  }

  // Reset health tracking
  resetHealth(): void {
    resetEndpointHealth();
    console.log('🔄 Health tracking reset');
  }

  // Get the best working endpoint
  async getBestEndpoint(): Promise<string> {
    try {
      return await getBestWorkingEndpoint();
    } catch (error) {
      console.error('❌ Failed to get best endpoint:', error);
      throw error;
    }
  }

  // Test a specific endpoint
  async testEndpoint(endpoint: string): Promise<{ working: boolean; latency?: number; error?: string }> {
    console.log(`🧪 Testing specific endpoint: ${endpoint}`);
    
    try {
      const { Connection } = await import('@solana/web3.js');
      const connection = new Connection(endpoint, 'confirmed');
      const startTime = Date.now();
      
      const blockHeight = await connection.getBlockHeight();
      const latency = Date.now() - startTime;

      console.log(`✅ Endpoint working - Block height: ${blockHeight.toLocaleString()}, Latency: ${latency}ms`);
      return { working: true, latency };
    } catch (error) {
      console.error(`❌ Endpoint failed: ${endpoint}`, error);
      return { 
        working: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get monitoring status
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

// Convenience functions
export const rpcHealthMonitor = RPCHealthMonitor.getInstance();

// Quick health check function
export async function quickHealthCheck(): Promise<void> {
  console.log('🚀 Quick RPC health check...');
  await rpcHealthMonitor.performHealthCheck();
}

// Test Helius endpoint specifically
export async function testHeliusEndpoint(): Promise<void> {
  const heliusEndpoint = `https://mainnet.helius-rpc.com/?api-key=${process.env.SOLANA_HELIUS_API_KEY}`;
  console.log('🔑 Testing Helius endpoint specifically...');
  
  const result = await rpcHealthMonitor.testEndpoint(heliusEndpoint);
  
  if (result.working) {
    console.log(`✅ Helius endpoint is working! Latency: ${result.latency}ms`);
  } else {
    console.log(`❌ Helius endpoint failed: ${result.error}`);
  }
}

// Get endpoint recommendations
export function getEndpointRecommendations(): void {
  const healthStatus = getEndpointHealth();
  const healthyEndpoints = Array.from(healthStatus.entries())
    .filter(([_, health]) => health.isHealthy)
    .sort((a, b) => a[1].latency - b[1].latency);

  console.log('\n💡 Endpoint Recommendations:');
  
  if (healthyEndpoints.length === 0) {
    console.log('   ⚠️ No healthy endpoints found. Consider:');
    console.log('     1. Checking your internet connection');
    console.log('     2. Verifying your Helius API key');
    console.log('     3. Trying again in a few minutes');
  } else {
    console.log('   🏆 Recommended endpoints (fastest first):');
    healthyEndpoints.slice(0, 3).forEach((endpoint, index) => {
      const isHelius = endpoint[0].includes('helius');
      const icon = isHelius ? '🔑' : '🌐';
      console.log(`     ${index + 1}. ${icon} ${endpoint[0]} (${endpoint[1].latency}ms)`);
    });
  }
} 
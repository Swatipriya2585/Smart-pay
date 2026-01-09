import { NextRequest, NextResponse } from 'next/server'
import { Connection, clusterApiUrl } from '@solana/web3.js'

// RPC Endpoints with fallback system - conditionally include Helius only if API key is available
const RPC_ENDPOINTS = [
  ...(process.env.SOLANA_HELIUS_API_KEY ? [{
    name: 'Helius',
    url: `https://mainnet.helius-rpc.com/?api-key=${process.env.SOLANA_HELIUS_API_KEY}`,
    priority: 1
  }] : []),
  {
    name: 'Alchemy',
    url: 'https://solana-mainnet.g.alchemy.com/v2/demo',
    priority: 2
  },
  {
    name: 'QuickNode',
    url: 'https://api.mainnet-beta.solana.com',
    priority: 3
  },
  {
    name: 'Triton',
    url: 'https://free.rpcpool.com',
    priority: 4
  },
  {
    name: 'Public RPC',
    url: clusterApiUrl('mainnet-beta'),
    priority: 5
  }
]

// Exponential backoff retry function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Test connection to a specific RPC endpoint
async function testConnection(endpoint: typeof RPC_ENDPOINTS[0]): Promise<any> {
  const connection = new Connection(endpoint.url, 'confirmed')
  
  try {
    const startTime = Date.now()
    const blockHeight = await connection.getBlockHeight()
    const slot = await connection.getSlot()
    const responseTime = Date.now() - startTime

    return {
      success: true,
      endpoint: endpoint.name,
      blockHeight,
      slot,
      responseTime,
      url: endpoint.url
    }
  } catch (error) {
    return {
      success: false,
      endpoint: endpoint.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: endpoint.url
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers })
  }

  try {
    if (action === 'health-check') {
      // Test all endpoints and return the best one
      const results = await Promise.all(
        RPC_ENDPOINTS.map(endpoint => testConnection(endpoint))
      )

      const successfulResults = results.filter(result => result.success)
      
      if (successfulResults.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'All RPC endpoints failed',
          results
        }, { headers })
      }

      // Sort by response time and priority
      const bestResult = successfulResults.sort((a, b) => {
        const aPriority = RPC_ENDPOINTS.find(e => e.name === a.endpoint)?.priority || 999
        const bPriority = RPC_ENDPOINTS.find(e => e.name === b.endpoint)?.priority || 999
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        return a.responseTime - b.responseTime
      })[0]

      return NextResponse.json({
        success: true,
        message: 'Service is healthy',
        data: {
          blockHeight: bestResult.blockHeight,
          slot: bestResult.slot,
          timestamp: new Date().toISOString(),
          environment: 'production',
          bestEndpoint: bestResult.endpoint,
          responseTime: bestResult.responseTime,
          allEndpoints: results
        }
      }, { headers })
    }

    // Default action: test all endpoints
    const results = await Promise.all(
      RPC_ENDPOINTS.map(endpoint => testConnection(endpoint))
    )

    const successfulCount = results.filter(r => r.success).length
    const totalCount = results.length

    return NextResponse.json({
      success: true,
      message: `RPC Test Results: ${successfulCount}/${totalCount} endpoints working`,
      data: {
        results,
        summary: {
          total: totalCount,
          successful: successfulCount,
          failed: totalCount - successfulCount,
          successRate: (successfulCount / totalCount * 100).toFixed(1) + '%'
        }
      }
    }, { headers })

  } catch (error) {
    console.error('RPC test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { headers, status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 
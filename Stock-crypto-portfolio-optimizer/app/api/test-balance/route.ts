import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

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
    name: 'Public RPC',
    url: 'https://api.mainnet-beta.solana.com',
    priority: 3
  }
]

// Get balance with fallback
async function getBalanceWithFallback(walletAddress: string): Promise<any> {
  let lastError: Error = new Error('All RPC endpoints failed to fetch balance')

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint.url, 'confirmed')
      const publicKey = new PublicKey(walletAddress)
      
      const startTime = Date.now()
      const balance = await connection.getBalance(publicKey)
      const responseTime = Date.now() - startTime

      return {
        success: true,
        balance: (balance / LAMPORTS_PER_SOL).toFixed(9),
        lamports: balance,
        endpoint: endpoint.name,
        responseTime,
        walletAddress
      }
    } catch (error) {
      lastError = error as Error
      console.warn(`Failed to get balance from ${endpoint.name}:`, error)
      continue
    }
  }

  throw lastError!
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('walletAddress')

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
    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address is required',
        example: '/api/test-balance?walletAddress=CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM'
      }, { headers, status: 400 })
    }

    // Validate wallet address format
    try {
      new PublicKey(walletAddress)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format',
        walletAddress
      }, { headers, status: 400 })
    }

    const result = await getBalanceWithFallback(walletAddress)

    return NextResponse.json({
      success: true,
      message: 'Balance fetched successfully',
      data: result
    }, { headers })

  } catch (error) {
    console.error('Balance fetch error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch balance',
      walletAddress,
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
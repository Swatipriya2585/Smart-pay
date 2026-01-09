import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

// RPC Endpoints - conditionally include Helius only if API key is available
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

// Get connection with fallback
async function getConnection(): Promise<Connection> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint.url, 'confirmed')
      // Test the connection
      await connection.getBlockHeight()
      console.log(`✅ Using RPC endpoint: ${endpoint.name}`)
      return connection
    } catch (error) {
      console.warn(`❌ Failed to connect to ${endpoint.name}:`, error)
      continue
    }
  }
  throw new Error('All RPC endpoints failed')
}

// Get SOL balance
async function getSOLBalance(connection: Connection, walletAddress: string): Promise<any> {
  try {
    const balance = await connection.getBalance(new PublicKey(walletAddress))
    const solBalance = balance / 1000000000 // Convert lamports to SOL
    
    return {
      symbol: 'SOL',
      name: 'Solana',
      balance: solBalance.toFixed(9),
      decimals: 9,
      mint: 'So11111111111111111111111111111111111111112',
      logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
    }
  } catch (error) {
    console.error('Error getting SOL balance:', error)
    return null
  }
}

// Get SPL token balances
async function getSPLTokenBalances(connection: Connection, walletAddress: string): Promise<any[]> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    )

    const tokens = tokenAccounts.value
      .filter(account => account.account.data.parsed.info.tokenAmount.uiAmount > 0)
      .map(account => {
        const tokenInfo = account.account.data.parsed.info
        return {
          symbol: tokenInfo.mint, // We'll need to fetch token metadata
          name: `Token ${tokenInfo.mint.substring(0, 8)}...`,
          balance: tokenInfo.tokenAmount.uiAmount.toString(),
          decimals: tokenInfo.tokenAmount.decimals,
          mint: tokenInfo.mint,
          logoURI: undefined
        }
      })

    return tokens
  } catch (error) {
    console.error('Error getting SPL token balances:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address is required'
      }, { headers, status: 400 })
    }

    // Validate wallet address format
    try {
      new PublicKey(walletAddress)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format'
      }, { headers, status: 400 })
    }

    // Get connection
    const connection = await getConnection()
    
    // Get SOL balance
    const solAsset = await getSOLBalance(connection, walletAddress)
    
    // Get SPL token balances
    const splTokens = await getSPLTokenBalances(connection, walletAddress)
    
    // Combine all assets
    const allAssets = [solAsset, ...splTokens].filter(asset => asset !== null)

    return NextResponse.json({
      success: true,
      message: 'Crypto assets loaded successfully',
      data: {
        walletAddress,
        assets: allAssets,
        totalAssets: allAssets.length,
        timestamp: new Date().toISOString()
      }
    }, { headers })

  } catch (error) {
    console.error('API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load crypto assets',
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
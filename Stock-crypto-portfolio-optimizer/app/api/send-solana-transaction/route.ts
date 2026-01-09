import { NextRequest, NextResponse } from 'next/server'
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair
} from '@solana/web3.js'
import * as bs58 from 'bs58'

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

// Validate wallet address
function isValidWalletAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Create and send transaction
async function createAndSendTransaction(
  fromPrivateKey: string,
  toAddress: string,
  amount: number
): Promise<any> {
  try {
    const connection = await getConnection()
    
    // Decode private key
    const privateKeyBytes = bs58.decode(fromPrivateKey)
    const keypair = Keypair.fromSecretKey(privateKeyBytes)
    
    // Validate recipient address
    const toPublicKey = new PublicKey(toAddress)
    
    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }
    
    // Convert SOL to lamports
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL)
    
    // Check sender balance (including estimated transaction fee)
    const ESTIMATED_FEE_LAMPORTS = 5000 // Typical Solana transaction fee
    const totalRequired = lamports + ESTIMATED_FEE_LAMPORTS
    const senderBalance = await connection.getBalance(keypair.publicKey)
    if (senderBalance < totalRequired) {
      throw new Error(`Insufficient balance. Available: ${(senderBalance / LAMPORTS_PER_SOL).toFixed(9)} SOL, Required: ${(totalRequired / LAMPORTS_PER_SOL).toFixed(9)} SOL (including ~${(ESTIMATED_FEE_LAMPORTS / LAMPORTS_PER_SOL).toFixed(9)} SOL fee)`)
    }
    
    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: toPublicKey,
        lamports: lamports,
      })
    )
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = keypair.publicKey
    
    // Sign and send transaction
    console.log('🚀 Sending transaction...')
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair],
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    )
    
    // Get transaction details
    const transactionDetails = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    })
    
    return {
      success: true,
      signature,
      amount,
      fromAddress: keypair.publicKey.toString(),
      toAddress,
      blockhash,
      slot: transactionDetails?.slot,
      fee: transactionDetails?.meta?.fee,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Transaction failed:', error)
    throw error
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
    const { fromPrivateKey, toAddress, amount } = body

    // Validate required fields
    if (!fromPrivateKey) {
      return NextResponse.json({
        success: false,
        error: 'fromPrivateKey is required'
      }, { headers, status: 400 })
    }

    if (!toAddress) {
      return NextResponse.json({
        success: false,
        error: 'toAddress is required'
      }, { headers, status: 400 })
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'amount must be a positive number'
      }, { headers, status: 400 })
    }

    // Validate wallet addresses
    if (!isValidWalletAddress(toAddress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid recipient wallet address'
      }, { headers, status: 400 })
    }

    // Validate private key format
    try {
      bs58.decode(fromPrivateKey)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid private key format'
      }, { headers, status: 400 })
    }

    // Execute transaction
    const result = await createAndSendTransaction(fromPrivateKey, toAddress, amount)

    return NextResponse.json({
      success: true,
      message: 'Transaction sent successfully',
      data: result
    }, { headers })

  } catch (error) {
    console.error('API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
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
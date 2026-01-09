import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

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

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    
    try {
      console.log('🚀 Requesting devnet SOL...')
      console.log(`📝 Wallet Address: ${walletAddress}`)
      
      // Request airdrop (2 SOL)
      const signature = await connection.requestAirdrop(
        new PublicKey(walletAddress),
        2 * LAMPORTS_PER_SOL // 2 SOL
      )
      
      console.log('⏳ Waiting for confirmation...')
      await connection.confirmTransaction(signature)
      
      // Check new balance
      const balance = await connection.getBalance(new PublicKey(walletAddress))
      const solBalance = balance / LAMPORTS_PER_SOL
      
      console.log('✅ Airdrop successful!')
      console.log(`💰 New Balance: ${solBalance.toFixed(9)} SOL`)
      
      return NextResponse.json({
        success: true,
        message: 'Devnet SOL received successfully',
        data: {
          signature,
          balance: solBalance.toFixed(9),
          lamports: balance,
          walletAddress,
          network: 'devnet',
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        }
      }, { headers })
      
    } catch (error) {
      console.error('❌ Airdrop failed:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request devnet SOL',
        walletAddress
      }, { headers, status: 500 })
    }

  } catch (error) {
    console.error('API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process request',
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
import { NextRequest, NextResponse } from 'next/server'
import { Keypair } from '@solana/web3.js'
import * as bs58 from 'bs58'

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
    if (!fromPrivateKey || !toAddress || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: fromPrivateKey, toAddress, amount'
      }, { headers, status: 400 })
    }

    // Generate a mock transaction result for demonstration
    const mockSignature = 'mock_signature_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    const mockBlockhash = 'mock_blockhash_' + Math.random().toString(36).substr(2, 9)
    
    // Decode the private key to get the public key
    let fromAddress = 'Unknown'
    try {
      const privateKeyBytes = bs58.decode(fromPrivateKey)
      const keypair = Keypair.fromSecretKey(privateKeyBytes)
      fromAddress = keypair.publicKey.toString()
    } catch (error) {
      // If private key is invalid, use a mock address
      fromAddress = 'mock_sender_' + Math.random().toString(36).substr(2, 9)
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: 'Test transaction completed successfully (DEMO MODE)',
      data: {
        signature: mockSignature,
        amount: parseFloat(amount),
        fromAddress: fromAddress,
        toAddress: toAddress,
        blockhash: mockBlockhash,
        slot: Math.floor(Math.random() * 1000000) + 300000000,
        fee: 5000,
        timestamp: new Date().toISOString(),
        note: 'This is a test transaction for demonstration purposes. No real SOL was transferred.'
      }
    }, { headers })

  } catch (error) {
    console.error('Test transaction error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test transaction failed',
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
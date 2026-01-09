import { NextRequest, NextResponse } from 'next/server'
import { Keypair } from '@solana/web3.js'
import * as bs58 from 'bs58'

export async function GET(request: NextRequest) {
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
    // Generate a new keypair
    const keypair = Keypair.generate()
    
    // Convert to base58 format
    const privateKey = bs58.encode(keypair.secretKey)
    const publicKey = keypair.publicKey.toString()

    return NextResponse.json({
      success: true,
      message: 'Wallet generated successfully',
      data: {
        publicKey,
        privateKey,
        timestamp: new Date().toISOString(),
        note: '⚠️ This is a test wallet. Never use private keys from test generation in production!'
      }
    }, { headers })

  } catch (error) {
    console.error('Wallet generation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate wallet',
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
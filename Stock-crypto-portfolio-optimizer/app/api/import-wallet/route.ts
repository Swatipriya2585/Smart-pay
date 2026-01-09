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
    const { privateKey } = body

    // Validate required fields
    if (!privateKey) {
      return NextResponse.json({
        success: false,
        error: 'Private key is required'
      }, { headers, status: 400 })
    }

    // Validate private key format
    try {
      const privateKeyBytes = bs58.decode(privateKey)
      
      // Check if the private key has the correct length (64 bytes for Solana)
      if (privateKeyBytes.length !== 64) {
        return NextResponse.json({
          success: false,
          error: 'Invalid private key length. Solana private keys must be 64 bytes (Base58 encoded)'
        }, { headers, status: 400 })
      }

      // Create keypair from private key
      const keypair = Keypair.fromSecretKey(privateKeyBytes)
      const publicKey = keypair.publicKey.toString()

      return NextResponse.json({
        success: true,
        message: 'Wallet imported successfully',
        data: {
          publicKey,
          timestamp: new Date().toISOString(),
          note: '⚠️ Wallet imported successfully. Never share your private key!'
        }
      }, { headers })

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid private key format. Please provide a valid Base58 encoded private key'
      }, { headers, status: 400 })
    }

  } catch (error) {
    console.error('Wallet import error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import wallet',
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
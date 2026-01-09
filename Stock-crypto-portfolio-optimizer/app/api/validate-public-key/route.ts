import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'

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
    const { publicKey } = body

    // Validate required fields
    if (!publicKey) {
      return NextResponse.json({
        success: false,
        error: 'Public key is required'
      }, { headers, status: 400 })
    }

    // Validate public key format
    try {
      const pubKey = new PublicKey(publicKey)
      
      return NextResponse.json({
        success: true,
        message: 'Public key validated successfully',
        data: {
          publicKey: pubKey.toString(),
          isValid: true,
          timestamp: new Date().toISOString(),
          note: '✅ Valid Solana wallet address. You can now check balance and send transactions.'
        }
      }, { headers })

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid public key format. Please provide a valid Solana wallet address'
      }, { headers, status: 400 })
    }

  } catch (error) {
    console.error('Public key validation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate public key',
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
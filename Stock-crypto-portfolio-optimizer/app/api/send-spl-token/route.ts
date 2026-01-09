import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction
} from '@solana/spl-token'
import * as bs58 from 'bs58'

// Known SPL token mints and decimals (extend as needed)
const TOKENS: Record<string, { mint: string; decimals: number }> = {
  BONK: { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
}

function getRpcUrl(): string {
  const heliusKey = process.env.SOLANA_HELIUS_API_KEY
  if (heliusKey) return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
  return 'https://api.mainnet-beta.solana.com'
}

function okHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: okHeaders() })
}

export async function POST(request: NextRequest) {
  const headers = okHeaders()
  try {
    const body = await request.json()
    const {
      fromPrivateKey, // base58-encoded secret key
      toAddress,
      amount, // human units
      mint, // optional: SPL mint; if absent, tokenSymbol must be provided
      tokenSymbol, // e.g., 'BONK'
    } = body

    if (!fromPrivateKey || !toAddress || !amount) {
      return NextResponse.json({ success: false, error: 'fromPrivateKey, toAddress, amount are required' }, { status: 400, headers })
    }

    // Determine token info
    let tokenInfo: { mint: string; decimals: number } | undefined

    if (mint) {
      // Custom mint provided - decimals MUST be explicitly provided
      if (typeof body.decimals !== 'number' || body.decimals < 0 || !Number.isFinite(body.decimals)) {
        // Try to get from tokenSymbol if provided
        const symbolInfo = tokenSymbol ? TOKENS[tokenSymbol.toUpperCase()] : undefined
        if (symbolInfo && symbolInfo.mint === mint) {
          tokenInfo = symbolInfo
        } else {
          return NextResponse.json({ 
            success: false, 
            error: 'When providing a custom mint address, you must also provide the decimals parameter' 
          }, { status: 400, headers })
        }
      } else {
        tokenInfo = { mint, decimals: body.decimals }
      }
    } else if (tokenSymbol) {
      // Use known token from TOKENS registry
      tokenInfo = TOKENS[tokenSymbol.toUpperCase()]
    }

    if (!tokenInfo || !tokenInfo.mint || typeof tokenInfo.decimals !== 'number' || tokenInfo.decimals < 0 || !Number.isFinite(tokenInfo.decimals)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unknown token. Provide valid tokenSymbol (e.g., BONK, USDC) or both mint and decimals' 
      }, { status: 400, headers })
    }

    const connection = new Connection(getRpcUrl(), 'confirmed')

    // Decode sender keypair
    let keypair: Keypair
    try {
      const secret = bs58.decode(fromPrivateKey)
      keypair = Keypair.fromSecretKey(secret)
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid fromPrivateKey (base58 required)' }, { status: 400, headers })
    }

    const toPub = new PublicKey(toAddress)
    const mintPub = new PublicKey(tokenInfo.mint)

    // Ensure associated token accounts exist (payer: sender)
    const fromAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mintPub, keypair.publicKey)
    const toAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mintPub, toPub)

    // Convert amount to smallest units using BigInt-safe arithmetic
    // For high decimals (e.g., 18), using Number() would cause precision loss
    const amountStr = amount.toString()
    const [integerPart = '0', decimalPart = ''] = amountStr.split('.')
    
    // Validate: if decimals=0 and amount has decimal places, reject it
    if (tokenInfo.decimals === 0 && decimalPart.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Token has 0 decimals but amount contains decimal places: ${amount}` 
      }, { status: 400, headers })
    }
    
    // Build the full amount string with proper decimal places
    const paddedDecimal = decimalPart.padEnd(tokenInfo.decimals, '0').slice(0, tokenInfo.decimals)
    const fullAmountStr = integerPart + paddedDecimal
    
    // Validate the string is not empty before BigInt conversion
    if (!fullAmountStr || fullAmountStr === '') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid amount format' 
      }, { status: 400, headers })
    }
    
    const amountUnits = BigInt(fullAmountStr)

    if (amountUnits <= 0n) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400, headers })
    }

    const ix = createTransferCheckedInstruction(
      fromAta.address,
      mintPub,
      toAta.address,
      keypair.publicKey,
      amountUnits,
      tokenInfo.decimals,
      [],
      TOKEN_PROGRAM_ID
    )

    const tx = new Transaction().add(ix)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    tx.feePayer = keypair.publicKey
    ;(tx as any).lastValidBlockHeight = lastValidBlockHeight

    const sig = await connection.sendTransaction(tx, [keypair], { skipPreflight: false, preflightCommitment: 'confirmed' })
    const conf = await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')

    // Validate confirmation result
    if (conf.value.err) {
      throw new Error(`Transaction failed to confirm: ${JSON.stringify(conf.value.err)}`)
    }

    return NextResponse.json({ success: true, signature: sig, token: tokenSymbol || 'CUSTOM', mint: tokenInfo.mint, amount, to: toAddress }, { headers })
  } catch (error) {
    console.error('SPL token transfer failed:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal error' }, { status: 500, headers })
  }
}



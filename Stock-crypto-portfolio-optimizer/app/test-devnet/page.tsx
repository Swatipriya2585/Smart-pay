'use client'

import { useState } from 'react'

interface Wallet {
  publicKey: string
  privateKey: string
  balance?: string
}

export default function TestDevnetPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generateWallet = async () => {
    setLoading(true)
    setStatus('Generating wallet...')
    
    try {
      const response = await fetch('/api/generate-wallet', { method: 'GET' })
      const data = await response.json()
      
      if (data.success) {
        setWallet(data.data)
        setStatus('✅ Wallet generated!')
        setResult(null)
      } else {
        setStatus('❌ Failed: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ Error: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const getDevnetSOL = async () => {
    if (!wallet) {
      setStatus('❌ Generate wallet first')
      return
    }

    setLoading(true)
    setStatus('Requesting devnet SOL...')
    
    try {
      const response = await fetch('/api/get-devnet-sol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.publicKey })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStatus('✅ Devnet SOL received!')
        setResult(data.data)
      } else {
        setStatus('❌ Failed: ' + data.error)
        setResult(data)
      }
    } catch (error) {
      setStatus('❌ Error: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const sendDevnetTransaction = async () => {
    if (!wallet) {
      setStatus('❌ Generate wallet first')
      return
    }

    setLoading(true)
    setStatus('Sending devnet transaction...')
    
    try {
      console.log('🔍 Sending transaction with:', {
        fromPrivateKey: wallet.privateKey ? 'Present' : 'Missing',
        toAddress: 'CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM',
        amount: 0.001
      })

      const response = await fetch('/api/send-solana-transaction-devnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPrivateKey: wallet.privateKey,
          toAddress: 'CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM',
          amount: 0.001
        })
      })
      
      const data = await response.json()
      console.log('🔍 Response:', data)
      
      if (data.success) {
        setStatus('✅ Transaction successful!')
        setResult(data.data)
      } else {
        setStatus('❌ Failed: ' + data.error)
        setResult(data)
      }
    } catch (error) {
      console.error('🔍 Error:', error)
      setStatus('❌ Error: ' + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          🧪 Devnet Transaction Test
        </h1>

        <div className="space-y-6">
          {/* Generate Wallet */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Step 1: Generate Wallet</h2>
            <button
              onClick={generateWallet}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              {loading ? 'Generating...' : 'Generate Test Wallet'}
            </button>
            {wallet && (
              <div className="mt-4 p-3 bg-white/5 rounded">
                <p className="text-white text-sm">
                  <strong>Public Key:</strong> {wallet.publicKey}
                </p>
                <p className="text-white text-sm">
                  <strong>Private Key:</strong> {wallet.privateKey.substring(0, 20)}...
                </p>
              </div>
            )}
          </div>

          {/* Get Devnet SOL */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Step 2: Get Devnet SOL</h2>
            <button
              onClick={getDevnetSOL}
              disabled={loading || !wallet}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              {loading ? 'Requesting...' : 'Get Devnet SOL (Free)'}
            </button>
          </div>

          {/* Send Transaction */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Step 3: Send Devnet Transaction</h2>
            <button
              onClick={sendDevnetTransaction}
              disabled={loading || !wallet}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              {loading ? 'Sending...' : 'Send 0.001 SOL to Test Address'}
            </button>
          </div>

          {/* Status */}
          {status && (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-2">Status</h3>
              <p className="text-gray-300">{status}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-2">Result</h3>
              <pre className="text-gray-300 text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
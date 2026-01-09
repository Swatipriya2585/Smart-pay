'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [amount, setAmount] = useState('0.001')

  const testHealthCheck = async () => {
    setIsLoading(true)
    setStatus('Testing health check...')
    
    try {
      const response = await fetch('/api/test-improved-rpc?action=health-check')
      const data = await response.json()
      
      if (data.success) {
        setStatus('✅ Health check passed! Service is healthy.')
      } else {
        setStatus('❌ Health check failed: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ Health check failed: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const testBalance = async () => {
    if (!walletAddress) {
      setStatus('❌ Please enter a wallet address')
      return
    }

    setIsLoading(true)
    setStatus('Fetching balance...')
    
    try {
      const response = await fetch(`/api/test-balance?walletAddress=${walletAddress}`)
      const data = await response.json()
      
      if (data.success) {
        setStatus(`✅ Balance: ${data.data.balance} SOL`)
      } else {
        setStatus('❌ Failed to fetch balance: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ Failed to fetch balance: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            🚀 CryptoChain Platform
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Complete CryptoChain Platform with Enhanced Solana Integration
          </p>
          <div className="text-sm text-gray-400">
            July 30th, 2024 - Production Ready
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Health Check Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">🏥 Health Check</h2>
            <p className="text-gray-300 mb-4">
              Test the Solana RPC connection and service health
            </p>
            <button
              onClick={testHealthCheck}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isLoading ? 'Testing...' : 'Test Health'}
            </button>
          </div>

          {/* Balance Check Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">💰 Balance Check</h2>
            <p className="text-gray-300 mb-4">
              Check SOL balance for any wallet address
            </p>
            <input
              type="text"
              placeholder="Enter wallet address..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full mb-3 p-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400"
            />
            <button
              onClick={testBalance}
              disabled={isLoading || !walletAddress}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isLoading ? 'Fetching...' : 'Check Balance'}
            </button>
          </div>

          {/* Crypto Transfer Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">💸 Crypto Transfer</h2>
            <p className="text-gray-300 mb-4">
              Send SOL between wallets with secure transactions
            </p>
            <button
              onClick={() => window.location.href = '/transfer'}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Transfer SOL
            </button>
          </div>
        </div>

        {/* Status Display */}
        {status && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 mb-8">
            <h3 className="text-xl font-bold text-white mb-2">Status</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{status}</p>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">🔧</div>
            <h3 className="font-bold text-white">Enhanced Solana</h3>
            <p className="text-sm text-gray-400">Helius API Integration</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">🛡️</div>
            <h3 className="font-bold text-white">Robust Error Handling</h3>
            <p className="text-sm text-gray-400">Exponential Backoff</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold text-white">Multi-Network</h3>
            <p className="text-sm text-gray-400">Solana & SUI Support</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 text-center">
          <div className="text-gray-400 mb-4">Quick Links</div>
          <div className="flex justify-center space-x-4">
            <a
              href="/transfer"
              className="text-red-400 hover:text-red-300 underline"
            >
              💸 Transfer SOL
            </a>
            <a
              href="/api/test-improved-rpc"
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
            >
              RPC Test API
            </a>
            <a
              href="/api/test-balance"
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
            >
              Balance API
            </a>
            <a
              href="/aws-lambda"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              AWS Lambda
            </a>
          </div>
        </div>
      </div>
    </main>
  )
} 
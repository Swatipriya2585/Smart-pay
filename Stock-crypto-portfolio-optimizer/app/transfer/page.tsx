'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Wallet {
  publicKey: string
  privateKey?: string
  balance?: string
  connected?: boolean
}

interface CryptoAsset {
  symbol: string
  name: string
  balance: string
  decimals: number
  mint?: string
  logoURI?: string
}

interface TransactionResult {
  success: boolean
  signature?: string
  amount?: number
  fromAddress?: string
  toAddress?: string
  error?: string
}

export default function TransferPage() {
  const router = useRouter()
  const [senderWallet, setSenderWallet] = useState<Wallet | null>(null)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('0.001')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null)
  const [testMode, setTestMode] = useState<'demo' | 'devnet' | 'mainnet'>('demo')
  const [showImportWallet, setShowImportWallet] = useState(false)
  const [importPublicKey, setImportPublicKey] = useState('')
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false)
  const [privateKeyForTransaction, setPrivateKeyForTransaction] = useState('')
  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>([])
  const [isWalletConnecting, setIsWalletConnecting] = useState(false)
  const [walletAvailable, setWalletAvailable] = useState({
    phantom: false,
    solflare: false
  })
  const [connectedWalletProvider, setConnectedWalletProvider] = useState<any>(null)

  useEffect(() => {
    // Check for available wallets
    const checkWallets = () => {
      setWalletAvailable({
        phantom: typeof window !== 'undefined' && !!(window as any).solana?.phantom,
        solflare: typeof window !== 'undefined' && 'solflare' in window
      })
    }

    checkWallets()
    window.addEventListener('load', checkWallets)
    return () => window.removeEventListener('load', checkWallets)
  }, [])



  // Connect to wallet
  const connectWallet = async (walletType: 'phantom' | 'solflare') => {
    setIsWalletConnecting(true)
    setStatus(`Connecting to ${walletType}...`)

    try {
      let wallet: any = null

      switch (walletType) {
        case 'phantom':
          if (typeof window !== 'undefined' && (window as any).solana?.phantom) {
            wallet = (window as any).solana.phantom
          } else {
            // Deep link to Phantom
            window.open('https://phantom.app/', '_blank')
            setStatus('🔗 Phantom not installed. Opening download page...')
            setIsWalletConnecting(false)
            return
          }
          break
        case 'solflare':
          if (typeof window !== 'undefined' && (window as any).solflare) {
            wallet = (window as any).solflare
          } else {
            // Deep link to Solflare
            window.open('https://solflare.com/', '_blank')
            setStatus('🔗 Solflare not installed. Opening download page...')
            setIsWalletConnecting(false)
            return
          }
          break
      }

      if (wallet) {
        // Connect to wallet
        const response = await wallet.connect()
        const publicKey = response.publicKey.toString()

        setSenderWallet({
          publicKey,
          connected: true
        })
        
        // Store the wallet provider for transaction signing
        setConnectedWalletProvider(wallet)

        setStatus(`✅ Connected to ${walletType}! Loading your crypto assets...`)
        
        // Load crypto assets
        await loadCryptoAssets(publicKey)
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      setStatus(`❌ Failed to connect to ${walletType}: ${error}`)
    } finally {
      setIsWalletConnecting(false)
    }
  }

  // Load crypto assets from wallet
  const loadCryptoAssets = async (publicKey: string) => {
    try {
      setStatus('Loading your crypto assets...')
      
      const response = await fetch('/api/get-crypto-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setCryptoAssets(data.data.assets)
        setStatus(`✅ Loaded ${data.data.assets.length} crypto assets!`)
      } else {
        setStatus('⚠️ Could not load crypto assets: ' + data.error)
      }
    } catch (error) {
      console.error('Error loading crypto assets:', error)
      setStatus('⚠️ Could not load crypto assets')
    }
  }

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      // Disconnect from the connected wallet provider
      if (connectedWalletProvider) {
        await connectedWalletProvider.disconnect()
      }

      setSenderWallet(null)
      setConnectedWalletProvider(null)
      setCryptoAssets([])
      setStatus('✅ Wallet disconnected')
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
      setStatus('❌ Error disconnecting wallet')
    }
  }

  // Generate a new wallet
  const generateWallet = async () => {
    setIsLoading(true)
    setStatus('Generating new wallet...')
    
    try {
      const response = await fetch('/api/generate-wallet', {
        method: 'GET'
      })
      const data = await response.json()
      
      if (data.success) {
        setSenderWallet(data.data)
        setStatus('✅ New wallet generated successfully!')
        setTransactionResult(null)
      } else {
        setStatus('❌ Failed to generate wallet: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ Failed to generate wallet: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  // Import existing wallet by public key
  const importWalletByPublicKey = async () => {
    if (!importPublicKey.trim()) {
      setStatus('❌ Please enter your public key')
      return
    }

    setIsLoading(true)
    setStatus('Importing wallet...')
    
    try {
      const response = await fetch('/api/validate-public-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: importPublicKey.trim()
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSenderWallet({
          publicKey: importPublicKey.trim(),
          privateKey: undefined
        })
        setImportPublicKey('')
        setShowImportWallet(false)
        setStatus('✅ Wallet imported successfully! Check balance to see your SOL.')
        setTransactionResult(null)
      } else {
        setStatus('❌ Failed to import wallet: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ Failed to import wallet: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check wallet balance
  const checkBalance = async () => {
    if (!senderWallet) {
      setStatus('❌ Please generate or import a wallet first')
      return
    }

    setIsLoading(true)
    setStatus('Checking balance...')
    
    try {
      const apiEndpoint = testMode === 'devnet' ? '/api/test-balance-devnet' : '/api/test-balance'
      const response = await fetch(`${apiEndpoint}?walletAddress=${senderWallet.publicKey}`)
      const data = await response.json()
      
      if (data.success) {
        setSenderWallet(prev => prev ? { ...prev, balance: data.data.balance } : null)
        setStatus(`✅ Balance: ${data.data.balance} SOL (${testMode})`)
      } else {
        setStatus('❌ Failed to check balance: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ Failed to check balance: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  // Send SOL transaction
  const sendTransaction = async () => {
    if (!senderWallet) {
      setStatus('❌ Please generate or import a wallet first')
      return
    }

    if (!recipientAddress) {
      setStatus('❌ Please enter recipient address')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setStatus('❌ Please enter a valid amount')
      return
    }

    // For demo mode, we don't need private key
    if (testMode === 'demo') {
      await sendDemoTransaction()
      return
    }

    // For connected wallets, use wallet signing
    if (senderWallet.connected) {
      await sendTransactionWithWallet()
      return
    }

    // For imported wallets, we need private key
    if (!senderWallet.privateKey && !privateKeyForTransaction) {
      setShowPrivateKeyInput(true)
      setStatus('🔐 Please enter your private key to send this transaction')
      return
    }

    await sendRealTransaction()
  }

  // Send transaction using connected wallet
  const sendTransactionWithWallet = async () => {
    if (!senderWallet || !connectedWalletProvider) {
      setStatus('❌ No wallet connected')
      return
    }

    setIsLoading(true)
    setStatus('Preparing transaction...')
    
    try {
      // Import Solana web3.js classes dynamically
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
      
      // Determine RPC endpoint based on test mode
      let rpcUrl = 'https://api.mainnet-beta.solana.com'
      if (testMode === 'devnet') {
        rpcUrl = 'https://api.devnet.solana.com'
      }
      
      const connection = new Connection(rpcUrl, 'confirmed')
      
      setStatus('Creating transaction...')
      
      // Create transaction
      const fromPubkey = new PublicKey(senderWallet.publicKey)
      const toPubkey = new PublicKey(recipientAddress)
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
      
      // Check balance (including estimated transaction fee)
      const ESTIMATED_FEE_LAMPORTS = 5000 // Typical Solana transaction fee
      const totalRequired = lamports + ESTIMATED_FEE_LAMPORTS
      const balance = await connection.getBalance(fromPubkey)
      if (balance < totalRequired) {
        throw new Error(`Insufficient balance. Available: ${(balance / LAMPORTS_PER_SOL).toFixed(9)} SOL, Required: ${(totalRequired / LAMPORTS_PER_SOL).toFixed(9)} SOL (including ~${(ESTIMATED_FEE_LAMPORTS / LAMPORTS_PER_SOL).toFixed(9)} SOL fee)`)
      }
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      )
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = fromPubkey
      
      setStatus('Waiting for wallet approval...')
      
      // Sign transaction with wallet
      const signedTransaction = await connectedWalletProvider.signTransaction(transaction)
      
      setStatus('Sending transaction...')
      
      // Send signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      
      setStatus('Confirming transaction...')
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed')
      
      setStatus('✅ Transaction sent successfully!')
      setTransactionResult({
        success: true,
        signature,
        amount: parseFloat(amount),
        fromAddress: senderWallet.publicKey,
        toAddress: recipientAddress
      })
      
      // Refresh balance after transaction
      setTimeout(checkBalance, 2000)
      
    } catch (error) {
      console.error('Wallet transaction error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatus('❌ Transaction failed: ' + errorMessage)
      setTransactionResult({ success: false, error: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  // Send demo transaction (no private key needed)
  const sendDemoTransaction = async () => {
    setIsLoading(true)
    setStatus('Sending demo transaction...')
    
    try {
      const response = await fetch('/api/test-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPrivateKey: 'demo_key',
          toAddress: recipientAddress,
          amount: parseFloat(amount)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setTransactionResult(data.data)
        setStatus('✅ Demo transaction sent successfully!')
      } else {
        setStatus('❌ Demo transaction failed: ' + data.error)
        setTransactionResult({ success: false, error: data.error })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setStatus('❌ Demo transaction failed: ' + errorMessage)
      setTransactionResult({ success: false, error: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  // Send real transaction (requires private key)
  const sendRealTransaction = async () => {
    if (!senderWallet) {
      setStatus('❌ Please generate or import a wallet first')
      return
    }

    const privateKey = senderWallet.privateKey || privateKeyForTransaction
    
    if (!privateKey) {
      setStatus('❌ Private key is required for real transactions')
      return
    }

    setIsLoading(true)
    setStatus('Sending transaction...')
    
    try {
      let apiEndpoint
      if (testMode === 'devnet') {
        apiEndpoint = '/api/send-solana-transaction-devnet'
        setStatus('Sending devnet transaction...')
      } else {
        apiEndpoint = '/api/send-solana-transaction'
        setStatus('Sending mainnet transaction...')
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPrivateKey: privateKey,
          toAddress: recipientAddress,
          amount: parseFloat(amount)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setTransactionResult(data.data)
        setStatus('✅ Transaction sent successfully!')
        // Clear private key after successful transaction
        setPrivateKeyForTransaction('')
        setShowPrivateKeyInput(false)
        // Refresh balance after transaction
        setTimeout(checkBalance, 2000)
      } else {
        setStatus('❌ Transaction failed: ' + data.error)
        setTransactionResult({ success: false, error: data.error })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setStatus('❌ Transaction failed: ' + errorMessage)
      setTransactionResult({ success: false, error: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  // Get devnet SOL for testing
  const getDevnetSOL = async () => {
    if (!senderWallet) {
      setStatus('❌ Please generate or import a wallet first')
      return
    }

    setIsLoading(true)
    setStatus('Requesting devnet SOL...')
    
    try {
      const response = await fetch('/api/get-devnet-sol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: senderWallet.publicKey
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setStatus('✅ Devnet SOL received! Check balance to confirm.')
        setTimeout(checkBalance, 2000)
      } else {
        setStatus('❌ Failed to get devnet SOL: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ Failed to get devnet SOL: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            💸 Crypto Transfer Test
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            Connect your wallet to view all crypto assets and transfer securely
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wallet Setup */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">🔑 Wallet Setup</h2>
            
            {!senderWallet ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-300 mb-4">
                    Connect your wallet or generate a test wallet
                  </p>
                  
                  {/* Wallet Connect Buttons */}
                  <div className="space-y-3">
                    {walletAvailable.phantom && (
                      <button
                        onClick={() => connectWallet('phantom')}
                        disabled={isWalletConnecting}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>🟣</span>
                        <span>{isWalletConnecting ? 'Connecting...' : 'Connect Phantom'}</span>
                      </button>
                    )}
                    
                    {walletAvailable.solflare && (
                      <button
                        onClick={() => connectWallet('solflare')}
                        disabled={isWalletConnecting}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>🟠</span>
                        <span>{isWalletConnecting ? 'Connecting...' : 'Connect Solflare'}</span>
                      </button>
                    )}
                  </div>

                  {/* Install Wallet Links */}
                  {!walletAvailable.phantom && !walletAvailable.solflare && (
                    <div className="mt-4 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                      <h3 className="text-lg font-semibold text-yellow-300 mb-2">Install a Wallet</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => window.open('https://phantom.app/', '_blank')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm"
                        >
                          🟣 Install Phantom
                        </button>
                        <button
                          onClick={() => window.open('https://solflare.com/', '_blank')}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm"
                        >
                          🟠 Install Solflare
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-gray-300 text-sm mb-3">Or use manual options:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={generateWallet}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                      >
                        Generate Test Wallet
                      </button>
                      <button
                        onClick={() => setShowImportWallet(true)}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                      >
                        Import Wallet
                      </button>
                    </div>
                  </div>
                </div>

                {/* Import Wallet Form */}
                {showImportWallet && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3">Import Existing Wallet</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">
                          Public Key (Wallet Address)
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your wallet address..."
                          value={importPublicKey}
                          onChange={(e) => setImportPublicKey(e.target.value)}
                          className="w-full p-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={importWalletByPublicKey}
                          disabled={isLoading || !importPublicKey.trim()}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          {isLoading ? 'Importing...' : 'Import Wallet'}
                        </button>
                        <button
                          onClick={() => {
                            setShowImportWallet(false)
                            setImportPublicKey('')
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-blue-300">
                        💡 Enter your public key to view wallet info. Private key will only be needed when sending transactions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-semibold mb-2">Wallet Address</label>
                  <input
                    type="text"
                    value={senderWallet.publicKey}
                    readOnly
                    className="w-full p-2 rounded bg-white/10 border border-white/20 text-white text-sm"
                  />
                </div>

                {senderWallet.connected && (
                  <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                    <p className="text-green-300 text-sm">
                      ✅ Connected to wallet
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-white font-semibold mb-2">SOL Balance</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={senderWallet.balance || 'Not checked'}
                      readOnly
                      className="flex-1 p-2 rounded bg-white/10 border border-white/20 text-white text-sm"
                    />
                    <button
                      onClick={checkBalance}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm"
                    >
                      {isLoading ? 'Checking...' : 'Check'}
                    </button>
                  </div>
                </div>

                {testMode === 'devnet' && (
                  <button
                    onClick={getDevnetSOL}
                    disabled={isLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    {isLoading ? 'Requesting...' : 'Get Devnet SOL (Free)'}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={generateWallet}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    Generate New Wallet
                  </button>
                  <button
                    onClick={disconnectWallet}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    {senderWallet.connected ? 'Disconnect' : 'Clear Wallet'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Crypto Assets */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">💰 Your Crypto Assets</h2>
            
            {!senderWallet ? (
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  Connect your wallet to view all your crypto assets
                </p>
                <div className="text-6xl mb-4">💎</div>
                <p className="text-gray-400 text-sm">
                  View SOL, SPL tokens, and other assets
                </p>
              </div>
            ) : cryptoAssets.length > 0 ? (
              <div className="space-y-3">
                {cryptoAssets.map((asset, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {asset.symbol.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{asset.symbol}</p>
                          <p className="text-gray-400 text-xs">{asset.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{asset.balance}</p>
                        <p className="text-gray-400 text-xs">{asset.decimals} decimals</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  No crypto assets found
                </p>
                <button
                  onClick={() => senderWallet && loadCryptoAssets(senderWallet.publicKey)}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Load Assets'}
                </button>
              </div>
            )}
          </div>

          {/* Transfer Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">💸 Transfer SOL</h2>
            
            {/* Test Mode Selection */}
            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">Test Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTestMode('demo')}
                  className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                    testMode === 'demo'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  🧪 Demo
                </button>
                <button
                  onClick={() => setTestMode('devnet')}
                  className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                    testMode === 'devnet'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  🧪 Devnet
                </button>
                <button
                  onClick={() => setTestMode('mainnet')}
                  className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                    testMode === 'mainnet'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  🔥 Mainnet
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Recipient Address</label>
                <input
                  type="text"
                  placeholder="Enter recipient wallet address..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full p-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Amount (SOL)</label>
                <input
                  type="number"
                  placeholder="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.001"
                  min="0.001"
                  className="w-full p-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              {/* Private Key Input for Real Transactions */}
              {showPrivateKeyInput && testMode !== 'demo' && !senderWallet?.connected && (
                <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                  <label className="block text-white font-semibold mb-2">
                    🔐 Private Key (Required for {testMode} transaction)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your private key..."
                    value={privateKeyForTransaction}
                    onChange={(e) => setPrivateKeyForTransaction(e.target.value)}
                    className="w-full p-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400"
                  />
                  <p className="text-xs text-yellow-300 mt-2">
                    ⚠️ Your private key is only used to sign this transaction and is not stored.
                  </p>
                </div>
              )}

              <button
                onClick={sendTransaction}
                disabled={isLoading || !senderWallet || !recipientAddress || !amount}
                className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${
                  testMode === 'demo'
                    ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white'
                    : testMode === 'devnet'
                    ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white'
                }`}
              >
                {isLoading ? 'Sending...' : 
                  testMode === 'demo' ? 'Send Demo Transaction' :
                  testMode === 'devnet' ? 'Send Devnet Transaction' :
                  'Send Mainnet Transaction'
                }
              </button>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-3">Quick Test</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setTestMode('demo')
                    setRecipientAddress('CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM')
                    setAmount('0.001')
                    setStatus('Demo mode ready! Generate wallet and click "Send Demo Transaction"')
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm"
                >
                  🧪 Setup Demo Test
                </button>
                <button
                  onClick={() => {
                    setTestMode('devnet')
                    setRecipientAddress('CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM')
                    setAmount('0.1')
                    setStatus('Devnet mode ready! Generate wallet, get devnet SOL, then click "Send Devnet Transaction"')
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm"
                >
                  🧪 Setup Devnet Test
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Display */}
        {status && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-2">Status</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{status}</p>
          </div>
        )}

        {/* Transaction Result */}
        {transactionResult && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">
              {transactionResult.success ? '✅ Transaction Success' : '❌ Transaction Failed'}
            </h3>
            
            {transactionResult.success ? (
              <div className="space-y-2 text-gray-300">
                <p><strong>Signature:</strong> {transactionResult.signature}</p>
                <p><strong>Amount:</strong> {transactionResult.amount} SOL</p>
                <p><strong>From:</strong> {transactionResult.fromAddress}</p>
                <p><strong>To:</strong> {transactionResult.toAddress}</p>
                <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
                {testMode === 'demo' && (
                  <p className="text-purple-300 text-sm">
                    💡 This was a demo transaction - no real SOL was transferred
                  </p>
                )}
              </div>
            ) : (
              <div className="text-red-300">
                <p><strong>Error:</strong> {transactionResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Wallet Connection Info */}
        <div className="mt-8 bg-green-500/20 backdrop-blur-lg rounded-lg p-6 border border-green-500/30">
          <h3 className="text-lg font-bold text-green-300 mb-2">🔗 Wallet Connection Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-green-200 text-sm">
            <div>
              <h4 className="font-semibold text-green-300">🔐 Secure</h4>
              <p>• No private key exposure</p>
              <p>• Wallet handles signing</p>
              <p>• Deep linking support</p>
            </div>
            <div>
              <h4 className="font-semibold text-green-300">💰 View All Assets</h4>
              <p>• SOL balance</p>
              <p>• SPL tokens</p>
              <p>• NFT collections</p>
            </div>
            <div>
              <h4 className="font-semibold text-green-300">🚀 Easy Transactions</h4>
              <p>• One-click signing</p>
              <p>• No manual key entry</p>
              <p>• Multiple wallet support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
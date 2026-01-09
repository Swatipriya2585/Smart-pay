import React, { useState } from 'react';
import { getWalletBalanceAndValue, detectNetworkAndValidate } from '@/utils/phantom';

export default function TestBalance() {
  const [walletAddress, setWalletAddress] = useState('CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testBalanceFetch = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      console.log('🧪 Testing balance fetch for:', walletAddress);
      const balanceResult = await getWalletBalanceAndValue(walletAddress);
      setResult(balanceResult);
      console.log('✅ Balance test result:', balanceResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('❌ Balance test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testNetworkDetection = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      console.log('🧪 Testing network detection for:', walletAddress);
      const networkResult = await detectNetworkAndValidate(walletAddress);
      setResult(networkResult);
      console.log('✅ Network test result:', networkResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('❌ Network test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-white text-2xl font-bold text-center">🧪 Balance Test Page</h1>
        
        <div className="bg-gray-800 rounded-xl p-4">
          <label className="block text-white text-sm font-medium mb-2">
            Wallet Address:
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            placeholder="Enter wallet address"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={testBalanceFetch}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-xl py-3 text-white font-medium transition-colors"
          >
            {loading ? 'Testing...' : '🔍 Test Balance Fetch'}
          </button>

          <button
            onClick={testNetworkDetection}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-xl py-3 text-white font-medium transition-colors"
          >
            {loading ? 'Testing...' : '🌐 Test Network Detection'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-xl p-4">
            <h3 className="text-red-400 font-semibold mb-2">❌ Error:</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2">✅ Result:</h3>
            <pre className="text-green-300 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2">📋 Instructions:</h3>
          <ol className="text-gray-300 text-sm space-y-1">
            <li>1. Make sure your Phantom wallet is on MAINNET</li>
            <li>2. Click "Test Balance Fetch" to check balance</li>
            <li>3. Click "Test Network Detection" to check network</li>
            <li>4. Check browser console (F12) for detailed logs</li>
            <li>5. Share the console logs with me</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 
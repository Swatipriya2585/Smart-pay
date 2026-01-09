import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { testAllEndpoints, getBestWorkingEndpoint, createRobustConnection } from '../utils/solana-rpc';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface EndpointTestResult {
  endpoint: string;
  working: boolean;
  latency?: number;
  error?: string;
  blockHeight?: number;
}

interface BalanceTestResult {
  address: string;
  balance?: number;
  error?: string;
  endpoint: string;
}

export default function RpcDebug() {
  const [endpointResults, setEndpointResults] = useState<EndpointTestResult[]>([]);
  const [balanceResults, setBalanceResults] = useState<BalanceTestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testAddress, setTestAddress] = useState('CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM');
  const [bestEndpoint, setBestEndpoint] = useState<string>('');

  const testAllRpcEndpoints = async () => {
    setIsTesting(true);
    setEndpointResults([]);
    
    try {
      console.log('🔍 Testing all RPC endpoints...');
      toast.loading('Testing RPC endpoints...', { id: 'rpc-test' });
      
      const results = await testAllEndpoints();
      setEndpointResults(results);
      
      const workingEndpoints = results.filter(r => r.working);
      if (workingEndpoints.length > 0) {
        const best = workingEndpoints.sort((a, b) => (a.latency || 0) - (b.latency || 0))[0];
        setBestEndpoint(best.endpoint);
        toast.success(`Found ${workingEndpoints.length} working endpoints! Best: ${best.endpoint.split('//')[1].split('/')[0]} (${best.latency}ms)`, { id: 'rpc-test' });
      } else {
        toast.error('No working RPC endpoints found!', { id: 'rpc-test' });
      }
      
    } catch (error) {
      console.error('❌ RPC endpoint testing failed:', error);
      toast.error('Failed to test RPC endpoints', { id: 'rpc-test' });
    } finally {
      setIsTesting(false);
    }
  };

  const testBalanceFetching = async () => {
    if (!testAddress.trim()) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    setIsTesting(true);
    setBalanceResults([]);
    
    try {
      console.log('💰 Testing balance fetching...');
      toast.loading('Testing balance fetching...', { id: 'balance-test' });
      
      const results: BalanceTestResult[] = [];
      
      // Test with robust connection
      try {
        const connection = await createRobustConnection();
        const balance = await connection.getBalance(new PublicKey(testAddress));
        results.push({
          address: testAddress,
          balance: balance / LAMPORTS_PER_SOL,
          endpoint: 'Robust Connection (Auto-selected)'
        });
      } catch (error) {
        results.push({
          address: testAddress,
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: 'Robust Connection (Auto-selected)'
        });
      }
      
      // Test with best endpoint
      if (bestEndpoint) {
        try {
          const connection = new Connection(bestEndpoint, 'confirmed');
          const balance = await connection.getBalance(new PublicKey(testAddress));
          results.push({
            address: testAddress,
            balance: balance / LAMPORTS_PER_SOL,
            endpoint: bestEndpoint
          });
        } catch (error) {
          results.push({
            address: testAddress,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: bestEndpoint
          });
        }
      }
      
      setBalanceResults(results);
      
      const successfulResults = results.filter(r => r.balance !== undefined);
      if (successfulResults.length > 0) {
        toast.success(`Balance fetch successful! Balance: ${successfulResults[0].balance} SOL`, { id: 'balance-test' });
      } else {
        toast.error('Balance fetching failed for all endpoints', { id: 'balance-test' });
      }
      
    } catch (error) {
      console.error('❌ Balance fetching test failed:', error);
      toast.error('Failed to test balance fetching', { id: 'balance-test' });
    } finally {
      setIsTesting(false);
    }
  };

  const getBestEndpoint = async () => {
    try {
      console.log('🏆 Finding best RPC endpoint...');
      toast.loading('Finding best RPC endpoint...', { id: 'best-endpoint' });
      
      const endpoint = await getBestWorkingEndpoint();
      setBestEndpoint(endpoint);
      
      toast.success(`Best endpoint: ${endpoint.split('//')[1].split('/')[0]}`, { id: 'best-endpoint' });
      
    } catch (error) {
      console.error('❌ Failed to find best endpoint:', error);
      toast.error('Failed to find best endpoint', { id: 'best-endpoint' });
    }
  };

  const copyEndpoint = (endpoint: string) => {
    navigator.clipboard.writeText(endpoint);
    toast.success('Endpoint copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 RPC Connection Debug</h1>
          <p className="text-gray-600 mb-6">
            Test and diagnose Solana RPC endpoint connections. This tool helps identify the best working endpoint and troubleshoot connection issues.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={testAllRpcEndpoints}
              disabled={isTesting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isTesting ? 'Testing...' : 'Test All Endpoints'}
            </button>
            
            <button
              onClick={getBestEndpoint}
              disabled={isTesting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Find Best Endpoint
            </button>
            
            <button
              onClick={testBalanceFetching}
              disabled={isTesting}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Test Balance Fetch
            </button>
          </div>

          {bestEndpoint && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">🏆 Best Working Endpoint</h3>
              <div className="flex items-center justify-between">
                <code className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                  {bestEndpoint}
                </code>
                <button
                  onClick={() => copyEndpoint(bestEndpoint)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Endpoint Test Results */}
        {endpointResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 RPC Endpoint Test Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Block Height
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {endpointResults.map((result, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {result.endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.working 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.working ? '✅ Working' : '❌ Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.latency ? `${result.latency}ms` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.blockHeight ? result.blockHeight.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        {result.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Balance Test Results */}
        {balanceResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Balance Fetch Test Results</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Wallet Address
              </label>
              <input
                type="text"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Solana wallet address"
              />
            </div>
            
            <div className="space-y-4">
              {balanceResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {result.endpoint}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      result.balance !== undefined 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.balance !== undefined ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                  
                  {result.balance !== undefined ? (
                    <div className="text-sm text-gray-600">
                      <p><strong>Address:</strong> {result.address}</p>
                      <p><strong>Balance:</strong> {result.balance.toFixed(6)} SOL</p>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      <p><strong>Error:</strong> {result.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troubleshooting Guide */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Troubleshooting Guide</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-red-400 pl-4">
              <h3 className="text-lg font-semibold text-red-800">❌ All Endpoints Failed</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Try again in a few minutes (rate limiting)</li>
                <li>• Consider using a paid RPC provider</li>
                <li>• Check if Solana network is experiencing issues</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-yellow-400 pl-4">
              <h3 className="text-lg font-semibold text-yellow-800">⚠️ High Latency</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Try a different RPC endpoint</li>
                <li>• Consider using a paid RPC provider</li>
                <li>• Check your network connection</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-blue-400 pl-4">
              <h3 className="text-lg font-semibold text-blue-800">💡 Recommendations</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Use the best endpoint shown above</li>
                <li>• For production, consider QuickNode, Alchemy, or Helius</li>
                <li>• Set up environment variable: NEXT_PUBLIC_SOLANA_RPC_ENDPOINT</li>
                <li>• Monitor endpoint performance regularly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
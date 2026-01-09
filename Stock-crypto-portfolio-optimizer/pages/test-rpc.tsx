import React, { useState } from 'react';
import { testAllEndpoints, getBestWorkingEndpoint } from '@/utils/solana-rpc';

export default function TestRpc() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bestEndpoint, setBestEndpoint] = useState<string>('');

  const testEndpoints = async () => {
    setLoading(true);
    try {
      const endpointResults = await testAllEndpoints();
      setResults(endpointResults);
      
      const working = endpointResults.filter(r => r.working);
      if (working.length > 0) {
        const best = await getBestWorkingEndpoint();
        setBestEndpoint(best);
      }
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">RPC Endpoint Tester</h1>
        
        <button
          onClick={testEndpoints}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-colors mb-6"
        >
          {loading ? 'Testing...' : 'Test All Endpoints'}
        </button>

        {bestEndpoint && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
            <h2 className="text-xl font-bold text-green-400 mb-2">Best Working Endpoint</h2>
            <p className="font-mono text-green-300">{bestEndpoint}</p>
          </div>
        )}

        <div className="grid gap-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border ${
                result.working
                  ? 'bg-green-500/20 border-green-500/50'
                  : 'bg-red-500/20 border-red-500/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm">{result.endpoint}</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  result.working ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {result.working ? 'WORKING' : 'FAILED'}
                </span>
              </div>
              {result.working && result.latency && (
                <p className="text-xs text-gray-300 mt-1">
                  Latency: {result.latency}ms
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
'use client'

import { useState } from 'react'

export default function TestDemoPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDemoTransaction = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPrivateKey: 'test_key',
          toAddress: 'test_address',
          amount: 0.001
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🧪 Demo Mode Test</h1>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Demo Mode Toggle</h2>
          <div className="flex items-center space-x-4 mb-4">
            <label className="text-white">Demo Mode:</label>
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-white">{demoMode ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
          
          <button
            onClick={testDemoTransaction}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            {loading ? 'Testing...' : 'Test Demo Transaction'}
          </button>
        </div>

        {result && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Result</h2>
            <pre className="text-white text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6">
          <a href="/transfer" className="text-blue-400 hover:text-blue-300 underline">
            ← Back to Transfer Page
          </a>
        </div>
      </div>
    </div>
  )
} 
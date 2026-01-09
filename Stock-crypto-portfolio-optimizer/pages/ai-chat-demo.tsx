import React from 'react';
import Head from 'next/head';
import AIChat from '../components/AIChat';

export default function AIChatDemo() {
  return (
    <>
      <Head>
        <title>AI Chat Demo - CryptoChain</title>
        <meta name="description" content="Test the AI chat functionality for CryptoChain" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, orientation=portrait" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CC</span>
                </div>
                <h1 className="text-white text-xl font-bold">CryptoChain</h1>
              </div>
              <div className="text-white/60 text-sm">
                AI Chat Demo
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel - Info */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <h2 className="text-white text-2xl font-bold mb-4">🤖 AI Assistant</h2>
                <p className="text-gray-300 mb-6">
                  Chat with our AI assistant about cryptocurrency, wallet management, and blockchain technology.
                </p>
                
                <div className="space-y-4">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                    <h3 className="text-purple-400 font-semibold mb-2">💡 Suggested Questions</h3>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li>• "What is Solana and how does it work?"</li>
                      <li>• "How do I keep my crypto wallet secure?"</li>
                      <li>• "What are the differences between SOL and other cryptocurrencies?"</li>
                      <li>• "How do blockchain transactions work?"</li>
                      <li>• "What are the benefits of using CryptoChain?"</li>
                    </ul>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">🔧 Setup Required</h3>
                    <p className="text-gray-300 text-sm">
                      To use the AI chat, you need to add your OpenAI API key to the <code className="bg-gray-800 px-1 rounded">.env.local</code> file:
                    </p>
                    <div className="mt-2 p-2 bg-gray-800 rounded text-xs font-mono text-green-400">
                      OPENAI_API_KEY="sk-your-actual-key-here"
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <h3 className="text-green-400 font-semibold mb-2">✅ Features</h3>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Real-time chat interface</li>
                      <li>• Cryptocurrency expertise</li>
                      <li>• Secure API integration</li>
                      <li>• Mobile-responsive design</li>
                      <li>• Error handling & retry logic</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Chat */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <AIChat className="h-[600px]" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              CryptoChain AI Assistant • Powered by OpenAI GPT-3.5 Turbo
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <a 
                href="/" 
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                ← Back to Home
              </a>
              <a 
                href="/send-solana-real" 
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                Send SOL →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
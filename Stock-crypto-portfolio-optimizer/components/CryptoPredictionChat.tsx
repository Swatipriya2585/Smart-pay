/**
 * Crypto Prediction Chat Component
 * 
 * Enhanced AI chat that provides crypto transaction predictions
 * based on connected wallet holdings
 */

import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  PaperAirplaneIcon, 
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  prediction?: PredictionData;
}

interface PredictionData {
  recommendation: {
    useSymbol: string;
    useAmount: number;
    reasons: string[];
    score: number;
    alternatives: Array<{
      symbol: string;
      amount: number;
      score: number;
    }>;
    holdSymbols: string[];
  };
  analysis?: {
    technical: string;
    sentiment: string;
    prediction: string;
  };
}

export default function CryptoPredictionChat() {
  const { publicKey, connected } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    if (connected && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content: `👋 Welcome! I'm your crypto transaction optimizer.\n\n${
          publicKey 
            ? `Connected wallet: ${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-8)}\n\n`
            : ''
        }I can help you decide which crypto to use for transactions to maximize value retention.\n\nTry:\n• "Should I use SOL or USDC for a $500 payment?"\n• "Analyze my portfolio for a $1000 transaction"\n• "Which crypto should I spend?"`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [connected, publicKey]);

  const getPrediction = async (amount: number, purpose: string = 'transaction') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/crypto-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey?.toString(),
          transactionAmount: amount,
          purpose
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Check if message contains transaction amount
      const amountMatch = messageContent.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      
      if (amountMatch && connected) {
        // Extract amount and get prediction
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        const purpose = messageContent.toLowerCase().includes('payment') ? 'payment' :
                       messageContent.toLowerCase().includes('purchase') ? 'purchase' :
                       'transaction';

        const predictionData = await getPrediction(amount, purpose);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: formatPredictionMessage(predictionData, amount),
          isUser: false,
          timestamp: new Date(),
          prediction: predictionData
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Regular chat message
        const response = await fetch('/api/openai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: messageContent,
            maxTokens: 200
          }),
        });

        const data = await response.json();

        if (data.success) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.response,
            isUser: false,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          setError(data.error || 'Failed to get response');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPredictionMessage = (data: PredictionData, amount: number): string => {
    const { recommendation, analysis } = data;
    
    let message = `💡 TRANSACTION RECOMMENDATION\n\n`;
    message += `For your $${amount.toFixed(2)} transaction:\n\n`;
    message += `🎯 USE: ${recommendation.useSymbol}\n`;
    message += `   Amount: ${recommendation.useAmount.toFixed(6)} ${recommendation.useSymbol}\n\n`;
    message += `Why ${recommendation.useSymbol}?\n`;
    recommendation.reasons.forEach(reason => {
      message += `   ${reason}\n`;
    });
    
    if (recommendation.holdSymbols.length > 0) {
      message += `\n🔒 HOLD: ${recommendation.holdSymbols.join(', ')}\n`;
      message += `   These are performing well - keep them!\n`;
    }

    if (analysis) {
      message += `\n📊 AI Analysis:\n${analysis.technical}\n${analysis.sentiment}\n${analysis.prediction}`;
    }

    return message;
  };

  const handleQuickPrediction = async () => {
    if (!transactionAmount || !connected) return;

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: `Analyze my portfolio for a $${amount} transaction`,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setTransactionAmount('');
    setShowPrediction(false);
    setIsLoading(true);

    try {
      const predictionData = await getPrediction(amount);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: formatPredictionMessage(predictionData, amount),
        isUser: false,
        timestamp: new Date(),
        prediction: predictionData
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Prediction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Crypto Optimizer</h3>
        </div>
        <div className="flex items-center space-x-2">
          {connected ? (
            <span className="text-xs text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Connected
            </span>
          ) : (
            <span className="text-xs text-gray-500">Not connected</span>
          )}
          <button
            onClick={() => setShowPrediction(!showPrediction)}
            className="text-sm text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
          >
            {showPrediction ? 'Hide' : 'Quick Predict'}
          </button>
        </div>
      </div>

      {/* Quick Prediction Panel */}
      {showPrediction && connected && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
            <input
              type="number"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              placeholder="Enter amount (USD)"
              className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleQuickPrediction}
              disabled={!transactionAmount || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Analyze
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!connected && (
          <div className="text-center text-gray-500 py-8">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm mb-2">Connect your wallet to get started!</p>
            <p className="text-xs text-gray-400">
              I'll analyze your holdings and recommend which crypto to use for transactions.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : message.prediction
                  ? 'bg-gradient-to-r from-green-50 to-blue-50 text-gray-900 border border-green-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.isUser ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Analyzing...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">
              <p className="text-sm">❌ {error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              connected 
                ? "Ask about your portfolio or enter transaction amount..." 
                : "Connect wallet to get predictions..."
            }
            disabled={isLoading || !connected}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || !connected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {connected 
            ? "Try: 'Should I use SOL for a $500 payment?'" 
            : "Connect your wallet to get started"}
        </p>
      </div>
    </div>
  );
}


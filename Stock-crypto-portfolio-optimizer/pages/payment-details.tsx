import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function PaymentDetails() {
  const router = useRouter();
  const [selectedCrypto, setSelectedCrypto] = useState('Ethereum');
  const [showCryptoSelector, setShowCryptoSelector] = useState(false);

  const handleConfirmPayment = () => {
    router.push('/payment-confirmation');
  };

  const cryptos = [
    { name: 'Ethereum', icon: '♦', color: 'bg-green-500' },
    { name: 'Solana', icon: 'S', color: 'bg-blue-500' },
    { name: 'Tether', icon: 'T', color: 'bg-green-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      {/* Header */}
      <div className="text-left mb-6">
        <h1 className="text-gray-400 text-sm mb-2">Home</h1>
        <h2 className="text-white text-3xl font-bold italic">CryptoChain</h2>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Payment Details */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold">Payment Details</h3>
          <div className="text-center">
            <p className="text-white text-4xl font-bold">$120.00</p>
            <div className="mt-2">
              <span className="text-white text-lg">amazon</span>
            </div>
          </div>
        </div>

        {/* Crypto Recommendation */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Crypto Recommendation</h3>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">♦</span>
            </div>
            <span className="text-white font-medium">Ethereum</span>
          </div>
        </div>

        {/* Cash Back */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Cash Back</h3>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-white font-medium">Bitcoin</span>
          </div>
          <p className="text-white text-sm">2% Cashback</p>
        </div>

        {/* Crypto Selector */}
        <div className="relative">
          <button
            onClick={() => setShowCryptoSelector(!showCryptoSelector)}
            className="w-full bg-purple-600 rounded-xl p-4 text-white font-medium text-left"
          >
            Select Crypto
          </button>
          
          {showCryptoSelector && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-purple-600 rounded-xl p-4 z-10">
              <div className="space-y-3">
                {cryptos.map((crypto) => (
                  <button
                    key={crypto.name}
                    onClick={() => {
                      setSelectedCrypto(crypto.name);
                      setShowCryptoSelector(false);
                    }}
                    className="w-full flex items-center space-x-3 text-white hover:bg-purple-700 rounded-lg p-2 transition-colors"
                  >
                    <div className={`w-6 h-6 ${crypto.color} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">{crypto.icon}</span>
                    </div>
                    <span className="font-medium">{crypto.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Payment Button */}
        <button
          onClick={handleConfirmPayment}
          className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl py-4 text-white font-medium transition-colors"
        >
          Confirm Payment
        </button>
      </div>
    </div>
  );
} 
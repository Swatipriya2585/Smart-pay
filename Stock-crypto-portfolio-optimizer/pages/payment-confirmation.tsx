import React from 'react';
import { useRouter } from 'next/router';

export default function PaymentConfirmation() {
  const router = useRouter();

  const handleOK = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      {/* Header */}
      <div className="text-left mb-8">
        <h1 className="text-gray-400 text-sm mb-2">Register</h1>
        <h2 className="text-white text-3xl font-bold italic">CryptoChain</h2>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Success Message */}
        <div className="text-center space-y-4">
          <h3 className="text-white text-3xl font-bold">
            Payment Sent
          </h3>
          
          {/* Ethereum Logo */}
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-white text-2xl font-bold">♦</span>
          </div>
          
          {/* Amount */}
          <p className="text-white text-2xl font-semibold">
            0.025 ETH
          </p>
          
          {/* Recipient */}
          <p className="text-white text-lg">
            Amazon.com
          </p>
        </div>

        {/* OK Button */}
        <button
          onClick={handleOK}
          className="w-full max-w-sm bg-purple-600 hover:bg-purple-700 rounded-xl py-4 text-white font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
} 
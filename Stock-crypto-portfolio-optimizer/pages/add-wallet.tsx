import React from 'react';
import { useRouter } from 'next/router';

export default function AddWallet() {
  const router = useRouter();

  const handleContinueWithEmail = () => {
    router.push('/create-pin');
  };

  const handleUsePhone = () => {
    router.push('/create-pin');
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
        {/* Wallet Card Visual */}
        <div className="relative w-full max-w-sm">
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-xl p-8 shadow-lg transform rotate-3">
            <div className="w-full h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg opacity-80"></div>
          </div>
        </div>

        {/* Main Text */}
        <div className="text-center space-y-2">
          <h3 className="text-white text-2xl font-bold">
            Add a Wallet
          </h3>
          <p className="text-white text-lg">
            Login or Import an existing wallet
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleContinueWithEmail}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl font-medium text-white shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all"
          >
            Continue with email
          </button>

          <button
            onClick={handleUsePhone}
            className="w-full text-white text-center py-2 hover:text-purple-300 transition-colors"
          >
            Use your phone no.
          </button>
        </div>
      </div>
    </div>
  );
} 
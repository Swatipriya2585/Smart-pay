import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { LockClosedIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreatePin() {
  const [pin, setPin] = useState('');
  const router = useRouter();

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
  };

  const handleContinue = () => {
    if (pin.length === 6) {
      console.log('PIN created:', pin);
      // New users go to wallet connection page
      router.push('/connect-wallet');
    }
  };

  const handleBack = () => {
    router.push('/phone-number');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={handleBack}
          className="p-2 rounded-full bg-gray-800 mr-4"
        >
          <ArrowLeftIcon className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-gray-400 text-sm mb-2">Register</h1>
          <h2 className="text-white text-3xl font-bold italic">CryptoChain</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Lock Icon */}
        <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h3 className="text-white text-2xl font-bold">
            Create a PIN
          </h3>
          <p className="text-white text-lg">
            This is used to secure your wallet on all your devices.
          </p>
        </div>

        {/* PIN Input */}
        <div className="w-full max-w-sm space-y-6">
          <div>
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter 6-digit PIN"
              className="w-full py-4 px-6 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-2xl font-mono placeholder-gray-500 focus:outline-none focus:border-purple-500"
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          {/* PIN Dots */}
          <div className="flex justify-center space-x-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 ${
                  index < pin.length
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleContinue}
            disabled={pin.length !== 6}
            className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all ${
              pin.length === 6
                ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            Continue
          </button>

          <p className="text-gray-400 text-sm text-center">
            Your PIN is encrypted and never stored in plain text
          </p>
        </div>
      </div>
    </div>
  );
} 
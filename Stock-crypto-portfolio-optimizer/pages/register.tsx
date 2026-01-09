import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ShieldCheckIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function Register() {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const router = useRouter();

  const handleRegister = () => {
    console.log('Register button clicked, agreedToTerms:', agreedToTerms);
    if (agreedToTerms) {
      console.log('Navigating to /phone-number');
      router.push('/phone-number');
    } else {
      console.log('Terms not agreed to');
    }
  };

  const handleLogin = () => {
    console.log('Login button clicked, navigating to /phone-login');
    router.push('/phone-login');
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
        {/* Value Proposition */}
        <div className="text-center space-y-2">
          <h3 className="text-white text-2xl font-bold">
            Decentralized Payment Platform
          </h3>
          <p className="text-white text-lg">
            No platform fees, low transaction fee, no hassle.
          </p>
        </div>

        {/* Security Card */}
        <div className="relative w-full max-w-sm">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-white font-medium">Secured by CryptoChain Security 2.0</p>
              </div>
            </div>
            <div className="text-white">
              <p className="text-lg font-mono">*****</p>
              <p className="text-sm">2025</p>
            </div>
          </div>
        </div>

        {/* Terms and Register Button */}
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                console.log('Checkbox clicked, current state:', agreedToTerms);
                setAgreedToTerms(!agreedToTerms);
              }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                agreedToTerms
                  ? 'bg-purple-600 border-purple-600'
                  : 'border-gray-400'
              }`}
            >
              {agreedToTerms && <CheckIcon className="w-4 h-4 text-white" />}
            </button>
            <span className="text-white text-sm">
              I agree to the Terms of service.
            </span>
          </div>

          <button
            onClick={handleRegister}
            disabled={!agreedToTerms}
            className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all ${
              agreedToTerms
                ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            Register
          </button>

          <button
            onClick={handleLogin}
            className="w-full text-white text-center py-2 hover:text-purple-300 transition-colors"
          >
            I already have an account!
          </button>
        </div>
      </div>
    </div>
  );
} 
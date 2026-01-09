import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { DevicePhoneMobileIcon, ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function PhoneNumber() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  // Simulate existing users database
  const existingUsers = ['9049948489', '5551234567', '9876543210'];

  const handleContinue = async () => {
    if (phoneNumber.length >= 10) {
      setIsChecking(true);
      setError('');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if phone number already exists
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (existingUsers.includes(cleanPhone)) {
        setError('This phone number is already registered. Please sign in instead.');
        setIsChecking(false);
        return;
      }
      
      console.log('Phone number entered:', phoneNumber);
      router.push('/create-pin');
    }
  };

  const handleBack = () => {
    router.push('/register');
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError(''); // Clear error when user types
  };

  const handleSignIn = () => {
    router.push('/phone-login');
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
        {/* Phone Icon */}
        <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center">
          <DevicePhoneMobileIcon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h3 className="text-white text-2xl font-bold">
            Enter Your Phone Number
          </h3>
          <p className="text-white text-lg">
            We'll send you a verification code
          </p>
        </div>

        {/* Phone Input */}
        <div className="w-full max-w-sm space-y-6">
          <div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className={`w-full py-4 px-6 bg-gray-800 border rounded-xl text-white text-center text-xl font-mono placeholder-gray-500 focus:outline-none transition-colors ${
                error ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-purple-500'
              }`}
              maxLength={14}
              inputMode="numeric"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                  <button
                    onClick={handleSignIn}
                    className="text-purple-400 hover:text-purple-300 text-sm mt-1 underline"
                  >
                    Click here to sign in
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={phoneNumber.length < 10 || isChecking}
            className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all ${
              phoneNumber.length >= 10 && !isChecking
                ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isChecking ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Checking...</span>
              </div>
            ) : (
              'Continue'
            )}
          </button>

          <p className="text-gray-400 text-sm text-center">
            By continuing, you agree to receive SMS messages for verification
          </p>
        </div>
      </div>
    </div>
  );
} 
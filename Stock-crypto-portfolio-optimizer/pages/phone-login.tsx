import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { DevicePhoneMobileIcon, LockClosedIcon, ArrowLeftIcon, ExclamationTriangleIcon, KeyIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function PhoneLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [step, setStep] = useState<'phone' | 'pin' | 'forgot-pin' | 'verify-reset'>('phone');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [generatedResetCode, setGeneratedResetCode] = useState('');
  const router = useRouter();

  // Simulate existing users database with PINs
  const existingUsers: { [key: string]: string } = {
    '9049948489': '123456',
    '5551234567': '654321',
    '9876543210': '111111'
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
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

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setError(''); // Clear error when user types
  };

  const handleResetCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setResetCode(value);
    setError(''); // Clear error when user types
  };

  const handleContinue = async () => {
    if (step === 'phone' && phoneNumber.length >= 10) {
      setIsChecking(true);
      setError('');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if phone number exists
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (!existingUsers[cleanPhone]) {
        setError('This phone number is not registered. Please sign up first.');
        setIsChecking(false);
        return;
      }
      
      console.log('Phone number verified:', phoneNumber);
      setStep('pin');
      setIsChecking(false);
    } else if (step === 'pin' && pin.length === 6) {
      setIsChecking(true);
      setError('');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if PIN is correct
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (existingUsers[cleanPhone] !== pin) {
        setError('Incorrect PIN. Please try again.');
        setPin('');
        setShowForgotPin(true);
        setIsChecking(false);
        return;
      }
      
      console.log('PIN verified:', pin);
      // Existing users go directly to home page
      router.push('/home');
    }
  };

  const handleForgotPin = () => {
    setStep('forgot-pin');
    setError('');
    setShowForgotPin(false);
  };

  const handleResetPin = async () => {
    setIsChecking(true);
    setError('');
    
    // Generate a 6-digit reset code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedResetCode(code);
    
    try {
      // Send SMS via API
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          resetCode: code,
          type: 'reset'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setError('A 6-digit reset code has been sent to your phone. Please check your SMS messages.');
        setStep('verify-reset');
      } else {
        setError(result.error || 'Failed to send reset code. Please try again.');
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      setError('Network error. Please check your connection and try again.');
    }
    
    setIsChecking(false);
  };

  const handleVerifyResetCode = async () => {
    if (resetCode.length !== 6) return;
    
    setIsChecking(true);
    setError('');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the reset code
    if (resetCode === generatedResetCode) {
      setError('PIN reset successful! You can now set a new PIN.');
      // In a real app, you would redirect to set new PIN page
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    } else {
      setError('Invalid reset code. Please check your SMS and try again.');
      setResetCode('');
    }
    
    setIsChecking(false);
  };

  const handleBack = () => {
    if (step === 'verify-reset') {
      setStep('forgot-pin');
      setResetCode('');
      setError('');
    } else if (step === 'forgot-pin') {
      setStep('pin');
      setShowForgotPin(false);
      setError('');
    } else if (step === 'pin') {
      setStep('phone');
      setPin('');
      setError('');
      setShowForgotPin(false);
    } else {
      router.push('/register');
    }
  };

  const handleSignUp = () => {
    router.push('/register');
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
          <h1 className="text-gray-400 text-sm mb-2">
            {step === 'forgot-pin' ? 'Reset PIN' : 
             step === 'verify-reset' ? 'Verify Code' : 'Login'}
          </h1>
          <h2 className="text-white text-3xl font-bold italic">CryptoChain</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Icon */}
        <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center">
          {step === 'phone' ? (
            <DevicePhoneMobileIcon className="w-8 h-8 text-white" />
          ) : step === 'forgot-pin' ? (
            <KeyIcon className="w-8 h-8 text-white" />
          ) : step === 'verify-reset' ? (
            <CheckIcon className="w-8 h-8 text-white" />
          ) : (
            <LockClosedIcon className="w-8 h-8 text-white" />
          )}
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h3 className="text-white text-2xl font-bold">
            {step === 'phone' ? 'Enter Your Phone Number' : 
             step === 'forgot-pin' ? 'Reset Your PIN' :
             step === 'verify-reset' ? 'Enter Reset Code' : 'Enter Your PIN'}
          </h3>
          <p className="text-white text-lg">
            {step === 'phone' 
              ? 'We\'ll verify your account' 
              : step === 'forgot-pin'
              ? 'We\'ll send you a reset code'
              : step === 'verify-reset'
              ? 'Enter the 6-digit code from your SMS'
              : 'Enter your 6-digit PIN to continue'
            }
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm space-y-6">
          {step === 'phone' ? (
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
          ) : step === 'forgot-pin' ? (
            <div className="text-center">
              <p className="text-white text-lg mb-4">
                We'll send a reset code to:
              </p>
              <p className="text-purple-400 text-xl font-mono mb-6">
                {phoneNumber}
              </p>
            </div>
          ) : step === 'verify-reset' ? (
            <div className="space-y-4">
              <input
                type="text"
                value={resetCode}
                onChange={handleResetCodeChange}
                placeholder="Enter 6-digit code"
                className={`w-full py-4 px-6 bg-gray-800 border rounded-xl text-white text-center text-2xl font-mono placeholder-gray-500 focus:outline-none transition-colors ${
                  error ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-purple-500'
                }`}
                maxLength={6}
                inputMode="numeric"
              />
              
              {/* Reset Code Dots */}
              <div className="flex justify-center space-x-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 ${
                      index < resetCode.length
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-gray-600'
                    }`}
                  />
                ))}
              </div>
              
              {/* Debug Info - Remove in production */}
              <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-2">Debug Info (Remove in production):</p>
                <p className="text-purple-400 text-sm font-mono">Reset Code: {generatedResetCode}</p>
                <p className="text-gray-400 text-xs mt-1">This simulates the SMS you would receive</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="password"
                value={pin}
                onChange={handlePinChange}
                placeholder="Enter 6-digit PIN"
                className={`w-full py-4 px-6 bg-gray-800 border rounded-xl text-white text-center text-2xl font-mono placeholder-gray-500 focus:outline-none transition-colors ${
                  error ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-purple-500'
                }`}
                maxLength={6}
                inputMode="numeric"
              />
              
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
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={`border rounded-xl p-4 ${
              error.includes('reset code') || error.includes('successful')
                ? 'bg-green-900/20 border-green-500' 
                : 'bg-red-900/20 border-red-500'
            }`}>
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 ${
                  error.includes('reset code') || error.includes('successful') ? 'text-green-400' : 'text-red-400'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    error.includes('reset code') || error.includes('successful') ? 'text-green-400' : 'text-red-400'
                  }`}>{error}</p>
                  {step === 'phone' && error.includes('not registered') && (
                    <button
                      onClick={handleSignUp}
                      className="text-purple-400 hover:text-purple-300 text-sm mt-1 underline"
                    >
                      Click here to sign up
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Forgot PIN Button */}
          {step === 'pin' && showForgotPin && (
            <button
              onClick={handleForgotPin}
              className="w-full py-3 px-6 border border-gray-600 rounded-xl font-medium text-white hover:bg-gray-800 transition-all"
            >
              Forgot PIN?
            </button>
          )}

          <button
            onClick={step === 'forgot-pin' ? handleResetPin : 
                     step === 'verify-reset' ? handleVerifyResetCode : handleContinue}
            disabled={
              (step === 'phone' && phoneNumber.length < 10) ||
              (step === 'pin' && pin.length !== 6) ||
              (step === 'verify-reset' && resetCode.length !== 6) ||
              isChecking
            }
            className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all ${
              ((step === 'phone' && phoneNumber.length >= 10) ||
               (step === 'pin' && pin.length === 6) ||
               (step === 'forgot-pin') ||
               (step === 'verify-reset' && resetCode.length === 6)) && !isChecking
                ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isChecking ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>
                  {step === 'forgot-pin' ? 'Sending...' : 
                   step === 'verify-reset' ? 'Verifying...' :
                   step === 'phone' ? 'Checking...' : 'Verifying...'}
                </span>
              </div>
            ) : (
              step === 'forgot-pin' ? 'Send Reset Code' :
              step === 'verify-reset' ? 'Verify Code' :
              step === 'phone' ? 'Continue' : 'Sign In'
            )}
          </button>

          {step === 'phone' && (
            <p className="text-gray-400 text-sm text-center">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-purple-400 hover:text-purple-300"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 
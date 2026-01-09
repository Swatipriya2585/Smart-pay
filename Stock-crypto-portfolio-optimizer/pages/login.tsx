import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    if (email && password) {
      router.push('/home');
    }
  };

  const handleBack = () => {
    router.push('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      {/* Header */}
      <div className="text-left mb-8">
        <h1 className="text-gray-400 text-sm mb-2">Login</h1>
        <h2 className="text-white text-3xl font-bold italic">CryptoChain</h2>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <LockClosedIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-2xl font-bold">
            Welcome Back
          </h3>
          <p className="text-white text-lg">
            Sign in to your CryptoChain account
          </p>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-sm space-y-6">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full py-4 px-6 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full py-4 px-6 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 pr-12"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={!email || !password}
            className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all ${
              email && password
                ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            Sign In
          </button>

          <div className="text-center space-y-4">
            <button className="text-purple-400 hover:text-purple-300 transition-colors text-sm">
              Forgot password?
            </button>
            <div>
              <button
                onClick={handleBack}
                className="text-white hover:text-purple-300 transition-colors"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
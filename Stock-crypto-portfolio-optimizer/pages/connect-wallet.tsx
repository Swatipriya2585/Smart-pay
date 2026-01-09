import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, WalletIcon, QrCodeIcon, ArrowRightIcon, ExclamationTriangleIcon, CheckIcon } from '@heroicons/react/24/outline';
import { connectPhantom, isPhantomInstalled, validateSolanaAddress, getWalletInfo, getPhantomProvider } from '@/utils/phantom';

export default function ConnectWallet() {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'select' | 'details' | 'connecting'>('select');
  const [phantomWallet, setPhantomWallet] = useState<any>(null);
  const [phantomInstalled, setPhantomInstalled] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const router = useRouter();

  // Check if Phantom wallet is installed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPhantomInstalled(isPhantomInstalled());
    }
  }, []);

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
    setError('');
  };

  const handleWalletAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWalletAddress(e.target.value);
    setError('');
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('select');
      setError('');
      setWalletAddress('');
    } else if (step === 'connecting') {
      setStep('details');
      setError('');
    } else {
      router.push('/create-pin');
    }
  };

  const handleWalletSelect = async (wallet: string) => {
    setSelectedWallet(wallet);
    setError('');
    
    // If Phantom is selected, immediately try to get the wallet address
    if (wallet === 'phantom' && phantomInstalled) {
      setIsLoadingAddress(true);
      try {
        await populatePhantomAddress();
      } catch (error) {
        console.error('Error populating Phantom address:', error);
        setError('Failed to get wallet address. Please try again.');
      } finally {
        setIsLoadingAddress(false);
      }
    }
  };

  const populatePhantomAddress = async () => {
    try {
      const provider = getPhantomProvider();
      if (!provider) {
        throw new Error('Phantom wallet not available');
      }

      // Check if already connected
      if (provider.isConnected) {
        const publicKey = provider.publicKey?.toString();
        if (publicKey) {
          setWalletAddress(publicKey);
          return;
        }
      }

      // Try to connect to get the public key
      console.log('Attempting to connect to Phantom to get public key...');
      const response = await provider.connect();
      const publicKey = response.publicKey.toString();
      
      console.log('Phantom connected, public key:', publicKey);
      setWalletAddress(publicKey);
      
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        setError('Please approve the connection in Phantom to continue.');
      } else {
        setError('Failed to connect to Phantom wallet. Please try again.');
      }
      throw error;
    }
  };

  const handleContinue = () => {
    if (!selectedWallet) {
      setError('Please select a wallet');
      return;
    }

    if (selectedWallet === 'phantom' && !phantomInstalled) {
      setError('Phantom wallet is not installed. Please install it from phantom.app');
      return;
    }

    if (selectedWallet === 'phantom' && !walletAddress) {
      setError('Please connect to Phantom wallet first to get your address');
      return;
    }

    setStep('details');
  };

  const handleConnect = async () => {
    if (!phoneNumber || !walletAddress) {
      setError('Please fill in all fields');
      return;
    }

    if (phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!validateSolanaAddress(walletAddress)) {
      setError('Please enter a valid Solana wallet address');
      return;
    }

    setStep('connecting');
    setIsConnecting(true);
    setError('');

    try {
      if (selectedWallet === 'phantom') {
        await finalizePhantomConnection();
      } else {
        // For other wallets, simulate connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Connecting to wallet:', selectedWallet);
        console.log('Phone:', phoneNumber);
        console.log('Address:', walletAddress);
      }

      // Store wallet info in localStorage for demo
      localStorage.setItem('cryptochain_wallet', JSON.stringify({
        type: selectedWallet,
        phoneNumber: phoneNumber,
        address: walletAddress,
        connected: true,
        connectedAt: new Date().toISOString()
      }));

      router.push('/home');
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError('Failed to connect wallet. Please try again.');
      setStep('details');
    } finally {
      setIsConnecting(false);
    }
  };

  const finalizePhantomConnection = async () => {
    try {
      console.log("🔍 Finalizing Phantom connection for:", walletAddress);
      
      // Get wallet info with accurate balance using the new function
      const walletInfo = await getWalletInfo(walletAddress, phoneNumber);
      
      console.log("✅ Wallet info retrieved:", walletInfo);
      
      // Store connection info
      localStorage.setItem('cryptochain_phantom_connection', JSON.stringify(walletInfo));

      console.log('Phantom connection finalized successfully');
      console.log('Public Key:', walletInfo.publicKey);
      console.log('Phone Number:', walletInfo.phoneNumber);
      console.log('Balance:', walletInfo.balance);

    } catch (error) {
      console.error('Phantom finalization error:', error);
      throw error;
    }
  };

  const handleSkip = () => {
    console.log('Skipping wallet connection');
    router.push('/home');
  };

  const wallets = [
    {
      id: 'phantom',
      name: 'Phantom',
      description: 'Most popular Solana wallet',
      icon: '👻',
      color: 'from-purple-500 to-purple-600',
      installed: phantomInstalled
    },
    {
      id: 'solflare',
      name: 'Solflare',
      description: 'Professional Solana wallet',
      icon: '🔥',
      color: 'from-orange-500 to-red-500',
      installed: true
    },
    {
      id: 'backpack',
      name: 'Backpack',
      description: 'All-in-one crypto wallet',
      icon: '🎒',
      color: 'from-blue-500 to-blue-600',
      installed: true
    },
    {
      id: 'slope',
      name: 'Slope',
      description: 'Mobile-first Solana wallet',
      icon: '📱',
      color: 'from-green-500 to-green-600',
      installed: true
    }
  ];

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
            {step === 'select' ? 'Setup' : 
             step === 'details' ? 'Wallet Details' : 'Connecting'}
          </h1>
          <h2 className="text-white text-3xl font-bold italic">CryptoChain</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Wallet Icon */}
        <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center">
          <WalletIcon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h3 className="text-white text-2xl font-bold">
            {step === 'select' ? 'Connect Your Wallet' :
             step === 'details' ? 'Enter Wallet Details' : 'Connecting Wallet'}
          </h3>
          <p className="text-white text-lg">
            {step === 'select' ? 'Choose your preferred crypto wallet to get started' :
             step === 'details' ? 'Please provide your contact information' : 'Please wait while we connect your wallet...'}
          </p>
        </div>

        {/* Step 1: Wallet Selection */}
        {step === 'select' && (
          <div className="w-full max-w-sm space-y-4">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  selectedWallet === wallet.id
                    ? 'border-purple-500 bg-gray-800'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                } ${!wallet.installed ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!wallet.installed || isLoadingAddress}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${wallet.color} flex items-center justify-center text-2xl`}>
                    {wallet.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-white font-semibold">{wallet.name}</h4>
                    <p className="text-gray-400 text-sm">{wallet.description}</p>
                    {!wallet.installed && (
                      <p className="text-red-400 text-xs mt-1">Not installed</p>
                    )}
                    {selectedWallet === wallet.id && isLoadingAddress && (
                      <p className="text-purple-400 text-xs mt-1">Connecting to get address...</p>
                    )}
                    {selectedWallet === wallet.id && walletAddress && (
                      <p className="text-green-400 text-xs mt-1">Address loaded ✓</p>
                    )}
                  </div>
                  {selectedWallet === wallet.id && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      {isLoadingAddress ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <CheckIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Wallet Details */}
        {step === 'details' && (
          <div className="w-full max-w-sm space-y-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="w-full py-4 px-6 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                maxLength={14}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                {selectedWallet === 'phantom' ? 'Wallet Address (auto-filled)' : 'Wallet Address'}
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={handleWalletAddressChange}
                placeholder="Enter your Solana wallet address"
                className="w-full py-4 px-6 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                disabled={selectedWallet === 'phantom'}
              />
              {selectedWallet === 'phantom' && (
                <p className="text-gray-400 text-xs mt-1">
                  Address automatically loaded from your Phantom wallet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Connecting */}
        {step === 'connecting' && (
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-white text-lg">
              Connecting to {selectedWallet}...
            </p>
            <p className="text-gray-400 text-sm">
              Finalizing your wallet connection
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-sm border border-red-500 bg-red-900/20 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium">{error}</p>
                {error.includes('not installed') && (
                  <a
                    href="https://phantom.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm mt-1 underline block"
                  >
                    Install Phantom Wallet
                  </a>
                )}
                {error.includes('approve the connection') && (
                  <button
                    onClick={() => handleWalletSelect('phantom')}
                    className="text-purple-400 hover:text-purple-300 text-sm mt-1 underline block"
                  >
                    Try connecting again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          {step === 'select' && (
            <button
              onClick={handleContinue}
              disabled={!selectedWallet || isLoadingAddress}
              className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all ${
                selectedWallet && !isLoadingAddress
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              {isLoadingAddress ? 'Loading Address...' : 'Continue'}
            </button>
          )}

          {step === 'details' && (
            <button
              onClick={handleConnect}
              disabled={!phoneNumber || !walletAddress || isConnecting}
              className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all ${
                phoneNumber && walletAddress && !isConnecting
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              Connect Wallet
            </button>
          )}

          {step === 'select' && (
            <button
              onClick={handleSkip}
              className="w-full py-4 px-6 border border-gray-600 rounded-xl font-medium text-white hover:bg-gray-800 transition-all"
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Info */}
        {step === 'select' && (
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              You can always connect a wallet later in settings
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 
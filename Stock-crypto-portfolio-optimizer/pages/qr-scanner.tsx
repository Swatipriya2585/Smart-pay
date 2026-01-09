import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, QrCodeIcon } from '@heroicons/react/24/outline';

export default function QRScanner() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [scannedData, setScannedData] = useState('');

  useEffect(() => {
    // Check if device supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported on this device');
      return;
    }

    startScanning();
  }, []);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setError('');

      // For now, we'll simulate QR scanning since we don't have a QR library
      // In a real implementation, you would use a library like 'react-qr-reader'
      console.log('QR Scanner started - this is a simulation');
      
      // Simulate scanning after 3 seconds
      setTimeout(() => {
        simulateQRScan();
      }, 3000);

    } catch (error) {
      console.error('Error starting scanner:', error);
      setError('Failed to start camera');
      setIsScanning(false);
    }
  };

  const simulateQRScan = () => {
    // Simulate scanning a Solana address
    const mockAddress = 'CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM';
    setScannedData(mockAddress);
    
    // Auto-redirect after showing the scanned data
    setTimeout(() => {
      handleScannedData(mockAddress);
    }, 2000);
  };

  const handleScannedData = (data: string) => {
    // Validate if it's a Solana address
    if (isValidSolanaAddress(data)) {
      const redirect = router.query.redirect as string;
      if (redirect === 'send-solana') {
        router.push({
          pathname: '/send-solana',
          query: { recipientAddress: data }
        });
      } else {
        // Default redirect
        router.push({
          pathname: '/send-solana',
          query: { recipientAddress: data }
        });
      }
    } else {
      setError('Invalid Solana address scanned');
      setIsScanning(false);
    }
  };

  const isValidSolanaAddress = (address: string) => {
    // Basic Solana address validation (44 characters, base58)
    return /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address);
  };

  const handleManualInput = () => {
    const address = prompt('Enter Solana address:');
    if (address && isValidSolanaAddress(address)) {
      handleScannedData(address);
    } else if (address) {
      setError('Invalid Solana address');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Scan QR Code</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Scanner Area */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="text-center space-y-4">
            {isScanning && !scannedData ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-white/20 rounded-2xl p-8 border-2 border-purple-500 relative">
                    <QrCodeIcon className="w-24 h-24 text-purple-400 animate-pulse" />
                    <div className="absolute inset-0 border-2 border-purple-500 rounded-2xl animate-ping opacity-20"></div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-300 text-lg">Scanning QR Code...</p>
                  <p className="text-gray-400 text-sm mt-2">Point camera at a Solana address QR code</p>
                </div>
                <div className="animate-pulse">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mx-auto"></div>
                </div>
              </div>
            ) : scannedData ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-500/20 rounded-full p-6 border border-green-500/50">
                    <QrCodeIcon className="w-16 h-16 text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="text-green-400 text-lg font-semibold">Address Scanned!</p>
                  <p className="text-gray-300 text-sm mt-2">Redirecting to send page...</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                  <p className="text-white font-mono text-xs break-all">
                    {scannedData}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-white/20 rounded-2xl p-8 border-2 border-gray-400">
                    <QrCodeIcon className="w-24 h-24 text-gray-400" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-300 text-lg">Scanner Ready</p>
                  <p className="text-gray-400 text-sm mt-2">Click start to begin scanning</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isScanning && !scannedData && (
            <button
              onClick={startScanning}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              Start Scanning
            </button>
          )}

          <button
            onClick={handleManualInput}
            className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-4 text-white hover:bg-white/20 transition-colors"
          >
            Enter Address Manually
          </button>

          {isScanning && (
            <button
              onClick={() => {
                setIsScanning(false);
                setScannedData('');
                setError('');
              }}
              className="w-full bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-4 text-red-300 hover:bg-red-500/30 transition-colors"
            >
              Stop Scanning
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-300 mb-2">How to use:</h3>
          <ul className="text-blue-200 text-sm space-y-1">
            <li>• Point your camera at a Solana address QR code</li>
            <li>• The scanner will automatically detect the address</li>
            <li>• You'll be redirected to the send page with the address filled</li>
            <li>• Or use "Enter Address Manually" to type it in</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 
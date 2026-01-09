import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, QrCodeIcon, ClipboardDocumentIcon, ShareIcon } from '@heroicons/react/24/outline';

export default function ReceiveSolana() {
  const router = useRouter();
  const [phantomConnection, setPhantomConnection] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);

  useEffect(() => {
    // Get Phantom connection from localStorage
    const connection = localStorage.getItem('cryptochain_phantom_connection');
    if (connection) {
      setPhantomConnection(JSON.parse(connection));
    }
  }, []);

  const handleCopyAddress = async () => {
    if (phantomConnection?.publicKey) {
      try {
        await navigator.clipboard.writeText(phantomConnection.publicKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  const handleShare = async () => {
    if (phantomConnection?.publicKey) {
      try {
        if (navigator.share) {
          await navigator.share({
            title: 'My Solana Address',
            text: `Send SOL to: ${phantomConnection.publicKey}`,
            url: `solana:${phantomConnection.publicKey}`
          });
        } else {
          // Fallback to copying
          handleCopyAddress();
        }
      } catch (error) {
        console.error('Failed to share:', error);
      }
    }
  };

  const generateQRCode = (text: string) => {
    // Simple QR code generation using a service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  if (!phantomConnection?.publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Receive SOL</h1>
            <div className="w-10"></div>
          </div>
        </div>
        
        <div className="p-6 text-center">
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
            <p className="text-red-300">Please connect your Phantom wallet first</p>
            <button
              onClick={() => router.push('/connect-wallet')}
              className="mt-4 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">Receive SOL</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Instructions */}
        <div className="text-center">
          <p className="text-gray-300 text-lg">Share your Solana address to receive SOL</p>
          <p className="text-gray-400 text-sm mt-2">Only send SOL to this address</p>
        </div>

        {/* QR Code Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="text-center space-y-4">
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={() => setShowQR(true)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showQR ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                QR Code
              </button>
              <button
                onClick={() => setShowQR(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !showQR ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                Address
              </button>
            </div>

            {showQR ? (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 inline-block">
                  <img
                    src={generateQRCode(phantomConnection.publicKey)}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-gray-400 text-sm">Scan this QR code to send SOL</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                  <p className="text-sm text-gray-300 break-all font-mono">
                    {phantomConnection.publicKey}
                  </p>
                </div>
                <p className="text-gray-400 text-sm">Copy this address to send SOL</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCopyAddress}
            className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-4 text-white hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
          >
            <ClipboardDocumentIcon className="w-5 h-5" />
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </button>

          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <ShareIcon className="w-5 h-5" />
            <span>Share Address</span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-300 mb-2">Security Notice</h3>
          <ul className="text-yellow-200 text-sm space-y-1">
            <li>• Only send SOL to this address</li>
            <li>• Double-check the address before sending</li>
            <li>• Never share your private keys</li>
            <li>• Transactions are irreversible</li>
          </ul>
        </div>

        {/* Network Info */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Network</span>
            <span className="text-green-400 font-medium">Solana Mainnet</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-300">Transaction Fee</span>
            <span className="text-white">~0.000005 SOL</span>
          </div>
        </div>
      </div>
    </div>
  );
} 
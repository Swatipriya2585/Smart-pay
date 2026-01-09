import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { CheckCircleIcon, ArrowLeftIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export default function SendSuccess() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState({
    amount: '',
    recipient: '',
    txHash: '',
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    if (router.query.amount) {
      setTransactionDetails({
        amount: router.query.amount as string,
        recipient: router.query.recipient as string,
        txHash: router.query.txHash as string,
        timestamp: new Date().toISOString()
      });
    }
  }, [router.query]);

  const handleCopyTxHash = async () => {
    try {
      await navigator.clipboard.writeText(transactionDetails.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy transaction hash:', error);
    }
  };

  const handleViewOnExplorer = () => {
    const explorerUrl = `https://solscan.io/tx/${transactionDetails.txHash}`;
    window.open(explorerUrl, '_blank');
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.push('/home')}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Transaction Success</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Success Animation */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-green-500/20 rounded-full p-6 border border-green-500/50">
              <CheckCircleIcon className="w-16 h-16 text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-400">Transaction Successful!</h2>
            <p className="text-gray-300 mt-2">Your SOL has been sent successfully</p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 space-y-4">
          <h3 className="text-lg font-semibold text-center">Transaction Details</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Amount Sent</span>
              <span className="text-white font-semibold">{transactionDetails.amount} SOL</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Recipient</span>
              <span className="text-white font-mono text-sm">
                {formatAddress(transactionDetails.recipient)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Network Fee</span>
              <span className="text-white">0.000005 SOL</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total</span>
              <span className="text-white font-semibold">
                {(parseFloat(transactionDetails.amount) + 0.000005).toFixed(6)} SOL
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Timestamp</span>
              <span className="text-white text-sm">
                {formatTimestamp(transactionDetails.timestamp)}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Hash */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300 text-sm">Transaction Hash</span>
            <button
              onClick={handleCopyTxHash}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-white font-mono text-xs break-all">
            {transactionDetails.txHash}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleViewOnExplorer}
            className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-4 text-white hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            <span>View on Solscan</span>
          </button>

          <button
            onClick={() => router.push('/home')}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            Back to Home
          </button>
        </div>

        {/* Network Status */}
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-300 text-sm">Transaction confirmed on Solana network</span>
          </div>
        </div>
      </div>
    </div>
  );
} 
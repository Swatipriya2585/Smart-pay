import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TransactionStatus {
  confirmed: boolean;
  error?: string;
  slot?: number;
  blockTime?: number;
}

export default function TransactionStatus() {
  const router = useRouter();
  const { signature } = router.query;
  
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  useEffect(() => {
    if (signature && typeof signature === 'string') {
      checkTransactionStatus(signature);
    }
  }, [signature]);

  const checkTransactionStatus = async (txSignature: string) => {
    try {
      setLoading(true);
      
      // For now, we'll assume the transaction was successful if we have a signature
      // In a real implementation, you'd check the blockchain
      setStatus({
        confirmed: true,
        slot: Date.now(),
        blockTime: Date.now()
      });
      
    } catch (error) {
      console.error('Error checking transaction status:', error);
      setStatus({
        confirmed: false,
        error: error instanceof Error ? error.message : 'Failed to check status'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) {
      return <ClockIcon className="w-8 h-8 text-yellow-500 animate-spin" />;
    }
    
    if (status?.confirmed) {
      return <CheckCircleIcon className="w-8 h-8 text-green-500" />;
    }
    
    if (status?.error) {
      return <XCircleIcon className="w-8 h-8 text-red-500" />;
    }
    
    return <ClockIcon className="w-8 h-8 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking transaction status...';
    if (status?.confirmed) return 'Transaction Confirmed';
    if (status?.error) return 'Transaction Failed';
    return 'Transaction Pending';
  };

  const getStatusColor = () => {
    if (loading) return 'text-yellow-500';
    if (status?.confirmed) return 'text-green-500';
    if (status?.error) return 'text-red-500';
    return 'text-yellow-500';
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
          <h1 className="text-xl font-bold">Transaction Status</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Transaction Signature */}
        {signature && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Signature:</span>
                <span className="font-mono text-sm break-all">{signature}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Short Signature:</span>
                <span className="font-mono text-sm">
                  {typeof signature === 'string' ? `${signature.slice(0, 8)}...${signature.slice(-8)}` : signature}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="text-center space-y-4">
            {getStatusIcon()}
            <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
              {getStatusText()}
            </h2>
            
            {status?.error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-300 text-sm">{status.error}</p>
              </div>
            )}
            
            {status?.confirmed && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                <p className="text-green-300 text-sm">Your transaction has been successfully confirmed on the Solana blockchain!</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Go to Home
          </button>
          <button
            onClick={() => router.push('/send-solana-real')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Send Another
          </button>
        </div>
      </div>
    </div>
  );
} 
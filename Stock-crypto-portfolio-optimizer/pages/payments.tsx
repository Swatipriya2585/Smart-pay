import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useWallet } from '@solana/wallet-adapter-react';
import { ClientWalletButton } from '@/components/ClientWalletButton';
import { 
  QrCodeIcon,
  ArrowRightIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { Cryptocurrency, CryptoRecommendation } from '@/types';
import { marketDataService } from '@/services/market-data';
import { aiRecommendationService } from '@/services/ai-recommendation';
import { solanaService } from '@/services/solana';
import toast from 'react-hot-toast';

interface PaymentForm {
  recipient: string;
  amount: number;
  cryptocurrency: string;
  description: string;
}

export default function Payments() {
  const { connected, publicKey, signTransaction } = useWallet();
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    recipient: '',
    amount: 0,
    cryptocurrency: 'SOL',
    description: ''
  });
  const [availableCryptos, setAvailableCryptos] = useState<Cryptocurrency[]>([]);
  const [recommendation, setRecommendation] = useState<CryptoRecommendation | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        const cryptos = await marketDataService.getTopCryptocurrencies(20);
        setAvailableCryptos(cryptos);
      } catch (error) {
        console.error('Error fetching cryptocurrencies:', error);
      }
    };

    fetchCryptos();
  }, []);

  useEffect(() => {
    const getRecommendation = async () => {
      if (connected && availableCryptos.length > 0 && paymentForm.amount > 0) {
        try {
          const rec = await aiRecommendationService.getSpendingRecommendation(
            availableCryptos.slice(0, 10),
            paymentForm.amount,
            'medium'
          );
          setRecommendation(rec);
        } catch (error) {
          console.error('Error getting recommendation:', error);
        }
      }
    };

    getRecommendation();
  }, [connected, availableCryptos, paymentForm.amount]);

  const handleInputChange = (field: keyof PaymentForm, value: string | number) => {
    setPaymentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!paymentForm.recipient.trim()) {
      toast.error('Please enter a recipient address');
      return false;
    }
    if (!solanaService.isValidPublicKey(paymentForm.recipient)) {
      toast.error('Please enter a valid Solana address');
      return false;
    }
    if (paymentForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    return true;
  };

  const handleSendPayment = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setTransactionStatus('pending');

    try {
      // Create transaction
      const transaction = await solanaService.sendSolTransaction(
        publicKey,
        new (await import('@solana/web3.js')).PublicKey(paymentForm.recipient),
        paymentForm.amount,
        publicKey
      );

      // Sign transaction
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const connection = solanaService.getConnection();
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      setTransactionStatus('success');
      toast.success('Payment sent successfully!');
      
      // Reset form
      setPaymentForm({
        recipient: '',
        amount: 0,
        cryptocurrency: 'SOL',
        description: ''
      });
      
    } catch (error) {
      console.error('Payment error:', error);
      setTransactionStatus('failed');
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = () => {
    if (!validateForm()) return;
    
    const paymentData = {
      recipient: paymentForm.recipient,
      amount: paymentForm.amount,
      cryptocurrency: paymentForm.cryptocurrency,
      description: paymentForm.description,
      timestamp: new Date().toISOString()
    };
    
    setShowQR(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  if (!connected) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <SparklesIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              Connect your Solana wallet to start making payments with AI-powered recommendations.
            </p>
            <ClientWalletButton className="mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Send Payment
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Send cryptocurrency payments with AI-powered recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Form */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Payment Details
            </h2>

            <div className="space-y-4">
              {/* Recipient Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={paymentForm.recipient}
                  onChange={(e) => handleInputChange('recipient', e.target.value)}
                  placeholder="Enter Solana wallet address"
                  className="input"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.000001"
                    className="input pr-12"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {paymentForm.cryptocurrency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptocurrency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cryptocurrency
                </label>
                <select
                  value={paymentForm.cryptocurrency}
                  onChange={(e) => handleInputChange('cryptocurrency', e.target.value)}
                  className="input"
                >
                  {availableCryptos.slice(0, 10).map((crypto) => (
                    <option key={crypto.id} value={crypto.symbol}>
                      {crypto.name} ({crypto.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="What's this payment for?"
                  className="input"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSendPayment}
                  disabled={loading || transactionStatus === 'pending'}
                  className="btn btn-primary flex-1 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="spinner h-4 w-4 mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowRightIcon className="h-4 w-4 mr-2" />
                      Send Payment
                    </>
                  )}
                </button>
                <button
                  onClick={generateQRCode}
                  className="btn btn-secondary flex items-center justify-center px-4"
                >
                  <QrCodeIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Transaction Status */}
              {transactionStatus !== 'idle' && (
                <div className={`mt-4 p-4 rounded-lg ${
                  transactionStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                  transactionStatus === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-center">
                    {transactionStatus === 'pending' && <ClockIcon className="h-5 w-5 text-yellow-400 mr-2" />}
                    {transactionStatus === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />}
                    {transactionStatus === 'failed' && <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />}
                    <span className={`text-sm font-medium ${
                      transactionStatus === 'success' ? 'text-green-800 dark:text-green-200' :
                      transactionStatus === 'failed' ? 'text-red-800 dark:text-red-200' :
                      'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {transactionStatus === 'pending' && 'Transaction pending...'}
                      {transactionStatus === 'success' && 'Payment sent successfully!'}
                      {transactionStatus === 'failed' && 'Transaction failed. Please try again.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="space-y-6">
            {recommendation && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    💡 AI Recommendation
                  </h3>
                  <span className={`badge ${recommendation.riskLevel === 'low' ? 'badge-success' : 
                    recommendation.riskLevel === 'medium' ? 'badge-warning' : 'badge-danger'}`}>
                    {recommendation.riskLevel} risk
                  </span>
                </div>
                
                <div className="flex items-center mb-4">
                  <img 
                    src={recommendation.cryptocurrency.image} 
                    alt={recommendation.cryptocurrency.name}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {recommendation.cryptocurrency.name} ({recommendation.cryptocurrency.symbol})
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Confidence: {recommendation.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {recommendation.reasoning.map((reason, index) => (
                    <p key={index} className="text-sm text-gray-600 dark:text-gray-300">
                      • {reason}
                    </p>
                  ))}
                </div>

                <button
                  onClick={() => handleInputChange('cryptocurrency', recommendation.cryptocurrency.symbol)}
                  className="btn btn-primary w-full"
                >
                  Use Recommended Crypto
                </button>
              </div>
            )}

            {/* QR Code */}
            {showQR && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    QR Code
                  </h3>
                  <button
                    onClick={() => setShowQR(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex justify-center mb-4">
                  <QRCode
                    value={JSON.stringify({
                      recipient: paymentForm.recipient,
                      amount: paymentForm.amount,
                      cryptocurrency: paymentForm.cryptocurrency,
                      description: paymentForm.description
                    })}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Scan this QR code to complete the payment
                </p>
              </div>
            )}

            {/* Payment Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Payment Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Network</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Solana</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Transaction Fee</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">~0.000005 SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Settlement Time</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">&lt; 1 second</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Security</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Self-custody</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
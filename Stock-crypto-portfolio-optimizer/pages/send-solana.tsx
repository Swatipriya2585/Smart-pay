import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, QrCodeIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface SendSolanaProps {
  recipientAddress?: string;
  amount?: string;
}

export default function SendSolana({ recipientAddress = '', amount = '' }: SendSolanaProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    recipientAddress: recipientAddress,
    amount: amount,
    memo: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkFee, setNetworkFee] = useState(0.000005); // Default Solana transaction fee
  const [phantomConnection, setPhantomConnection] = useState<any>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Get Phantom connection from localStorage
    const connection = localStorage.getItem('cryptochain_phantom_connection');
    console.log('🔍 Send page - Found connection in localStorage:', connection);
    if (connection) {
      const parsedConnection = JSON.parse(connection);
      setPhantomConnection(parsedConnection);
      console.log('✅ Send page - Set phantom connection:', parsedConnection);
    } else {
      console.log('❌ Send page - No phantom connection found in localStorage');
    }
  }, []);

  useEffect(() => {
    if (phantomConnection?.publicKey) {
      fetchCurrentBalance();
    }
  }, [phantomConnection]);

  const fetchCurrentBalance = async () => {
    if (!phantomConnection?.publicKey) {
      console.log('❌ Send page - No phantom connection public key available');
      return;
    }
    
    console.log('💰 Send page - Fetching balance for:', phantomConnection.publicKey);
    
    try {
      const response = await fetch(`/api/test-balance?walletAddress=${phantomConnection.publicKey}`);
      const data = await response.json();
      
      console.log('✅ Send page - Balance response:', data);
      
      if (data.success && data.solanaBalances?.sol) {
        const solBalance = parseFloat(data.solanaBalances.sol.balance);
        setBalance(solBalance);
        console.log('💰 Send page - Set balance to:', solBalance, 'SOL');
      }
    } catch (error) {
      console.error('❌ Send page - Error fetching balance:', error);
    }
  };

  const validateAddress = (address: string) => {
    // Basic Solana address validation (44 characters, base58)
    return /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address);
  };

  const validateAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    return numAmount > 0 && numAmount <= balance;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSend = async () => {
    if (!phantomConnection?.publicKey) {
      setError('Please connect your Phantom wallet first');
      return;
    }

    if (!validateAddress(formData.recipientAddress)) {
      setError('Please enter a valid Solana address');
      return;
    }

    if (!validateAmount(formData.amount)) {
      setError('Please enter a valid amount (must be greater than 0 and less than your balance)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Send transaction using our API
      const response = await fetch('/api/send-solana', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAddress: phantomConnection.publicKey,
          toAddress: formData.recipientAddress,
          amount: formData.amount,
          memo: formData.memo
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      console.log('Transaction successful:', result.data);

      // Navigate to success page
      router.push({
        pathname: '/send-success',
        query: {
          amount: formData.amount,
          recipient: formData.recipientAddress,
          txHash: result.data.txHash
        }
      });

    } catch (error) {
      console.error('Transaction failed:', error);
      setError('Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = () => {
    // Navigate to QR scanner page
    router.push('/qr-scanner?redirect=send-solana');
  };

  const totalAmount = parseFloat(formData.amount) + networkFee;

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
          <h1 className="text-xl font-bold">Send SOL</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Wallet Connection Status */}
        {phantomConnection?.publicKey ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-300 text-sm">Wallet Connected</span>
              </div>
              <span className="text-green-300 text-xs font-mono">
                {phantomConnection.publicKey.slice(0, 8)}...{phantomConnection.publicKey.slice(-8)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-red-300 text-sm">Wallet Not Connected</span>
              </div>
              <button
                onClick={() => router.push('/connect-wallet')}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded-lg transition-colors text-xs"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="text-center">
            <p className="text-gray-300 text-sm">Available Balance</p>
            <p className="text-3xl font-bold">{balance.toFixed(4)} SOL</p>
            <p className="text-gray-400 text-sm">≈ ${(balance * 186).toFixed(2)} USD</p>
          </div>
        </div>

        {/* Recipient Address */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Recipient Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.recipientAddress}
              onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
              placeholder="Enter Solana address"
              className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleScanQR}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors"
            >
              <QrCodeIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              step="0.000001"
              min="0"
              max={balance}
              className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              SOL
            </div>
          </div>
        </div>

        {/* Memo (Optional) */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Memo (Optional)
          </label>
          <input
            type="text"
            value={formData.memo}
            onChange={(e) => handleInputChange('memo', e.target.value)}
            placeholder="Add a note"
            maxLength={100}
            className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Transaction Details */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Amount</span>
              <span className="text-white">{formData.amount || '0.00'} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Network Fee</span>
              <span className="text-white">{networkFee.toFixed(6)} SOL</span>
            </div>
            <div className="border-t border-white/10 pt-2">
              <div className="flex justify-between font-medium">
                <span className="text-gray-300">Total</span>
                <span className="text-white">{totalAmount.toFixed(6)} SOL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-300 text-sm">{error}</p>
            {error.includes('connect your Phantom wallet') && (
              <button
                onClick={() => router.push('/connect-wallet')}
                className="mt-2 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Connect Wallet
              </button>
            )}
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !formData.recipientAddress || !formData.amount}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Send SOL'
          )}
        </button>
      </div>
    </div>
  );
} 
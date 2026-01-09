import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  ChevronDownIcon,
  PaperAirplaneIcon,
  QrCodeIcon,
  WalletIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  usdValue: string;
  change24h: number;
  logoUrl?: string;
  network: string;
}

export default function Home() {
  const router = useRouter();
  const [phantomConnection, setPhantomConnection] = useState<any>(null);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [dailyChange, setDailyChange] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('Account 1');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);

  useEffect(() => {
    loadWalletInfo();
  }, []);

  useEffect(() => {
    if (phantomConnection?.publicKey) {
      console.log("🔄 Phantom connection detected, fetching balances...");
      fetchBalances();
    }
  }, [phantomConnection]);

  const loadWalletInfo = () => {
    try {
      console.log("🔍 Loading wallet info...");
      
      const storedPhantom = localStorage.getItem('cryptochain_phantom_connection');
      console.log("📦 Stored phantom:", storedPhantom);

      if (storedPhantom) {
        const phantomData = JSON.parse(storedPhantom);
        setPhantomConnection(phantomData);
        console.log("✅ Set phantom connection:", phantomData);
      }
    } catch (error) {
      console.error("❌ Error loading wallet info:", error);
      setError('Failed to load wallet info');
    }
  };

  const fetchBalances = async () => {
    if (!phantomConnection?.publicKey) {
      console.log("❌ No phantom connection, skipping balance fetch");
      return;
    }

    try {
      console.log("🎯 Fetching balances for wallet address:", phantomConnection.publicKey);
      setIsBalanceLoading(true);
      setError('');

      // Direct API call to our working endpoint
      const response = await fetch(`/api/test-balance?walletAddress=${phantomConnection.publicKey}`);
      const data = await response.json();
      
      console.log("✅ API response:", data);

      if (data.success && data.solanaBalances) {
        const balances = data.solanaBalances;
        console.log("✅ Solana balances:", balances);

        // Convert to token balance format
        const realTokenBalances: TokenBalance[] = [];
        let totalValue = 0;
        let totalChange = 0;

        Object.entries(balances).forEach(([key, balance]: [string, any]) => {
          if (balance) {
            const usdValue = parseFloat(balance.usdValue);
            totalValue += usdValue;
            totalChange += balance.change24h || 0;

            realTokenBalances.push({
              symbol: balance.symbol,
              name: balance.name,
              balance: balance.balance,
              usdValue: balance.usdValue,
              change24h: balance.change24h,
              network: balance.network,
              logoUrl: balance.logoUrl
            });
          }
        });

        setTokenBalances(realTokenBalances);
        setTotalBalance(totalValue);
        setDailyChange(totalChange);
        
        console.log("🎯 Token balances set:", realTokenBalances);
        console.log("💰 Total balance:", totalValue);
        console.log("📊 Daily change:", totalChange);

      } else {
        console.error("❌ API response error:", data);
        setError('Failed to fetch balances from API');
      }

    } catch (error) {
      console.error("❌ Error fetching balances:", error);
      setError('Failed to fetch balances. Please check your wallet connection.');
    } finally {
      setIsBalanceLoading(false);
    }
  };

  const handleRefreshBalances = async () => {
    await fetchBalances();
  };

          const handleSend = () => {
          console.log("📤 Send button clicked");
          router.push('/send-solana-real');
        };

  const handleReceive = () => {
    console.log("📥 Receive button clicked");
    router.push('/receive-solana');
  };

  const handleScanQR = () => {
    console.log("📱 Scan QR button clicked");
    router.push('/qr-scanner?redirect=send-solana');
  };

  const handleContinue = () => {
    console.log("➡️ Continue button clicked");
    router.push('/payment-details');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold italic mb-2">CryptoChain</h1>
          <p className="text-gray-300 text-sm">@Swati Priya</p>
        </div>

        {/* Account Dropdown */}
        <div className="relative mb-6">
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="w-full bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between text-left"
          >
            <span className="text-white font-medium">{selectedAccount}</span>
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          </button>
          
          {showAccountDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-lg z-10">
              <div className="p-2">
                <div className="text-xs text-gray-400 px-3 py-2">Wallet Addresses</div>
                {phantomConnection ? (
                  <button
                    onClick={() => {
                      setSelectedAccount('Account 1');
                      setShowAccountDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded"
                  >
                    <div className="font-medium">Account 1</div>
                    <div className="text-xs text-gray-400 font-mono">
                      {phantomConnection.publicKey.slice(0, 8)}...
                    </div>
                  </button>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    No wallet connected
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedAccount('Add New Account');
                    setShowAccountDropdown(false);
                    router.push('/connect-wallet');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-purple-400 hover:bg-gray-700 rounded flex items-center"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add New Account
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Balance */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold mb-2">
            {isBalanceLoading ? (
              <div className="animate-pulse">Loading...</div>
            ) : (
              formatCurrency(totalBalance)
            )}
          </div>
          <div className="flex items-center justify-center space-x-2 text-red-400">
            {dailyChange !== 0 ? (
              <>
                {dailyChange >= 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                <span className="text-sm">
                  {formatCurrency(Math.abs(dailyChange))} ({formatPercentage(dailyChange)})
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-400">No change data</span>
            )}
          </div>
        </div>

        {/* Send/Receive and QR Code */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex space-x-4">
            <button
              onClick={handleSend}
              className="bg-purple-600 rounded-lg p-3 flex items-center space-x-2"
            >
              <PaperAirplaneIcon className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Send</span>
            </button>
            <button
              onClick={handleReceive}
              className="bg-purple-600 rounded-lg p-3 flex items-center space-x-2"
            >
              <WalletIcon className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Receive</span>
            </button>
          </div>
          
          <div className="text-center">
            <div className="bg-white rounded-lg p-3 w-16 h-16 flex items-center justify-center mb-2">
              <QrCodeIcon className="w-8 h-8 text-black" />
            </div>
            <button
              onClick={handleScanQR}
              className="text-purple-400 text-sm"
            >
              Scan QR code
            </button>
          </div>
        </div>
      </div>

      {/* Token Balances */}
      <div className="px-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Your Assets</h2>
        
        {!phantomConnection && (
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 text-center">
            <p className="text-yellow-200 text-sm mb-2">No wallet connected</p>
            <button
              onClick={() => router.push('/connect-wallet')}
              className="bg-yellow-600 hover:bg-yellow-700 rounded px-4 py-2 text-sm text-white"
            >
              Connect Phantom Wallet
            </button>
          </div>
        )}
        
        {isBalanceLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-700 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {tokenBalances.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">No tokens found. Connect your wallet to see balances.</p>
              </div>
            ) : (
              tokenBalances.map((token, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 border border-purple-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {token.logoUrl ? (
                        <img 
                          src={token.logoUrl} 
                          alt={token.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            const nextElement = target.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center ${token.logoUrl ? 'hidden' : ''}`}>
                        <span className="text-white text-xs font-bold">{token.symbol}</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{token.name}</p>
                        <p className="text-gray-400 text-sm">{token.balance}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">${token.usdValue}</p>
                      <p className={`text-sm ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(token.change24h)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Debug Info */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-2">
          <h4 className="text-white font-semibold text-sm">🔧 Debug Info</h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Wallet Connected:</span>
              <span className="text-white">{phantomConnection ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Wallet Address:</span>
              <span className="text-white font-mono">{phantomConnection?.publicKey?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Balance:</span>
              <span className="text-white">${totalBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tokens Found:</span>
              <span className="text-white">{tokenBalances.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Loading:</span>
              <span className="text-white">{isBalanceLoading ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefreshBalances}
          disabled={isBalanceLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 rounded-lg py-3 text-white font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span>{isBalanceLoading ? 'Loading...' : '🔄 Fetch My Balances'}</span>
          {isBalanceLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 rounded-lg p-4 text-center">
            <p className="text-red-200">{error}</p>
            <button
              onClick={handleRefreshBalances}
              className="mt-2 bg-red-700 hover:bg-red-600 rounded px-4 py-2 text-sm"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="px-6 py-8">
        <button
          onClick={handleContinue}
          className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl py-4 text-white font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
} 
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { solanaTransactionService } from '@/services/solana-transaction';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createRobustConnection, getRpcEndpoints, testRpcEndpoint } from '@/utils/solana-rpc';
import { ClientWalletButton } from '@/components/ClientWalletButton';
import toast from 'react-hot-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function TestBlockchain() {
  const router = useRouter();
  const [phantomConnection, setPhantomConnection] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadPhantomConnection();
  }, []);

  const loadPhantomConnection = () => {
    try {
      const storedPhantom = localStorage.getItem('cryptochain_phantom_connection');
      if (storedPhantom) {
        const phantomData = JSON.parse(storedPhantom);
        setPhantomConnection(phantomData);
        console.log('✅ Loaded Phantom connection:', phantomData);
      }
    } catch (error) {
      console.error('❌ Error loading Phantom connection:', error);
    }
  };

  const addTestResult = (name: string, status: 'pending' | 'success' | 'error', message: string, details?: any) => {
    setTestResults(prev => [...prev, { name, status, message, details }]);
  };

  const updateTestResult = (name: string, status: 'success' | 'error', message: string, details?: any) => {
    setTestResults(prev => prev.map(result => 
      result.name === name ? { ...result, status, message, details } : result
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: RPC Endpoint Connectivity
      addTestResult('RPC Connectivity', 'pending', 'Testing RPC endpoints...');
      await testRpcConnectivity();

      // Test 2: Wallet Connection
      addTestResult('Wallet Connection', 'pending', 'Checking wallet connection...');
      await testWalletConnection();

      // Test 3: Balance Fetching
      addTestResult('Balance Fetching', 'pending', 'Fetching wallet balance...');
      await testBalanceFetching();

      // Test 4: Transaction Service
      addTestResult('Transaction Service', 'pending', 'Testing transaction service...');
      await testTransactionService();

      // Test 5: Transaction Creation
      addTestResult('Transaction Creation', 'pending', 'Testing transaction creation...');
      await testTransactionCreation();

      toast.success('All blockchain tests completed!');
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      toast.error('Some tests failed. Check results below.');
    } finally {
      setIsRunning(false);
    }
  };

  const testRpcConnectivity = async () => {
    try {
      const endpoints = getRpcEndpoints();
      let workingEndpoints = 0;

      for (const endpoint of endpoints) {
        const isWorking = await testRpcEndpoint(endpoint);
        if (isWorking) workingEndpoints++;
      }

      if (workingEndpoints > 0) {
        updateTestResult('RPC Connectivity', 'success', 
          `${workingEndpoints}/${endpoints.length} RPC endpoints working`);
      } else {
        updateTestResult('RPC Connectivity', 'error', 
          'No RPC endpoints are working');
      }
    } catch (error) {
      updateTestResult('RPC Connectivity', 'error', 
        `RPC test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testWalletConnection = async () => {
    if (!phantomConnection) {
      updateTestResult('Wallet Connection', 'error', 'No Phantom wallet connected');
      return;
    }

    try {
      // Test if the public key is valid
      new PublicKey(phantomConnection.publicKey);
      updateTestResult('Wallet Connection', 'success', 
        `Connected: ${phantomConnection.publicKey.slice(0, 8)}...${phantomConnection.publicKey.slice(-8)}`);
    } catch (error) {
      updateTestResult('Wallet Connection', 'error', 
        `Invalid wallet address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testBalanceFetching = async () => {
    if (!phantomConnection) {
      updateTestResult('Balance Fetching', 'error', 'No wallet connected');
      return;
    }

    try {
      const connection = await createRobustConnection();
      const balance = await connection.getBalance(new PublicKey(phantomConnection.publicKey));
      const solBalance = balance / LAMPORTS_PER_SOL;
      setBalance(solBalance);
      
      updateTestResult('Balance Fetching', 'success', 
        `Balance: ${solBalance.toFixed(6)} SOL (${balance} lamports)`);
    } catch (error) {
      updateTestResult('Balance Fetching', 'error', 
        `Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testTransactionService = async () => {
    try {
      await solanaTransactionService.initialize();
      const connection = solanaTransactionService.getConnection();
      const endpoint = connection.rpcEndpoint;
      
      updateTestResult('Transaction Service', 'success', 
        `Service initialized with endpoint: ${endpoint}`);
    } catch (error) {
      updateTestResult('Transaction Service', 'error', 
        `Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testTransactionCreation = async () => {
    if (!phantomConnection) {
      updateTestResult('Transaction Creation', 'error', 'No wallet connected');
      return;
    }

    try {
      // Create a test transaction (not actually sent)
      const testAmount = 0.000001; // Very small amount for testing
      const testRecipient = '11111111111111111111111111111112'; // System program address
      
      const transaction = await solanaTransactionService.createTransferTransaction(
        phantomConnection.publicKey,
        testRecipient,
        testAmount,
        'Test transaction'
      );

      const fee = await solanaTransactionService.estimateTransactionFee(transaction);
      
      updateTestResult('Transaction Creation', 'success', 
        `Transaction created successfully. Fee: ${fee / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      updateTestResult('Transaction Creation', 'error', 
        `Transaction creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
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
          <h1 className="text-xl font-bold">Blockchain Integration Test</h1>
          <ClientWalletButton className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded-lg transition-colors text-sm" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Wallet Status */}
        {phantomConnection ? (
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
            {balance > 0 && (
              <div className="mt-2 text-xs text-green-300">
                <p>Balance: {balance.toFixed(6)} SOL</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-300 text-center">Please connect your Phantom wallet to run tests</p>
          </div>
        )}

        {/* Test Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold mb-4">Blockchain Integration Tests</h2>
          <p className="text-gray-300 text-sm mb-4">
            This page tests all aspects of the Solana blockchain integration to ensure everything is working correctly.
          </p>
          
          <button
            onClick={runAllTests}
            disabled={isRunning || !phantomConnection}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Running Tests...</span>
              </>
            ) : (
              <span>Run All Tests</span>
            )}
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h3 className="font-medium">{result.name}</h3>
                    <p className={`text-sm ${getStatusColor(result.status)}`}>{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-gray-400 mt-1">{JSON.stringify(result.details)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm">
                <span>Total Tests:</span>
                <span>{testResults.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Passed:</span>
                <span className="text-green-400">
                  {testResults.filter(r => r.status === 'success').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed:</span>
                <span className="text-red-400">
                  {testResults.filter(r => r.status === 'error').length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/send-solana-real')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Test Send Transaction
            </button>
            <button
              onClick={() => router.push('/home')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              View Home Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
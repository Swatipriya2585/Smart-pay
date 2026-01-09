import { NextApiRequest, NextApiResponse } from 'next';
import { 
  detectWalletAddresses, 
  getAllCryptoBalancesMultiWallet,
  getSolanaBalances,
  getSuiBalances
} from '@/utils/multi-crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("🧪 Testing multi-wallet address detection and balance fetching...");

    // Test with a known Solana address
    const testSolanaAddress = "CU97mFAKEgBDtcyFGVqC6dZbRxZ4wD76aXjGzhamZXdM";
    
    // Simulate detected addresses (in a real app, this would come from wallet detection)
    const detectedAddresses = {
      solana: testSolanaAddress,
      sui: testSolanaAddress, // For testing, using same address
      ethereum: undefined
    };

    console.log("🔍 Detected addresses:", detectedAddresses);

    // Test individual network balance fetching
    console.log("🔍 Testing Solana balance fetch...");
    let solanaBalances = {};
    try {
      solanaBalances = await getSolanaBalances(testSolanaAddress);
      console.log("✅ Solana balances:", solanaBalances);
    } catch (error) {
      console.error("❌ Error in Solana balance fetch:", error);
    }

    console.log("🔍 Testing SUI balance fetch...");
    const suiBalances = await getSuiBalances(testSolanaAddress);
    console.log("✅ SUI balances:", suiBalances);

    // Test multi-wallet balance fetching
    console.log("🔍 Testing multi-wallet balance fetch...");
    console.log("🔍 Input addresses:", detectedAddresses);
    
    // Test direct call to getSolanaBalances with the same address
    console.log("🔍 Testing direct getSolanaBalances call...");
    const directSolanaBalances = await getSolanaBalances(testSolanaAddress);
    console.log("✅ Direct Solana balances:", directSolanaBalances);
    
    const allBalances = await getAllCryptoBalancesMultiWallet(detectedAddresses);
    console.log("✅ All balances result:", allBalances);
    console.log("✅ All balances keys:", Object.keys(allBalances));

    return res.status(200).json({
      success: true,
      detectedAddresses,
      solanaBalances,
      suiBalances,
      directSolanaBalances,
      allBalances,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Test multi-wallet API error:", error);
    return res.status(500).json({
      error: 'Failed to test multi-wallet functionality',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 
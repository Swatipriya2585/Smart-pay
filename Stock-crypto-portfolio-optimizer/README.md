# 🚀 CryptoChain AI Optimizer

**Full-Stack Cryptocurrency Platform with AI-Powered Transaction Predictions**

> **🆕 NEW: Enhanced Bot Architecture!** See [START_HERE.md](START_HERE.md) for the new multi-source data system with 8 intelligent bots, 30 data sources, and 100+ crypto keywords.

---

## 🎯 What This Is

A complete cryptocurrency payment platform that connects to your Solana wallet and uses AI to predict which crypto you should use for transactions to maximize value retention.

### The Problem It Solves

**Scenario:** You need to send $500 in crypto. You have SOL, USDC, and ETH in your wallet.

❌ **Without AI:** You guess and use SOL. Next day SOL surges 50%. You lost $250 in potential gains!

✅ **With AI:** System predicts SOL will rise, ETH will drop. Recommends using ETH. You save money!

---

## ✨ Key Features

### 🔗 Blockchain Integration
- ✅ Solana wallet connection (Phantom, Solflare, etc.)
- ✅ Real-time balance fetching
- ✅ Transaction sending
- ✅ SPL token support
- ✅ Mainnet & Devnet support

### 🤖 AI-Powered Predictions
- ✅ Analyzes your actual wallet holdings
- ✅ Fetches real-time crypto prices
- ✅ Predicts which cryptos will rise/drop
- ✅ Recommends which to use vs hold
- ✅ OpenAI integration for advanced analysis

### 💬 Smart Chat Interface
- ✅ Natural language interaction
- ✅ Auto-detects transaction amounts
- ✅ Quick prediction panel
- ✅ Formatted recommendations
- ✅ Real-time wallet status

### 📊 Portfolio Management
- ✅ Multi-currency support
- ✅ Profit/loss tracking
- ✅ Transaction history
- ✅ QR code generation
- ✅ Balance monitoring

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env.local`:

```env
# Required for AI predictions
OPENAI_API_KEY=your_openai_api_key_here

# Optional - defaults to public Solana RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# For testing on devnet
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 4. Connect Your Wallet

1. Install Phantom wallet extension
2. Click "Connect Wallet" button
3. Approve connection
4. Start getting predictions!

---

## 📖 How to Use

### Method 1: Natural Language Chat

Just type naturally in the chat:

```
"Should I use SOL or USDC for a $500 payment?"
"I need to send $1000 to a friend. Which crypto should I use?"
"Analyze my portfolio for a $250 transaction"
```

The AI will:
1. Detect the transaction amount
2. Fetch your wallet holdings
3. Get current prices
4. Run prediction algorithm
5. Provide recommendation

### Method 2: Quick Predict

1. Click "Quick Predict" button
2. Enter amount (e.g., 500)
3. Click "Analyze"
4. Get instant recommendation!

### Example Output

```
💡 TRANSACTION RECOMMENDATION

For your $500.00 transaction:

🎯 USE: SOL
   Amount: 3.846154 SOL
   
Why SOL?
   📉 Declining 24h (-8%)
   📉 Weak weekly trend
   💸 Currently at loss

🔒 HOLD: USDC, ETH
   These are performing well - keep them!

📊 AI Analysis:
SOL showing downward momentum, good time to spend.
ETH has positive sentiment and strong uptrend.
Recommendation: Use SOL, hold ETH for gains.
```

---

## 🏗️ Project Structure

```
├── app/                          # Next.js 13+ App Router
│   ├── api/                      # API routes (new style)
│   │   ├── generate-wallet/
│   │   ├── send-solana-transaction/
│   │   └── ...
│   ├── page.tsx                  # Home page
│   └── layout.tsx                # Root layout
│
├── pages/                        # Pages Router
│   ├── api/                      # API routes
│   │   ├── crypto-prediction.ts  # 🎯 AI Prediction API
│   │   ├── openai-chat.ts
│   │   └── ...
│   ├── home.tsx                  # Main dashboard
│   ├── send-solana.tsx           # Send transaction page
│   └── ...
│
├── components/                   # React components
│   ├── CryptoPredictionChat.tsx  # 🎯 AI Chat Component
│   ├── SolanaWalletProvider.tsx  # Wallet provider
│   ├── ClientWalletButton.tsx    # Wallet button
│   └── ...
│
├── services/                     # Business logic
│   ├── solana.ts                 # Solana blockchain
│   ├── market-data.ts            # Price data
│   ├── ai-recommendation.ts      # AI logic
│   └── ...
│
├── utils/                        # Utility functions
│   ├── solana-rpc.ts             # RPC helpers
│   ├── phantom.ts                # Phantom wallet
│   └── ...
│
├── hooks/                        # Custom React hooks
│   └── useSolanaWallet.ts        # Wallet hook
│
├── types/                        # TypeScript types
│   └── index.ts
│
├── python-backend/               # 🐍 Python AI Backend
│   ├── crypto_portfolio_optimizer.py  # Original Python AI
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Python env template
│
├── archive/                      # Old files (not used)
│
└── README.md                     # This file
```

---

## 🔧 Configuration

### Supported Wallets

- Phantom
- Solflare
- Ledger
- Torus
- And more via Solana wallet adapter

### Supported Cryptocurrencies

- SOL (Solana)
- USDC (USD Coin)
- USDT (Tether)
- Any SPL token

### Networks

- **Mainnet:** Real transactions with real money
- **Devnet:** Testing with fake SOL (free from faucet)

---

## 🤖 How the AI Works

### Prediction Algorithm

```typescript
// Multi-factor scoring system
for each crypto in wallet:
  score = 0
  
  // Factor 1: 24h price change (high weight)
  if declining > 5%: score += 5  // USE (likely to drop more)
  if rising > 5%: score -= 5     // HOLD (likely to rise more)
  
  // Factor 2: 7d trend (medium weight)
  if weak trend: score += 3      // USE
  if strong trend: score -= 3    // HOLD
  
  // Factor 3: Profit/loss (low weight)
  if at loss: score += 2         // USE (cut losses)
  if at profit: score -= 2       // HOLD (let winners run)

// Highest score = Best to use for transaction
// Lowest score = Best to hold
```

### Data Sources

1. **Wallet Holdings:** Solana blockchain (real-time)
2. **Prices:** CoinGecko API (free, no key needed)
3. **AI Analysis:** OpenAI GPT-4o-mini (optional)

---

## 📡 API Reference

### POST /api/crypto-prediction

Get AI recommendation for a transaction.

**Request:**
```json
{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "transactionAmount": 500,
  "purpose": "payment"
}
```

**Response:**
```json
{
  "success": true,
  "recommendation": {
    "useSymbol": "SOL",
    "useAmount": 3.846154,
    "reasons": ["📉 Declining 24h (-8%)", "💸 Currently at loss"],
    "score": 8,
    "alternatives": [...],
    "holdSymbols": ["USDC", "ETH"]
  },
  "analysis": {
    "technical": "SOL showing downward momentum...",
    "sentiment": "Market conditions favor holding ETH...",
    "prediction": "Recommend using SOL for this transaction."
  }
}
```

---

## 🧪 Testing

### Test on Devnet

1. Set devnet RPC in `.env.local`:
```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

2. Get free devnet SOL:
```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

3. Test predictions with devnet tokens!

### Test Without Wallet

You can test the API directly:

```bash
curl -X POST http://localhost:3000/api/crypto-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "holdings": [
      {"symbol": "SOL", "amount": 10, "avgPrice": 100},
      {"symbol": "USDC", "amount": 1000, "avgPrice": 1}
    ],
    "transactionAmount": 500
  }'
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Add environment variables in Vercel dashboard:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SOLANA_RPC_URL`

### Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔐 Security

### Wallet Security
- ✅ Never stores private keys
- ✅ Read-only wallet access
- ✅ User approves all transactions
- ✅ Uses official Solana wallet adapter

### API Security
- ✅ Environment variables for secrets
- ✅ No sensitive data in responses
- ✅ Rate limiting recommended
- ✅ CORS configured

### Data Privacy
- ✅ No personal data collected
- ✅ Wallet addresses are public info
- ✅ Predictions done server-side
- ✅ No tracking or analytics

---

## 🐛 Troubleshooting

### "Wallet not connecting"
- Install Phantom wallet extension
- Refresh the page
- Check you're on correct network

### "No holdings found"
- Wallet might be empty
- Check network (mainnet vs devnet)
- Try devnet with airdropped SOL

### "Prediction failed"
- Check transaction amount is valid
- Ensure holdings have enough value
- Verify OpenAI API key is set

### "API errors"
- Check `.env.local` file exists
- Verify API keys are correct
- Check console for detailed errors

---

## 🐍 Python Backend (Optional)

The `python-backend/` folder contains the original Python implementation of the AI prediction algorithm. This is **optional** - the TypeScript version in the API routes is production-ready.

### Run Python Version

```bash
cd python-backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your OPENAI_API_KEY
python crypto_portfolio_optimizer.py
```

This provides a terminal-based interface for testing the AI algorithm directly.

---

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Wallet connection
- [x] Transaction sending
- [x] AI predictions
- [x] Chat interface

### Phase 2: Enhanced Bot Architecture ✅ **NEW!**
- [x] Multi-source data aggregation (30 sources)
- [x] 8 intelligent bots (Price, Liquidity, OnChain, Derivatives, News, Regulatory, Anomaly, WhaleFlow)
- [x] Keyword-based event classification (100+ keywords)
- [x] Secondary signal gating enforcement
- [x] Regulatory compliance checking
- [x] News sentiment analysis
- [x] Comprehensive test suite

### Phase 3: Future Enhancements 📋
- [ ] Multi-chain support (Ethereum, BSC)
- [ ] Historical performance tracking
- [ ] Route optimization (DEX swaps, bridges)
- [ ] CaVR tail-risk calculations
- [ ] Mobile app (React Native)
- [ ] Push notifications

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎉 Quick Start Summary

```bash
# 1. Clone and install
git clone <your-repo>
cd <project>
npm install

# 2. Set up environment
echo "OPENAI_API_KEY=your_key" > .env.local

# 3. Run
npm run dev

# 4. Connect wallet and start predicting!
```

---

## 💡 Tips

1. **Start with devnet** - Test with free tokens first
2. **Small amounts** - Start with small transactions
3. **Check predictions** - Review AI reasoning before acting
4. **Monitor performance** - Track prediction accuracy
5. **Stay informed** - Crypto markets are volatile!

---

## 📞 Support

For issues or questions:
1. Check this README
2. Review INTEGRATION_GUIDE.md
3. Check browser console for errors
4. Test on devnet first

---

**🚀 Built with Next.js, Solana, OpenAI, and ❤️**

*Your intelligent crypto transaction companion!*

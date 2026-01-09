# Bot Architecture Documentation

## Overview

This document describes the enhanced data source and bot architecture for the CryptoChain AI Optimizer.

## Architecture Principles

### 1. **Data Source Registry**
- Centralized configuration in `config/data_sources.json`
- Each source has:
  - Cost tier (free/paid/internal)
  - Role flags (core_pricing, pareto_constraints, contextual_bandit, secondary_signal)
  - Rate limits and API configuration

### 2. **Bot Architecture**
- Modular bots for different data types
- Standardized `BotOutput` interface
- Strict separation of core metrics vs secondary signals

### 3. **Secondary Signal Gating** ⚠️ CRITICAL
- **Core metrics** (price, volatility, liquidity, fees) can ONLY come from:
  - PriceBot
  - LiquidityBot
  - OnChainBot
  
- **Secondary signals** (news, sentiment, whale activity) can ONLY be used for:
  - Event-driven tail-risk adjustment
  - Pareto exclusion (hard blocks)
  - Explainability

- **Enforcement**: Type-level and runtime validation in `BaseBot.validateOutput()`

## Bots

### PriceBot
- **Category**: Core pricing
- **Sources**: CoinGecko, Binance, Coinbase, Pyth
- **Outputs**: 
  - Core: price, volatility, volume
  - Secondary: anomaly flags (price discrepancies)

### LiquidityBot
- **Category**: Core execution
- **Sources**: Binance order books, Coinbase
- **Outputs**:
  - Core: liquidity depth, spread
  - Secondary: feasibility flags

### OnChainBot
- **Category**: Core execution
- **Sources**: Etherscan, Solscan, Solana RPC
- **Outputs**:
  - Core: fees, congestion, failure rate
  - Secondary: congestion alerts

### DerivativesBot
- **Category**: Secondary (tail-risk)
- **Sources**: Deribit, Coinglass
- **Outputs**:
  - Secondary: IV, funding rates, liquidations, tail-risk flags

### NewsBot
- **Category**: Secondary (events)
- **Sources**: CryptoPanic, CoinDesk, The Block, Reuters
- **Outputs**:
  - Secondary: event flags (exploit, regulatory, depeg, etc.)
  - Uses keyword matcher for classification

### RegulatoryBot
- **Category**: Secondary (compliance)
- **Sources**: SEC, OFAC
- **Outputs**:
  - Secondary: regulatory risk, **HARD BLOCKS**

### AnomalyBot
- **Category**: Secondary (confidence adjustment)
- **Sources**: Binance, Coinbase
- **Outputs**:
  - Secondary: anomaly flags (spoofing, wash trading, divergence)

### WhaleFlowBot
- **Category**: Secondary (market pressure)
- **Sources**: Whale Alert, CryptoQuant
- **Outputs**:
  - Secondary: whale activity, exchange flows

## Keyword Impact Scoring

Located in `lib/utils/keywordMatcher.ts` and `config/crypto_keywords.json`.

### Event Types
- `exploit`: Hacks, breaches, vulnerabilities
- `regulatory`: SEC, OFAC, legal actions
- `depeg`: Stablecoin depegging
- `delisting`: Exchange delistings
- `outage`: Network/exchange outages
- `insolvency`: Bankruptcy, liquidity crunch
- `liquidation`: Derivatives liquidations
- `tokenomics`: Burns, unlocks, emissions
- `institutional`: ETF, institutional adoption
- `adoption`: Partnerships, integrations

### Severity Levels
- `low`: Informational, minimal impact
- `medium`: Notable event, requires attention
- `high`: Critical event, may trigger exclusion

### Confirmation Logic
- Conservative default: `confirmed = false`
- Requires explicit confirmation keywords: "confirmed", "official", "announced"
- High-severity events require stronger confirmation
- Speculation keywords ("rumor", "alleged") prevent confirmation

## Bot Orchestrator

Located in `lib/bots/BotOrchestrator.ts`.

### Workflow
1. Run all bots in parallel
2. Aggregate core metrics (from primary bots only)
3. Aggregate secondary signals
4. Apply exclusions:
   - **Regulatory hard blocks** (highest priority)
   - Confirmed high-severity negative events
5. Calculate overall confidence
6. Return complete output with audit trail

### Exclusion Rules
1. **Regulatory hard blocks override everything**
2. Confirmed exploits/insolvency/delisting trigger exclusion
3. Medium-severity events do NOT trigger exclusion (only penalize score)

## API Integration

### Enhanced Prediction API
Located in `pages/api/crypto-prediction-enhanced.ts`.

**Endpoint**: `POST /api/crypto-prediction-enhanced`

**Request**:
```json
{
  "holdings": [
    {"symbol": "BTC", "amount": 0.5, "avgPrice": 40000},
    {"symbol": "ETH", "amount": 10, "avgPrice": 2000}
  ],
  "transactionAmount": 5000,
  "purpose": "payment"
}
```

**Response**:
```json
{
  "success": true,
  "recommendation": {
    "useSymbol": "ETH",
    "useAmount": 2.5,
    "reasons": [
      "✅ Low volatility (1.23%)",
      "✅ High liquidity",
      "✅ Low fees ($0.50)"
    ],
    "score": 12,
    "alternatives": [...],
    "holdSymbols": ["BTC"]
  },
  "analysis": {
    "technical": "...",
    "sentiment": "...",
    "prediction": "..."
  },
  "botData": {
    "coreMetrics": {...},
    "secondarySignals": {...},
    "excludedAssets": [],
    "confidence": {
      "overall": "high",
      "byBot": {...}
    }
  }
}
```

### Scoring Algorithm
```typescript
score = 0

// Core factors (from bots)
if (volatility < 0.02) score += 5
if (liquidity > transactionAmount * 10) score += 3
if (spread < 0.005) score += 2
if (fees < 1) score += 2
if (congestion < 0.3) score += 1

// Secondary factors (explainability only, not scoring)
// - News events
// - Whale activity
// - Anomalies
```

## Testing

### Run Tests
```bash
npm run test:bots
# or
ts-node tests/test-bots.ts
```

### Test Coverage
- ✅ Individual bot execution
- ✅ Secondary signal gating validation
- ✅ Keyword matcher classification
- ✅ Orchestrator integration
- ✅ Exclusion logic

### Manual Test Checklist
1. **Secondary Signal Gating**:
   - [ ] NewsBot does NOT populate core metrics
   - [ ] DerivativesBot does NOT populate core metrics
   - [ ] WhaleFlowBot does NOT populate core metrics
   
2. **Exclusions**:
   - [ ] Regulatory hard block excludes asset
   - [ ] Confirmed exploit excludes asset
   - [ ] Medium-severity news does NOT exclude (only penalizes)
   
3. **Keyword Detection**:
   - [ ] "hack" detected as exploit
   - [ ] "SEC charges" detected as regulatory
   - [ ] "depeg" detected as stablecoin event
   
4. **API Integration**:
   - [ ] Enhanced API returns bot data
   - [ ] Excluded assets are filtered out
   - [ ] Scoring uses core metrics only

## Configuration

### Enable/Disable Data Sources
Edit `config/data_sources.json`:
```json
{
  "id": "coinglass",
  "enabled": false  // Set to true to enable
}
```

### Add API Keys
Create `.env.local`:
```env
# Optional paid sources
COINGLASS_API_KEY=your_key
NANSEN_API_KEY=your_key
WHALE_ALERT_API_KEY=your_key
ETHERSCAN_API_KEY=your_key
```

### MVP Mode
Set `mvpMode: true` in `config/data_sources.json` to use only free sources.

## File Structure
```
config/
  ├── data_sources.json       # Data source registry
  └── crypto_keywords.json    # Keyword definitions

lib/
  ├── bots/
  │   ├── base.ts            # Base bot class + interfaces
  │   ├── PriceBot.ts
  │   ├── LiquidityBot.ts
  │   ├── OnChainBot.ts
  │   ├── DerivativesBot.ts
  │   ├── NewsBot.ts
  │   ├── RegulatoryBot.ts
  │   ├── AnomalyBot.ts
  │   ├── WhaleFlowBot.ts
  │   └── BotOrchestrator.ts
  └── utils/
      └── keywordMatcher.ts   # Keyword detection

pages/api/
  ├── crypto-prediction.ts          # Original API
  └── crypto-prediction-enhanced.ts # New bot-powered API

tests/
  └── test-bots.ts           # Test suite
```

## Assumptions

1. **Rate Limits**: Configured per source, enforced by `globalRateLimiter`
2. **Caching**: 5-minute default cache per bot
3. **Fallbacks**: Bots provide estimated data if API calls fail
4. **Error Handling**: Individual bot failures don't crash orchestrator
5. **API Keys**: Optional for most sources (free tier available)

## Future Enhancements

- [ ] Add CaVRBot for VaR/CVaR calculations
- [ ] Implement actual web scraping for news sources
- [ ] Add StablecoinBot for peg monitoring
- [ ] Implement TokenomicsBot for unlock schedules
- [ ] Add route optimization (DEX swaps, bridges)
- [ ] Implement contextual bandit learning from payment logs

## Support

For issues or questions:
1. Check this documentation
2. Review test scripts in `tests/`
3. Check bot outputs in API response `botData`
4. Review console logs for bot errors/warnings


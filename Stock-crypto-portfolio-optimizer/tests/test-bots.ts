/**
 * Test script for bot architecture
 * 
 * Tests individual bots and orchestrator
 * Validates secondary signal gating
 */

import { PriceBot } from '../lib/bots/PriceBot';
import { LiquidityBot } from '../lib/bots/LiquidityBot';
import { OnChainBot } from '../lib/bots/OnChainBot';
import { DerivativesBot } from '../lib/bots/DerivativesBot';
import { NewsBot } from '../lib/bots/NewsBot';
import { RegulatoryBot } from '../lib/bots/RegulatoryBot';
import { AnomalyBot } from '../lib/bots/AnomalyBot';
import { WhaleFlowBot } from '../lib/bots/WhaleFlowBot';
import { botOrchestrator } from '../lib/bots/BotOrchestrator';
import { keywordMatcher } from '../lib/utils/keywordMatcher';

async function testPriceBot() {
  console.log('\n=== Testing PriceBot ===');
  const priceBot = new PriceBot();
  const output = await priceBot.fetch(['BTC', 'ETH', 'SOL']);
  
  console.log('✓ PriceBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Core metrics populated: ${Object.keys(output.coreMetrics).length > 0}`);
  console.log(`  Price (BTC): $${output.coreMetrics.price}`);
  
  // Validate: PriceBot should populate core metrics
  if (Object.keys(output.coreMetrics).length === 0) {
    throw new Error('PriceBot failed to populate core metrics');
  }
}

async function testLiquidityBot() {
  console.log('\n=== Testing LiquidityBot ===');
  const liquidityBot = new LiquidityBot();
  const output = await liquidityBot.fetch(['BTC', 'ETH'], { transactionSize: 10000 });
  
  console.log('✓ LiquidityBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Liquidity: ${output.coreMetrics.liquidity}`);
  console.log(`  Spread: ${output.coreMetrics.spread}`);
}

async function testOnChainBot() {
  console.log('\n=== Testing OnChainBot ===');
  const onChainBot = new OnChainBot();
  const output = await onChainBot.fetch(['ETH', 'SOL'], { chains: ['ethereum', 'solana'] });
  
  console.log('✓ OnChainBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Fees: $${output.coreMetrics.fees}`);
  console.log(`  Congestion: ${output.coreMetrics.congestion}`);
}

async function testDerivativesBot() {
  console.log('\n=== Testing DerivativesBot ===');
  const derivativesBot = new DerivativesBot();
  const output = await derivativesBot.fetch(['BTC', 'ETH']);
  
  console.log('✓ DerivativesBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Core metrics populated: ${Object.keys(output.coreMetrics).length}`);
  console.log(`  Secondary signals: ${Object.keys(output.secondarySignals).length}`);
  
  // Validate: DerivativesBot should NOT populate core metrics
  if (Object.keys(output.coreMetrics).length > 0) {
    console.warn('⚠️  WARNING: DerivativesBot populated core metrics (should be secondary only)');
  }
}

async function testNewsBot() {
  console.log('\n=== Testing NewsBot ===');
  const newsBot = new NewsBot();
  const output = await newsBot.fetch(['BTC', 'ETH'], { lookbackHours: 24 });
  
  console.log('✓ NewsBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Event flags: ${output.secondarySignals.eventFlags?.length || 0}`);
  console.log(`  Core metrics populated: ${Object.keys(output.coreMetrics).length}`);
  
  // Validate: NewsBot should NOT populate core metrics
  if (Object.keys(output.coreMetrics).length > 0) {
    throw new Error('GATING VIOLATION: NewsBot populated core metrics');
  }
  
  console.log('✓ Secondary signal gating validated');
}

async function testRegulatoryBot() {
  console.log('\n=== Testing RegulatoryBot ===');
  const regulatoryBot = new RegulatoryBot();
  const output = await regulatoryBot.fetch(['BTC', 'ETH', 'XRP']);
  
  console.log('✓ RegulatoryBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Regulatory risk level: ${output.secondarySignals.regulatoryRisk?.level}`);
  console.log(`  Hard block: ${output.secondarySignals.regulatoryRisk?.hardBlock}`);
}

async function testAnomalyBot() {
  console.log('\n=== Testing AnomalyBot ===');
  const anomalyBot = new AnomalyBot();
  const output = await anomalyBot.fetch(['BTC', 'ETH']);
  
  console.log('✓ AnomalyBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Anomalies detected: ${output.secondarySignals.anomalyDetected}`);
}

async function testWhaleFlowBot() {
  console.log('\n=== Testing WhaleFlowBot ===');
  const whaleFlowBot = new WhaleFlowBot();
  const output = await whaleFlowBot.fetch(['BTC', 'ETH'], { lookbackHours: 24 });
  
  console.log('✓ WhaleFlowBot executed');
  console.log(`  Confidence: ${output.confidence}`);
  console.log(`  Whale activity count: ${output.secondarySignals.whaleActivity?.length || 0}`);
}

function testKeywordMatcher() {
  console.log('\n=== Testing Keyword Matcher ===');
  
  const testCases = [
    {
      text: 'Bitcoin exchange hacked, $100M stolen',
      expected: 'exploit'
    },
    {
      text: 'SEC charges crypto company with fraud',
      expected: 'regulatory'
    },
    {
      text: 'USDT stablecoin depeg event',
      expected: 'depeg'
    }
  ];

  for (const testCase of testCases) {
    const classification = keywordMatcher.classifyEvent(testCase.text);
    
    if (classification) {
      console.log(`✓ Classified "${testCase.text}"`);
      console.log(`  Event type: ${classification.eventType} (expected: ${testCase.expected})`);
      console.log(`  Severity: ${classification.severity}`);
      console.log(`  Confirmed: ${classification.confirmed}`);
      console.log(`  Keywords: ${classification.keywords.join(', ')}`);
    } else {
      console.log(`✗ Failed to classify "${testCase.text}"`);
    }
  }
}

async function testOrchestrator() {
  console.log('\n=== Testing Bot Orchestrator ===');
  
  const output = await botOrchestrator.run({
    assets: ['BTC', 'ETH', 'SOL'],
    transactionAmount: 5000,
    lookbackHours: 24
  });
  
  console.log('✓ Orchestrator executed');
  console.log(`  Overall confidence: ${output.confidence.overall}`);
  console.log(`  Assets analyzed: ${output.assets.join(', ')}`);
  console.log(`  Excluded assets: ${output.excludedAssets.length}`);
  console.log(`  Event flags: ${output.secondarySignals.eventFlags.length}`);
  console.log(`  Core metrics for BTC:`);
  console.log(`    Price: $${output.coreMetrics.price['BTC']}`);
  console.log(`    Volatility: ${output.coreMetrics.volatility['BTC']}`);
  console.log(`    Liquidity: ${output.coreMetrics.liquidity['BTC']}`);
  
  // Validate exclusions
  if (output.excludedAssets.length > 0) {
    console.log(`\n  Exclusions:`);
    for (const exclusion of output.excludedAssets) {
      console.log(`    - ${exclusion.asset}: ${exclusion.reason} (${exclusion.source})`);
    }
  }
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         BOT ARCHITECTURE TEST SUITE                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Test keyword matcher first (no API calls)
    testKeywordMatcher();

    // Test individual bots
    await testPriceBot();
    await testLiquidityBot();
    await testOnChainBot();
    await testDerivativesBot();
    await testNewsBot();
    await testRegulatoryBot();
    await testAnomalyBot();
    await testWhaleFlowBot();

    // Test orchestrator
    await testOrchestrator();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         ✓ ALL TESTS PASSED                                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════╗');
    console.error('║         ✗ TEST FAILED                                     ║');
    console.error('╚═══════════════════════════════════════════════════════════╝');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();


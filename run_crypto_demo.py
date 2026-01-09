"""
Demo script to showcase crypto_portfolio_optimizer
"""
import sys
import os

# Fix encoding for Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Add python-backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-backend'))

print("=" * 80)
print("CRYPTO PORTFOLIO OPTIMIZER - DEMO")
print("=" * 80)
print()
print("📊 This demo will:")
print("   1. Generate a random crypto portfolio")
print("   2. Show current prices and holdings")
print("   3. Simulate a transaction request")
print("   4. Provide AI-powered recommendations")
print()
print("=" * 80)
print()

# Import after adding to path
from crypto_portfolio_optimizer import (
    generate_random_portfolio,
    optimize_transaction,
    get_crypto_price_data
)
import random

# Generate random portfolio
print("🎲 Generating random portfolio...\n")
portfolio = generate_random_portfolio()

# Display portfolio
print("\n" + "=" * 80)
portfolio.display_portfolio()

# Generate random transaction
portfolio_data = portfolio.get_portfolio_value()
total_value = portfolio_data['total_value']
amount = random.uniform(total_value * 0.2, total_value * 0.4)
purposes = ["payment to friend", "online purchase", "service payment"]
purpose = random.choice(purposes)

print("\n" + "=" * 80)
print("💸 TRANSACTION REQUEST")
print("=" * 80)
print(f"Amount: ${amount:.2f}")
print(f"Purpose: {purpose}")
print("=" * 80)

# Get recommendation
print("\n🤖 Analyzing portfolio and generating recommendation...\n")
recommendation = optimize_transaction(portfolio, amount, purpose)
print(recommendation)

print("\n" + "=" * 80)
print("✅ DEMO COMPLETE!")
print("=" * 80)
print()
print("💡 To run the full interactive version:")
print("   cd python-backend")
print("   python crypto_portfolio_optimizer.py")
print()
print("📚 For more info, see: python-backend/README.md")
print("=" * 80)


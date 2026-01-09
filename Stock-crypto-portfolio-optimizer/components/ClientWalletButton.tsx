import React, { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface ClientWalletButtonProps {
  className?: string;
}

export const ClientWalletButton: React.FC<ClientWalletButtonProps> = ({ className }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Return a placeholder button during SSR to prevent hydration mismatch
    return (
      <button
        className={`wallet-adapter-button ${className || ''}`}
        disabled
        style={{
          background: 'linear-gradient(90deg, #512da8 0%, #673ab7 100%)',
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          cursor: 'not-allowed',
          fontSize: '14px',
          fontWeight: '600',
          height: '48px',
          padding: '0 24px',
          opacity: 0.5
        }}
      >
        Connect Wallet
      </button>
    );
  }

  return <WalletMultiButton className={className} />;
}; 
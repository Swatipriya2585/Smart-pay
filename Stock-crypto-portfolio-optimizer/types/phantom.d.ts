interface PhantomProvider {
  isPhantom?: boolean;
  connect(): Promise<{ publicKey: { toBytes(): Uint8Array } }>;
  disconnect(): Promise<void>;
  on(event: string, callback: (args: any) => void): void;
  publicKey: { toBytes(): Uint8Array } | null;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
}

interface Window {
  solana?: PhantomProvider;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
} 
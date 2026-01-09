import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SolanaWalletProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, orientation=portrait" />
        <meta name="theme-color" content="#581c87" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="CryptoChain" />
        <meta name="apple-mobile-web-app-title" content="CryptoChain" />
        <meta name="msapplication-TileColor" content="#581c87" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* iOS specific meta tags */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Android specific meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="CryptoChain" />
        <meta name="msapplication-TileColor" content="#581c87" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* PWA and mobile optimization */}
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
        
        <title>CryptoChain</title>
      </Head>
      <Component {...pageProps} />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: '90vw',
            margin: '0 auto',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </SolanaWalletProvider>
  );
} 
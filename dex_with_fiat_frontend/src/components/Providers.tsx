'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { StellarWalletProvider } from '@/contexts/StellarWalletContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <StellarWalletProvider>{children}</StellarWalletProvider>
    </ThemeProvider>
  );
}

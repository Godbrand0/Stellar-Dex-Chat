'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  isConnected as freighterIsConnected,
  getAddress,
  getNetwork,
  signTransaction,
  requestAccess,
} from '@stellar/freighter-api';

export interface StellarWalletConnection {
  address: string;
  publicKey: string;
  isConnected: boolean;
  network: string;
  networkPassphrase: string;
}

interface StellarWalletContextType {
  connection: StellarWalletConnection;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTx: (xdr: string) => Promise<string>;
  isFreighterInstalled: boolean;
  isLoading: boolean;
  error: string | null;
}

const defaultConnection: StellarWalletConnection = {
  address: '',
  publicKey: '',
  isConnected: false,
  network: '',
  networkPassphrase: '',
};

const StellarWalletContext = createContext<StellarWalletContextType>({
  connection: defaultConnection,
  connect: async () => {},
  disconnect: () => {},
  signTx: async () => '',
  isFreighterInstalled: false,
  isLoading: false,
  error: null,
});

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] =
    useState<StellarWalletConnection>(defaultConnection);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, check if Freighter is installed
  useEffect(() => {
    const check = async () => {
      try {
        const result = await freighterIsConnected();
        setIsFreighterInstalled(!result.error && result.isConnected);
      } catch {
        setIsFreighterInstalled(false);
      }
    };
    check();
  }, []);

  // Auto-reconnect from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('stellar_address');
    if (stored && isFreighterInstalled) {
      getAddress()
        .then(async (addrResult) => {
          if (!addrResult.error && addrResult.address === stored) {
            const netResult = await getNetwork();
            setConnection({
              address: addrResult.address,
              publicKey: addrResult.address,
              isConnected: true,
              network: netResult.network || 'TESTNET',
              networkPassphrase: netResult.networkPassphrase || '',
            });
          }
        })
        .catch(() => {});
    }
  }, [isFreighterInstalled]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessResult = await requestAccess();
      if (accessResult.error) throw new Error(String(accessResult.error));

      const addrResult = await getAddress();
      if (addrResult.error) throw new Error(String(addrResult.error));

      const netResult = await getNetwork();

      const addr = addrResult.address;
      localStorage.setItem('stellar_address', addr);

      setConnection({
        address: addr,
        publicKey: addr,
        isConnected: true,
        network: netResult.network || 'TESTNET',
        networkPassphrase: netResult.networkPassphrase || '',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect Freighter',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('stellar_address');
    setConnection(defaultConnection);
    setError(null);
  }, []);

  const signTx = useCallback(
    async (xdr: string): Promise<string> => {
      const result = await signTransaction(xdr, {
        networkPassphrase: connection.networkPassphrase,
        address: connection.address,
      });
      if (result.error) throw new Error(String(result.error));
      return result.signedTxXdr;
    },
    [connection.address, connection.networkPassphrase],
  );

  return (
    <StellarWalletContext.Provider
      value={{
        connection,
        connect,
        disconnect,
        signTx,
        isFreighterInstalled,
        isLoading,
        error,
      }}
    >
      {children}
    </StellarWalletContext.Provider>
  );
}

export function useStellarWallet() {
  const ctx = useContext(StellarWalletContext);
  if (!ctx)
    throw new Error(
      'useStellarWallet must be used inside StellarWalletProvider',
    );
  return ctx;
}

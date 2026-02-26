import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { WalletState } from './types';
import { connectWallet, checkWalletConnection, isFreighterInstalled, isAlbedoInstalled, WalletProvider } from './wallet';
import { fetchBalance } from './contract';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AuctionPage from './pages/Auction';
import Profile from './pages/Profile';
import toast from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import { useWalletStore } from './store/useWalletStore';
import { validateEnv } from './env';

function AppShell() {
  const navigate = useNavigate();
  const [isFreighter, setIsFreighter] = useState(false);
  const [isAlbedo, setIsAlbedo] = useState(false);
  const [wallet, setWallet] = useState<WalletState>({
    publicKey: null,
    network: null,
    balance: null,
    isConnected: false,
    isConnecting: false,
  });
  const [provider, setProvider] = useState<WalletProvider>('freighter');
  const setWalletStore = useWalletStore(s => s.setState);

  // Check installation and connection on mount
  useEffect(() => {
    const envErrors = validateEnv();
    if (envErrors.length) {
      console.warn('[ENV] configuration issues:', envErrors.join('; '));
    }
    isFreighterInstalled().then(setIsFreighter);
    isAlbedoInstalled().then(setIsAlbedo);

    checkWalletConnection(provider).then(state => {
      if (state.isConnected && state.publicKey) {
        setWallet(state);
        setWalletStore({ ...state, selectedWallet: provider });
        fetchBalance(state.publicKey).then(balance => {
          setWallet(prev => ({ ...prev, balance }));
          setWalletStore({ balance });
        });
      }
    });

    // Check installation status periodically (in case they install while app is open)
    const interval = setInterval(() => {
      isFreighterInstalled().then(setIsFreighter);
      isAlbedoInstalled().then(setIsAlbedo);
    }, 5000);
    return () => clearInterval(interval);
  }, [provider, setWalletStore]);

  // Poll balance every 4 seconds if connected
  useEffect(() => {
    if (!wallet.isConnected || !wallet.publicKey) return;

    const interval = setInterval(() => {
      fetchBalance(wallet.publicKey!).then(balance => {
        if (balance !== wallet.balance) {
          setWallet(prev => ({ ...prev, balance }));
          setWalletStore({ balance });
        }
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [wallet.isConnected, wallet.publicKey, wallet.balance, setWalletStore]);

  const handleConnect = useCallback(async (prov: WalletProvider) => {
    setProvider(prov);
    setWallet(prev => ({ ...prev, isConnecting: true }));
    try {
      const state = await connectWallet(prov);
      const balance = await fetchBalance(state.publicKey ?? '');
      setWallet({ ...state, balance });
      setWalletStore({ ...state, balance, selectedWallet: prov });
      toast.success(`Connected with ${prov === 'freighter' ? 'Freighter' : 'Albedo'}`);
      navigate('/auction', { replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg);
      setWallet(prev => ({ ...prev, isConnecting: false }));
    }
  }, [navigate, setWalletStore]);

  const handleDisconnect = useCallback(() => {
    setWallet({ publicKey: null, network: null, balance: null, isConnected: false, isConnecting: false });
    setWalletStore({ publicKey: null, network: null, balance: null, isConnected: false, isConnecting: false, selectedWallet: null });
    toast('Wallet disconnected.', { icon: '👋' });
  }, [setWalletStore]);

  const isTestnet = !wallet.isConnected || wallet.network === 'TESTNET' || wallet.network === 'Test SDF Network ; September 2015';

  return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {!isTestnet && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 py-3 px-6 animate-in slide-in-from-top duration-500">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="text-amber-500" size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-wider">Network Mismatch</p>
                  <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-tight">Your wallet is connected to {wallet.network}. Please switch to Stellar Testnet.</p>
                </div>
              </div>
              <button
                onClick={() => handleConnect(provider)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-amber-950 text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
              >
                Switch Network
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-10">
          <div className="space-y-10">
            {/* Navbar Area (Simplified structure inside the pages or shared) */}
            <Navbar
              wallet={wallet}
              isFreighterInstalled={isFreighter}
              isAlbedoInstalled={isAlbedo}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />

            <main>
              <Routes>
                <Route path="/" element={<Home wallet={wallet} isFreighterInstalled={isFreighter} isAlbedoInstalled={isAlbedo} onConnect={handleConnect} />} />
                <Route path="/auction" element={<ProtectedRoute><Dashboard wallet={wallet} /></ProtectedRoute>} />
                <Route path="/auction/:id" element={<ProtectedRoute><AuctionPage wallet={wallet} /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile wallet={wallet} /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#3b82f6', secondary: '#111827' },
            },
          }}
        />
      </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App;

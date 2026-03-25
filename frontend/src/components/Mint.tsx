import React, { useState, useEffect, useCallback } from 'react';
import { Coins, Loader2, AlertCircle, CheckCircle2, Wallet, Zap, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTokenBalance, mintTokens, NETWORK_PASSPHRASE } from '../contract';
import { signTransaction, connectWallet } from '../wallet';
import { Button } from './ui/button';

const Mint: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0.00');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'error' | 'success' | 'info' | null }>({
    message: '',
    type: null,
  });

  const fetchUserBalance = useCallback(async (addr: string) => {
    const b = await getTokenBalance(addr);
    setBalance(b);
  }, []);

  const handleConnect = async () => {
    try {
      const wallet = await connectWallet('freighter');
      setAddress(wallet.publicKey);
      if (wallet.publicKey) {
        await fetchUserBalance(wallet.publicKey);
      }
      toast.success('Wallet connected!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect wallet');
    }
  };

  const handleMint = async (mintAmount: number, targetAddress?: string) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!mintAmount || mintAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const finalRecipient = targetAddress || address;
    setLoading(true);
    setStatus({ message: 'Simulating & signing transaction...', type: 'info' });
    const toastId = toast.loading(`Minting ${mintAmount} ATK...`);

    try {
      console.log("[Mint UI] Starting mint process...");
      console.log("[Mint UI] Wallet:", address);
      console.log("[Mint UI] Recipient:", finalRecipient);
      console.log("[Mint UI] Amount:", mintAmount);

      const res = await mintTokens(address, finalRecipient, mintAmount, async (xdr) => {
        return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
      });

      console.log("[Mint UI] Success:", res);
      
      if (res.success) {
        setStatus({ 
          message: `Successfully minted ${mintAmount} ATK to ${finalRecipient.slice(0, 8)}...`, 
          type: 'success' 
        });
        toast.success(`Successfully minted ${mintAmount} tokens!`, { id: toastId });
        
        // Clear inputs
        setAmount('');
        setRecipient('');
        
        // Refresh balance after a short delay for ledger finality
        setTimeout(() => fetchUserBalance(address), 5000);
      } else {
        throw new Error(res.error || "Minting failed");
      }
    } catch (err: any) {
      console.error("[Mint UI] Error:", err);
      const errorMsg = err.message || 'Minting failed';
      setStatus({ message: errorMsg, type: 'error' });
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-card p-8 space-y-6 max-w-2xl mx-auto border-blue-500/20 bg-blue-500/5">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center shadow-inner">
            <Coins size={28} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Mint AuctionToken</h3>
            <p className="text-gray-400 text-sm font-medium">Create ATK tokens directly to your wallet</p>
          </div>
        </div>
        
        {address && (
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Balance</p>
            <p className="text-2xl font-black text-blue-500">{balance} <span className="text-sm opacity-50">ATK</span></p>
          </div>
        )}
      </div>

      {!address ? (
        <div className="py-12 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gray-900 border border-white/5 flex items-center justify-center mx-auto shadow-2xl">
            <Wallet size={32} className="text-gray-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-white">Wallet Not Connected</h4>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Connect your Freighter wallet to start minting AuctionTokens (ATK).</p>
          </div>
          <Button onClick={handleConnect} size="lg" className="px-10">
            Connect Freighter
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Token Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="saas-input w-full pl-12"
                  disabled={loading}
                />
                <Coins size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Recipient Address (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Defaults to your wallet"
                  className="saas-input w-full pl-12"
                  disabled={loading}
                />
                <Wallet size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              onClick={() => handleMint(Number(amount), recipient)}
              disabled={loading || !amount}
              size="lg"
              className="flex-1 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Minting...
                </>
              ) : (
                <>
                  <Zap size={18} className="mr-2" />
                  Mint Tokens
                </>
              )}
            </Button>
            
            <Button 
              variant="secondary"
              onClick={() => handleMint(100)}
              disabled={loading}
              size="lg"
              className="sm:w-48"
            >
              Mint 100 ATK
            </Button>
          </div>

          {status.message && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${
              status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
              status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {status.type === 'error' ? <ShieldAlert size={20} className="shrink-0" /> : 
               status.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> :
               <AlertCircle size={20} className="shrink-0" />}
              <p className="text-sm font-medium leading-relaxed">{status.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Mint;

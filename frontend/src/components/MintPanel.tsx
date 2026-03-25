import React, { useState, useEffect } from 'react';
import { Wallet, Coins, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useToken } from '../hooks/useToken';
import { checkIsAdmin, mintTokens, NETWORK_PASSPHRASE } from '../contract';
import { signTransaction } from '../wallet';

interface MintPanelProps {
    walletAddress: string | null;
}

const MintPanel: React.FC<MintPanelProps> = ({ walletAddress }) => {
    const { balance, refresh: refreshToken } = useToken(walletAddress);
    const [isAdmin, setIsAdmin] = useState(false);
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [isMinting, setIsMinting] = useState(false);

    useEffect(() => {
        async function verifyAdmin() {
            if (walletAddress) {
                const adminStatus = await checkIsAdmin(walletAddress);
                setIsAdmin(adminStatus);
            }
        }
        verifyAdmin();
    }, [walletAddress]);

    const handleMint = async (mintAmount: number, targetAddress: string) => {
        if (!walletAddress) {
            toast.error('Wallet not connected');
            return;
        }

        setIsMinting(true);
        const tid = toast.loading('Preparing mint transaction...');

        try {
            const result = await mintTokens(walletAddress, targetAddress, mintAmount, async (xdr) => {
                return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
            });

            if (result.success) {
                toast.success(`Successfully minted ${mintAmount} tokens!`, { id: tid });
                await refreshToken();
                setAmount('');
                setRecipient('');
            } else {
                toast.error(result.error || 'Minting failed', { id: tid });
            }
        } catch (err) {
            toast.error((err as Error).message, { id: tid });
        } finally {
            setIsMinting(false);
        }
    };

    if (!walletAddress) {
        return null; // Don't render if wallet is not connected
    }

    if (!isAdmin) {
        return (
            <div className="saas-card p-6 text-center space-y-4 border-dashed border-amber-500/20 bg-amber-500/5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                    <AlertTriangle size={24} className="text-amber-500" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Admin Access Required</h3>
                    <p className="text-amber-400/80 text-sm">
                        You must be the token administrator to mint new tokens.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="saas-card p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center">
                        <Coins size={24} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Mint Tokens</h3>
                        <p className="text-gray-400 text-sm">Create and distribute new TOK tokens.</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Admin Balance</p>
                    <p className="text-xl font-black text-blue-500">{parseFloat(balance).toFixed(2)} <span className="text-xs opacity-50 text-gray-400">TOK</span></p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleMint(parseFloat(amount), recipient || walletAddress); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 1000"
                            className="saas-input w-full mt-1"
                            disabled={isMinting}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Recipient (Optional)</label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="Defaults to your address"
                            className="saas-input w-full mt-1"
                            disabled={isMinting}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                    <button
                        type="submit"
                        disabled={isMinting || !amount}
                        className="saas-button py-3 text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                    >
                        {isMinting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Mint Tokens'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMint(100, walletAddress)}
                        disabled={isMinting}
                        className="saas-button py-3 text-sm font-bold bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isMinting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Mint 100 (Demo)'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MintPanel;

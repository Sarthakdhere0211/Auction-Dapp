import React, { useState } from 'react';
import { Settings, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTxUrl } from '../config/stellar';

interface AdminInitPanelProps {
    walletAddress: string;
    onInitialize: (startingPrice: number, durationMinutes: number) => Promise<{ success: boolean; txHash: string; error?: string }>;
    isInitializing: boolean;
}

const AdminInitPanel: React.FC<AdminInitPanelProps> = ({
    walletAddress,
    onInitialize,
    isInitializing,
}) => {
    const [startingPrice, setStartingPrice] = useState('10');
    const [duration, setDuration] = useState('60');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleInitialize = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setTxHash(null);

        const price = parseFloat(startingPrice);
        const durationMins = parseInt(duration);

        if (isNaN(price) || price <= 0) {
            setError('Starting price must be greater than 0');
            return;
        }

        if (isNaN(durationMins) || durationMins <= 0) {
            setError('Duration must be greater than 0');
            return;
        }

        try {
            const result = await onInitialize(price, durationMins);
            
            if (result.success) {
                setTxHash(result.txHash);
                toast.success('Auction initialized successfully!');
            } else {
                setError(result.error || 'Initialization failed');
                toast.error(result.error || 'Initialization failed');
            }
        } catch (err) {
            const msg = (err as Error).message;
            setError(msg);
            toast.error(msg);
        }
    };

    return (
        <div className="saas-card p-8 space-y-6 border-2 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Settings size={24} className="text-amber-500" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Admin Panel</h3>
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Initialize Auction Contract</p>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-200 leading-relaxed">
                    The auction contract needs to be initialized before users can place bids. 
                    This is a one-time operation that sets the starting price and duration.
                </p>
            </div>

            <form onSubmit={handleInitialize} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Starting Price (XLM)
                    </label>
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={startingPrice}
                        onChange={(e) => setStartingPrice(e.target.value)}
                        className="saas-input w-full p-4 text-lg font-black"
                        disabled={isInitializing}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Duration (Minutes)
                    </label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="saas-input w-full p-4 text-lg font-black"
                        disabled={isInitializing}
                        required
                    />
                    <p className="text-[10px] text-gray-500 ml-1">
                        Recommended: 60 minutes (1 hour) or 1440 minutes (24 hours)
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isInitializing}
                    className="w-full saas-button py-5 text-base bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-600/20"
                >
                    {isInitializing ? (
                        <div className="flex items-center justify-center gap-3">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="uppercase tracking-widest font-black text-sm">Initializing...</span>
                        </div>
                    ) : (
                        <span className="uppercase tracking-widest font-black text-sm">Initialize Auction</span>
                    )}
                </button>
            </form>

            {error && (
                <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle size={14} />
                        <span className="font-black text-[10px] uppercase tracking-widest">Initialization Failed</span>
                    </div>
                    <p className="text-xs text-red-400/80 font-medium leading-relaxed">{error}</p>
                </div>
            )}

            {txHash && (
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-500">
                        <CheckCircle size={14} />
                        <span className="font-black text-[10px] uppercase tracking-widest">
                            Auction Initialized Successfully
                        </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono break-all opacity-60 leading-relaxed">
                        {txHash}
                    </p>
                    <a
                        href={getTxUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                    >
                        View on Stellar Expert →
                    </a>
                </div>
            )}

            <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-gray-600 leading-relaxed">
                    <span className="font-black">Owner Address:</span> {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </p>
            </div>
        </div>
    );
};

export default AdminInitPanel;
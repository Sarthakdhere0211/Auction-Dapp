import React, { useState, useEffect } from 'react';
import { Coins, Loader2, ShieldAlert, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { mintTestTokens, NETWORK_PASSPHRASE, getTokenBalance, checkIsAdmin } from '../contract';
import { signTransaction } from '../wallet';
import { getTxUrl } from '../config/stellar';

interface MintButtonProps {
    walletAddress: string;
    onSuccess?: () => void;
    className?: string;
}

/**
 * A production-ready component to mint test tokens directly from the UI using Freighter.
 * Includes admin detection, multi-stage transaction feedback, and explorer links.
 */
const MintButton: React.FC<MintButtonProps> = ({ walletAddress, onSuccess, className = "" }) => {
    const [status, setStatus] = useState<'idle' | 'preparing' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Detect if the user is an admin on mount or address change
    useEffect(() => {
        if (walletAddress) {
            checkIsAdmin(walletAddress).then(setIsAdmin);
        } else {
            setIsAdmin(null);
        }
    }, [walletAddress]);

    const handleMint = async () => {
        if (!walletAddress) {
            toast.error("Please connect your wallet first");
            return;
        }

        if (isAdmin === false) {
            toast.error("Unauthorized: Only the contract admin can mint tokens.");
            return;
        }

        setStatus('preparing');
        setErrorMessage(null);
        setLastTxHash(null);
        const toastId = toast.loading("Simulating transaction...");

        try {
            // Mint 1000 TOK tokens (7 decimals assumed)
            const amount = 1000; 
            
            const res = await mintTestTokens(walletAddress, amount, async (xdr) => {
                setStatus('signing');
                toast.loading("Awaiting wallet signature...", { id: toastId });
                return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
            });

            if (res.success) {
                setStatus('success');
                setLastTxHash(res.txHash);
                toast.success(`Successfully minted ${amount} TOK!`, { id: toastId });
                console.log(`[Mint] Success! View on Explorer: ${getTxUrl(res.txHash)}`);
                
                if (onSuccess) onSuccess();
                
                // Reset to idle after 5 seconds
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                setStatus('error');
                const isAuthError = res.error?.toLowerCase().includes("unauthorized") || 
                                   res.error?.toLowerCase().includes("error(contract, #4)");
                
                const finalError = isAuthError 
                    ? "Authorization Failed: Only the Admin wallet can execute this." 
                    : (res.error || "Minting failed. Check network status.");
                
                setErrorMessage(finalError);
                toast.error(finalError, { id: toastId });
            }
        } catch (err) {
            setStatus('error');
            const msg = (err as Error).message || "Transaction aborted";
            setErrorMessage(msg);
            toast.error(msg, { id: toastId });
        }
    };

    const getButtonContent = () => {
        if (isAdmin === false) {
            return <><ShieldAlert size={14} className="text-red-500" /> Admin Access Required</>;
        }

        switch (status) {
            case 'preparing':
                return <><Loader2 size={14} className="animate-spin" /> Preparing...</>;
            case 'signing':
                return <><Loader2 size={14} className="animate-spin" /> Awaiting Signature...</>;
            case 'submitting':
                return <><Loader2 size={14} className="animate-spin" /> Submitting to Ledger...</>;
            case 'success':
                return <><CheckCircle2 size={14} className="text-emerald-400" /> Minted Successfully!</>;
            case 'error':
                return <><AlertCircle size={14} className="text-red-500" /> Transaction Failed</>;
            default:
                return <><Coins size={14} className="text-blue-400 group-hover:rotate-12 transition-transform" /> Mint Test Tokens (1000 TOK)</>;
        }
    };

    const isProcessing = ['preparing', 'signing', 'submitting'].includes(status);
    const isDisabled = isProcessing || !walletAddress || isAdmin === false;

    return (
        <div className="space-y-4 w-full group">
            <button
                onClick={handleMint}
                disabled={isDisabled}
                className={`saas-button py-4 w-full text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all relative overflow-hidden ${
                    status === 'error' ? 'border-red-500/50 text-red-400 bg-red-500/5' : ''
                } ${status === 'success' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' : ''} ${
                    isAdmin === false ? 'border-gray-800 text-gray-500 bg-gray-900/50 grayscale' : ''
                } ${isProcessing ? 'opacity-70 cursor-wait' : ''} ${className}`}
            >
                {getButtonContent()}
                {isProcessing && (
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                )}
            </button>
            
            {/* Feedback & Fallbacks */}
            <div className="px-2">
                {isAdmin === false && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                        <p className="text-[9px] text-amber-500/90 font-bold text-center uppercase tracking-tight flex items-center justify-center gap-2">
                            <ShieldCheck size={12} />
                            Demo Account Restricted
                        </p>
                        <p className="text-[8px] text-gray-500 text-center leading-relaxed">
                            Only the contract deployer can mint new tokens. <br/>
                            Please use the admin wallet or request tokens from the team.
                        </p>
                    </div>
                )}

                {status === 'success' && lastTxHash && (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <a 
                            href={getTxUrl(lastTxHash)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors underline decoration-blue-400/30 underline-offset-4"
                        >
                            <ExternalLink size={10} /> View Transaction on StellarExpert
                        </a>
                    </div>
                )}

                {status === 'error' && (
                    <p className="text-[9px] text-red-400/80 font-medium text-center uppercase tracking-tighter animate-in fade-in">
                        {errorMessage || "An error occurred. Check browser console."}
                    </p>
                )}

                {status === 'idle' && isAdmin !== false && (
                    <p className="text-[8px] text-gray-500 text-center uppercase tracking-widest opacity-60 font-medium">
                        Stellar Testnet • 1000 TOK per Mint
                    </p>
                )}
            </div>
        </div>
    );
};

export default MintButton;

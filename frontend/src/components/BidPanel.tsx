import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, XCircle, Loader2, ShieldCheck, Wallet, AlertTriangle, Clock, Zap, Award, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { Auction } from '../types';
import { ContractAuctionState } from '../contract';
import { AuctionStatus } from '../utils/auctionStatus';
import AuctionStatusBadge from './AuctionStatusBadge';
import CountdownTimer from './CountdownTimer';
import { getTxUrl } from '../config/stellar';
import { NETWORK_PASSPHRASE, TOKEN_ID, CONTRACT_ID } from '../contract';
import { useAuction } from '../hooks/useAuction';
import { useToken } from '../hooks/useToken';
import { useBid } from '../hooks/useBid';
import { signTransaction } from '../wallet';

interface BidPanelProps {
    auction: Auction;
    walletAddress: string | null;
}

const BidPanel: React.FC<BidPanelProps> = ({
    auction: initialAuction,
    walletAddress,
}) => {
    const { status, auctionState, refresh, purchaseNow } = useAuction(walletAddress);
    const { balance, allowance, refresh: refreshToken, approve, getFaucet } = useToken(walletAddress);
    
    const { handlePlaceBid, loading: isPlacingBid } = useBid(walletAddress, async (xdr) => {
        return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
    });

    const [bidAmount, setBidAmount] = useState('');
    const [nowSeconds, setNowSeconds] = useState<number>(Math.floor(Date.now() / 1000));
    
    // Stable fallback end time for demo (24 hours from first mount if not in contract)
    const [demoEndTime] = useState(() => Math.floor(Date.now() / 1000) + 86400);

    const [isBuyingNow, setIsBuyingNow] = useState(false);
    const [isFaucetLoading, setIsFaucetLoading] = useState(false);

    // Dynamic auction data from contract state
    const currentHighestBid = auctionState?.highest_bid ?? initialAuction.highestBid ?? 0;
    
    // Increment logic: Minimum bid is currentHighestBid + 10 TOK (or starting_price if no bids)
    const bidIncrement = 10;
    const minRequired = currentHighestBid > 0 
        ? currentHighestBid + bidIncrement 
        : (auctionState?.starting_price ?? 200); // Updated scale: 200 TOK starting price
        
    // Sanitize endTime: if it's in milliseconds (e.g. 1711382400000), convert to seconds
    const sanitizeTime = (ts: number) => ts > 10000000000 ? Math.floor(ts / 1000) : ts;
    const contractEndTime = auctionState?.end_time ? sanitizeTime(auctionState.end_time) : 0;
    const initialEndTime = initialAuction.endTime ? sanitizeTime(initialAuction.endTime) : 0;

    const rawEffectiveEndTime = contractEndTime > 0 
        ? contractEndTime 
        : (initialEndTime > nowSeconds ? initialEndTime : demoEndTime);

    // Final Sanity Check: If the duration is more than 7 days (604800s), it's likely a data error.
    // Cap it at 24 hours (86400s) for a clean demo UI.
    const duration = rawEffectiveEndTime - nowSeconds;
    const effectiveEndTime = duration > 604800 ? (nowSeconds + 86400) : rawEffectiveEndTime;

    const isOwner = walletAddress && auctionState?.owner === walletAddress;
    const isEnded = auctionState?.is_ended || (effectiveEndTime <= nowSeconds);
    
    // Validation for button state
    const bidAmountNum = parseFloat(bidAmount);
    const isInvalidBid = isNaN(bidAmountNum) || bidAmountNum < minRequired;
    const isInsufficientBalance = parseFloat(balance) < (bidAmountNum || minRequired);

    const handleBidMinimum = () => {
        setBidAmount(minRequired.toString());
    };

    useEffect(() => {
        if (auctionState) {
            console.log("[BidPanel] Current Auction State:", auctionState);
            console.log("[BidPanel] Wallet Balance:", balance);
            console.log("[BidPanel] Minimum Required:", minRequired);
            console.log("[BidPanel] Effective End Time:", effectiveEndTime);
        }
    }, [auctionState, balance, minRequired, effectiveEndTime]);

    useEffect(() => {
        const interval = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleFaucet = async () => {
        setIsFaucetLoading(true);
        const tid = toast.loading("Requesting demo tokens...");
        try {
            const res = await getFaucet();
            if (res.success) {
                toast.success("Received 1000 TOK!", { id: tid });
                refreshToken();
            } else {
                toast.error(res.error || "Faucet failed", { id: tid });
            }
        } finally {
            setIsFaucetLoading(false);
        }
    };

    const handleBidFlow = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(bidAmount);

        if (isNaN(amount) || amount < minRequired) {
            toast.error(`Minimum bid is ${minRequired} TOK`);
            return;
        }

        console.log(`[BidUI] Placing bid: ${amount} TOK for wallet: ${walletAddress}`);
        await handlePlaceBid(amount);
        
        setBidAmount('');
        await Promise.all([refresh(), refreshToken()]);
    };

    const handleBuyNowFlow = async () => {
        if (!walletAddress || !auctionState?.buy_now_price) return;
        
        if (parseFloat(balance) < auctionState.buy_now_price) {
            toast.error("Insufficient balance for Buy Now");
            return;
        }

        if (allowance < auctionState.buy_now_price) {
            const tid = toast.loading("Approving tokens for purchase...");
            const appRes = await approve(auctionState.buy_now_price + 100);
            if (!appRes.success) {
                toast.error("Approval failed", { id: tid });
                return;
            }
            toast.success("Approved!", { id: tid });
            await refreshToken();
        }

        setIsBuyingNow(true);
        try {
            const res = await purchaseNow();
            if (res.success) {
                toast.success("Auction won via Buy Now!");
                refresh();
                refreshToken();
            } else {
                toast.error(res.error || "Buy Now failed");
            }
        } finally {
            setIsBuyingNow(false);
        }
    };

    if (!walletAddress) {
        return (
            <div className="saas-card p-10 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto shadow-inner">
                    <Wallet size={32} className="text-blue-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">Connect Wallet</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                        Join the auction by connecting your Freighter wallet.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="saas-card p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 overflow-hidden max-w-full">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 md:pb-6 gap-4">
                <div className="space-y-1">
                    <h3 className="text-lg md:text-xl font-black text-white tracking-tight">Bid Settlement</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] md:text-[10px] text-blue-500 font-black uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Auction Active
                        </span>
                    </div>
                </div>
                <div className="flex items-center sm:justify-end">
                    {status !== 'loading' && status !== 'error' && (
                        <AuctionStatusBadge status={status as AuctionStatus} />
                    )}
                </div>
            </div>

            {/* Auction Info Grid - Adjusted grid for sidebar (lg:grid-cols-1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-950 border border-white/5 space-y-1">
                    <p className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest">Current Bid</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-black text-white whitespace-nowrap">
                        {currentHighestBid.toLocaleString()} <span className="text-xs opacity-50 font-medium">TOK</span>
                    </p>
                    {auctionState?.highest_bidder ? (
                        <p className="text-[9px] text-emerald-400 font-bold uppercase truncate flex items-center gap-1">
                            <ShieldCheck size={10} className="shrink-0" /> {auctionState.highest_bidder.slice(0, 8)}...{auctionState.highest_bidder.slice(-8)}
                        </p>
                    ) : (
                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">No bids yet</p>
                    )}
                </div>

                <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-950 border ${parseFloat(balance) < minRequired ? 'border-amber-500/20' : 'border-white/5'} space-y-1`}>
                    <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                            <p className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest">Your Funds</p>
                            <p className={`text-lg sm:text-2xl font-black whitespace-nowrap ${parseFloat(balance) < minRequired ? 'text-amber-500' : 'text-white'}`}>
                                {parseFloat(balance).toFixed(2)} <span className="text-xs opacity-50 font-medium">TOK</span>
                            </p>
                        </div>
                        <button 
                            onClick={handleFaucet}
                            disabled={isFaucetLoading}
                            className="p-2 sm:p-2.5 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition-all border border-blue-500/10 shadow-lg shadow-blue-500/5 shrink-0"
                            title="Get Demo Tokens"
                        >
                            <Coins size={16} className={isFaucetLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Status / Minimum Bid Helper - Adjusted grid for sidebar (lg:grid-cols-1) */}
            {!isEnded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-xl bg-blue-600/5 border border-blue-500/10 flex flex-col items-center justify-center gap-1 text-center min-w-0">
                        <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Ends In</p>
                        <div className="w-full overflow-hidden">
                            <CountdownTimer
                                endTime={effectiveEndTime}
                                currentTimeSeconds={nowSeconds}
                                size="md"
                                showIcon={false}
                            />
                        </div>
                    </div>
                    <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center justify-center gap-1 text-center min-w-0">
                        <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Next Bid From</p>
                        <p className="text-base sm:text-lg font-black text-white whitespace-nowrap">{minRequired} <span className="text-[10px] opacity-50">TOK</span></p>
                    </div>
                </div>
            )}

            {isEnded && (
                <div className="p-5 sm:p-6 rounded-xl sm:rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center">
                    <p className="text-amber-500 font-black uppercase tracking-widest text-xs sm:text-sm">Auction Ended</p>
                </div>
            )}

            {/* Bidding Actions */}
            {!isEnded && !isOwner && (
                <div className="space-y-5 sm:space-y-6 pt-2">
                    <form onSubmit={handleBidFlow} className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end px-1 gap-2">
                                <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Place Your Bid</label>
                                <button 
                                    type="button"
                                    onClick={handleBidMinimum}
                                    className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors flex items-center gap-1 w-fit"
                                >
                                    <Zap size={10} /> Bid Minimum ({minRequired} TOK)
                                </button>
                            </div>
                            <div className="relative group">
                                <input
                                    type="number"
                                    min={minRequired}
                                    step="0.01"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    placeholder={`Enter ${minRequired} or more TOK`}
                                    className="saas-input w-full p-4 sm:p-5 pl-4 sm:pl-6 text-lg sm:text-xl font-black border-2 border-white/5 focus:border-blue-500/50 transition-all text-center"
                                    disabled={isPlacingBid}
                                />
                                <span className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-gray-500 font-black text-[9px] sm:text-[10px] uppercase tracking-widest pointer-events-none">TOK</span>
                            </div>
                            
                            {isInsufficientBalance && (
                                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest text-center">
                                    <AlertTriangle size={12} className="shrink-0" /> Insufficient Balance - Use Faucet
                                </div>
                            )}
                            
                            {!isInsufficientBalance && !isInvalidBid && bidAmountNum > 0 && (
                                <div className="flex items-center justify-center gap-2 px-3 py-1 text-blue-400 text-[9px] font-black uppercase tracking-widest text-center">
                                    <Zap size={10} className="shrink-0" /> Increase bid by {(bidAmountNum - currentHighestBid).toFixed(2)} TOK
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isPlacingBid || isInvalidBid || isInsufficientBalance}
                            className="saas-button w-full py-4 sm:py-5 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isPlacingBid ? <Loader2 size={16} className="animate-spin" /> : (
                                    <>
                                        <Zap size={16} className="group-hover:scale-110 transition-transform shrink-0" />
                                        <span className="truncate">
                                            {isInsufficientBalance ? 'Insufficient Balance' : 
                                             isInvalidBid && bidAmount ? `Min ${minRequired} Required` : 'Place Your Bid'}
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    {auctionState?.buy_now_price && (
                        <div className="relative py-1 md:py-2">
                            <div className="absolute inset-0 flex items-center px-4 sm:px-8"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center text-[9px] sm:text-[10px] uppercase font-black text-gray-600"><span className="bg-gray-900 px-3 md:px-4">OR</span></div>
                        </div>
                    )}

                    {auctionState?.buy_now_price && (
                        <button
                            onClick={handleBuyNowFlow}
                            disabled={isBuyingNow}
                            className="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed group px-4"
                        >
                            <Award size={18} className="group-hover:rotate-12 transition-transform shrink-0" />
                            <span className="truncate">
                                {isBuyingNow ? <Loader2 size={16} className="animate-spin" /> : `Buy Instant for ${auctionState.buy_now_price} TOK`}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {/* Winner Badge for Ended Auction */}
            {isEnded && auctionState?.highest_bidder && (
                <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 text-center space-y-4 sm:space-y-5 shadow-2xl">
                    <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto border border-emerald-500/30">
                        <Award size={24} className="text-emerald-500 sm:size-[28px]" />
                    </div>
                    <div className="space-y-2 overflow-hidden">
                        <h4 className="text-sm sm:text-base md:text-lg font-black text-white uppercase tracking-tighter">Auction Winner</h4>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 max-w-full">
                            <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                            <p className="text-[8px] sm:text-[9px] text-emerald-400 font-bold uppercase tracking-widest truncate">
                                {auctionState.highest_bidder.slice(0, 10)}...{auctionState.highest_bidder.slice(-10)}
                            </p>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-black text-white pt-2 truncate">{currentHighestBid.toLocaleString()} <span className="text-xs sm:text-sm font-medium opacity-50">TOK</span></p>
                    </div>
                </div>
            )}

            {/* Security Footer */}
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-6 md:pt-8 border-t border-white/5 opacity-50 text-center sm:text-left">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gray-950 border border-white/5 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} className="text-gray-400 md:size-[18px]" />
                </div>
                <p className="text-[9px] md:text-[10px] text-gray-500 font-bold leading-relaxed uppercase tracking-tight">
                    Secured by Soroban. Bids require 2-step confirmation: Token Allowance & Contract Submission.
                </p>
            </div>
        </div>
    );
};

export default BidPanel;

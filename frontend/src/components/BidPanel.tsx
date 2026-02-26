import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, XCircle, Loader2, ShieldCheck, Wallet, AlertTriangle } from 'lucide-react';
import { Auction } from '../types';
import { ContractAuctionState } from '../contract';
import { AuctionStatus } from '../utils/auctionStatus';
import AuctionStatusBadge from './AuctionStatusBadge';
import CountdownTimer from './CountdownTimer';
import { getTxUrl } from '../config/stellar';
import { setAuctionEndTime } from '../contract';
import { signTransaction } from '../wallet';

interface BidPanelProps {
    auction: Auction;
    walletAddress: string | null;
    onPlaceBid: (amount: number) => Promise<void>;
    isPlacingBid: boolean;
    txHash: string | null;
    txError: string | null;
    auctionStatus: AuctionStatus | 'loading' | 'error';
    contractState: ContractAuctionState | null;
}

const BidPanel: React.FC<BidPanelProps> = ({
    auction,
    walletAddress,
    onPlaceBid,
    isPlacingBid,
    txHash,
    txError,
    auctionStatus,
    contractState,
}) => {
    const [bidAmount, setBidAmount] = useState('');
    const [validationError, setValidationError] = useState('');
    const [nowSeconds, setNowSeconds] = useState<number>(Math.floor(Date.now() / 1000));

    // Determine if bidding is allowed
    const walletConnected = !!walletAddress;
    const isInitialized = contractState?.is_initialized === true;
    const isLive = auctionStatus === AuctionStatus.LIVE;
    const currentHighestBid = contractState?.highest_bid || auction.highestBid;
    const minRequired = Math.max(auction.minBid, currentHighestBid + 1);
    const isOwner = walletAddress && contractState?.owner === walletAddress;
    const canRestart = isOwner && auctionStatus === AuctionStatus.ENDED && !contractState?.highest_bidder;
    const [isRestarting, setIsRestarting] = useState(false);
    const [restartError, setRestartError] = useState<string | null>(null);
    const [restartSuccess, setRestartSuccess] = useState<string | null>(null);
    const [durationMinutes, setDurationMinutes] = useState<number>(120);

    const canBidNow = walletConnected;
    const disabledReason = !walletConnected
        ? 'Wallet not connected'
        : undefined;

    console.log({
        walletConnected,
        auctionStatus,
        contractState,
        auctionData: auction,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');

        if (!canBidNow) {
            setValidationError(disabledReason || 'Cannot place bid');
            return;
        }

        const amount = parseFloat(bidAmount);
        if (isNaN(amount) || amount <= 0) {
            setValidationError('Enter a valid bid amount');
            return;
        }
        if (amount <= currentHighestBid) {
            setValidationError(`Bid must be higher than current bid (${currentHighestBid} XLM)`);
            return;
        }
        if (amount < minRequired) {
            setValidationError(`Minimum bid required is ${minRequired} XLM`);
            return;
        }

        await onPlaceBid(amount);
        if (!txError) setBidAmount('');
    };

    useEffect(() => {
        const interval = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(interval);
    }, [auctionStatus, contractState?.end_time]);

    if (!walletAddress) {
        return (
            <div className="saas-card p-10 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto">
                    <Wallet size={32} className="text-blue-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">Wallet Connection</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Connect your Freighter wallet to participate in this live auction and place bids.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="saas-card p-8 space-y-8">
            {/* Header with Status Badge */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Bid Settlement</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">
                        Auction ID: #{auction.id}
                    </p>
                </div>
                {auctionStatus !== 'loading' && auctionStatus !== 'error' && (
                    <AuctionStatusBadge status={auctionStatus as AuctionStatus} />
                )}
            </div>
            {/* transaction feedback section */}
            {(isPlacingBid || txHash || txError) && (
                <div className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800 space-y-2">
                    {isPlacingBid && (
                        <p className="flex items-center gap-2 text-blue-300">
                            <Loader2 className="animate-spin w-4 h-4" />
                            Transaction pending…
                        </p>
                    )}
                    {!isPlacingBid && txHash && !txError && (
                        <p className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            Transaction confirmed
                            <a
                                href={getTxUrl(txHash)}
                                target="_blank"
                                rel="noreferrer"
                                className="underline ml-1"
                            >
                                view on explorer
                            </a>
                        </p>
                    )}
                    {!isPlacingBid && txError && (
                        <p className="flex items-center gap-2 text-red-400">
                            <XCircle className="w-4 h-4" />
                            {txError}
                        </p>
                    )}
                </div>
            )}
            {/* Countdown Timer (only when LIVE) */}
            {isLive && contractState?.end_time && (
                <div className="p-6 rounded-2xl bg-gray-950 border border-gray-800">
                    <CountdownTimer
                        endTime={contractState.end_time}
                        currentTimeSeconds={nowSeconds}
                        size="md"
                        showIcon={true}
                    />
                </div>
            )}

            {/* No explicit initialization UI - direct bidding available */}

            {/* Current Price Display */}
            <div className="p-6 rounded-2xl bg-gray-950 border border-gray-800 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                            Current Highest
                        </p>
                        <p className="text-3xl font-black text-white">
                            {currentHighestBid > 0 ? currentHighestBid.toLocaleString() : '—'}
                            <span className="text-xs font-normal text-gray-500 ml-1">XLM</span>
                        </p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
                    <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-3">
                        <p className="font-black text-gray-500 uppercase tracking-widest">Initialized</p>
                        <p className="font-black text-white">{isInitialized ? 'true' : 'false'}</p>
                    </div>
                    <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-3">
                        <p className="font-black text-gray-500 uppercase tracking-widest">End Time</p>
                        <p className="font-black text-white">{contractState?.end_time ?? '—'}</p>
                    </div>
                    <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-3">
                        <p className="font-black text-gray-500 uppercase tracking-widest">Ledger Time</p>
                        <p className="font-black text-white">{nowSeconds}</p>
                    </div>
                    <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-3">
                        <p className="font-black text-gray-500 uppercase tracking-widest">Highest Bid</p>
                        <p className="font-black text-white">{currentHighestBid ?? '—'} XLM</p>
                    </div>
                    <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-3">
                        <p className="font-black text-gray-500 uppercase tracking-widest">Status</p>
                        <p className="font-black text-white">{auctionStatus}</p>
                    </div>
                </div>
                <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Min. Increment
                    </p>
                    <p className="text-sm font-bold text-white">
                        +1.00 <span className="text-[10px] text-gray-500">XLM</span>
                    </p>
                </div>
                {contractState?.highest_bidder && (
                    <div className="pt-4 border-t border-gray-800">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                            Highest Bidder
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                            {contractState.highest_bidder.slice(0, 8)}...
                            {contractState.highest_bidder.slice(-8)}
                        </p>
                    </div>
                )}
            </div>

            {/* Bid Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                            Your Offer
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min={minRequired}
                                step="0.01"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder={`Min ${minRequired} XLM`}
                                className="saas-input w-full p-4 pl-5 text-lg font-black"
                                disabled={isPlacingBid || !canBidNow}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs uppercase tracking-widest">
                                XLM
                            </span>
                        </div>
                        {validationError && (
                            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <XCircle size={12} /> {validationError}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isPlacingBid || !bidAmount || !canBidNow}
                        className="saas-button w-full py-5 text-base bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPlacingBid ? (
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 size={20} className="animate-spin" />
                                <span className="uppercase tracking-widest font-black text-sm">
                                    Processing...
                                </span>
                            </div>
                        ) : (
                            <span className="uppercase tracking-widest font-black text-sm">
                                Place Secure Bid
                            </span>
                        )}
                    </button>

                    <p className="text-[10px] text-gray-600 text-center font-bold uppercase tracking-widest">
                        Network fee: ~0.01 XLM
                    </p>
                </form>

            {/* Disabled reason banner */}
            {!isLive && (
                <div className="p-6 rounded-2xl bg-gray-950 border border-gray-800 text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center mx-auto">
                        {auctionStatus === AuctionStatus.NOT_INITIALIZED ? (
                            <AlertTriangle size={20} className="text-amber-500" />
                        ) : (
                            <XCircle size={20} className="text-red-500" />
                        )}
                    </div>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        {disabledReason || 'Bidding Not Available'}
                    </h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase">
                        {auctionStatus === AuctionStatus.NOT_INITIALIZED
                            ? 'Contract owner must initialize the auction first'
                            : auctionStatus === AuctionStatus.ENDED
                            ? 'This auction has ended and settled'
                            : 'Bidding is currently unavailable'}
                    </p>

                    {/* Initialization removed per simplified flow */}

                    {canRestart && (
                        <div className="pt-3">
                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    value={durationMinutes}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value, 10);
                                        setDurationMinutes(Number.isFinite(v) ? v : 120);
                                    }}
                                    className="saas-input w-24 text-[10px] font-black"
                                />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    minutes
                                </span>
                            </div>
                            <button
                                disabled={isRestarting}
                                onClick={async () => {
                                    setRestartError(null);
                                    setRestartSuccess(null);
                                    setIsRestarting(true);
                                    try {
                                        const result = await setAuctionEndTime(walletAddress!, durationMinutes, async (xdr) => {
                                            return await signTransaction(xdr, 'Test SDF Network ; September 2015', 'freighter');
                                        });
                                        if (result.success) {
                                            setRestartSuccess(`Started. Tx: ${result.txHash}`);
                                        } else {
                                            setRestartError(result.error || 'Failed to start auction');
                                        }
                                    } catch (e) {
                                        setRestartError((e as Error).message);
                                    } finally {
                                        setIsRestarting(false);
                                    }
                                }}
                                className="saas-button mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isRestarting ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" /> Starting…
                                    </>
                                ) : (
                                    <>Start Auction Now ({durationMinutes}m)</>
                                )}
                            </button>
                            {restartSuccess && (
                                <p className="text-emerald-500 text-[10px] font-mono mt-2 break-all">
                                    {restartSuccess}
                                </p>
                            )}
                            {restartError && (
                                <p className="text-red-500 text-[10px] font-mono mt-2 break-all">
                                    {restartError}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Status Messages */}
            <div className="space-y-4">
                {txHash && (
                    <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                                    Confirmed on Ledger
                                </span>
                            </div>
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
                            <ExternalLink size={12} /> View on Explorer
                        </a>
                    </div>
                )}

                {txError && (
                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-red-500">
                            <XCircle size={14} />
                            <span className="font-black text-[10px] uppercase tracking-widest">
                                Transaction Failed
                            </span>
                        </div>
                        <p className="text-xs text-red-400/80 font-medium leading-relaxed">{txError}</p>
                    </div>
                )}
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-4 pt-6 border-t border-gray-800">
                <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-gray-500" />
                </div>
                <p className="text-[10px] text-gray-500 font-bold leading-relaxed uppercase tracking-tight">
                    Secured by Soroban. Bids are locked in escrow and returned if outbid.
                </p>
            </div>
        </div>
    );
};

export default BidPanel;

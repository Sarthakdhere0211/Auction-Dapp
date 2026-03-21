import React from 'react';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AuctionStatus, getStatusInfo } from '../utils/auctionStatus';

interface AuctionStatusBannerProps {
    status: AuctionStatus | 'loading' | 'error';
    error?: string | null;
}

const AuctionStatusBanner: React.FC<AuctionStatusBannerProps> = ({ status, error }) => {
    // Loading state
    if (status === 'loading') {
        return (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                    <Loader2 size={20} className="text-blue-500 animate-spin" />
                    <div>
                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-wider">
                            Loading Auction State
                        </p>
                        <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-tight">
                            Querying Soroban contract...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <XCircle className="text-red-500" size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] font-black text-red-500 uppercase tracking-wider">
                            Error Loading Auction
                        </p>
                        {error && (
                            <p className="text-[10px] text-red-400/80 font-bold tracking-tight mt-1">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Get status info for auction states
    const info = getStatusInfo(status as AuctionStatus);

    // Render based on status
    if (status === AuctionStatus.NOT_INITIALIZED) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Clock className="text-emerald-500" size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-emerald-500 uppercase tracking-wider">
                            Ready for Bids
                        </p>
                        <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-tight">
                            Enter your bid below to start the auction — no setup required
                        </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>
        );
    }

    if (status === AuctionStatus.LIVE) {
        return (
            <div className={`${info.bgColor} border ${info.borderColor} rounded-xl p-4`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${info.bgColor} flex items-center justify-center`}>
                        <Clock className={info.textColor} size={18} />
                    </div>
                    <div className="flex-1">
                        <p className={`text-[11px] font-black ${info.textColor} uppercase tracking-wider`}>
                            Auction Live
                        </p>
                        <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-tight">
                            Place your bids now • Real-time on-chain bidding
                        </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>
        );
    }

    if (status === AuctionStatus.ENDED) {
        return (
            <div className={`${info.bgColor} border ${info.borderColor} rounded-xl p-4`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${info.bgColor} flex items-center justify-center`}>
                        <Clock className={info.textColor} size={18} />
                    </div>
                    <div>
                        <p className={`text-[11px] font-black ${info.textColor} uppercase tracking-wider`}>
                            Time Ended — Place a Bid to Reopen
                        </p>
                        <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-tight">
                            Your bid will be accepted and the auction will extend by 1 hour automatically
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default AuctionStatusBanner;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, Gavel, ShieldCheck, Zap } from 'lucide-react';
import { Auction } from '../types';
import Countdown from './Countdown';

interface AuctionCardProps {
    auction: Auction;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'Digital Art': Zap,
    'Real Estate': TrendingUp,
    'Collectibles': Gavel,
    'Luxury Goods': ShieldCheck,
    'Electronics': Zap,
};

const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
    const navigate = useNavigate();
    const [isLive, setIsLive] = useState(!auction.isEnded);

    useEffect(() => {
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            setIsLive(!auction.isEnded && auction.endTime > now);
        };
        const timeout = setTimeout(update, 0);
        const interval = setInterval(update, 5000);
        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [auction.endTime, auction.isEnded]);
    const CategoryIcon = CATEGORY_ICONS[auction.category] || Zap;

    return (
        <div
            className="saas-card group cursor-pointer flex flex-col h-full hover:border-blue-500/30 transition-all duration-500 p-4"
            onClick={() => navigate(`/auction/${auction.id}`)}
        >
            {/* Image Section */}
            <div className="relative h-56 rounded-2xl overflow-hidden shrink-0 mb-4">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent z-10" />
                <img
                    src={auction.imageUrl}
                    alt={auction.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${auction.id}/600/400`;
                    }}
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-gray-950/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                        <CategoryIcon size={12} className="text-blue-400" />
                        <span className="text-[10px] text-white font-bold uppercase tracking-widest">{auction.category}</span>
                    </div>
                </div>

                <div className="absolute top-3 right-3 z-20">
                    <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${isLive
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/20 text-red-400 border-red-500/20'
                        }`}>
                        {isLive ? (
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE
                            </div>
                        ) : 'Ended'}
                    </div>
                </div>

                {/* Price Overlay */}
                <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-end">
                    <div className="p-3 rounded-xl bg-gray-950/40 backdrop-blur-lg border border-white/5">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">
                            {isLive ? 'Current Bid' : 'Sold For'}
                        </p>
                        <p className="text-lg font-black text-white leading-none">
                            {auction.highestBid.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">XLM</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-grow flex flex-col px-1 pb-1">
                <h3 className="text-white font-bold text-lg leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors mb-4">
                    {auction.title}
                </h3>

                <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-gray-400" />
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                {isLive ? 'Closing in' : 'Status'}
                            </span>
                        </div>
                        <div className="text-xs font-black text-white uppercase tracking-tight">
                            <Countdown endTime={auction.endTime} isEnded={auction.isEnded} />
                        </div>
                    </div>

                    <button
                        className="saas-button py-3 text-[10px] uppercase tracking-[0.2em] font-black"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/auction/${auction.id}`);
                        }}
                    >
                        {isLive ? 'Place Your Bid' : 'View Summary'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuctionCard;

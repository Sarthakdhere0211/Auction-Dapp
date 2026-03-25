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
            onClick={() => navigate(`/auction/${auction.id}`)}
            className="group saas-card !p-0 overflow-hidden cursor-pointer hover:border-blue-500/40 transition-all duration-500 shadow-2xl hover:shadow-blue-500/10 flex flex-col h-full"
        >
            {/* Image Section */}
            <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent z-10" />
                <img 
                    src={auction.imageUrl} 
                    alt={auction.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${auction.id}/800/600`;
                    }}
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-col gap-2">
                    <div className="px-2 py-1 sm:px-3 sm:py-1 rounded-lg bg-gray-950/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                        <CategoryIcon size={10} className="sm:size-12 text-blue-400" />
                        <span className="text-[8px] sm:text-[9px] text-white font-black uppercase tracking-widest">{auction.category}</span>
                    </div>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
                    <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${isLive
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/20 text-red-400 border-red-500/20'
                        }`}>
                        {isLive ? (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE
                            </div>
                        ) : 'Ended'}
                    </div>
                </div>

                {/* Price Overlay */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-20 flex justify-between items-end">
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-950/40 backdrop-blur-lg border border-white/5">
                        <p className="text-[7px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">
                            {isLive ? 'Current Bid' : 'Sold For'}
                        </p>
                        <p className="text-sm sm:text-lg font-black text-white leading-none">
                            {auction.highestBid.toLocaleString()} <span className="text-[7px] sm:text-[10px] font-normal text-gray-400">XLM</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-3 sm:p-6 flex flex-col flex-grow space-y-3 sm:space-y-6">
                <div className="space-y-1 flex-grow">
                    <h3 className="text-sm sm:text-lg font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1 tracking-tight">
                        {auction.title}
                    </h3>
                </div>

                <div className="mt-auto space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Clock size={10} className="sm:size-14 text-gray-400" />
                            <span className="text-[7px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                {isLive ? 'Closing in' : 'Status'}
                            </span>
                        </div>
                        <div className="text-[9px] sm:text-xs font-black text-white uppercase tracking-tight">
                            <Countdown endTime={auction.endTime} isEnded={auction.isEnded} />
                        </div>
                    </div>

                    <button
                        className="saas-button py-2.5 sm:py-3 text-[7px] sm:text-[10px] uppercase tracking-[0.2em] font-black w-full rounded-lg md:rounded-xl"
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

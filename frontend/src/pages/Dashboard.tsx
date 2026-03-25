import React, { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Zap, Search, SlidersHorizontal } from 'lucide-react';
import { Auction, AuctionCategory, WalletState } from '../types';
import { getAllAuctions, startBidEventPolling, stopBidEventPolling } from '../contract';
import AuctionCard from '../components/AuctionCard';
import { useAuctionStore } from '../store/useAuctionStore';

// categories list not used in current UI

interface DashboardProps {
    wallet: WalletState;
}

const SkeletonCard = () => (
    <div className="saas-card p-4 animate-pulse">
        <div className="w-full h-48 rounded-2xl bg-gray-800/50 mb-4" />
        <div className="h-4 bg-gray-800/50 rounded-full w-3/4 mb-3" />
        <div className="h-4 bg-gray-800/50 rounded-full w-1/2 mb-6" />
        <div className="flex justify-between items-center">
            <div className="h-10 bg-gray-800/50 rounded-xl w-24" />
            <div className="h-10 bg-gray-800/50 rounded-xl w-24" />
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ wallet: _wallet }) => {

    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [filtered, setFiltered] = useState<Auction[]>([]);
    const [category] = useState<AuctionCategory>('All');
    const [searchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [liveCount, setLiveCount] = useState(0);

    const setAuctionsStore = useAuctionStore(s => s.setAuctions);

    void _wallet;
    const loadAuctions = useCallback(async () => {
        try {
            const data = await getAllAuctions();
            setAuctions(data);
            setAuctionsStore(data);
        } catch (err) {
            console.error('Failed to load auctions', err);
        } finally {
            setLoading(false);
        }
    }, [setAuctionsStore]);

    useEffect(() => {
        loadAuctions();

        const interval = setInterval(loadAuctions, 4000);

        startBidEventPolling(() => loadAuctions());

        return () => {
            clearInterval(interval);
            stopBidEventPolling();
        };
    }, [loadAuctions]);

    useEffect(() => {
        let result = auctions;

        if (category !== 'All') {
            result = result.filter(a => a.category === category);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q)
            );
        }

        setFiltered(result);

    }, [auctions, category, searchQuery]);

    useEffect(() => {

        const update = () => {
            const now = Math.floor(Date.now() / 1000);

            setLiveCount(
                auctions.filter(a => !a.isEnded && a.endTime > now).length
            );
        };

        const timeout = setTimeout(update, 0);
        const interval = setInterval(update, 5000);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };

    }, [auctions]);

    return (
        <div className="space-y-6 md:space-y-12 max-w-screen-xl mx-auto px-4 sm:px-6">
            {/* Hero Banner */}
            <div className="relative rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-gray-950 border border-white/5 shadow-3xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent opacity-50" />
                <div className="relative p-6 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                    <div className="space-y-4 md:space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-2xl mx-auto md:mx-0">
                            <Zap size={14} className="animate-pulse" />
                            Live Market Protocol
                        </div>
                        <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter leading-tight md:leading-none">
                            Discover Digital <br className="hidden md:block" />
                            <span className="text-blue-500">Asset Auctions</span>
                        </h1>
                        <p className="text-gray-500 text-xs md:text-lg max-w-md leading-relaxed font-medium mx-auto md:mx-0">
                            Bid on exclusive digital assets secured by the Soroban smart contract network.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 w-full md:w-auto">
                        {[
                            { label: 'Volume', val: '1.2M', sub: 'XLM' },
                            { label: 'Active', val: '48', sub: 'Lots' },
                        ].map(stat => (
                            <div key={stat.label} className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-inner text-center md:text-left min-w-[100px] md:min-w-[140px]">
                                <p className="text-[8px] md:text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 md:mb-2">{stat.label}</p>
                                <p className="text-xl md:text-4xl font-black text-white tracking-tighter">{stat.val}</p>
                                <p className="text-[8px] md:text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5 md:mt-1">{stat.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 md:gap-6 px-1">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar scroll-smooth">
                    {['All Assets', 'Digital Art', 'Protocols', 'Domain'].map((cat, i) => (
                        <button
                            key={cat}
                            className={`px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${i === 0
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                                    : 'bg-gray-950 text-gray-500 hover:text-white border border-white/5'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input
                            type="text"
                            placeholder="Search protocol..."
                            className="bg-gray-950 border border-white/5 rounded-lg md:rounded-xl pl-10 md:pl-12 pr-4 md:pr-6 py-2.5 md:py-3 text-[10px] md:text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all w-full sm:w-64 shadow-inner"
                        />
                    </div>
                    <button className="p-2.5 md:p-3 rounded-lg md:rounded-xl bg-gray-950 border border-white/5 text-gray-500 hover:text-white transition-all shadow-inner">
                        <SlidersHorizontal size={16} md:size={18} />
                    </button>
                </div>
            </div>

            {/* Auction Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                {loading ? (
                    Array(8).fill(0).map((_, i) => (
                        <div key={i} className="saas-card h-[420px] animate-pulse bg-gray-900/50 border-white/5" />
                    ))
                ) : (
                    filtered.map(auction => (
                        <AuctionCard key={auction.id} auction={auction} />
                    ))
                )}
            </div>
        </div>
    );
};

export default Dashboard;

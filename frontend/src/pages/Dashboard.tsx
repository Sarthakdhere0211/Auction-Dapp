import React, { useEffect, useState, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
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
        <div className="space-y-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">

                <div className="space-y-4">
                    <div className="flex items-center gap-3">

                        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                            <TrendingUp className="text-blue-500" size={24} />
                        </div>

                        <div>
                            <h2 className="text-4xl font-black tracking-tight text-white leading-none">
                                Marketplace
                            </h2>

                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">
                                Stellar Ledger Protocol v21
                            </p>
                        </div>

                    </div>
                </div>

                <div className="flex items-center gap-4">

                    <div className="px-4 py-2.5 rounded-xl bg-gray-900/50 border border-white/5 backdrop-blur-md flex items-center gap-3">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            42k+ Bidders
                        </span>
                    </div>

                    <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {liveCount} Live Pools
                        </span>
                    </div>

                </div>

            </div>

            {/* Auction Grid */}

            {loading ? (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>

            ) : filtered.length === 0 ? (

                <div className="saas-card text-center py-32">
                    No auctions found
                </div>

            ) : (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                    {filtered.map(auction => (
                        <AuctionCard key={auction.id} auction={auction} />
                    ))}
                </div>

            )}

        </div>
    );
};

export default Dashboard;

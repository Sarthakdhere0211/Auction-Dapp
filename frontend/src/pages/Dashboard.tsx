import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, TrendingUp, Zap, BarChart, Activity, ArrowUpRight } from 'lucide-react';
import { Auction, AuctionCategory, WalletState } from '../types';
import { getAllAuctions, startBidEventPolling, stopBidEventPolling, createAuction } from '../contract';
import AuctionCard from '../components/AuctionCard';
import CreateAuctionDialog from '../components/CreateAuctionDialog';
import toast from 'react-hot-toast';
import { signTransaction } from '../wallet';
import { useAuctionStore } from '../store/useAuctionStore';

const CATEGORIES: AuctionCategory[] = ['All', 'Digital Art', 'Real Estate', 'Collectibles', 'Luxury Goods', 'Electronics'];

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

const Dashboard: React.FC<DashboardProps> = ({ wallet }) => {
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [filtered, setFiltered] = useState<Auction[]>([]);
    const [category, setCategory] = useState<AuctionCategory>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [liveCount, setLiveCount] = useState(0);

    const setAuctionsStore = useAuctionStore(s => s.setAuctions);
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
            setLiveCount(auctions.filter(a => !a.isEnded && a.endTime > now).length);
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
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                            <TrendingUp className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tight text-white leading-none">Marketplace</h2>
                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Stellar Ledger Protocol v21</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-4 py-2.5 rounded-xl bg-gray-900/50 border border-white/5 backdrop-blur-md flex items-center gap-3">
                        <div className="flex -space-x-1.5 ">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-gray-950 bg-gray-800 flex items-center justify-center text-[8px] font-black text-white">
                                    {i}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">42k+ Bidders</span>
                    </div>

                    <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2.5 shadow-lg shadow-emerald-500/5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{liveCount} Live Pools</span>
                    </div>
                    <CreateAuctionDialog
                        disabled={!wallet.publicKey}
                        onCreate={async (data) => {
                            if (!wallet.publicKey) {
                                toast.error('Connect a wallet first')
                                return
                            }
                            try {
                                const res = await createAuction(
                                    wallet.publicKey,
                                    {
                                        title: data.title,
                                        description: data.description,
                                        imageUrl: data.imageUrl,
                                        category: data.category,
                                        durationSecs: data.durationSecs,
                                        minBid: data.minBid,
                                    },
                                    async (xdr) => {
                                        try {
                                            return await signTransaction(xdr, wallet.network || 'Test SDF Network ; September 2015', 'freighter')
                                        } catch {
                                            return await signTransaction(xdr, wallet.network || 'Test SDF Network ; September 2015', 'albedo')
                                        }
                                    }
                                )
                                if (res.success) {
                                    toast.success('Auction created')
                                    await loadAuctions()
                                } else {
                                    throw new Error(res.error)
                                }
                            } catch (e) {
                                toast.error((e as Error).message)
                            }
                        }}
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Side: Auction List (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Controls Card */}
                    <div className="saas-card bg-gray-900/30 border-white/5 flex flex-col md:flex-row gap-6 p-4">
                        <div className="relative flex-1 group">
                            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by asset name, description, or hash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="saas-input pl-14 bg-gray-950/50 border-white/5"
                            />
                        </div>
                        <div className="relative min-w-[220px]">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as AuctionCategory)}
                                className="saas-input appearance-none cursor-pointer pr-12 bg-gray-950/50 border-white/5 font-bold text-xs uppercase tracking-widest"
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c === 'All' ? 'All Asset Classes' : c}</option>
                                ))}
                            </select>
                            <Filter size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Auction Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="saas-card text-center py-32 bg-gray-950/20 border-dashed border-gray-800">
                            <div className="w-20 h-20 rounded-full bg-gray-900 mx-auto flex items-center justify-center mb-6">
                                <Search size={32} className="text-gray-700" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No match found</h3>
                            <p className="text-gray-500 text-sm max-w-xs mx-auto">Try adjusting your filters or search terms for the current market state.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                            {filtered.map(auction => (
                                <AuctionCard key={auction.id} auction={auction} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side: Stats & Activity (1/3) */}
                <div className="space-y-8">
                    {/* Market Stats */}
                    <div className="saas-card space-y-8 p-8 overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl" />

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
                                <BarChart size={22} className="text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-lg tracking-tight">Market Analytics</h3>
                                <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] tracking-widest uppercase mt-0.5">
                                    <ArrowUpRight size={12} />
                                    +12.5% Vol
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-gray-950/50 rounded-2xl p-6 border border-white/5 group hover:border-blue-500/20 transition-colors">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4">Cumulative Volume</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-black text-white tracking-tighter">42,850</p>
                                    <p className="text-sm font-bold text-gray-600 uppercase">XLM</p>
                                </div>
                            </div>
                            <div className="bg-gray-950/50 rounded-2xl p-6 border border-white/5 group hover:border-blue-500/20 transition-colors">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4">Total Bids (24h)</p>
                                <p className="text-4xl font-black text-white tracking-tighter">1,248</p>
                            </div>
                        </div>
                    </div>

                    {/* Live Feed */}
                    <div className="saas-card space-y-8 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <Activity size={48} className="text-blue-600/10 rotate-12" />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 pulse-soft">
                                <Zap size={22} className="text-white" />
                            </div>
                            <h3 className="font-black text-white text-lg tracking-tight">Global Live Feed</h3>
                        </div>

                        <div className="space-y-6 relative">
                            <div className="absolute left-[3px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500/50 via-gray-800 to-transparent" />

                            {[
                                { user: 'GCEZ...OL3E', action: 'placed high bid', amount: '2,750', time: '5s ago', type: 'bid' },
                                { user: 'GD6W...LMKH', action: 'secured pool', amount: '12k', time: '1m ago', type: 'win' },
                                { user: 'GBVU...QIZI', action: 'outbid entrant', amount: '4,500', time: '3m ago', type: 'bid' },
                                { user: 'GCEZ...OL3E', action: 'placed high bid', amount: '1,200', time: '12m ago', type: 'bid' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-6 pl-6 relative">
                                    <div className="absolute left-[1px] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-4 ring-gray-950" />
                                    <div className="space-y-1.5">
                                        <p className="text-xs text-gray-400 font-medium">
                                            <span className="text-blue-400 font-black tracking-tight">{item.user}</span>
                                            <span className="mx-1.5 text-gray-600">{item.action}</span>
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-white font-black">{item.amount} XLM</span>
                                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.1em]">{item.time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5">
                            View Ledger History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

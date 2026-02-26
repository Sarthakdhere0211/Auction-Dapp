import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, TrendingUp, Activity, ExternalLink, Wallet, ShieldCheck, Award, Mail, ArrowUpRight } from 'lucide-react';
import { WalletState, Auction, BidRecord } from '../types';
import { getUserBids } from '../contract';

interface ProfileProps {
    wallet: WalletState;
}

function shortenAddress(addr: string) {
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
}

const Profile: React.FC<ProfileProps> = ({ wallet }) => {
    const navigate = useNavigate();
    const [userBids, setUserBids] = useState<{ auction: Auction; bid: BidRecord }[]>([]);
    const [loading, setLoading] = useState(true);
    const [nowTs, setNowTs] = useState(0);

    const loadData = useCallback(async () => {
        if (!wallet.publicKey) return;
        try {
            const bids = await getUserBids(wallet.publicKey);
            setUserBids(bids);
        } catch (err) {
            console.error('Failed to load profile data', err);
        } finally {
            setLoading(false);
        }
    }, [wallet.publicKey]);

    useEffect(() => {
        if (wallet.publicKey) {
            loadData();
            const interval = setInterval(loadData, 5000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [loadData, wallet.publicKey]);

    useEffect(() => {
        const update = () => {
            setNowTs(Math.floor(Date.now() / 1000));
        };
        const timeout = setTimeout(update, 0);
        const interval = setInterval(update, 5000);
        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, []);

    const activeBids = userBids.filter(({ auction }) => !auction.isEnded && auction.endTime > nowTs);
    const pastBids = userBids.filter(({ auction }) => auction.isEnded || auction.endTime <= nowTs);
    const wins = pastBids.filter(({ auction, bid }) =>
        (auction.isEnded || auction.endTime <= nowTs) && auction.highestBidder === wallet.publicKey && auction.highestBid === bid.amount
    );

    const winRate = userBids.length > 0 ? Math.round((wins.length / userBids.length) * 100) : 0;
    const portfolioValue = wins.reduce((sum, { bid }) => sum + bid.amount, 0);

    return (
        <div className="space-y-12 pb-20">
            {/* profile header */}
            <div className="saas-card border-none bg-gradient-to-tr from-blue-600/10 via-transparent to-indigo-600/10 h-72 flex items-end p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -mr-20 -mt-20 group-hover:bg-blue-600/20 transition-all duration-700" />

                <div className="flex flex-col md:flex-row items-end justify-between w-full gap-8 relative z-20">
                    <div className="flex items-center gap-8">
                        <div className="relative group/avatar">
                            <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-blue-400 p-1 shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105">
                                <div className="w-full h-full rounded-[1.8rem] bg-gray-950 flex items-center justify-center overflow-hidden">
                                    <User size={56} className="text-blue-500" />
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-gray-950 border border-white/10 flex items-center justify-center shadow-xl">
                                <ShieldCheck size={20} className="text-emerald-500" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black text-white tracking-tighter">Collector Profile</h2>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Early Adopter • Batch #01</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="px-4 py-2 rounded-xl bg-gray-950/60 backdrop-blur-md border border-white/5 font-mono text-[10px] font-black text-gray-400 flex items-center gap-3 shadow-xl group/addr hover:border-white/20 transition-colors">
                                    <Wallet size={14} className="text-blue-500" />
                                    {wallet.publicKey ? shortenAddress(wallet.publicKey) : '...'}
                                    <ExternalLink size={12} className="cursor-pointer text-gray-600 hover:text-white transition-colors" />
                                </div>
                                <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-500 shadow-lg shadow-emerald-500/5">
                                    Identity Verified
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-12 px-10 py-6 rounded-[2rem] bg-gray-950/20 backdrop-blur-3xl border border-white/5 shadow-2xl">
                        <div className="text-center group/stat">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover/stat:text-blue-400 transition-colors">Portfolio Val.</p>
                            <p className="text-4xl font-black text-white leading-none tracking-tighter">{loading ? '...' : portfolioValue.toLocaleString()} <span className="text-sm font-normal text-gray-500 ml-1">XLM</span></p>
                        </div>
                        <div className="text-center group/stat">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover/stat:text-blue-400 transition-colors">Win Rate</p>
                            <p className="text-4xl font-black text-white leading-none tracking-tighter">{loading ? '...' : winRate}<span className="text-xl font-normal text-gray-500 ml-1">%</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Activity (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                                <Activity size={20} className="text-blue-500" />
                            </div>
                            <h3 className="text-lg font-black text-white tracking-tight uppercase">Live Participations</h3>
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-gray-900 border border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                            {activeBids.length} Active Slots
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-6">
                            {[1, 2].map(i => <div key={i} className="h-28 rounded-3xl bg-gray-950/50 border border-white/5 animate-pulse" />)}
                        </div>
                    ) : activeBids.length === 0 ? (
                        <div className="saas-card p-20 text-center border-dashed border-gray-800 bg-gray-950/20">
                            <div className="w-20 h-20 rounded-full bg-gray-950 mx-auto flex items-center justify-center mb-6">
                                <TrendingUp size={32} className="text-gray-800" />
                            </div>
                            <p className="text-gray-500 font-bold mb-8">No active auction participations detected.</p>
                            <button onClick={() => navigate('/dashboard')} className="saas-button px-10 !w-auto text-xs uppercase tracking-widest ">
                                Start Exploring
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeBids.map(({ auction, bid }) => {
                                const isWinning = auction.highestBidder === wallet.publicKey;
                                return (
                                    <div
                                        key={auction.id}
                                        className="saas-card p-4 flex items-center justify-between hover:border-blue-500/30 transition-all duration-300 cursor-pointer group hover:bg-white/5"
                                        onClick={() => navigate(`/auction/${auction.id}`)}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-xl">
                                                <img src={auction.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors leading-none tracking-tight">{auction.title}</h4>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Entry:</span>
                                                        <span className="text-sm font-black text-white uppercase tracking-tighter">{bid.amount.toLocaleString()} <span className="text-[10px] text-gray-600 font-normal">XLM</span></span>
                                                    </div>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{auction.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-3 px-4">
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${isWinning
                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/5 pulse-soft'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/5'}`}>
                                                {isWinning ? 'Leading' : 'Outbid'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Live Pool</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar (1/3) */}
                <div className="space-y-8">
                    <div className="saas-card space-y-10 p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Wallet size={80} />
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Liquid Balance</h3>
                            <div className="bg-gray-950/50 p-8 rounded-[2rem] border border-white/5 space-y-6 group hover:border-blue-500/20 transition-all">
                                <p className="text-5xl font-black text-white leading-none tracking-tighter shadow-2xl">{loading ? '...' : (wallet.balance || '0.00')} <span className="text-base font-normal text-gray-600 uppercase ml-1">XLM</span></p>
                                <button className="saas-button py-4 w-full text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98]">
                                    <Award size={14} />
                                    Fund Managed Account
                                </button>
                            </div>
                        </div>

                        <div className="space-y-8 pt-4">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Protocol Metrics</h3>
                            <div className="space-y-8">
                                <div className="space-y-3 prose-sm">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ledger Engagement</span>
                                        <span className="text-lg font-black text-white tracking-tighter">{userBids.length} <span className="text-[10px] text-gray-600 font-normal">Bids</span></span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden p-[2px]">
                                        <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${Math.min((userBids.length / 10) * 100, 100)}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-3 prose-sm">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Win Probability</span>
                                        <span className="text-lg font-black text-emerald-500 tracking-tighter">{winRate}<span className="text-[10px] font-normal ml-0.5">%</span></span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden p-[2px]">
                                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${winRate}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="saas-card bg-gradient-to-br from-indigo-600/10 to-transparent border-white/5 space-y-6 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                            <Mail size={32} className="text-indigo-400" />
                        </div>

                        <div className="space-y-4 relative z-10">
                            <h3 className="font-black text-white text-lg tracking-tight uppercase">Protocol Alerts</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Get prioritized encrypted notifications for ledger state changes and outbid events.
                            </p>
                            <button className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest group/btn">
                                Orchestrate Alerts
                                <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;

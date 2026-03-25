import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, TrendingUp, Activity, ExternalLink, Wallet, ShieldCheck, Mail, ArrowUpRight } from 'lucide-react';
import { WalletState, Auction, BidRecord } from '../types';
import { getUserBids, fetchTokenBalance } from '../contract';
import MintPanel from '../components/MintPanel';
import Mint from '../components/Mint';

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
    const [tokenBalance, setTokenBalance] = useState<string>('0.00');

    const loadData = useCallback(async () => {
        if (!wallet.publicKey) return;
        try {
            const [bids, tBalance] = await Promise.all([
                getUserBids(wallet.publicKey),
                fetchTokenBalance(wallet.publicKey)
            ]);
            setUserBids(bids);
            setTokenBalance(tBalance);
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
        <div className="space-y-6 md:space-y-12 pb-10 md:pb-20">
            {/* profile header */}
            <div className="saas-card border-none bg-gradient-to-tr from-blue-600/10 via-transparent to-indigo-600/10 min-h-[18rem] md:h-72 flex items-end p-4 md:p-8 overflow-hidden relative group rounded-2xl md:rounded-[2.5rem]">
                <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px] -mr-10 md:-mr-20 -mt-10 md:-mt-20 group-hover:bg-blue-600/20 transition-all duration-700" />

                <div className="flex flex-col md:flex-row items-center md:items-end justify-between w-full gap-6 md:gap-8 relative z-20 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <div className="relative group/avatar">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[2rem] bg-gradient-to-tr from-blue-600 to-blue-400 p-1 shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105">
                                <div className="w-full h-full rounded-[1.2rem] md:rounded-[1.8rem] bg-gray-950 flex items-center justify-center overflow-hidden">
                                    <User size={40} md:size={56} className="text-blue-500" />
                                </div>
                            </div>
                            <div className="absolute -bottom-1 md:-bottom-2 -right-1 md:-right-2 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl bg-gray-950 border border-white/10 flex items-center justify-center shadow-xl">
                                <ShieldCheck size={16} md:size={20} className="text-emerald-500" />
                            </div>
                        </div>

                        <div className="space-y-2 md:space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">Collector Profile</h2>
                                <p className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-widest">Early Adopter • Batch #01</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-gray-950/60 backdrop-blur-md border border-white/5 font-mono text-[9px] md:text-[10px] font-black text-gray-400 flex items-center gap-2 md:gap-3 shadow-xl group/addr hover:border-white/20 transition-colors">
                                    <Wallet size={12} md:size={14} className="text-blue-500" />
                                    {wallet.publicKey ? shortenAddress(wallet.publicKey) : '...'}
                                    <ExternalLink size={10} md:size={12} className="cursor-pointer text-gray-600 hover:text-white transition-colors" />
                                </div>
                                <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500 shadow-lg shadow-emerald-500/5">
                                    Identity Verified
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6 md:gap-12 px-6 md:px-10 py-4 md:py-6 rounded-2xl md:rounded-[2rem] bg-gray-950/20 backdrop-blur-3xl border border-white/5 shadow-2xl w-full md:w-auto justify-center">
                        <div className="text-center group/stat">
                            <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 md:mb-3 group-hover/stat:text-blue-400 transition-colors">Portfolio Val.</p>
                            <p className="text-xl md:text-4xl font-black text-white leading-none tracking-tighter">{loading ? '...' : portfolioValue.toLocaleString()} <span className="text-[10px] md:text-sm font-normal text-gray-500 ml-1">XLM</span></p>
                        </div>
                        <div className="text-center group/stat">
                            <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 md:mb-3 group-hover/stat:text-blue-400 transition-colors">Win Rate</p>
                            <p className="text-xl md:text-4xl font-black text-white leading-none tracking-tighter">{loading ? '...' : winRate}<span className="text-xs md:text-xl font-normal text-gray-500 ml-1">%</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                {/* Activity (2/3) */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                                <Activity size={18} md:size={20} className="text-blue-500" />
                            </div>
                            <h3 className="text-base md:text-lg font-black text-white tracking-tight uppercase">Live Participations</h3>
                        </div>
                        <div className="px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-gray-900 border border-white/5 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest">
                            {activeBids.length} Active Slots
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4 md:space-y-6">
                            {[1, 2].map(i => <div key={i} className="h-24 md:h-28 rounded-2xl md:rounded-3xl bg-gray-950/50 border border-white/5 animate-pulse" />)}
                        </div>
                    ) : activeBids.length === 0 ? (
                        <div className="saas-card p-12 md:p-20 text-center border-dashed border-gray-800 bg-gray-950/20 rounded-2xl md:rounded-[2rem]">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-950 mx-auto flex items-center justify-center mb-4 md:mb-6">
                                <TrendingUp size={24} md:size={32} className="text-gray-800" />
                            </div>
                            <p className="text-gray-500 font-bold mb-6 md:mb-8 text-sm md:text-base">No active auction participations detected.</p>
                            <button onClick={() => navigate('/dashboard')} className="saas-button px-8 md:px-10 !w-auto text-[10px] md:text-xs uppercase tracking-widest ">
                                Start Exploring
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 md:space-y-4">
                            {activeBids.map(({ auction, bid }) => {
                                const isWinning = auction.highestBidder === wallet.publicKey;
                                return (
                                    <div
                                        key={auction.id}
                                        className="saas-card p-3 md:p-4 flex flex-col md:flex-row items-center justify-between hover:border-blue-500/30 transition-all duration-300 cursor-pointer group hover:bg-white/5 gap-4 rounded-xl md:rounded-2xl"
                                        onClick={() => navigate(`/auction/${auction.id}`)}
                                    >
                                        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-xl">
                                                <img src={auction.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                            </div>
                                            <div className="space-y-1 md:space-y-2 flex-grow overflow-hidden">
                                                <h4 className="text-lg md:text-xl font-bold text-white group-hover:text-blue-400 transition-colors leading-none tracking-tight truncate">{auction.title}</h4>
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <span className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest whitespace-nowrap">Entry:</span>
                                                        <span className="text-xs md:text-sm font-black text-white uppercase tracking-tighter whitespace-nowrap">{bid.amount.toLocaleString()} <span className="text-[9px] md:text-[10px] text-gray-600 font-normal">XLM</span></span>
                                                    </div>
                                                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-gray-800 shrink-0" />
                                                    <span className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest truncate">{auction.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 w-full md:w-auto px-1 md:px-4">
                                            <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg ${isWinning
                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/5 pulse-soft'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/5'}`}>
                                                {isWinning ? 'Leading' : 'Outbid'}
                                            </div>
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                <p className="text-[8px] md:text-[10px] font-black text-gray-600 uppercase tracking-widest">Live Pool</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar (1/3) */}
                <div className="space-y-6 md:space-y-8">
                    <div className="saas-card space-y-8 md:space-y-10 p-6 md:p-8 shadow-2xl relative overflow-hidden rounded-2xl md:rounded-3xl">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Wallet size={80} />
                        </div>

                        <div className="space-y-4 md:space-y-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Liquid Balance</h3>
                            <div className="bg-gray-950/50 p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-white/5 space-y-4 md:space-y-6 group hover:border-blue-500/20 transition-all">
                                <div className="space-y-1">
                                    <p className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter shadow-2xl">{loading ? '...' : (wallet.balance || '0.00')} <span className="text-xs md:text-base font-normal text-gray-600 uppercase ml-1">XLM</span></p>
                                    <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2 md:mt-4">Custom Token Balance</p>
                                    <p className="text-xl md:text-3xl font-black text-blue-500 tracking-tighter">{loading ? '...' : tokenBalance} <span className="text-[10px] md:text-xs font-normal text-gray-500 uppercase ml-1">TOK</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 md:space-y-8 pt-2 md:pt-4">
                            <MintPanel walletAddress={wallet.publicKey} />
                            
                            {/* New Production-Ready Minter */}
                            <div className="space-y-3 md:space-y-4 pt-4 md:pt-8">
                                <div className="flex items-center gap-3 ml-1">
                                    <Zap size={14} md:size={16} className="text-blue-500" />
                                    <h3 className="text-[9px] md:text-xs font-black text-gray-500 uppercase tracking-widest">Advanced Token Minter</h3>
                                </div>
                                <Mint />
                            </div>
                        </div>

                        <div className="space-y-6 md:space-y-8 pt-2 md:pt-4">
                            <h3 className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Protocol Metrics</h3>
                            <div className="space-y-6 md:space-y-8">
                                <div className="space-y-2 md:space-y-3 prose-sm">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Ledger Engagement</span>
                                        <span className="text-base md:text-lg font-black text-white tracking-tighter">{userBids.length} <span className="text-[9px] md:text-[10px] text-gray-600 font-normal">Bids</span></span>
                                    </div>
                                    <div className="h-1.5 md:h-2 w-full bg-gray-900 rounded-full overflow-hidden p-[2px]">
                                        <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${Math.min((userBids.length / 10) * 100, 100)}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-2 md:space-y-3 prose-sm">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Win Probability</span>
                                        <span className="text-base md:text-lg font-black text-emerald-500 tracking-tighter">{winRate}<span className="text-[9px] md:text-[10px] font-normal ml-0.5">%</span></span>
                                    </div>
                                    <div className="h-1.5 md:h-2 w-full bg-gray-900 rounded-full overflow-hidden p-[2px]">
                                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${winRate}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="saas-card bg-gradient-to-br from-indigo-600/10 to-transparent border-white/5 space-y-4 md:space-y-6 p-6 md:p-8 relative overflow-hidden group rounded-2xl md:rounded-3xl">
                        <div className="absolute top-0 right-0 p-4 md:p-6 opacity-30 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none">
                            <Mail size={28} md:size={32} className="text-indigo-400" />
                        </div>

                        <div className="space-y-2 md:space-y-4 relative z-10 text-center md:text-left">
                            <h3 className="font-black text-white text-base md:text-lg tracking-tight uppercase">Protocol Alerts</h3>
                            <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
                                Get prioritized encrypted notifications for ledger state changes and outbid events.
                            </p>
                            <button className="flex items-center justify-center md:justify-start gap-2 text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest group/btn w-full md:w-auto">
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

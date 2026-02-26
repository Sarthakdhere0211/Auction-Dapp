import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Clock, TrendingUp, ExternalLink, ShieldCheck, History, Search, Box, Award, Shield, Globe, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { Auction, BidRecord, WalletState } from '../types';
import { getAuction, getBidHistory, placeBid, startBidEventPolling, stopBidEventPolling, getContractIsInitialized, getContractAuctionStatus, initializeAuction } from '../contract';
import { orchestrateBid } from '../utils/bidOrchestrator';
import { signTransaction, isFreighterInstalled } from '../wallet';
import { NETWORK_PASSPHRASE } from '../contract';
import BidPanel from '../components/BidPanel';
import AuctionStatusBanner from '../components/AuctionStatusBanner';
import TxStatusModal from '../components/TxStatusModal';
import { validateEnv } from '../env';
import { useAuctionState } from '../hooks/useAuctionState';
import { getAccountUrl, getContractUrl } from '../config/stellar';

interface AuctionPageProps {
    wallet: WalletState;
}

function shortenAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

function formatTime(ts: number) {
    return new Date(ts * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

const AuctionPage: React.FC<AuctionPageProps> = ({ wallet }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [auction, setAuction] = useState<Auction | null>(null);
    const [bidHistory, setBidHistory] = useState<BidRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPlacingBid, setIsPlacingBid] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [txError, setTxError] = useState<string | null>(null);
    const [showTxModal, setShowTxModal] = useState(false);

    // ensure modal pops up whenever we receive a tx hash or error (in case user closed it early)
    useEffect(() => {
        if (txHash || txError) {
            setShowTxModal(true);
        }
    }, [txHash, txError]);

    const auctionId = parseInt(id ?? '0', 10);

    // Use auction state hook for contract state and status
    const { status: auctionStatus, auctionState: contractState, refresh } = useAuctionState(wallet.publicKey);

    console.log('Auction status:', auctionStatus);
    console.log('Auction data:', auction);
    console.log('Wallet:', wallet.publicKey);

    const loadData = useCallback(async () => {
        if (!auctionId) return;
        try {
            const [auc, bids] = await Promise.all([
                getAuction(auctionId),
                getBidHistory(auctionId),
            ]);
            setAuction(auc);
            setBidHistory([...bids].reverse()); // most recent first
        } catch (err) {
            console.error('Failed to load auction', err);
        } finally {
            setLoading(false);
        }
    }, [auctionId]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 4000);
        startBidEventPolling((changedId) => {
            if (changedId === 0 || changedId === auctionId) {
                loadData();
            }
        });
        return () => {
            clearInterval(interval);
            stopBidEventPolling();
        };
    }, [loadData, auctionId]);

    const handlePlaceBid = async (amount: number) => {
        if (!wallet.publicKey || !auction) return;
        const envIssues = validateEnv();
        const lacksContract = envIssues.some(e => e.toLowerCase().includes('vite_contract_id'));
        if (lacksContract) {
            toast.error('Contract not configured. Please check environment variables.');
            return;
        }
        const isTestnet = wallet.network === 'TESTNET' || wallet.network === 'Test SDF Network ; September 2015';
        if (!isTestnet) {
            toast.error(`Wallet is on ${wallet.network}. Please switch to Stellar Testnet.`);
            return;
        }
        const freighterOk = await isFreighterInstalled();
        if (!freighterOk) {
            toast.error('Freighter is not installed or unavailable.');
            return;
        }
        setIsPlacingBid(true);
        setTxHash(null);
        setTxError(null);
        setShowTxModal(true);

        try {
            const result = await orchestrateBid(
                wallet.publicKey,
                amount,
                120,
                {
                    isInitialized: async () => await getContractIsInitialized(),
                    getStatus: async () => await getContractAuctionStatus(),
                    initialize: async (owner, startPriceXlm, durationMins) => {
                        const tx = await initializeAuction(owner, startPriceXlm, durationMins, async (xdr) => {
                            try {
                                return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
                            } catch {
                                return await signTransaction(xdr, NETWORK_PASSPHRASE, 'albedo');
                            }
                        });
                        return tx;
                    },
                    bid: async (amountXlm) => {
                        const res = await placeBid(
                            auctionId,
                            wallet.publicKey as string,
                            amountXlm,
                            async (xdr) => {
                                try {
                                    return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
                                } catch {
                                    return await signTransaction(xdr, NETWORK_PASSPHRASE, 'albedo');
                                }
                            }
                        );
                        return res;
                    },
                }
            );
            setTxHash(result.txHash);
            if (result.success) {
                toast.success(`Bid placed successfully! Tx: ${result.txHash}`);
                await loadData();
                await refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            const msg = (err as Error).message ?? 'Unknown error';
            setTxError(msg);
            toast.error(msg);
        } finally {
            setIsPlacingBid(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl border-4 border-blue-600/20 border-t-blue-500 animate-[spin_1.5s_linear_infinite]" />
                    <div className="text-center space-y-2">
                        <p className="text-white font-black uppercase tracking-[0.2em] text-xs">Synchronizing Ledger</p>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Querying Soroban contract state...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-20 flex items-center justify-center">
                <div className="text-center saas-card p-12 border-dashed border-gray-800">
                    <Search size={48} className="mx-auto text-gray-800 mb-6" />
                    <h2 className="text-2xl font-black text-white mb-2">Pool Not Found</h2>
                    <p className="text-gray-500 mb-10 text-sm">The requested auction pool does not exist or has been pruned.</p>
                    <button onClick={() => navigate('/dashboard')} className="saas-button px-10">
                        View active pools
                    </button>
                </div>
            </div>
        );
    }

    const isLive = auctionStatus === 'live';

    return (
        <div className="space-y-12">
            {/* Header / Back */}
            <div className="flex items-center justify-between px-2">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2.5 text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Return to discovery
                </button>
                <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-2xl ${isLive
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5'
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {isLive ? 'Market Active' : 'Market Settled'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Side: Auction Details (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    <AuctionStatusBanner status={auctionStatus} />
                    {/* Hero Section */}
                    <div className="saas-card overflow-hidden !p-0 border-none shadow-3xl bg-gray-950">
                        <div className="relative h-[560px] group/hero">
                            <img
                                src={auction.imageUrl}
                                alt={auction.title}
                                className="w-full h-full object-cover group-hover/hero:scale-105 transition-transform duration-[2s] ease-out"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${auction.id}/1200/800`;
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
                            <div className="absolute top-0 right-0 p-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer">
                                    <ExternalLink size={24} className="text-white opacity-40 hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <div className="absolute bottom-12 left-12 right-12 space-y-6">
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-2 rounded-xl bg-blue-600 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-blue-600/40">
                                        {auction.category}
                                    </span>
                                    <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-950/60 backdrop-blur-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                                        <ShieldCheck size={14} /> Soroban Verified
                                    </span>
                                </div>
                                <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tighter max-w-3xl drop-shadow-2xl">{auction.title}</h1>
                            </div>
                        </div>
                        <div className="p-12 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="space-y-4 group/info">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-3 group-hover/info:text-blue-500 transition-colors">
                                        <Award size={14} /> Originator
                                    </p>
                                    <a
                                        href={getAccountUrl(auction.seller)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-base text-gray-300 hover:text-white font-mono flex items-center gap-2 truncate transition-colors"
                                    >
                                        {shortenAddress(auction.seller)} <ExternalLink size={12} className="opacity-40" />
                                    </a>
                                </div>
                                <div className="space-y-4 group/info">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-3 group-hover/info:text-emerald-500 transition-colors">
                                        <Tag size={14} /> Floor Price
                                    </p>
                                    <p className="text-2xl font-black text-white tracking-tight">{auction.minBid.toLocaleString()} <span className="text-xs font-normal text-gray-500 uppercase ml-1">XLM</span></p>
                                </div>
                                <div className="space-y-4 group/info">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-3 group-hover/info:text-blue-500 transition-colors">
                                        <Clock size={14} /> Expiration
                                    </p>
                                    <p className="text-sm font-bold text-white tracking-tight">{formatTime(auction.endTime)}</p>
                                </div>
                            </div>

                            <div className="space-y-6 pt-12 border-t border-white/5">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Asset Definition</h3>
                                <p className="text-gray-400 leading-relaxed text-lg max-w-4xl">{auction.description}</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Network', val: 'Stellar Pubnet', icon: <Globe size={14} /> },
                                    { label: 'Verification', val: 'Contract Authenticated', icon: <Shield size={14} /> },
                                    { label: 'Settlement', val: 'Atomic Swap', icon: <Box size={14} /> },
                                    { label: 'Taxonomy', val: 'NFT-Soroban-v1', icon: <Activity size={14} /> },
                                ].map(item => (
                                    <div key={item.label} className="p-5 rounded-2xl bg-gray-950/50 border border-white/5 space-y-3 shadow-inner">
                                        <div className="text-gray-600">{item.icon}</div>
                                        <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">{item.label}</p>
                                        <p className="text-[11px] font-black text-white uppercase tracking-tight">{item.val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Bid History & Action (1/3) */}
                <div className="space-y-8">
                    <BidPanel
                        auction={auction}
                        walletAddress={wallet.publicKey}
                        onPlaceBid={handlePlaceBid}
                        isPlacingBid={isPlacingBid}
                        txHash={txHash}
                        txError={txError}
                        auctionStatus={auctionStatus}
                        contractState={contractState}
                    />

                    {/* Bid History Card */}
                    <div className="saas-card space-y-8 p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                                    <History size={18} className="text-blue-500" />
                                </div>
                                <h3 className="text-lg font-black text-white tracking-tight uppercase">Recent Bids</h3>
                            </div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">{bidHistory.length} History</span>
                        </div>

                        {bidHistory.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-gray-800 rounded-[2rem] bg-gray-950/20">
                                <div className="w-16 h-16 rounded-full bg-gray-950 mx-auto flex items-center justify-center mb-4">
                                    <TrendingUp size={24} className="text-gray-800" />
                                </div>
                                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">No activity recorded</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {bidHistory.map((bid, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all group ${idx === 0
                                            ? 'bg-blue-600/10 border-blue-500/30 shadow-2xl shadow-blue-500/10'
                                            : 'bg-gray-950/60 border-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-inner ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-600'}`}>
                                                #{bidHistory.length - idx}
                                            </div>
                                            <div className="space-y-1">
                                                <p className={`text-xs font-mono font-black ${idx === 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                    {shortenAddress(bid.bidder)}
                                                </p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{formatTime(bid.timestamp)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black tracking-tight ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>
                                                {bid.amount.toLocaleString()} <span className="text-[10px] font-normal text-gray-600 ml-0.5 uppercase">XLM</span>
                                            </p>
                                            {idx === 0 && (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest mt-1">
                                                    <TrendingUp size={10} />
                                                    Highest
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <a
                            href={getContractUrl(import.meta.env.VITE_CONTRACT_ID)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 rounded-xl bg-gray-900/50 border border-white/5 flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all shadow-inner group"
                        >
                            <Box size={14} className="group-hover:text-blue-500 transition-colors" />
                            View on Stellar.Expert
                        </a>
                    </div>
                </div>
            </div>
            <TxStatusModal
                open={showTxModal}
                onOpenChange={setShowTxModal}
                status={isPlacingBid ? 'pending' : txHash ? 'success' : txError ? 'failed' : 'pending'}
                txHash={txHash}
            />
        </div>
    );
};

export default AuctionPage;

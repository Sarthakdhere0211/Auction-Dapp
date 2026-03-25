import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, ArrowRight, TrendingUp, Trophy, Layers } from 'lucide-react';
import { WalletState } from '../types';
import { motion } from 'framer-motion';
import { WalletProvider } from '../wallet';

interface HomeProps {
    wallet: WalletState;
    isFreighterInstalled: boolean;
    isAlbedoInstalled: boolean;
    onConnect: (provider: WalletProvider) => void;
}

const features = [
    {
        icon: <Zap size={24} className="text-blue-500" />,
        title: 'Instant Finality',
        description: 'Settlement in 3–5 seconds with near-zero network fees on the Stellar ledger.',
        color: 'blue'
    },
    {
        icon: <Shield size={24} className="text-emerald-500" />,
        title: 'Quantum Secure',
        description: 'All auction logic runs on decentralized Soroban smart contracts.',
        color: 'emerald'
    },
    {
        icon: <Layers size={24} className="text-indigo-500" />,
        title: 'Verified Assets',
        description: 'Only trusted and verified assets are listed on our global protocol.',
        color: 'indigo'
    },
];

const Home: React.FC<HomeProps> = ({ wallet, isFreighterInstalled, isAlbedoInstalled, onConnect }) => {
    const navigate = useNavigate();

    const handleCTA = () => {
        if (wallet.isConnected) {
            navigate('/auction');
        } else {
            onConnect('freighter');
        }
    };

    return (
        <div className="flex flex-col space-y-16 md:space-y-32 py-6 md:py-10">
            {/* Hero Section */}
            <motion.div className="relative pt-6 md:pt-10 pb-12 md:pb-20 overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                {/* Visual Glows */}
                <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-indigo-600/10 rounded-full blur-[80px] md:blur-[120px] -z-10" />

                <div className="text-center space-y-6 md:space-y-10 max-w-4xl mx-auto relative z-20 px-4">
                    <div className="inline-flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl bg-gray-900/50 backdrop-blur-md border border-white/5 shadow-2xl pulse-soft mx-auto">
                        <TrendingUp size={12} md:size={14} className="text-blue-400" />
                        <span className="text-[8px] md:text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Protocol Live • Testnet v21</span>
                    </div>

                    <h1 className="text-4xl sm:text-7xl lg:text-8xl font-black text-white leading-tight md:leading-none tracking-tighter">
                        Next-Gen <br className="hidden md:block" />
                        <span className="bg-gradient-to-tr from-blue-400 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Digital Auctions.
                        </span>
                    </h1>

                    <p className="text-gray-400 text-sm md:text-xl max-w-2xl mx-auto leading-relaxed px-2">
                        Experience the most transparent and efficient auction protocol built on Stellar.
                        Zero compromise on speed, scale, or security.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-6 pt-4">
                        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full sm:w-auto">
                            <button
                                onClick={() => onConnect('freighter')}
                                disabled={wallet.isConnecting || !isFreighterInstalled}
                                className="saas-button px-6 md:px-8 py-3.5 md:py-4 text-sm md:text-base flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto"
                            >
                                {wallet.isConnected ? 'Open Dashboard' : 'Connect Freighter'}
                                <ArrowRight size={16} md:size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => onConnect('albedo')}
                                disabled={wallet.isConnecting || !isAlbedoInstalled}
                                className="px-6 md:px-8 py-3.5 md:py-4 text-sm md:text-base rounded-lg md:rounded-xl border border-white/10 bg-gray-900/50 text-white hover:bg-gray-800 transition-colors w-full sm:w-auto"
                            >
                                {wallet.isConnected ? 'Open Dashboard' : 'Connect Albedo'}
                            </button>
                        </div>

                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map(i => (
                                <img
                                    key={i}
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-950 bg-gray-900"
                                    alt="User"
                                />
                            ))}
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-950 bg-blue-600 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white">
                                +10k
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-2">
                {[
                    { label: 'Total Volume', val: '4.2M XLM' },
                    { label: 'Live Auctions', val: '124' },
                    { label: 'Total Bids', val: '48.5k' },
                    { label: 'Asset Classes', val: '12' },
                ].map(s => (
                    <div key={s.label} className="saas-card text-center py-6 md:py-8 hover:bg-white/5 transition-colors rounded-xl md:rounded-2xl">
                        <p className="text-[8px] md:text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1 md:mb-2">{s.label}</p>
                        <p className="text-xl md:text-3xl font-black text-white tracking-tight">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-2">
                {features.map((feat) => (
                    <div key={feat.title} className="saas-card group p-8 md:p-10 flex flex-col items-center text-center space-y-6 md:space-y-8 rounded-xl md:rounded-2xl">
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-${feat.color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            {feat.icon}
                        </div>
                        <div className="space-y-2 md:space-y-3">
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">{feat.title}</h3>
                            <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{feat.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Info */}
            <div className="saas-card bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/10 text-center py-12 md:py-20 px-6 md:px-10 space-y-6 md:space-y-8 rounded-3xl md:rounded-[3rem] relative overflow-hidden mx-2">
                <div className="absolute top-0 right-0 p-6 md:p-10 opacity-5 md:opacity-10 pointer-events-none">
                    <Trophy size={120} md:size={200} className="text-white" />
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">Elite assets, <br />Global liquidity.</h2>
                <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base px-2">Participate in auctions for exclusive real estate tokens, high-value digital art, and luxury goods.</p>
                <button
                    onClick={handleCTA}
                    className="saas-button px-8 md:px-10 !w-auto bg-white text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-blue-50 transition-colors rounded-lg md:rounded-xl"
                >
                    Launch App Now
                </button>
            </div>
        </div>
    );
};

export default Home;

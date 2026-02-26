import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, LogOut, LayoutGrid, BarChart3, History } from 'lucide-react';
import { WalletState } from '../types';
import { WalletProvider } from '../wallet';

interface NavbarProps {
    wallet: WalletState;
    isFreighterInstalled: boolean;
    isAlbedoInstalled: boolean;
    onConnect: (provider: WalletProvider) => void;
    onDisconnect: () => void;
}

function shortenAddress(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

const Navbar: React.FC<NavbarProps> = ({ wallet, isFreighterInstalled, isAlbedoInstalled, onConnect, onDisconnect }) => {
    const location = useLocation();

    const navLinks = [
        { name: 'Market', path: '/', icon: LayoutGrid },
        { name: 'Portfolio', path: '/profile', icon: History },
    ];

    return (
        <div className="flex justify-between items-center py-2 px-1">
            <Link to="/" className="flex items-center gap-3 group transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <BarChart3 className="text-white w-6 h-6" />
                </div>
                <div className="hidden md:block">
                    <h1 className="text-xl font-black tracking-tight text-white leading-none">
                        STELLAR<span className="text-blue-500">LIVE</span>
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Auction Protocol</p>
                </div>
            </Link>

            <div className="flex items-center gap-2 md:gap-8">
                {/* Navigation Links */}
                <nav className="hidden lg:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all uppercase tracking-widest ${isActive
                                        ? 'bg-blue-600/10 text-blue-400'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={16} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-4">
                    {/* Network Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none">Testnet</span>
                    </div>

                    {wallet.isConnected && wallet.publicKey ? (
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block text-right">
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none">{shortenAddress(wallet.publicKey)}</p>
                                <p className="text-sm font-black text-white mt-0.5">{wallet.balance || '0.00'} XLM</p>
                            </div>
                            <button
                                onClick={onDisconnect}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-400/5 hover:border-red-400/20 transition-all group"
                                title="Disconnect Wallet"
                            >
                                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onConnect('freighter')}
                                disabled={!isFreighterInstalled || wallet.isConnecting}
                                className="saas-button px-4 !w-auto text-[10px] uppercase tracking-widest flex items-center gap-2"
                            >
                                <Wallet size={14} />
                                Freighter
                            </button>
                            <button
                                onClick={() => onConnect('albedo')}
                                disabled={!isAlbedoInstalled || wallet.isConnecting}
                                className="px-4 py-2 rounded-xl border border-white/10 bg-gray-900 text-white text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors"
                            >
                                Albedo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Navbar;

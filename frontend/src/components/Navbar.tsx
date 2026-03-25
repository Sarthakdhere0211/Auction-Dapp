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
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const navLinks = [
        { name: 'Market', path: '/', icon: LayoutGrid },
        { name: 'Portfolio', path: '/profile', icon: History },
    ];

    return (
        <div className="relative flex justify-between items-center py-3 md:py-4 px-3 md:px-6 bg-gray-950/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
            <Link to="/" className="flex items-center gap-2 md:gap-3 group transition-all shrink-0">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <BarChart3 className="text-white w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="block">
                    <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none">
                        STELLAR<span className="text-blue-500">LIVE</span>
                    </h1>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">Auction Protocol</p>
                </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
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

            <div className="flex items-center gap-2 md:gap-3">
                {/* Network Badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none">Testnet</span>
                </div>

                {wallet.isConnected && wallet.publicKey ? (
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden md:block text-right">
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none">{shortenAddress(wallet.publicKey)}</p>
                            <p className="text-sm font-black text-white mt-0.5">{wallet.balance || '0.00'} XLM</p>
                        </div>
                        <button
                            onClick={onDisconnect}
                            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-400/5 hover:border-red-400/20 transition-all"
                        >
                            <LogOut size={16} className="md:size-[18px]" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onConnect('freighter')}
                            disabled={!isFreighterInstalled || wallet.isConnecting}
                            className="saas-button px-3 md:px-4 py-2 md:py-2.5 !w-auto text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                        >
                            <Wallet size={14} />
                            <span className="hidden sm:inline">Connect</span>
                            <span className="inline sm:hidden">Wallet</span>
                        </button>
                    </div>
                )}

                {/* Mobile Menu Toggle */}
                <button 
                    className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <LayoutGrid size={22} />
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-gray-950/95 backdrop-blur-2xl border-b border-white/5 p-4 lg:hidden flex flex-col gap-2 z-50 shadow-2xl animate-in slide-in-from-top-2 duration-300">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all ${location.pathname === link.path
                                ? 'bg-blue-600/10 text-blue-400'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <link.icon size={18} />
                            {link.name}
                        </Link>
                    ))}
                    {/* Network Badge for Mobile Menu */}
                    <div className="sm:hidden flex items-center gap-2 px-4 py-3 border-t border-white/5 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none">Connected to Testnet</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navbar;

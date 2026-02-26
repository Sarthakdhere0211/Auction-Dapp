import React from 'react';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { AuctionStatus, getStatusInfo } from '../utils/auctionStatus';

interface AuctionStatusBadgeProps {
    status: AuctionStatus;
    className?: string;
}

const AuctionStatusBadge: React.FC<AuctionStatusBadgeProps> = ({ status, className = '' }) => {
    const info = getStatusInfo(status);

    const getIcon = () => {
        switch (status) {
            case AuctionStatus.LIVE:
                return <Clock size={14} className={info.textColor} />;
            case AuctionStatus.ENDED:
                return <CheckCircle size={14} className={info.textColor} />;
            case AuctionStatus.NOT_INITIALIZED:
                return <AlertTriangle size={14} className={info.textColor} />;
            default:
                return null;
        }
    };

    return (
        <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${info.bgColor} ${info.textColor} ${info.borderColor} ${className}`}
        >
            {getIcon()}
            <span className="text-[10px] font-black uppercase tracking-widest">
                {info.label}
            </span>
            {status === AuctionStatus.LIVE && (
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
        </div>
    );
};

export default AuctionStatusBadge;
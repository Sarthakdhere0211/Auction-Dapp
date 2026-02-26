import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getTimeRemaining, formatTimeRemaining, formatTimeRemainingHuman } from '../utils/auctionStatus';

interface CountdownTimerProps {
    endTime: number;
    currentTimeSeconds: number;
    onExpire?: () => void;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
    endTime,
    currentTimeSeconds,
    onExpire,
    showIcon = true,
    size = 'md',
}) => {
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [localTime, setLocalTime] = useState(currentTimeSeconds);

    useEffect(() => {
        setLocalTime(currentTimeSeconds);
    }, [currentTimeSeconds]);

    useEffect(() => {
        const remaining = getTimeRemaining(endTime, localTime);
        setTimeRemaining(remaining);
        if (remaining === 0 && onExpire) {
            onExpire();
        }
    }, [endTime, localTime, onExpire]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setLocalTime((prev) => (prev > 0 ? prev + 1 : prev));
        }, 0);
        const interval = setInterval(() => {
            setLocalTime((prev) => (prev > 0 ? prev + 1 : prev));
        }, 1000);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, []);

    const isExpired = timeRemaining === 0;
    const isUrgent = timeRemaining > 0 && timeRemaining < 300; // Less than 5 minutes

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return {
                    container: 'text-sm',
                    time: 'text-lg',
                    icon: 16,
                };
            case 'lg':
                return {
                    container: 'text-base',
                    time: 'text-5xl',
                    icon: 24,
                };
            case 'md':
            default:
                return {
                    container: 'text-base',
                    time: 'text-3xl',
                    icon: 20,
                };
        }
    };

    const sizeClasses = getSizeClasses();

    return (
        <div className={`flex flex-col items-center gap-2 ${sizeClasses.container}`}>
            {showIcon && (
                <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={sizeClasses.icon} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        Time Remaining
                    </span>
                </div>
            )}

            <div
                className={`font-mono font-black ${sizeClasses.time} ${
                    isExpired
                        ? 'text-red-500'
                        : isUrgent
                        ? 'text-amber-500 animate-pulse'
                        : 'text-white'
                }`}
            >
                {formatTimeRemaining(timeRemaining)}
            </div>

            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {isExpired ? 'Auction Ended' : formatTimeRemainingHuman(timeRemaining)}
            </div>
        </div>
    );
};

export default CountdownTimer;

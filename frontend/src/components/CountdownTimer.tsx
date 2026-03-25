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
    // Sanitize endTime: if it's in milliseconds (e.g. 1711382400000), convert to seconds
    const effectiveEndTime = endTime > 10000000000 ? Math.floor(endTime / 1000) : endTime;
    
    const timeRemaining = Math.max(0, effectiveEndTime - currentTimeSeconds);
    const isExpired = timeRemaining === 0;
    const isUrgent = timeRemaining > 0 && timeRemaining < 300; // Less than 5 minutes

    useEffect(() => {
        if (isExpired && onExpire) {
            onExpire();
        }
    }, [isExpired, onExpire]);

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
                    time: 'text-3xl sm:text-4xl md:text-5xl',
                    icon: 24,
                };
            case 'md':
            default:
                return {
                    container: 'text-[10px] sm:text-xs',
                    time: 'text-sm sm:text-base md:text-lg lg:text-xl',
                    icon: 16,
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
                className={`font-mono font-black whitespace-nowrap ${sizeClasses.time} ${
                    isExpired
                        ? 'text-red-500'
                        : isUrgent
                        ? 'text-amber-500 animate-pulse'
                        : 'text-white'
                }`}
            >
                {formatTimeRemaining(timeRemaining)}
            </div>
        </div>
    );
};

export default CountdownTimer;

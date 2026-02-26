import React, { useState, useEffect } from 'react';

interface CountdownProps {
    endTime: number; // unix timestamp in seconds
    isEnded: boolean;
    className?: string;
}

interface TimeLeft {
    hours: number;
    minutes: number;
    seconds: number;
    days: number;
}

function calcTimeLeft(endTime: number): TimeLeft {
    const diff = Math.max(0, endTime - Math.floor(Date.now() / 1000));
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return { days, hours, minutes, seconds };
}

const Countdown: React.FC<CountdownProps> = ({ endTime, isEnded, className = '' }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [expired, setExpired] = useState(isEnded);

    useEffect(() => {
        if (isEnded) {
            const timeout = setTimeout(() => {
                setExpired(true);
            }, 0);
            return () => clearTimeout(timeout);
        }
        const interval = setInterval(() => {
            const t = calcTimeLeft(endTime);
            setTimeLeft(t);
            if (t.days === 0 && t.hours === 0 && t.minutes === 0 && t.seconds === 0) {
                setExpired(true);
                clearInterval(interval);
            }
        }, 1000);
        const timeout = setTimeout(() => {
            const t = calcTimeLeft(endTime);
            setTimeLeft(t);
            if (t.days === 0 && t.hours === 0 && t.minutes === 0 && t.seconds === 0) {
                setExpired(true);
            }
        }, 0);
        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [endTime, isEnded]);

    if (expired || isEnded) {
        return (
            <span className={`text-red-400 font-semibold text-sm ${className}`}>
                Auction Ended
            </span>
        );
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    if (timeLeft.days > 0) {
        return (
            <span className={`font-mono font-bold text-emerald-400 ${className}`}>
                {timeLeft.days}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m
            </span>
        );
    }

    return (
        <span className={`font-mono font-bold ${timeLeft.hours === 0 && timeLeft.minutes < 10 ? 'text-orange-400' : 'text-emerald-400'} ${className}`}>
            {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
    );
};

export default Countdown;

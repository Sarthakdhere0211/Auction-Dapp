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
}

function calcTimeLeft(endTime: number): TimeLeft {
    const diff = Math.max(0, endTime - Math.floor(Date.now() / 1000));
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return { hours, minutes, seconds };
}

const Countdown: React.FC<CountdownProps> = ({ endTime, isEnded, className = '' }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });
    const [expired, setExpired] = useState(isEnded);

    useEffect(() => {
        if (isEnded) {
            setExpired(true);
            return;
        }
        const interval = setInterval(() => {
            const t = calcTimeLeft(endTime);
            setTimeLeft(t);
            if (t.hours === 0 && t.minutes === 0 && t.seconds === 0) {
                setExpired(true);
                clearInterval(interval);
            }
        }, 1000);
        const t = calcTimeLeft(endTime);
        setTimeLeft(t);
        if (t.hours === 0 && t.minutes === 0 && t.seconds === 0) {
            setExpired(true);
        }
        return () => clearInterval(interval);
    }, [endTime, isEnded]);

    if (expired || isEnded) {
        return (
            <span className={`text-red-400 font-black text-[10px] uppercase tracking-widest ${className}`}>
                Ended
            </span>
        );
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    return (
        <span className={`font-mono font-black ${timeLeft.hours === 0 && timeLeft.minutes < 10 ? 'text-orange-400' : 'text-emerald-400'} ${className}`}>
            {timeLeft.hours > 0 ? `${timeLeft.hours}h ` : ''}{pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
        </span>
    );
};

export default Countdown;

/**
 * Auction Status Utilities
 * 
 * Clean, type-safe auction state management
 */

export enum AuctionStatus {
    NOT_INITIALIZED = 'not_started',
    LIVE = 'live',
    ENDED = 'ended',
}

export interface AuctionStatusInfo {
    status: AuctionStatus;
    label: string;
    color: 'green' | 'red' | 'yellow';
    bgColor: string;
    textColor: string;
    borderColor: string;
    canBid: boolean;
}

/**
 * Determine auction status based on state
 */
export function getAuctionStatus(
    isInitialized: boolean,
    endTime: number | null,
    currentTimeSeconds: number
): AuctionStatus {
    // Not initialized
    if (!isInitialized || endTime === null) {
        return AuctionStatus.NOT_INITIALIZED;
    }

    // Check if ended
    if (currentTimeSeconds >= endTime) {
        return AuctionStatus.ENDED;
    }

    // Must be live
    return AuctionStatus.LIVE;
}

/**
 * Get status display information
 */
export function getStatusInfo(status: AuctionStatus): AuctionStatusInfo {
    switch (status) {
        case AuctionStatus.LIVE:
            return {
                status: AuctionStatus.LIVE,
                label: 'LIVE',
                color: 'green',
                bgColor: 'bg-emerald-500/10',
                textColor: 'text-emerald-500',
                borderColor: 'border-emerald-500/20',
                canBid: true,
            };

        case AuctionStatus.ENDED:
            return {
                status: AuctionStatus.ENDED,
                label: 'CAN REOPEN',
                color: 'yellow',
                bgColor: 'bg-amber-500/10',
                textColor: 'text-amber-500',
                borderColor: 'border-amber-500/20',
                canBid: true,
            };

        case AuctionStatus.NOT_INITIALIZED:
            return {
                status: AuctionStatus.NOT_INITIALIZED,
                label: 'OPEN',
                color: 'green',
                bgColor: 'bg-emerald-500/10',
                textColor: 'text-emerald-500',
                borderColor: 'border-emerald-500/20',
                canBid: true,
            };

        default:
            return {
                status: AuctionStatus.NOT_INITIALIZED,
                label: 'UNKNOWN',
                color: 'yellow',
                bgColor: 'bg-gray-500/10',
                textColor: 'text-gray-500',
                borderColor: 'border-gray-500/20',
                canBid: false,
            };
    }
}

/**
 * Calculate time remaining in seconds
 */
export function getTimeRemaining(endTime: number, currentTimeSeconds: number): number {
    return Math.max(0, endTime - currentTimeSeconds);
}

/**
 * Format time remaining into a clean, compact hours-based format (Hh Mm Ss).
 * Example: 3661 -> 1h 1m 1s
 */
export function formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) {
        return '00h 00m 00s';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
}

/**
 * Alias for backward compatibility with existing components
 */
export function formatTimeRemainingHuman(seconds: number): string {
    return formatTimeRemaining(seconds);
}

/**
 * Check if auction can accept bids
 */
export function mapAuctionStatus(statusCode: number): AuctionStatus {
    if (statusCode === 1) return AuctionStatus.LIVE;
    if (statusCode === 2) return AuctionStatus.ENDED;
    return AuctionStatus.NOT_INITIALIZED;
}

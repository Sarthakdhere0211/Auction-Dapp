/**
 * Bid Helper Utilities
 * 
 * Production-ready helpers for bid validation, formatting, and UX
 */

/**
 * Validate bid amount before submission
 */
export function validateBidAmount(
    amount: number,
    minBid: number,
    currentHighestBid: number,
    userBalance: string | null
): { valid: boolean; error?: string } {
    // Check if amount is a valid number
    if (isNaN(amount) || !isFinite(amount)) {
        return { valid: false, error: 'Please enter a valid number' };
    }

    // Check if amount is positive
    if (amount <= 0) {
        return { valid: false, error: 'Bid amount must be greater than 0' };
    }

    // Check if amount meets minimum bid
    if (amount < minBid) {
        return { 
            valid: false, 
            error: `Bid must be at least ${minBid.toLocaleString()} XLM` 
        };
    }

    // Check if amount is higher than current highest bid
    if (amount <= currentHighestBid) {
        return { 
            valid: false, 
            error: `Bid must be higher than ${currentHighestBid.toLocaleString()} XLM` 
        };
    }

    // Check if user has sufficient balance
    if (userBalance) {
        const balance = parseFloat(userBalance);
        if (amount > balance) {
            return { 
                valid: false, 
                error: `Insufficient balance. You have ${balance.toFixed(2)} XLM` 
            };
        }

        // Warn if bid would leave less than 1 XLM for fees
        if (balance - amount < 1) {
            return {
                valid: false,
                error: 'Please leave at least 1 XLM for transaction fees'
            };
        }
    }

    return { valid: true };
}

/**
 * Format XLM amount for display
 */
export function formatXLM(amount: number, decimals: number = 2): string {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Convert XLM to stroops (1 XLM = 10,000,000 stroops)
 */
export function xlmToStroops(xlm: number): bigint {
    return BigInt(Math.floor(xlm * 10_000_000));
}

/**
 * Convert stroops to XLM
 */
export function stroopsToXLM(stroops: bigint): number {
    return Number(stroops) / 10_000_000;
}

/**
 * Get Stellar Expert transaction URL
 */
export function getStellarExpertTxUrl(txHash: string, network: 'testnet' | 'public' = 'testnet'): string {
    return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

/**
 * Get Stellar Expert account URL
 */
export function getStellarExpertAccountUrl(address: string, network: 'testnet' | 'public' = 'testnet'): string {
    return `https://stellar.expert/explorer/${network}/account/${address}`;
}

/**
 * Get Stellar Expert contract URL
 */
export function getStellarExpertContractUrl(contractId: string, network: 'testnet' | 'public' = 'testnet'): string {
    return `https://stellar.expert/explorer/${network}/contract/${contractId}`;
}

/**
 * Shorten Stellar address for display
 */
export function shortenAddress(address: string, startChars: number = 4, endChars: number = 4): string {
    if (!address || address.length <= startChars + endChars) {
        return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Parse error message from Soroban contract
 */
export function parseSorobanError(error: string): string {
    // Common error patterns
    if (error.includes('MismatchingParameterLen')) {
        return 'Contract parameter mismatch. Please contact support.';
    }
    if (error.includes('UnexpectedSize')) {
        return 'Invalid transaction size. Please try again.';
    }
    if (error.includes('InsufficientBalance')) {
        return 'Insufficient XLM balance for this transaction.';
    }
    if (error.includes('AuctionEnded')) {
        return 'This auction has already ended.';
    }
    if (error.includes('BidTooLow')) {
        return 'Your bid is too low. Please bid higher.';
    }
    if (error.includes('User rejected')) {
        return 'Transaction was rejected in wallet.';
    }
    if (error.includes('timeout')) {
        return 'Transaction timed out. It may still succeed. Check Stellar Expert.';
    }

    // Return original error if no pattern matches
    return error;
}

/**
 * Calculate suggested bid amount (10% above current highest)
 */
export function calculateSuggestedBid(currentHighestBid: number, minIncrement: number = 1): number {
    const tenPercentHigher = currentHighestBid * 1.1;
    const withMinIncrement = currentHighestBid + minIncrement;
    return Math.max(tenPercentHigher, withMinIncrement);
}

/**
 * Check if auction is active
 */
export function isAuctionActive(endTime: number): boolean {
    return endTime > Math.floor(Date.now() / 1000);
}

/**
 * Get time remaining in seconds
 */
export function getTimeRemaining(endTime: number): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, endTime - now);
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'Ended';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

/**
 * Debounce function for input validation
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

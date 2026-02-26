/**
 * Soroban Contract Type Definitions
 * 
 * Type-safe interfaces for contract interactions
 */

import { xdr } from '@stellar/stellar-sdk';

/**
 * Contract method names
 */
export const CONTRACT_METHODS = {
    PLACE_BID: 'place_bid',
    CREATE_AUCTION: 'create_auction',
    END_AUCTION: 'end_auction',
    GET_AUCTION: 'get_auction',
    GET_BID_HISTORY: 'get_bid_history',
} as const;

/**
 * Contract call parameters for place_bid
 * 
 * CRITICAL: Contract signature is `place_bid(env: Env, bidder: Address, amount: i128)`
 * Must pass EXACTLY 2 arguments in this order
 */
export interface PlaceBidParams {
    /** Bidder's Stellar public key (G...) */
    bidder: string;
    /** Bid amount in stroops (1 XLM = 10,000,000 stroops) */
    amount: bigint;
}

/**
 * Contract call parameters for create_auction
 */
export interface CreateAuctionParams {
    seller: string;
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    durationSecs: bigint;
    minBid: bigint;
}

/**
 * Transaction result from contract call
 */
export interface ContractTxResult {
    /** Transaction hash */
    txHash: string;
    /** Whether transaction succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
    /** Result data from contract (if any) */
    result?: unknown;
}

/**
 * Transaction status during submission
 */
export type TxStatus = 'idle' | 'building' | 'simulating' | 'signing' | 'submitting' | 'confirming' | 'success' | 'failed';

/**
 * Transaction state for UI
 */
export interface TxState {
    status: TxStatus;
    txHash: string | null;
    error: string | null;
    progress: number; // 0-100
}

/**
 * Soroban RPC simulation result
 */
export interface SimulationResult {
    success: boolean;
    cost?: {
        cpuInsns: string;
        memBytes: string;
    };
    result?: xdr.ScVal;
    error?: string;
}

/**
 * Contract event types
 */
export enum ContractEventType {
    BID_PLACED = 'bid_placed',
    AUCTION_CREATED = 'auction_created',
    AUCTION_ENDED = 'auction_ended',
}

/**
 * Contract event data
 */
export interface ContractEvent {
    type: ContractEventType;
    auctionId: number;
    data: unknown;
    timestamp: number;
    txHash: string;
}

/**
 * Bid placed event data
 */
export interface BidPlacedEvent {
    auctionId: number;
    bidder: string;
    amount: number;
    timestamp: number;
}

/**
 * Auction created event data
 */
export interface AuctionCreatedEvent {
    auctionId: number;
    seller: string;
    title: string;
    minBid: number;
    endTime: number;
}

/**
 * Auction ended event data
 */
export interface AuctionEndedEvent {
    auctionId: number;
    winner: string | null;
    finalBid: number;
    timestamp: number;
}

/**
 * Contract error codes
 */
export enum ContractErrorCode {
    AUCTION_NOT_FOUND = 1,
    AUCTION_ENDED = 2,
    BID_TOO_LOW = 3,
    INSUFFICIENT_BALANCE = 4,
    UNAUTHORIZED = 5,
    INVALID_PARAMETERS = 6,
}

/**
 * Contract error with code and message
 */
export interface ContractError {
    code: ContractErrorCode;
    message: string;
    details?: string;
}

/**
 * Type guard for contract error
 */
export function isContractError(error: unknown): error is ContractError {
    return typeof error === 'object' && error !== null &&
        'code' in error && 'message' in error &&
        typeof (error as { code: unknown }).code === 'number' &&
        typeof (error as { message: unknown }).message === 'string';
}

/**
 * Validate bidder address format
 */
export function isValidStellarAddress(address: string): boolean {
    return /^G[A-Z0-9]{55}$/.test(address);
}

/**
 * Validate contract ID format
 */
export function isValidContractId(contractId: string): boolean {
    return /^C[A-Z0-9]{55}$/.test(contractId);
}

/**
 * Convert XLM to stroops
 */
export function xlmToStroops(xlm: number): bigint {
    if (!Number.isFinite(xlm) || xlm < 0) {
        throw new Error('Invalid XLM amount');
    }
    return BigInt(Math.floor(xlm * 10_000_000));
}

/**
 * Convert stroops to XLM
 */
export function stroopsToXLM(stroops: bigint): number {
    return Number(stroops) / 10_000_000;
}

/**
 * Validate place_bid parameters
 */
export function validatePlaceBidParams(params: PlaceBidParams): { valid: boolean; error?: string } {
    if (!params.bidder || !isValidStellarAddress(params.bidder)) {
        return { valid: false, error: 'Invalid bidder address' };
    }

    if (params.amount <= 0n) {
        return { valid: false, error: 'Bid amount must be greater than 0' };
    }

    // Check if amount is reasonable (not more than 1 trillion XLM in stroops)
    const maxStroops = BigInt(1_000_000_000_000) * BigInt(10_000_000);
    if (params.amount > maxStroops) {
        return { valid: false, error: 'Bid amount exceeds maximum allowed' };
    }

    return { valid: true };
}

/**
 * Format contract error for display
 */
export function formatContractError(error: ContractError | Error | string): string {
    if (typeof error === 'string') {
        return error;
    }

    if (isContractError(error)) {
        switch (error.code) {
            case ContractErrorCode.AUCTION_NOT_FOUND:
                return 'Auction not found';
            case ContractErrorCode.AUCTION_ENDED:
                return 'This auction has already ended';
            case ContractErrorCode.BID_TOO_LOW:
                return 'Your bid is too low. Please bid higher.';
            case ContractErrorCode.INSUFFICIENT_BALANCE:
                return 'Insufficient XLM balance';
            case ContractErrorCode.UNAUTHORIZED:
                return 'You are not authorized to perform this action';
            case ContractErrorCode.INVALID_PARAMETERS:
                return 'Invalid parameters provided';
            default:
                return error.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error occurred';
}

/**
 * Transaction builder options
 */
export interface TxBuilderOptions {
    /** Transaction fee in stroops (default: 100000) */
    fee?: string;
    /** Transaction timeout in seconds (default: 180) */
    timeout?: number;
    /** Network passphrase */
    networkPassphrase: string;
    /** Memo (optional) */
    memo?: string;
}

/**
 * Default transaction options for Soroban
 */
export const DEFAULT_TX_OPTIONS: Partial<TxBuilderOptions> = {
    fee: '100000', // 0.01 XLM
    timeout: 180, // 3 minutes
};

/**
 * Signing function type
 */
export type SigningFunction = (xdr: string) => Promise<string>;

/**
 * Contract call options
 */
export interface ContractCallOptions {
    /** Source account public key */
    sourceAccount: string;
    /** Contract ID */
    contractId: string;
    /** Method name */
    method: string;
    /** Method parameters */
    params: unknown[];
    /** Signing function */
    signFn: SigningFunction;
    /** Transaction options */
    txOptions?: Partial<TxBuilderOptions>;
}

/**
 * Poll transaction options
 */
export interface PollTxOptions {
    /** Maximum number of polls (default: 20) */
    maxPolls?: number;
    /** Interval between polls in ms (default: 2000) */
    pollInterval?: number;
    /** Callback for each poll */
    onPoll?: (attempt: number, status: string) => void;
}

import { useState, useEffect, useCallback } from 'react';
import { 
    getContractAuctionState, 
    getContractAuctionStatus,
    getContractIsInitialized,
    getContractIsLive,
    ContractAuctionState,
    initializeAuction,
    TxResult
} from '../contract';
import { signTransaction } from '../wallet';
import { NETWORK_PASSPHRASE } from '../contract';
import { AuctionStatus, mapAuctionStatus } from '../utils/auctionStatus';

export interface UseAuctionStateReturn {
    status: AuctionStatus | 'loading' | 'error';
    auctionState: ContractAuctionState | null;
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    initialize: (owner: string, startingPrice: number, durationMinutes: number) => Promise<TxResult>;
}

/**
 * Hook to manage auction contract state
 * 
 * Automatically checks initialization status and fetches auction data
 * Provides methods to initialize and refresh state
 */
export function useAuctionState(walletAddress: string | null): UseAuctionStateReturn {
    const [status, setStatus] = useState<AuctionStatus | 'loading' | 'error'>('loading');
    const [auctionState, setAuctionState] = useState<ContractAuctionState | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAuction = useCallback(async () => {
        const withTimeout = async <T>(p: Promise<T>, ms = 10000, label = 'request'): Promise<T> => {
            return await Promise.race<T>([
                p,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
            ]);
        };

        setIsLoading(true);
        setError(null);

        try {
            let statusCode: number;
            try {
                statusCode = await withTimeout(getContractAuctionStatus(), 10000, 'status');
            } catch {
                const initFallback = await withTimeout(getContractIsInitialized(), 8000, 'init');
                if (!initFallback) {
                    statusCode = 0;
                } else {
                    const liveFallback = await withTimeout(getContractIsLive(), 8000, 'live');
                    statusCode = liveFallback ? 1 : 2;
                }
            }
            const statusMapped = mapAuctionStatus(statusCode);
            const initialized = statusCode !== 0;
            setIsInitialized(initialized);

            if (!initialized) {
                setStatus(statusMapped);
                setAuctionState(null);
                console.log({
                    walletConnected: !!walletAddress,
                    auctionStatus: statusMapped,
                    contractState: null,
                    auctionData: null,
                });
                return;
            }

            const state = await withTimeout(getContractAuctionState(), 12000, 'state');
            setAuctionState(state);
            setStatus(statusMapped);

            console.log({
                walletConnected: !!walletAddress,
                auctionStatus: statusMapped,
                contractState: state,
                auctionData: null,
            });
        } catch (err) {
            try {
                let statusCode: number;
                try {
                    statusCode = await withTimeout(getContractAuctionStatus(), 8000, 'status');
                } catch {
                    const initFallback = await withTimeout(getContractIsInitialized(), 6000, 'init');
                    if (!initFallback) {
                        statusCode = 0;
                    } else {
                        const liveFallback = await withTimeout(getContractIsLive(), 6000, 'live');
                        statusCode = liveFallback ? 1 : 2;
                    }
                }
                const statusMapped = mapAuctionStatus(statusCode);
                setStatus(statusMapped);
                setAuctionState(null);
                setError((err as Error).message);
            } catch {
                setStatus(AuctionStatus.NOT_INITIALIZED);
                setAuctionState(null);
                setError((err as Error).message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress]);

    const refresh = useCallback(async () => {
        await fetchAuction();
    }, [fetchAuction]);

    const initialize = useCallback(async (
        owner: string,
        startingPrice: number,
        durationMinutes: number
    ): Promise<TxResult> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await initializeAuction(
                owner,
                startingPrice,
                durationMinutes,
                async (xdr) => {
                    return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
                }
            );

            if (result.success) {
                await refresh();
            } else {
                setError(result.error || 'Initialization failed');
            }

            return result;
        } catch (err) {
            const errorMsg = (err as Error).message;
            setError(errorMsg);
            return {
                txHash: '',
                success: false,
                error: errorMsg
            };
        } finally {
            setIsLoading(false);
        }
    }, [refresh]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchAuction();
        }, 0);
        return () => clearTimeout(timeout);
    }, [fetchAuction]);

    useEffect(() => {
        if (status !== AuctionStatus.LIVE) return;

        const interval = setInterval(() => {
            fetchAuction();
        }, 5000);

        return () => clearInterval(interval);
    }, [status, fetchAuction]);

    return {
        status,
        auctionState,
        isInitialized,
        isLoading,
        error,
        refresh,
        initialize,
    };
}

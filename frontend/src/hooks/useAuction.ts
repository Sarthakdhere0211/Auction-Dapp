import { useState, useEffect, useCallback } from 'react';
import { 
    getContractAuctionState, 
    getContractAuctionStatus, 
    ContractAuctionState, 
    PlaceBidResult, 
    placeBid, 
    buyNow, 
    finalizeAuction,
    NETWORK_PASSPHRASE
} from '../contract';
import { signTransaction } from '../wallet';
import { AuctionStatus, mapAuctionStatus } from '../utils/auctionStatus';

export function useAuction(publicKey: string | null) {
    const [status, setStatus] = useState<AuctionStatus | 'loading' | 'error'>('loading');
    const [auctionState, setAuctionState] = useState<ContractAuctionState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const statusCode = await getContractAuctionStatus();
            const statusMapped = mapAuctionStatus(statusCode);
            const state = await getContractAuctionState();
            setAuctionState(state);
            setStatus(statusMapped);
        } catch (err) {
            console.error("Auction fetch error:", err);
            setStatus('error');
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 5000);
        return () => clearInterval(interval);
    }, [refresh]);

    const bid = async (amount: number): Promise<PlaceBidResult> => {
        if (!publicKey) return { success: false, txHash: '', error: 'Wallet not connected' };
        return placeBid(publicKey, amount, async (xdr) => {
            return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
        });
    };

    const purchaseNow = async (): Promise<PlaceBidResult> => {
        if (!publicKey) return { success: false, txHash: '', error: 'Wallet not connected' };
        return buyNow(publicKey, async (xdr) => {
            return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
        });
    };

    const settle = async (): Promise<PlaceBidResult> => {
        if (!publicKey) return { success: false, txHash: '', error: 'Wallet not connected' };
        return finalizeAuction(publicKey, async (xdr) => {
            return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
        });
    };

    return { status, auctionState, loading, error, refresh, bid, purchaseNow, settle };
}

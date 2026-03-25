import { useState, useEffect, useCallback } from 'react';
import { 
    getTokenBalance, 
    getAllowance, 
    approveToken, 
    requestFaucetTokens, 
    NETWORK_PASSPHRASE, 
    CONTRACT_ID,
    TxResult
} from '../contract';
import { signTransaction } from '../wallet';

export function useToken(publicKey: string | null) {
    const [balance, setBalance] = useState<string>('0.00');
    const [allowance, setAllowance] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);
        console.log(`[useToken] Fetching balance for: ${publicKey}`);
        try {
            const [bal, allow] = await Promise.all([
                getTokenBalance(publicKey),
                CONTRACT_ID ? getAllowance(publicKey, CONTRACT_ID) : Promise.resolve(0)
            ]);
            console.log(`[useToken] Raw balance fetched: ${bal}`);
            setBalance(bal);
            setAllowance(allow);
        } catch (err) {
            console.error("[useToken] Token fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const approve = async (amount: number): Promise<TxResult> => {
        if (!publicKey) return { success: false, txHash: '', error: 'Wallet not connected' };
        return approveToken(publicKey, amount, async (xdr) => {
            return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
        });
    };

    const getFaucet = async (): Promise<TxResult> => {
        if (!publicKey) return { success: false, txHash: '', error: 'Wallet not connected' };
        return requestFaucetTokens(publicKey, async (xdr) => {
            return await signTransaction(xdr, NETWORK_PASSPHRASE, 'freighter');
        });
    };

    return { balance, allowance, loading, refresh, approve, getFaucet };
}

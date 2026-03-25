import { useState, useEffect, useCallback } from "react";
import {
  getContractAuctionState,
  getContractAuctionStatus,
  ContractAuctionState,
  initializeAuction,
  TxResult,
} from "../contract";

import { signTransaction } from "../wallet";
import { NETWORK_PASSPHRASE } from "../contract";
import { AuctionStatus, mapAuctionStatus } from "../utils/auctionStatus";

export interface UseAuctionStateReturn {
  status: AuctionStatus | "loading" | "error";
  auctionState: ContractAuctionState | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  initialize: (
    owner: string,
    startingPrice: number,
    durationMinutes: number,
    buyNowPrice?: number | null
  ) => Promise<TxResult>;
}

export function useAuctionState(
  _walletAddress: string | null
): UseAuctionStateReturn {
  void _walletAddress;
  const [status, setStatus] = useState<AuctionStatus | "loading" | "error">(
    "loading"
  );
  const [auctionState, setAuctionState] =
    useState<ContractAuctionState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuction = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const statusCode = await getContractAuctionStatus();
      const statusMapped = mapAuctionStatus(statusCode);
      const state = await getContractAuctionState();

      setIsInitialized(state.is_initialized);
      setAuctionState(state);
      setStatus(statusMapped);
    } catch (err) {
      console.error("Auction fetch error:", err);
      setStatus(AuctionStatus.NOT_INITIALIZED);
      setAuctionState(null);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchAuction();
  }, [fetchAuction]);

  const initialize = useCallback(
    async (
      owner: string,
      startingPrice: number,
      durationMinutes: number,
      buyNowPrice: number | null = null
    ): Promise<TxResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await initializeAuction(
          owner,
          startingPrice,
          durationMinutes,
          buyNowPrice,
          async (xdr) => {
            return await signTransaction(xdr, NETWORK_PASSPHRASE, "freighter");
          }
        );

        if (result.success) {
          await refresh();
        } else {
          setError(result.error || "Initialization failed");
        }

        return result;
      } catch (err) {
        const errorMsg = (err as Error).message;

        setError(errorMsg);

        return {
          txHash: "",
          success: false,
          error: errorMsg,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  useEffect(() => {
    if (status !== AuctionStatus.LIVE && status !== AuctionStatus.NOT_INITIALIZED && status !== AuctionStatus.ENDED) return;

    const interval = setInterval(fetchAuction, 5000);

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

export interface BidDeps {
  isInitialized: () => Promise<boolean>;
  getStatus: () => Promise<number>;
  initialize: (owner: string, startPriceXlm: number, durationMins: number) => Promise<{ success: boolean; txHash: string; error?: string }>;
  bid: (amountXlm: number) => Promise<{ success: boolean; txHash: string; error?: string }>;
}

export async function orchestrateBid(
  bidder: string,
  amountXlm: number,
  durationMins: number,
  deps: BidDeps
): Promise<{ success: boolean; txHash: string; error?: string }> {
  const init = await deps.isInitialized();
  if (!init) {
    const startPrice = Math.max(0, amountXlm - 0.01);
    const res = await deps.initialize(bidder, startPrice, durationMins);
    if (!res.success) {
      return { success: false, txHash: '', error: res.error || 'Initialization failed' };
    }
  }
  const status = await deps.getStatus();
  if (status !== 1) {
    return { success: false, txHash: '', error: 'Auction not live' };
  }
  const bidRes = await deps.bid(amountXlm);
  return bidRes;
}

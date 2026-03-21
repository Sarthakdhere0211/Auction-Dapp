export interface BidDeps {
  bid: (amountXlm: number) => Promise<{ success: boolean; txHash: string; error?: string }>;
}

/**
 * Orchestrates placing a bid. The auction does not require initialization;
 * the first bid initializes the contract. This helper only calls bid().
 */
export async function orchestrateBid(
  _bidder: string,
  amountXlm: number,
  _durationMins: number,
  deps: BidDeps
): Promise<{ success: boolean; txHash: string; error?: string }> {
  return deps.bid(amountXlm);
}

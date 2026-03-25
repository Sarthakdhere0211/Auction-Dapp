import { useState, useCallback } from 'react';
import { 
    getTokenBalance, 
    approveToken, 
    getAllowance, 
    placeBid, 
    CONTRACT_ID,
    NETWORK_PASSPHRASE
} from '../contract';
import toast from 'react-hot-toast';

export function useBid(walletAddress: string | null, signFn: (xdr: string) => Promise<string>) {
  const [loading, setLoading] = useState(false);

  const handlePlaceBid = useCallback(async (amount: number) => {
    if (!walletAddress) {
      toast.error('Wallet not connected');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Initiating bid sequence...');

    try {
      console.log("--- [useBid] START ---");
      console.log("Wallet:", walletAddress);
      console.log("Auction Contract:", CONTRACT_ID);
      console.log("Bid Amount (TOK):", amount);

      // 1. Check Balance first
      const balanceStr = await getTokenBalance(walletAddress);
      const balance = parseFloat(balanceStr);
      console.log("User Balance:", balance);

      if (balance < amount) {
        throw new Error(`Insufficient balance. Have ${balance} TOK, need ${amount} TOK`);
      }

      // 2. Verify Allowance
      console.log("Verifying current allowance...");
      const allowance = await getAllowance(walletAddress, CONTRACT_ID);
      console.log("Current Allowance:", allowance);

      // 3. Conditional Approval
      if (allowance < amount) {
        toast.loading(`Step 1/2: Approving ${amount} TOK...`, { id: toastId });
        console.log(`Insufficient allowance (${allowance} < ${amount}). Requesting approval...`);
        
        // We approve slightly more to avoid repeated approvals for small bid increments
        const approveAmount = amount + 50; 
        const approveRes = await approveToken(walletAddress, approveAmount, signFn);
        
        if (!approveRes.success) {
          throw new Error(approveRes.error || "Token approval failed.");
        }
        
        console.log("Approval transaction successful.");
        toast.success('Tokens approved!', { id: toastId });
        
        // Wait for ledger to finalize approval before placing bid
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log("Allowance sufficient. Skipping approval.");
      }

      // 4. Place Bid
      toast.loading('Step 2/2: Confirming bid on blockchain...', { id: toastId });
      console.log(`Placing bid of ${amount} TOK...`);
      
      const bidRes = await placeBid(walletAddress, amount, signFn);
      
      if (!bidRes.success) {
        throw new Error(bidRes.error || "Bid submission failed.");
      }

      console.log("Bid Success:", bidRes);
      console.log("--- [useBid] COMPLETE ---");
      toast.success(`Successfully placed bid of ${amount} TOK!`, { id: toastId });

    } catch (err: any) {
      console.error("--- [useBid] FAILED ---");
      console.error(err);
      toast.error(err.message || 'Bidding failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, signFn]);

  return { handlePlaceBid, loading };
}

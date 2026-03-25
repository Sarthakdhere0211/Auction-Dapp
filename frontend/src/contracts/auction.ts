import {
  Contract,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  Networks,
} from "@stellar/stellar-sdk";
import { getEnv } from "../env";

const ENV = getEnv();

// Constants
const RPC_URL = ENV.SOROBAN_RPC_URL;
const server = new rpc.Server(RPC_URL);
const NETWORK_PASSPHRASE = ENV.STELLAR_NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
const AUCTION_CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "CC2XWKWSI44EKC6W4EACZXTXQVHK32GIWPOP7RFDRMXLMVNFPFCC2W2X";

/**
 * Place a bid in the auction contract
 * Note: Tokens are pulled via transfer_from, so approveToken must be called first
 */
export async function placeBid(
  userAddress: string,
  amount: number,
  signFn: (xdr: string) => Promise<string>
) {
  try {
    const amountInStroops = BigInt(Math.floor(amount * 10_000_000));
    const contract = new Contract(AUCTION_CONTRACT_ID);

    console.log(`[placeBid] Wallet: ${userAddress}`);
    console.log(`[placeBid] Amount: ${amount} (${amountInStroops} stroops)`);

    const account = await server.getAccount(userAddress);
    const tx = new TransactionBuilder(account, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "place_bid",
          nativeToScVal(userAddress, { type: "address" }),
          nativeToScVal(amountInStroops, { type: "i128" })
        )
      )
      .setTimeout(180)
      .build();

    // 1. Simulate
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Bid Simulation failed: ${JSON.stringify(sim.error)}`);
    }

    // 2. Assemble
    const assembled = rpc.assembleTransaction(tx, sim).build();

    // 3. Sign
    const signedXdr = await signFn(assembled.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    
    // 4. Submit
    const submission = await server.sendTransaction(signedTx);
    console.log("[placeBid] Result:", submission);
    
    if (submission.status === "ERROR") throw new Error("Bid submission failed");
    return submission;
  } catch (err) {
    console.error("[placeBid] Error:", err);
    throw err;
  }
}

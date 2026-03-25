import {
  Contract,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Networks,
} from "@stellar/stellar-sdk";
import { getEnv } from "../env";

const ENV = getEnv();

// Constants
const RPC_URL = ENV.SOROBAN_RPC_URL;
const server = new rpc.Server(RPC_URL);
const NETWORK_PASSPHRASE = ENV.STELLAR_NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
const TOKEN_ID = import.meta.env.VITE_TOKEN_ID || "CDEEXI3H4PXMIXCVGINFDCHDKPLRJJXWJFMK6P2MFRPBQHVYEP2D74VB";
const AUCTION_ID = import.meta.env.VITE_CONTRACT_ID || "CC2XWKWSI44EKC6W4EACZXTXQVHK32GIWPOP7RFDRMXLMVNFPFCC2W2X";

/**
 * Get current allowance for auction contract to spend user's tokens
 */
export async function getAllowance(userAddress: string, spenderAddress: string): Promise<number> {
  try {
    const contract = new Contract(TOKEN_ID);
    const op = contract.call(
      "allowance",
      nativeToScVal(userAddress, { type: "address" }),
      nativeToScVal(spenderAddress, { type: "address" })
    );

    const account = await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) return 0;

    const rawValue = scValToNative(sim.result!.retval);
    // Convert from stroops (7 decimals) to UI number
    return Number(rawValue) / 10_000_000;
  } catch (err) {
    console.error("[getAllowance] Error:", err);
    return 0;
  }
}

/**
 * Fetch token balance for a specific address
 */
export async function getBalance(address: string): Promise<string> {
  try {
    const contract = new Contract(TOKEN_ID);
    const op = contract.call("balance", nativeToScVal(address, { type: "address" }));
    
    // Simulation dummy account
    const account = await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    const tx = new TransactionBuilder(account, { 
      fee: "100", 
      networkPassphrase: NETWORK_PASSPHRASE 
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) return "0.00";
    
    const rawValue = scValToNative(sim.result!.retval);
    return (Number(rawValue) / 10_000_000).toFixed(2);
  } catch (err) {
    console.error("[getBalance] Error:", err);
    return "0.00";
  }
}

/**
 * Approve tokens for the auction contract
 */
export async function approveToken(
  userAddress: string,
  spenderAddress: string,
  amount: number,
  signFn: (xdr: string) => Promise<string>
) {
  try {
    // 1 TOK = 10,000,000 stroops (7 decimals)
    const amountInStroops = BigInt(Math.floor(amount * 10_000_000));
    const contract = new Contract(TOKEN_ID);
    
    const latestLedger = (await server.getLatestLedger()).sequence;
    const expirationLedger = latestLedger + 2000; // Increased expiration

    console.log(`[approveToken] Wallet: ${userAddress}`);
    console.log(`[approveToken] Spender: ${spenderAddress}`);
    console.log(`[approveToken] Amount: ${amount} TOK (${amountInStroops} stroops)`);

    const account = await server.getAccount(userAddress);
    const tx = new TransactionBuilder(account, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "approve",
          nativeToScVal(userAddress, { type: "address" }),
          nativeToScVal(spenderAddress, { type: "address" }),
          nativeToScVal(amountInStroops, { type: "i128" }),
          nativeToScVal(expirationLedger, { type: "u32" })
        )
      )
      .setTimeout(180)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Approval Simulation failed: ${JSON.stringify(sim.error)}`);
    }

    const assembled = rpc.assembleTransaction(tx, sim).build();
    const signedXdr = await signFn(assembled.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    
    const submission = await server.sendTransaction(signedTx);
    console.log("[approveToken] Success:", submission);
    
    if (submission.status === "ERROR") throw new Error("Approval submission failed");
    return submission;
  } catch (err) {
    console.error("[approveToken] Error:", err);
    throw err;
  }
}

/**
 * Mint tokens (Admin only)
 */
export async function mintToken(
  adminAddress: string,
  recipient: string,
  amount: number,
  signFn: (xdr: string) => Promise<string>
) {
  try {
    const amountInStroops = BigInt(Math.floor(amount * 10_000_000));
    const contract = new Contract(TOKEN_ID);
    
    const account = await server.getAccount(adminAddress);
    const tx = new TransactionBuilder(account, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "mint",
          nativeToScVal(recipient, { type: "address" }),
          nativeToScVal(amountInStroops, { type: "i128" })
        )
      )
      .setTimeout(180)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new Error(`Mint Simulation failed: ${JSON.stringify(sim.error)}`);

    const assembled = rpc.assembleTransaction(tx, sim).build();
    const signedXdr = await signFn(assembled.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    
    const submission = await server.sendTransaction(signedTx);
    console.log("[mintToken] Result:", submission);
    
    return submission;
  } catch (err) {
    console.error("[mintToken] Error:", err);
    throw err;
  }
}

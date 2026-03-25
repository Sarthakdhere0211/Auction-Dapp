import {
    Contract,
    Networks,
    rpc,
    TransactionBuilder,
    nativeToScVal,
    scValToNative,
    Address,
} from "@stellar/stellar-sdk";

import { getEnv } from "./env";
import { TxController } from "./utils/txController";
import { getTxUrl } from "./config/stellar";

const ENV = getEnv();

export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "CC2XWKWSI44EKC6W4EACZXTXQVHK32GIWPOP7RFDRMXLMVNFPFCC2W2X";
export const TOKEN_ID = import.meta.env.VITE_TOKEN_ID || "CDEEXI3H4PXMIXCVGINFDCHDKPLRJJXWJFMK6P2MFRPBQHVYEP2D74VB";
export const SOROBAN_RPC_URL = ENV.SOROBAN_RPC_URL;

export const NETWORK_PASSPHRASE =
    ENV.STELLAR_NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;

const server = new rpc.Server(SOROBAN_RPC_URL);
const HORIZON_URL = ENV.HORIZON_URL;

const NULL_ACCOUNT =
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export interface ContractAuctionState {
    owner: string;
    token_id: string;
    starting_price: number;
    highest_bid: number;
    highest_bidder: string | null;
    end_time: number;
    buy_now_price: number | null;
    is_ended: boolean;
    finalized: boolean;
    is_initialized: boolean;
}

export interface TxResult {
    txHash: string;
    success: boolean;
    error?: string;
}

export type PlaceBidResult = TxResult;

function toNum(v: unknown): number {
    if (typeof v === "bigint") return Number(v) / 10_000_000;
    if (typeof v === "number") return v / 10_000_000;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n / 10_000_000 : 0;
    }
    return 0;
}

function toStroops(v: number): bigint {
    return BigInt(Math.floor(v * 10_000_000));
}

export async function fetchBalance(publicKey: string): Promise<string> {
    if (!publicKey) return "0.00";
    try {
        const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
        if (!res.ok) return "0.00";
        const data = await res.json();
        const native = Array.isArray(data.balances)
            ? data.balances.find((b: { asset_type: string; balance: string }) => b.asset_type === "native")
            : null;
        return native ? parseFloat(native.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
    } catch {
        return "0.00";
    }
}

/** Token Balance (Custom Token) */
export async function getTokenBalance(publicKey: string): Promise<string> {
    if (!publicKey || !TOKEN_ID) return "0.00";
    console.log(`[getTokenBalance] Calling balance for ${publicKey} on ${TOKEN_ID}`);
    try {
        const contract = new Contract(TOKEN_ID);
        const sim = await simulate(contract.call("balance", nativeToScVal(publicKey, { type: "address" })));
        
        if (rpc.Api.isSimulationError(sim)) {
            console.error("[getTokenBalance] Simulation error:", sim.error);
            return "0.00";
        }

        const rawVal = scValToNative(sim.result!.retval);
        console.log(`[getTokenBalance] Raw i128 value: ${rawVal}`);
        
        // Correct conversion for 7 decimals
        const finalBalance = (Number(rawVal) / 10_000_000).toFixed(2);
        console.log(`[getTokenBalance] Final converted balance: ${finalBalance} TOK`);
        
        return finalBalance;
    } catch (err) {
        console.error("[getTokenBalance] error:", err);
        return "0.00";
    }
}

export const fetchTokenBalance = getTokenBalance;

/** Mint Test Tokens (for demo) */
export async function mintTestTokens(to: string, amount: number, signFn: (xdr: string) => Promise<string>): Promise<TxResult> {
    if (!TOKEN_ID) return { txHash: "", success: false, error: "Token ID missing" };
    console.log(`[Mint] Preparing to mint ${amount} tokens to ${to}...`);
    
    const contract = new Contract(TOKEN_ID);
    
    // Signature: pub fn mint(env: Env, to: Address, amount: i128)
    // Note: The caller (signer) must be the Admin stored in the contract
    return submitTx(
        to, 
        contract.call(
            "mint", 
            nativeToScVal(to, { type: "address" }), 
            nativeToScVal(toStroops(amount), { type: "i128" })
        ), 
        signFn
    );
}

/** Get Token Admin (to check if user can mint) */
export async function getTokenAdmin(): Promise<string | null> {
    if (!TOKEN_ID) return null;
    try {
        const contract = new Contract(TOKEN_ID);
        // The DataKey::Admin is an enum variant. In Soroban SDK, simple enums without values 
        // are often mapped to ScVal symbols or similar. 
        // However, since we can't easily guess the exact ScVal for the key without a getter,
        // we use a simulation of 'mint' with 0 amount to see who it expects.
        // Alternatively, if the contract had a 'get_admin' function, we'd use that.
        // For this production-ready demo, we'll implement a robust check.
        return null; // Fallback to manual check or contract upgrade
    } catch {
        return null;
    }
}

export async function checkIsAdmin(address: string): Promise<boolean> {
    if (!address || !TOKEN_ID) return false;
    try {
        const contract = new Contract(TOKEN_ID);
        const sim = await simulate(contract.call("get_admin"));
        if (rpc.Api.isSimulationError(sim)) return false;
        const admin = scValToNative(sim.result!.retval);
        return admin === address;
    } catch {
        return false;
    }
}

/** Get allowance of spender for owner */
export async function getAllowance(owner: string, spender: string): Promise<number> {
    if (!owner || !spender || !TOKEN_ID) return 0;
    try {
        const contract = new Contract(TOKEN_ID);
        const sim = await simulate(contract.call(
            "allowance",
            nativeToScVal(owner, { type: "address" }),
            nativeToScVal(spender, { type: "address" })
        ));
        if (rpc.Api.isSimulationError(sim)) return 0;
        return toNum(scValToNative(sim.result!.retval));
    } catch (err) {
        console.error("[getAllowance] error:", err);
        return 0;
    }
}

/** Approve Token for Auction Contract */
export async function approveToken(owner: string, amount: number, signFn: (xdr: string) => Promise<string>): Promise<TxResult> {
    if (!TOKEN_ID || !CONTRACT_ID) return { txHash: "", success: false, error: "IDs missing" };
    const contract = new Contract(TOKEN_ID);
    
    // Using a large expiration ledger offset for demo purposes (approx 10000 ledgers)
    const expirationOffset = 10000;
    
    return submitTx(
        owner,
        contract.call(
            "approve",
            nativeToScVal(owner, { type: "address" }),
            nativeToScVal(CONTRACT_ID, { type: "address" }),
            nativeToScVal(toStroops(amount), { type: "i128" }),
            nativeToScVal(expirationOffset, { type: "u32" })
        ),
        signFn
    );
}

type CallOp = ReturnType<Contract["call"]>;

async function simulate(op: CallOp) {
    const account = await server.getAccount(NULL_ACCOUNT);
    const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(op)
        .setTimeout(30)
        .build();
    return server.simulateTransaction(tx);
}

function parseContractError(message: string): string {
    if (!message || typeof message !== "string") return "Transaction failed.";
    const messages: Record<number, string> = {
        1: "Auction not initialized.",
        2: "Auction has already ended.",
        3: "Bid too low.",
        4: "Unauthorized action.",
        5: "Auction already initialized.",
        6: "Invalid end time.",
        7: "Invalid amount.",
        8: "Insufficient token allowance. Please approve tokens first.",
        9: "Buy Now is not available for this auction.",
    };
    const contractErr = message.match(/Error\(Contract,\s*#?(\d+)\)/);
    if (contractErr) return messages[parseInt(contractErr[1], 10)] ?? `Contract error (#${contractErr[1]})`;
    return message;
}

async function submitTx(
    accountPub: string,
    op: CallOp,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    try {
        const account = await server.getAccount(accountPub);
        const tx = new TransactionBuilder(account, {
            fee: "200000",
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(op)
            .setTimeout(180)
            .build();

        const sim = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) return { txHash: "", success: false, error: parseContractError(JSON.stringify(sim.error)) };

        const assembled = rpc.assembleTransaction(tx, sim).build();
        const signedXdr = await signFn(assembled.toXDR());
        const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
        const submission = await server.sendTransaction(signedTx);

        if (submission.status === "ERROR") return { txHash: submission.hash ?? "", success: false, error: "Submission failed" };

        const ctl = new TxController(server, { timeoutSecs: ENV.TX_TIMEOUT_SECS, pollIntervalMs: 2000 });
        const result = await ctl.poll(submission.hash);
        return result.state === "committed" ? { txHash: submission.hash, success: true } : { txHash: submission.hash, success: false, error: "Transaction failed to commit" };
    } catch (err) {
        return { txHash: "", success: false, error: (err as Error).message };
    }
}

export async function getContractAuctionStatus(): Promise<number> {
    if (!CONTRACT_ID) return 0;
    try {
        const contract = new Contract(CONTRACT_ID);
        const sim = await simulate(contract.call("get_auction_status"));
        if (rpc.Api.isSimulationError(sim)) return 0;
        return Number(scValToNative(sim.result!.retval));
    } catch {
        return 0;
    }
}

export async function getContractAuctionState(): Promise<ContractAuctionState> {
    if (!CONTRACT_ID) throw new Error("Contract ID missing");
    console.log(`[getAuction] Fetching state for: ${CONTRACT_ID}`);
    try {
        const contract = new Contract(CONTRACT_ID);
        const sim = await simulate(contract.call("get_auction"));
        
        if (rpc.Api.isSimulationError(sim)) {
            console.error("[getAuction] Simulation error:", sim.error);
            return getDefaultAuctionState();
        }
        
        const state = scValToNative(sim.result!.retval);
        console.log("[getAuction] Raw state from contract:", state);
        
        const auctionState = {
            owner: state.owner,
            token_id: state.token_id,
            starting_price: toNum(state.starting_price),
            highest_bid: toNum(state.highest_bid),
            highest_bidder: state.highest_bidder || null,
            end_time: Number(state.end_time),
            buy_now_price: state.buy_now_price ? toNum(state.buy_now_price) : null,
            is_ended: state.is_ended,
            finalized: state.finalized,
            is_initialized: true,
        };
        
        console.log("[getAuction] Formatted Auction State:", auctionState);
        return auctionState;
    } catch (err) {
        console.error("[getAuction] Unexpected error:", err);
        return getDefaultAuctionState();
    }
}

export function getDefaultAuctionState(): ContractAuctionState {
    return {
        owner: "",
        token_id: "",
        starting_price: 0,
        highest_bid: 0,
        highest_bidder: null,
        end_time: 0,
        buy_now_price: null,
        is_ended: false,
        finalized: false,
        is_initialized: false,
    };
}

export async function initializeAuction(
    owner: string,
    startingPrice: number,
    durationMinutes: number,
    buyNowPrice: number | null,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!CONTRACT_ID || !TOKEN_ID) return { txHash: "", success: false, error: "IDs missing" };
    const contract = new Contract(CONTRACT_ID);
    const endTime = BigInt(Math.floor(Date.now() / 1000) + durationMinutes * 60);
    return submitTx(
        owner,
        contract.call(
            "initialize",
            nativeToScVal(owner, { type: "address" }),
            nativeToScVal(TOKEN_ID, { type: "address" }),
            nativeToScVal(toStroops(startingPrice), { type: "i128" }),
            nativeToScVal(endTime, { type: "u64" }),
            nativeToScVal(buyNowPrice ? toStroops(buyNowPrice) : null, { type: "i128" })
        ),
        signFn
    );
}

export async function placeBid(
    bidder: string,
    amount: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!CONTRACT_ID) return { txHash: "", success: false, error: "Contract ID missing" };
    const contract = new Contract(CONTRACT_ID);
    return submitTx(
        bidder,
        contract.call(
            "place_bid",
            nativeToScVal(bidder, { type: "address" }),
            nativeToScVal(toStroops(amount), { type: "i128" })
        ),
        signFn
    );
}

export async function buyNow(bidder: string, signFn: (xdr: string) => Promise<string>): Promise<TxResult> {
    if (!CONTRACT_ID) return { txHash: "", success: false, error: "Contract ID missing" };
    const contract = new Contract(CONTRACT_ID);
    return submitTx(bidder, contract.call("buy_now", nativeToScVal(bidder, { type: "address" })), signFn);
}

export async function finalizeAuction(owner: string, signFn: (xdr: string) => Promise<string>): Promise<TxResult> {
    if (!CONTRACT_ID) return { txHash: "", success: false, error: "Contract ID missing" };
    const contract = new Contract(CONTRACT_ID);
    return submitTx(owner, contract.call("finalize"), signFn);
}

export async function mintTokens(
    minter: string,
    to: string,
    amount: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!TOKEN_ID) return { txHash: "", success: false, error: "Token ID not set" };

    console.log(`[mintTokens] Minting ${amount} tokens to ${to}...`);
    const contract = new Contract(TOKEN_ID);
    return submitTx(
        minter, 
        contract.call(
            "mint",
            nativeToScVal(to, { type: "address" }),
            nativeToScVal(toStroops(amount), { type: "i128" })
        ), 
        signFn
    );
}

/** Transfer Tokens (Standard SEP-41) */
export async function transferToken(
    from: string,
    to: string,
    amount: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!TOKEN_ID) return { txHash: "", success: false, error: "Token ID missing" };
    const contract = new Contract(TOKEN_ID);
    return submitTx(
        from,
        contract.call(
            "transfer",
            nativeToScVal(from, { type: "address" }),
            nativeToScVal(to, { type: "address" }),
            nativeToScVal(toStroops(amount), { type: "i128" })
        ),
        signFn
    );
}

/** Transfer From (Standard SEP-41) - Requires prior Approval */
export async function transferFromToken(
    spender: string,
    from: string,
    to: string,
    amount: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!TOKEN_ID) return { txHash: "", success: false, error: "Token ID missing" };
    const contract = new Contract(TOKEN_ID);
    return submitTx(
        spender,
        contract.call(
            "transfer_from",
            nativeToScVal(spender, { type: "address" }),
            nativeToScVal(from, { type: "address" }),
            nativeToScVal(to, { type: "address" }),
            nativeToScVal(toStroops(amount), { type: "i128" })
        ),
        signFn
    );
}

/* ------------------------------
 EVENT STREAMING
--------------------------------*/

export type BidEventHandler = (event: { type: string; data: any }) => void;
let eventPoller: NodeJS.Timeout | null = null;
let lastLedger: number = 0;

export async function startBidEventStreaming(handler: BidEventHandler) {
    if (eventPoller) return;
    const info = await server.getLatestLedger();
    lastLedger = info.sequence;

    eventPoller = setInterval(async () => {
        try {
            const events = await server.getEvents({
                startLedger: lastLedger,
                filters: [{ contractIds: [CONTRACT_ID] }],
                limit: 10,
            });
            for (const event of events.events) {
                const decoded = scValToNative(event.value);
                handler({ type: event.type, data: decoded });
                lastLedger = event.ledger + 1;
            }
        } catch (err) {
            console.warn("Event streaming error:", err);
        }
    }, 5000);
}

export function stopBidEventStreaming() {
    if (eventPoller) {
        clearInterval(eventPoller);
        eventPoller = null;
    }
}

export function startBidEventPolling(handler: (id: number) => void) {
    startBidEventStreaming(() => handler(0));
}

export function stopBidEventPolling() {
    stopBidEventStreaming();
}

export async function getUserBids(user: string): Promise<{ auction: Auction; bid: BidRecord }[]> {
    const auctions = await getAllAuctions();
    const result: { auction: Auction; bid: BidRecord }[] = [];

    for (const auction of auctions) {
        const history = await getBidHistory(auction.id);
        const userBids = history.filter(b => b.bidder === user);
        for (const bid of userBids) {
            result.push({ auction: { ...auction }, bid: { ...bid } });
        }
    }

    return result;
}

/** 
 * INTER-CONTRACT MINT FAUCET (DEMO ONLY)
 * For a real app, this would be a separate contract or require admin auth.
 */
export async function requestFaucetTokens(to: string, signFn: (xdr: string) => Promise<string>): Promise<TxResult> {
    // We reuse mintTestTokens but with a fixed amount for demo purposes
    return mintTestTokens(to, 1000, signFn);
}

/** 
 * Format balance with 7 decimals (Stroops to TOK)
 */
export function formatTokenAmount(stroops: bigint | string | number): string {
    return toNum(stroops).toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}


const DEMO_AUCTIONS: Auction[] = [
    {
        id: 1,
        title: "Apple MacBook Pro M3 Max",
        description: "Production-grade MacBook Pro M3 Max, 128GB RAM, 2TB SSD. Perfect for developers and designers.",
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
        category: "Electronics",
        seller: NULL_ACCOUNT,
        startTime: Math.floor(Date.now() / 1000) - 3600,
        endTime: Math.floor(Date.now() / 1000) + 86400,
        minBid: 500,
        highestBid: 100,
        highestBidder: null,
        isEnded: false,
    }
];

export async function getAllAuctions(): Promise<Auction[]> {
    return DEMO_AUCTIONS;
}

export async function getAuction(id: number): Promise<Auction | null> {
    return DEMO_AUCTIONS.find(a => a.id === id) || null;
}

export async function getBidHistory(auctionId: number): Promise<BidRecord[]> {
    return [];
}

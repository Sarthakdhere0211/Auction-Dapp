import {
    Contract,
    Networks,
    rpc,
    TransactionBuilder,
    nativeToScVal,
    scValToNative,
} from "@stellar/stellar-sdk";

import { getEnv } from "./env";
import { TxController } from "./utils/txController";
import { getTxUrl } from "./config/stellar";

const ENV = getEnv();

export const CONTRACT_ID = ENV.CONTRACT_ID;
export const SOROBAN_RPC_URL = ENV.SOROBAN_RPC_URL;

export const NETWORK_PASSPHRASE =
    ENV.STELLAR_NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;

const server = new rpc.Server(SOROBAN_RPC_URL);
const HORIZON_URL = ENV.HORIZON_URL;

const NULL_ACCOUNT =
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export interface ContractAuctionState {
    owner: string;
    starting_price: number;
    end_time: number;
    highest_bid: number;
    highest_bidder: string | null;
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

export async function fetchBalance(publicKey: string): Promise<string> {
    if (!publicKey) return "0.00";
    try {
        const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
        if (!res.ok) {
            console.warn(`[fetchBalance] Account ${publicKey} not found on ${HORIZON_URL}. It might be unfunded.`);
            return "0.00";
        }
        const data = await res.json();
        const native = Array.isArray(data.balances)
            ? data.balances.find((b: { asset_type: string; balance: string }) => b.asset_type === "native")
            : null;
        return native ? parseFloat(native.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
    } catch (err) {
        console.error("[fetchBalance] error:", err);
        return "0.00";
    }
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

/** Map Soroban contract error codes to user-friendly messages */
function parseContractError(message: string): string {
    if (!message || typeof message !== "string") return "Transaction failed.";
    const contractErr = message.match(/Error\(Contract,\s*#?(\d+)\)/);
    if (contractErr) {
        const code = parseInt(contractErr[1], 10);
        const messages: Record<number, string> = {
            1: "Auction not initialized (place a bid to start it).",
            2: "The contract on the network is an old version that rejects bids after the auction time. Redeploy the contract (see REDEPLOY.md in the project root) so your bid can succeed and extend the auction.",
            3: "Bid amount is too low. Enter an amount higher than the current highest bid.",
            4: "You are not authorized to perform this action.",
            5: "Auction is already initialized.",
            6: "Invalid end time.",
            7: "Invalid bid amount. Enter a positive value.",
        };
        return messages[code] ?? `Contract error (#${code}).`;
    }
    if (message.includes("BidTooLow") || message.toLowerCase().includes("bid too low"))
        return "Bid amount is too low. Enter an amount higher than the current highest bid.";
    if (message.includes("InvalidAmount") || message.toLowerCase().includes("invalid amount"))
        return "Invalid bid amount. Enter a positive value.";
    if (message.toLowerCase().includes("reject") || message.toLowerCase().includes("denied"))
        return "You rejected the transaction in your wallet.";
    if (message.includes("HostError") || message.includes("host"))
        return message.length > 200 ? parseContractError(message.slice(0, 200)) : message;
    return message;
}

/** Extract a readable error from submission response when status is ERROR */
function getSubmissionErrorMessage(submission: { status: string; hash?: string; diagnosticEvents?: unknown[]; errorResult?: unknown }): string {
    const events = submission.diagnosticEvents;
    if (Array.isArray(events) && events.length > 0) {
        for (let i = events.length - 1; i >= 0; i--) {
            try {
                const ev = events[i];
                const str = typeof ev === "string" ? ev : JSON.stringify(ev);
                if (str.includes("Error(Contract") || str.includes("HostError") || str.includes("error")) {
                    const parsed = parseContractError(str);
                    if (parsed !== str || str.length < 300) return parsed;
                }
            } catch {
                // ignore
            }
        }
    }
    const hash = submission.hash ?? "";
    if (hash) return `Transaction failed on network. Check the transaction in the explorer for details.`;
    return "Transaction failed. Please try again.";
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

        if (rpc.Api.isSimulationError(sim)) {
            let raw = typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error);
            if (!raw || raw === "{}") {
                const events = (sim as { events?: unknown[] }).events;
                if (Array.isArray(events) && events.length > 0) {
                    raw = JSON.stringify(events[events.length - 1]);
                }
            }
            console.error("[submitTx] Simulation error:", raw);
            const errMsg = parseContractError(raw);
            return { txHash: "", success: false, error: errMsg };
        }

        const assembled = rpc.assembleTransaction(tx, sim).build();

        const signedXdr = await signFn(assembled.toXDR());

        const signedTx = TransactionBuilder.fromXDR(
            signedXdr,
            NETWORK_PASSPHRASE
        );

        const submission = await server.sendTransaction(signedTx);

        if (submission.status === "ERROR") {
            const sub = submission as { error?: string; errorResultXdr?: string; diagnosticEvents?: unknown[]; hash?: string };
            let errMsg = sub.error ?? getSubmissionErrorMessage(submission);
            if (sub.errorResultXdr && !sub.error) errMsg = getSubmissionErrorMessage(submission);
            console.error("[submitTx] Submission error:", submission);
            return {
                txHash: submission.hash ?? "",
                success: false,
                error: parseContractError(errMsg),
            };
        }

        const ctl = new TxController(server, {
            timeoutSecs: ENV.TX_TIMEOUT_SECS,
            pollIntervalMs: 2000,
        });

        const result = await ctl.poll(submission.hash);

        if (result.state === "committed") {
            return { txHash: submission.hash, success: true };
        }

        return {
            txHash: submission.hash,
            success: false,
            error: `Pending: ${getTxUrl(submission.hash)}`,
        };
    } catch (err) {
        const e = err as Error & { error?: string };
        const message = e?.message ?? e?.error ?? String(err);
        console.error("[submitTx] Error:", err);
        const friendly = parseContractError(message);
        return {
            txHash: "",
            success: false,
            error: friendly || "Transaction failed. Please try again.",
        };
    }
}

export async function getContractIsInitialized(): Promise<boolean> {
    if (!CONTRACT_ID) return false;

    try {
        const contract = new Contract(CONTRACT_ID);

        const sim = await simulate(contract.call("is_initialized"));

        if (rpc.Api.isSimulationError(sim)) return false;

        if (!sim.result || !sim.result.retval) return false;

        const val = scValToNative(sim.result.retval);

        return val === true;
    } catch {
        return false;
    }
}

export async function getContractAuctionStatus(): Promise<number> {
    if (!CONTRACT_ID) return 0;

    try {
        const contract = new Contract(CONTRACT_ID);

        const sim = await simulate(contract.call("get_auction_status"));

        if (rpc.Api.isSimulationError(sim)) return 0;

        if (!sim.result || !sim.result.retval) return 0;

        const value = scValToNative(sim.result.retval);

        return Number(value);
    } catch {
        return 0;
    }
}

/** Default state when contract is not yet initialized (first bid will initialize). */
export function getDefaultAuctionState(): ContractAuctionState {
    return {
        owner: "",
        starting_price: 0,
        end_time: 0,
        highest_bid: 0,
        highest_bidder: null,
        is_initialized: false,
    };
}

export async function getContractAuctionState(): Promise<ContractAuctionState> {
    if (!CONTRACT_ID) throw new Error("Contract ID missing");

    const contract = new Contract(CONTRACT_ID);

    const sim = await simulate(contract.call("get_auction"));

    if (rpc.Api.isSimulationError(sim)) {
        return getDefaultAuctionState();
    }

    if (!sim.result || !sim.result.retval) {
        return getDefaultAuctionState();
    }

    const state = scValToNative(sim.result.retval);

    return {
        owner: String(state.owner),
        starting_price: toNum(state.starting_price),
        end_time: Number(state.end_time),
        highest_bid: toNum(state.highest_bid),
        highest_bidder: state.highest_bidder
            ? String(state.highest_bidder)
            : null,
        is_initialized: true,
    };
}

export async function initializeAuction(
    owner: string,
    startingPrice: number,
    durationMinutes: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!CONTRACT_ID)
        return { txHash: "", success: false, error: "Contract ID missing" };

    const contract = new Contract(CONTRACT_ID);

    const endTime = BigInt(
        Math.floor(Date.now() / 1000) + durationMinutes * 60
    );

    const stroops = BigInt(Math.floor(startingPrice * 10_000_000));

    return submitTx(
        owner,
        contract.call(
            "initialize",
            nativeToScVal(owner, { type: "address" }),
            nativeToScVal(stroops, { type: "i128" }),
            nativeToScVal(endTime, { type: "u64" })
        ),
        signFn
    );
}

export async function setAuctionEndTime(
    owner: string,
    durationMinutes: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {

    if (!CONTRACT_ID)
        return { txHash: "", success: false, error: "Contract ID missing" };

    const contract = new Contract(CONTRACT_ID);

    const newEnd = BigInt(
        Math.floor(Date.now() / 1000) + durationMinutes * 60
    );

    return submitTx(
        owner,
        contract.call(
            "set_end_time",
            nativeToScVal(owner, { type: "address" }),
            nativeToScVal(newEnd, { type: "u64" })
        ),
        signFn
    );
}

export async function placeBid(
    _auctionId: number,
    bidder: string,
    amount: number,
    signFn: (xdr: string) => Promise<string>
): Promise<PlaceBidResult> {
    if (!CONTRACT_ID)
        return { txHash: "", success: false, error: "Contract ID missing" };

    if (amount <= 0)
        return { txHash: "", success: false, error: "Bid amount must be greater than zero." };

    const contract = new Contract(CONTRACT_ID);
    const stroops = BigInt(Math.floor(amount * 10_000_000));

    return submitTx(
        bidder,
        contract.call(
            "place_bid",
            nativeToScVal(bidder, { type: "address" }),
            nativeToScVal(stroops, { type: "i128" })
        ),
        signFn
    );
}

/* ------------------------------
 DEMO AUCTIONS
--------------------------------*/

import { Auction, BidRecord } from "./types";

const now = Math.floor(Date.now() / 1000);

const DEMO_AUCTIONS: Auction[] = [
  {
    id: 1,
    title: "Apple MacBook Pro M3 Max",
    description: "Factory sealed MacBook Pro",
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80",
    category: "Electronics",
    seller: NULL_ACCOUNT,
    startTime: now - 3600,
    endTime: now + 86400,
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
  const a = DEMO_AUCTIONS.find(x => x.id === id);
  return a ? { ...a } : null;
}

export async function getBidHistory(auctionId: number): Promise<BidRecord[]> {
  return [
    {
      auctionId,
      bidder: NULL_ACCOUNT,
      amount: 120,
      timestamp: Math.floor(Date.now() / 1000)
    }
  ];
}

export async function getUserBids(user: string): Promise<BidRecord[]> {

  const auctions = await getAllAuctions();
  const userBids: BidRecord[] = [];

  for (const auction of auctions) {

    const history = await getBidHistory(auction.id);
    const filtered = history.filter(bid => bid.bidder === user);
    userBids.push(...filtered);

  }

  return userBids;
}

export type BidEventHandler = (auctionId: number) => void;

let poller: NodeJS.Timeout | null = null;

export function startBidEventPolling(handler: BidEventHandler) {

  if (poller) return;

  poller = setInterval(() => {
    handler(0);
  }, 3000);

}

export function stopBidEventPolling() {

  if (poller) {
    clearInterval(poller);
    poller = null;
  }

}
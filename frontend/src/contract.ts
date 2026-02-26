import {
    Contract,
    Networks,
    rpc,
    TransactionBuilder,
    nativeToScVal,
    scValToNative,
} from '@stellar/stellar-sdk';
import { Auction, BidRecord } from './types';
import { getEnv } from './env';
import { TxController } from './utils/txController';
import { getTxUrl } from './config/stellar';

const ENV = getEnv();
export const CONTRACT_ID = ENV.CONTRACT_ID;
export const SOROBAN_RPC_URL = ENV.SOROBAN_RPC_URL;
export const NETWORK_PASSPHRASE = ENV.STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;
export const HORIZON_URL = ENV.HORIZON_URL;

const server = new rpc.Server(SOROBAN_RPC_URL);

// ─────────────────────────────────────────────
//  Demo Seed Data (used when no contract deployed)
// ─────────────────────────────────────────────

const now = Math.floor(Date.now() / 1000);

const DEMO_AUCTIONS: Auction[] = [
    {
        id: 1,
        title: 'Apple MacBook Pro M3 Max',
        description: 'Factory sealed Apple MacBook Pro 16-inch with M3 Max chip, 64GB RAM, 2TB SSD.',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
        category: 'Electronics',
        seller: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGEWDHDAEYAR3C5R2ZOL3E',
        startTime: now - 3600,
        endTime: now + 86400,
        minBid: 500,
        highestBid: 2750,
        highestBidder: 'GD6WNNTW664WH7FXC5BHPC2ZUEFQ5XUJZRPQ7BIUAGBZXUHTFQZLMKH',
        isEnded: false,
    },
    {
        id: 2,
        title: 'Bored Ape #4821 — NFT Print',
        description: 'Limited edition high-resolution fine art print of Bored Ape Yacht Club #4821.',
        imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80',
        category: 'Digital Art',
        seller: 'GBVUEY84QBJHQQQOHTBGHTBBOCOOHHBMBDAGJQHW72KIWVDKPQOQCQIZ',
        startTime: now - 7200,
        endTime: now + 43200,
        minBid: 1000,
        highestBid: 4500,
        highestBidder: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGEWDHDAEYAR3C5R2ZOL3E',
        isEnded: false,
    },
    {
        id: 3,
        title: 'PS5 Console — Bundle',
        description: 'PlayStation 5 Digital Edition with two DualSense controllers.',
        imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=80',
        category: 'Luxury Goods',
        seller: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
        startTime: now - 10800,
        endTime: now + 21600,
        minBid: 300,
        highestBid: 870,
        highestBidder: 'GD6WNNTW664WH7FXC5BHPC2ZUEFQ5XUJZRPQ7BIUAGBZXUHTFQZLMKH',
        isEnded: false,
    }
];

const DEMO_BIDS: Record<number, BidRecord[]> = {
    1: [
        { auctionId: 1, bidder: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37', amount: 500, timestamp: now - 3400 },
        { auctionId: 1, bidder: 'GD6WNNTW664WH7FXC5BHPC2ZUEFQ5XUJZRPQ7BIUAGBZXUHTFQZLMKH', amount: 2750, timestamp: now - 900 },
    ],
    2: [
        { auctionId: 2, bidder: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGEWDHDAEYAR3C5R2ZOL3E', amount: 4500, timestamp: now - 2000 },
    ],
    3: [
        { auctionId: 3, bidder: 'GD6WNNTW664WH7FXC5BHPC2ZUEFQ5XUJZRPQ7BIUAGBZXUHTFQZLMKH', amount: 870, timestamp: now - 1200 },
    ],
};

const _auctions: Auction[] = DEMO_AUCTIONS.map(a => ({ ...a }));
const _bids: Record<number, BidRecord[]> = { ...DEMO_BIDS };

// ─────────────────────────────────────────────
//  Stellar Balance fetch (real Horizon API)
// ─────────────────────────────────────────────

export async function fetchBalance(publicKey: string): Promise<string> {
    try {
        const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
        if (!res.ok) return '0.00';
        const data = await res.json();
        const nativeBalance = data.balances?.find((b: { asset_type: string; balance: string }) => b.asset_type === 'native');
        return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
    } catch {
        return '0.00';
    }
}

// ─────────────────────────────────────────────
//  Contract State Management
// ─────────────────────────────────────────────

export interface ContractAuctionState {
    owner: string;
    starting_price: number;
    end_time: number;
    highest_bid: number;
    highest_bidder: string | null;
    is_initialized: boolean;
}

export async function getContractIsInitialized(): Promise<boolean> {
    if (!CONTRACT_ID) return false;
    try {
        const contract = new Contract(CONTRACT_ID);
        const account = await server.getAccount(
            'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
        );
        const tx = new TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(contract.call('is_initialized'))
            .setTimeout(30)
            .build();
        const simulation = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulation)) {
            const err = String(simulation.error ?? '');
            if (err.toLowerCase().includes('non-existent contract function')) {
                const status = await getContractAuctionStatus();
                return status !== 0;
            }
            throw new Error(`Failed to read initialized flag: ${simulation.error}`);
        }
        const result = simulation.result?.retval;
        if (!result) return false;
        const value = scValToNative(result);
        return value === true;
    } catch {
        try {
            const status = await getContractAuctionStatus();
            return status !== 0;
        } catch {
            return false;
        }
    }
}

export async function getContractIsLive(): Promise<boolean> {
    if (!CONTRACT_ID) return false;
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
    );
    const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call('is_live'))
        .setTimeout(30)
        .build();
    const simulation = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation)) {
        throw new Error(`Failed to get live status: ${simulation.error}`);
    }
    const result = simulation.result?.retval;
    if (!result) return false;
    const value = scValToNative(result);
    return value === true;
}

export async function getContractAuctionStatus(): Promise<number> {
    if (!CONTRACT_ID) return 0;
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
    );
    const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call('get_auction_status'))
        .setTimeout(30)
        .build();
    const simulation = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation)) {
        const err = String(simulation.error ?? '');
        if (err.toLowerCase().includes('non-existent contract function') || err.toLowerCase().includes('missingvalue')) {
            try {
                const initialized = await getContractIsInitialized();
                if (!initialized) return 0;
                const live = await getContractIsLive();
                return live ? 1 : 2;
            } catch {
                return 0;
            }
        }
        throw new Error(`Failed to get auction status: ${simulation.error}`);
    }
    const result = simulation.result?.retval;
    if (!result) return 0;
    const value = scValToNative(result);
    return Number(value || 0);
}

/**
 * Check if auction contract is initialized
 */
export async function isAuctionInitialized(): Promise<boolean> {
    if (!CONTRACT_ID) return false;
    return await getContractIsInitialized();
}

/**
 * Get auction state from contract
 */
export async function getContractAuctionState(): Promise<ContractAuctionState> {
    if (!CONTRACT_ID) {
        throw new Error('Contract ID not configured');
    }

    try {
        const contract = new Contract(CONTRACT_ID);
        const normalizeAddress = (addr: unknown): string => {
            if (!addr) return '';
            if (typeof addr === 'string') return addr;
            if (typeof addr === 'object') {
                if ('address' in addr && typeof (addr as { address: unknown }).address === 'string') {
                    return (addr as { address: string }).address;
                }
                if ('toString' in addr && typeof (addr as { toString: () => string }).toString === 'function') {
                    return String((addr as { toString: () => string }).toString());
                }
            }
            return '';
        };
        
        // Build read-only transaction
        const account = await server.getAccount(
            'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' // Null account for reads
        );
        
        const tx = new TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(contract.call('get_auction'))
            .setTimeout(30)
            .build();

        const simulation = await server.simulateTransaction(tx);
        
        if (rpc.Api.isSimulationError(simulation)) {
            // Treat missing state as not initialized for callers
            const errMsg = String(simulation.error ?? '');
            if (errMsg.includes('Error(Contract, #1)')) {
                throw new Error('Auction not initialized');
            }
            throw new Error(`Failed to get auction state: ${simulation.error}`);
        }

        // Parse result
        const result = simulation.result?.retval;
        if (!result) {
            throw new Error('No auction state returned');
        }

        // Convert ScVal to native values
        const state = scValToNative(result);
        const ownerStr = normalizeAddress(state.owner);
        const highestBidderStr = state.highest_bidder ? normalizeAddress(state.highest_bidder) : null;
        const toNum = (v: unknown): number => {
            if (typeof v === 'bigint') return Number(v) / 10_000_000;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
            }
            return 0;
        };

        console.log('[getContractAuctionState]', { raw: state });

        return {
            owner: ownerStr,
            starting_price: toNum(state.starting_price),
            end_time: Number(state.end_time || 0),
            highest_bid: toNum(state.highest_bid),
            highest_bidder: highestBidderStr,
            is_initialized: true,
        };
    } catch (err) {
        console.error('Error getting auction state:', err);
        throw err;
    }
}

// Removed: current_time view (contracts should not expose ledger time). Frontend no longer calls it.

/**
 * Initialize auction contract
 */
export async function initializeAuction(
    owner: string,
    startingPrice: number,
    durationMinutes: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    console.log('=== INITIALIZE AUCTION START ===');
    console.log('Owner:', owner);
    console.log('Starting Price (XLM):', startingPrice);
    console.log('Duration (minutes):', durationMinutes);

    if (!CONTRACT_ID) {
        return {
            txHash: '',
            success: false,
            error: 'Contract ID not configured'
        };
    }

    try {
        // Check if already initialized
        const isInit = await isAuctionInitialized();
        if (isInit) {
            return {
                txHash: '',
                success: false,
                error: 'Auction is already initialized'
            };
        }

        const account = await server.getAccount(owner);
        const contract = new Contract(CONTRACT_ID);

        const endTime = BigInt(Math.floor(Date.now() / 1000) + (durationMinutes * 60));
        const startingPriceStroops = BigInt(Math.floor(startingPrice * 10_000_000));

        console.log('End time (unix):', endTime.toString());
        console.log('Starting price (stroops):', startingPriceStroops.toString());

        const tx = new TransactionBuilder(account, {
            fee: '100000',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(
                contract.call(
                    'initialize',
                    nativeToScVal(owner, { type: 'address' }),
                    nativeToScVal(startingPriceStroops, { type: 'i128' }),
                    nativeToScVal(endTime, { type: 'u64' })
                )
            )
            .setTimeout(180)
            .build();

        console.log('Simulating initialization...');
        const simulation = await server.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simulation)) {
            throw new Error(`Simulation failed: ${simulation.error}`);
        }

        console.log('✅ Simulation successful');

        const assembledTx = rpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signFn(assembledTx.toXDR());
        const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

        console.log('Submitting initialization transaction...');
        const submission = await server.sendTransaction(signedTx);

        if (submission.status === 'ERROR') {
            throw new Error('Transaction submission failed');
        }

        // Poll for confirmation
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const txResponse = await server.getTransaction(submission.hash);

            if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
                console.log('🎉 Auction initialized successfully!');
                return { txHash: submission.hash, success: true };
            }

            if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
                throw new Error('Transaction failed on ledger');
            }
        }

        throw new Error('Transaction timeout');
    } catch (err) {
        console.error('❌ Initialize error:', err);
        return {
            txHash: '',
            success: false,
            error: (err as Error).message
        };
    } finally {
        console.log('=== INITIALIZE AUCTION END ===');
    }
}

// ─────────────────────────────────────────────
//  Contract reads (demo fallback)
// ─────────────────────────────────────────────

export async function getAllAuctions(): Promise<Auction[]> {
    return _auctions.map(a => ({ ...a }));
}

export async function getAuction(id: number): Promise<Auction | null> {
    return _auctions.find(a => a.id === id) ?? null;
}

export async function getBidHistory(auctionId: number): Promise<BidRecord[]> {
    return [...(_bids[auctionId] ?? [])];
}

export async function getUserBids(address: string): Promise<{ auction: Auction; bid: BidRecord }[]> {
    const result: { auction: Auction; bid: BidRecord }[] = [];
    for (const auction of _auctions) {
        const bids = _bids[auction.id] ?? [];
        const userBid = [...bids].reverse().find(b => b.bidder === address);
        if (userBid) result.push({ auction: { ...auction }, bid: userBid });
    }
    return result;
}

// ─────────────────────────────────────────────
//  Contract writes
// ─────────────────────────────────────────────

export interface PlaceBidResult {
    txHash: string;
    success: boolean;
    error?: string;
}

export async function setAuctionEndTime(
    owner: string,
    durationMinutes: number,
    signFn: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!CONTRACT_ID) {
        return { txHash: '', success: false, error: 'Contract ID not configured' };
    }
    try {
        const account = await server.getAccount(owner);
        const contract = new Contract(CONTRACT_ID);
        const newEndTime = BigInt(Math.floor(Date.now() / 1000) + (durationMinutes * 60));

        const tx = new TransactionBuilder(account, {
            fee: '100000',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(
                contract.call(
                    'set_end_time',
                    nativeToScVal(owner, { type: 'address' }),
                    nativeToScVal(newEndTime, { type: 'u64' })
                )
            )
            .setTimeout(180)
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulation)) {
            throw new Error(`Simulation failed: ${simulation.error}`);
        }
        const assembledTx = rpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signFn(assembledTx.toXDR());
        const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
        const submission = await server.sendTransaction(signedTx);
        if (submission.status === 'ERROR') {
            throw new Error('Transaction submission failed');
        }
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const txResponse = await server.getTransaction(submission.hash);
            if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
                return { txHash: submission.hash, success: true };
            }
            if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
                throw new Error('Transaction failed on ledger');
            }
        }
        throw new Error('Transaction timeout');
    } catch (err) {
        return { txHash: '', success: false, error: (err as Error).message };
    }
}

export interface CreateAuctionInput {
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    durationSecs: number;
    minBid: number;
}

export interface TxResult {
    txHash: string;
    success: boolean;
    error?: string;
}

/**
 * Place a bid on an auction
 * 
 * CRITICAL: Contract signature is `place_bid(env: Env, bidder: Address, amount: i128)`
 * Frontend must pass EXACTLY 2 arguments: bidder (Address) and amount (i128)
 * 
 * @param auctionId - Auction ID (used for frontend logic only, NOT passed to contract)
 * @param bidder - Connected wallet public key
 * @param amount - Bid amount in XLM (will be converted to i128)
 * @param signFn - Freighter/Albedo signing function
 */
export async function placeBid(
    auctionId: number,
    bidder: string,
    amount: number,
    signFn?: (xdr: string) => Promise<string>
): Promise<PlaceBidResult> {
    console.log('=== PLACE BID START ===');
    console.log('[bid] network:', NETWORK_PASSPHRASE);
    console.log('[bid] rpc:', SOROBAN_RPC_URL);
    console.log('[bid] contract:', CONTRACT_ID);
    console.log('[bid] bidder:', bidder);
    console.log('[bid] amount_xlm:', amount);

    // Validation
    if (!CONTRACT_ID) {
        return {
            txHash: '',
            success: false,
            error: 'Missing VITE_CONTRACT_ID. Set it in .env and restart the dev server.'
        };
    }

    if (!bidder || !bidder.startsWith('G')) {
        return {
            txHash: '',
            success: false,
            error: 'Invalid bidder address'
        };
    }

    if (amount <= 0) {
        return {
            txHash: '',
            success: false,
            error: 'Bid amount must be greater than 0'
        };
    }

    if (!signFn) {
        return {
            txHash: '',
            success: false,
            error: 'Signing function not provided'
        };
    }

    try {
        console.log('✅ proceeding to submit bid without pre-checks');

        // 1. Load account from network
        console.log('[bid] loading account...');
        const account = await server.getAccount(bidder);
        console.log('[bid] account_sequence:', account.sequenceNumber());

        // 2. Create contract instance
        const contract = new Contract(CONTRACT_ID);

        // 3. Convert amount to i128 (Soroban expects stroops: 1 XLM = 10,000,000 stroops)
        const stroopsInt = Math.floor(Number(amount) * 10_000_000);
        const stroops = BigInt(stroopsInt);
        console.log('[bid] amount_stroops:', stroopsInt);

        // 4. Build transaction with ONLY 2 arguments: bidder and amount
        console.log('[bid] building tx: method=place_bid args=[Address,i128]');
        const tx = new TransactionBuilder(account, {
            fee: '200000',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(
                contract.call(
                    'place_bid',
                    // Argument 1: bidder (Address)
                    nativeToScVal(bidder, { type: 'address' }),
                    // Argument 2: amount (i128)
                    nativeToScVal(stroops, { type: 'i128' })
                    // NO THIRD ARGUMENT - contract only expects 2 parameters
                )
            )
            .setTimeout(180) // 3 minutes timeout
            .build();

        console.log('[bid] tx built');

        // 5. Simulate transaction
        console.log('[bid] simulating...');
        const simulation = await server.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simulation)) {
            const err = String(simulation.error ?? '');
            console.error('❌ simulation error:', err);
            throw new Error(`Simulation failed: ${err}`);
        }

        console.log('✅ simulation ok');
        if ('cost' in simulation) {
            console.log('[bid] sim_cost:', simulation.cost);
        }

        // 6. Assemble transaction with simulation results
        console.log('[bid] assembling...');
        const assembledTx = rpc.assembleTransaction(tx, simulation).build();
        const xdrEncoded = assembledTx.toXDR();
        console.log('[bid] xdr_len:', xdrEncoded.length);

        // 7. Sign transaction with Freighter/Albedo
        console.log('[bid] requesting signature...');
        const signedXdr = await signFn(xdrEncoded);
        console.log('✅ signed');

        const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

        // 8. Submit transaction to network
        console.log('[bid] submitting...');
        const submission = await server.sendTransaction(signedTx);
        console.log('[bid] hash:', submission.hash);
        console.log('[bid] status:', submission.status);

        if (submission.status === 'ERROR') {
            throw new Error(`Transaction submission error: ${JSON.stringify(submission)}`);
        }

        console.log('[bid] confirming...');
        const ctl = new TxController(server, { timeoutSecs: ENV.TX_TIMEOUT_SECS, pollIntervalMs: 2000 });
        const result = await ctl.poll(submission.hash);
        if (result.state === 'committed') {
            console.log('🎉 success', result);
            return { txHash: submission.hash, success: true };
        }
        if (result.state === 'failed') {
            console.error('❌ failed on ledger');
            throw new Error('Transaction failed on ledger. Check Stellar Expert for details.');
        }
        console.warn('⚠️ pending/timeout', result);
        return { txHash: submission.hash, success: false, error: `Pending: ${getTxUrl(submission.hash)}` };

    } catch (err) {
        console.error('❌ bid error:', err);
        const errorMessage = (err as Error).message || 'Unknown error occurred';
        const emsg = errorMessage.toLowerCase();
        
        if (emsg.includes('error(contract, #1)') || emsg.includes('not initialized')) {
            return {
                txHash: '',
                success: false,
                error: 'Auction not initialized. Please initialize the auction first.'
            };
        }
        if (emsg.includes('error(contract, #2)') || emsg.includes('ended')) {
            return {
                txHash: '',
                success: false,
                error: 'Auction has ended.'
            };
        }
        if (emsg.includes('error(contract, #3)') || emsg.includes('bid too low')) {
            return {
                txHash: '',
                success: false,
                error: 'Bid too low. Enter a higher amount.'
            };
        }
        if (emsg.includes('tx_bad_seq') || emsg.includes('bad seq') || emsg.includes('sequence')) {
            return {
                txHash: '',
                success: false,
                error: 'Out-of-date account sequence. Refresh account and retry.'
            };
        }
        if (emsg.includes('tx_insufficient_fee') || emsg.includes('insufficient fee') || emsg.includes('fee')) {
            return {
                txHash: '',
                success: false,
                error: 'Insufficient fee. Increase fee and retry.'
            };
        }
        if (emsg.includes('tx_insufficient_balance') || emsg.includes('op_underfunded') || emsg.includes('balance')) {
            return {
                txHash: '',
                success: false,
                error: 'Wallet account not found or not funded on Testnet.'
            };
        }
        if (emsg.includes('invalid signature') || emsg.includes('bad auth')) {
            return {
                txHash: '',
                success: false,
                error: 'Invalid signature. Ensure the wallet signs on Testnet.'
            };
        }
        if (emsg.includes('no such contract') || emsg.includes('contract not found')) {
            return {
                txHash: '',
                success: false,
                error: 'Contract not found. Verify CONTRACT_ID and network.'
            };
        }
        
        return {
            txHash: '',
            success: false,
            error: errorMessage
        };
    } finally {
        console.log('=== PLACE BID END ===');
    }
}

export async function placeBidEnsuringInit(
    auctionId: number,
    bidder: string,
    amount: number,
    durationMinutes: number,
    signFn: (xdr: string) => Promise<string>
): Promise<PlaceBidResult> {
    console.log('=== BID ENSURE INIT START ===');
    try {
        const initialized = await getContractIsInitialized();
        console.log('[ensure] initialized:', initialized);
        if (!initialized) {
            const startPrice = Math.max(0, amount - 0.01);
            console.log('[ensure] initializing with startPrice_xlm:', startPrice, 'duration_mins:', durationMinutes);
            const init = await initializeAuction(bidder, startPrice, durationMinutes, signFn);
            if (!init.success) {
                throw new Error(init.error || 'Initialization failed');
            }
            console.log('[ensure] init tx:', init.txHash);
            await new Promise(r => setTimeout(r, 2000));
        }

        const statusCode = await getContractAuctionStatus();
        console.log('[ensure] status_code:', statusCode);
        if (statusCode !== 1) {
            throw new Error('Auction not live');
        }

        return await placeBid(auctionId, bidder, amount, signFn);
    } finally {
        console.log('=== BID ENSURE INIT END ===');
    }
}

export async function createAuction(
    seller: string,
    input: CreateAuctionInput,
    signFn?: (xdr: string) => Promise<string>
): Promise<TxResult> {
    if (!CONTRACT_ID) {
        return { txHash: '', success: false, error: 'VITE_CONTRACT_ID is not defined in environment.' };
    }
    try {
        const account = await server.getAccount(seller);
        const contract = new Contract(CONTRACT_ID);
        const tx = new TransactionBuilder(account, {
            fee: '10000',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(
                contract.call(
                    'create_auction',
                    nativeToScVal(seller, { type: 'address' }),
                    nativeToScVal(input.title, { type: 'string' }),
                    nativeToScVal(input.description, { type: 'string' }),
                    nativeToScVal(input.imageUrl, { type: 'string' }),
                    nativeToScVal(input.category, { type: 'string' }),
                    nativeToScVal(BigInt(input.durationSecs), { type: 'u64' }),
                    nativeToScVal(BigInt(Math.floor(input.minBid)), { type: 'i128' }),
                )
            )
            .setTimeout(30)
            .build();
        const simulation = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulation)) {
            throw new Error(`Simulation failed: ${simulation.error}`);
        }
        const assembledTx = rpc.assembleTransaction(tx, simulation).build();
        const xdrEncoded = assembledTx.toXDR();
        if (!signFn) throw new Error('Signing function not provided');
        const signedXdr = await signFn(xdrEncoded);
        const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
        const submission = await server.sendTransaction(signedTx);
        if (submission.status !== 'PENDING') {
            throw new Error(`Submission failed: ${submission.status}. Hash: ${submission.hash}`);
        }
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const txResponse = await server.getTransaction(submission.hash);
            if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
                return { txHash: submission.hash, success: true };
            }
            if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
                throw new Error('Transaction failed on ledger after submission.');
            }
        }
        throw new Error('Transaction timed out after submission. Check Stellar Expert for hash: ' + submission.hash);
    } catch (err) {
        return { txHash: '', success: false, error: (err as Error).message };
    }
}

export type BidEventHandler = (auctionId: number) => void;

let _eventPoller: ReturnType<typeof setInterval> | null = null;

export function startBidEventPolling(onNewBid: BidEventHandler) {
    if (_eventPoller) return;
    _eventPoller = setInterval(() => {
        onNewBid(0);
    }, 2500);
}

export function stopBidEventPolling() {
    if (_eventPoller) {
        clearInterval(_eventPoller);
        _eventPoller = null;
    }
}

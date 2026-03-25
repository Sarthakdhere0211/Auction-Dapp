import {
    Asset,
    Keypair,
    Networks,
    Operation,
    TransactionBuilder,
    Horizon,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

/**
 * Generate and fund a new account on Testnet
 */
export async function createAndFundAccount() {
    const pair = Keypair.random();
    console.log(`[Account] Secret: ${pair.secret()}`);
    console.log(`[Account] Public: ${pair.publicKey()}`);

    try {
        const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pair.publicKey())}`);
        await response.json();
        console.log('[Account] Funded successfully via Friendbot');
        return pair;
    } catch (error) {
        console.error('[Account] Funding failed:', error);
        throw error;
    }
}

/**
 * Establish a Trustline for a specific asset
 */
export async function establishTrustline(
    receiverSecret: string,
    assetCode: string,
    issuerPublicKey: string
) {
    const receiverPair = Keypair.fromSecret(receiverSecret);
    const asset = new Asset(assetCode, issuerPublicKey);

    console.log(`[Trustline] Creating trustline for ${assetCode}...`);

    const account = await server.loadAccount(receiverPair.publicKey());
    const transaction = new TransactionBuilder(account, {
        fee: '1000',
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(Operation.changeTrust({ asset }))
        .setTimeout(30)
        .build();

    transaction.sign(receiverPair);
    return await server.submitTransaction(transaction);
}

/**
 * Issue tokens (Issuer -> Distributor)
 */
export async function issueTokens(
    issuerSecret: string,
    distributorPublicKey: string,
    assetCode: string,
    amount: string
) {
    const issuerPair = Keypair.fromSecret(issuerSecret);
    const asset = new Asset(assetCode, issuerPair.publicKey());

    console.log(`[Issuance] Sending ${amount} ${assetCode} to ${distributorPublicKey}...`);

    const account = await server.loadAccount(issuerPair.publicKey());
    const transaction = new TransactionBuilder(account, {
        fee: '1000',
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(Operation.payment({
            destination: distributorPublicKey,
            asset: asset,
            amount: amount,
        }))
        .setTimeout(30)
        .build();

    transaction.sign(issuerPair);
    return await server.submitTransaction(transaction);
}

/**
 * Send tokens to a user (Distributor -> User)
 */
export async function sendTokens(
    senderSecret: string,
    receiverPublicKey: string,
    assetCode: string,
    issuerPublicKey: string,
    amount: string
) {
    const senderPair = Keypair.fromSecret(senderSecret);
    const asset = new Asset(assetCode, issuerPublicKey);

    console.log(`[Transfer] Sending ${amount} ${assetCode} to ${receiverPublicKey}...`);

    const account = await server.loadAccount(senderPair.publicKey());
    const transaction = new TransactionBuilder(account, {
        fee: '1000',
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(Operation.payment({
            destination: receiverPublicKey,
            asset: asset,
            amount: amount,
        }))
        .setTimeout(30)
        .build();

    transaction.sign(senderPair);
    return await server.submitTransaction(transaction);
}

/**
 * Fetch asset balances for an account
 */
export async function getAssetBalances(publicKey: string) {
    try {
        const account = await server.loadAccount(publicKey);
        return account.balances.filter(b => b.asset_type !== 'native');
    } catch (error) {
        console.error('[Balances] Error fetching balances:', error);
        return [];
    }
}

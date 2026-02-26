/**
 * Stellar Network Configuration
 * 
 * Centralized configuration for Stellar network endpoints and URLs
 */

// Network endpoints
export const STELLAR_CONFIG = {
    // Testnet
    TESTNET: {
        HORIZON_URL: 'https://horizon-testnet.stellar.org',
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
        EXPLORER_BASE: 'https://stellar.expert/explorer/testnet',
    },
    // Public (Mainnet)
    PUBLIC: {
        HORIZON_URL: 'https://horizon.stellar.org',
        SOROBAN_RPC_URL: 'https://soroban-mainnet.stellar.org',
        NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
        EXPLORER_BASE: 'https://stellar.expert/explorer/public',
    },
} as const;

// Current network (from environment or default to testnet)
const CURRENT_NETWORK = import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC' ? 'PUBLIC' : 'TESTNET';

// Stellar Explorer URLs
export const STELLAR_EXPLORER = {
    BASE: STELLAR_CONFIG[CURRENT_NETWORK].EXPLORER_BASE,
    TX: `${STELLAR_CONFIG[CURRENT_NETWORK].EXPLORER_BASE}/tx`,
    ACCOUNT: `${STELLAR_CONFIG[CURRENT_NETWORK].EXPLORER_BASE}/account`,
    CONTRACT: `${STELLAR_CONFIG[CURRENT_NETWORK].EXPLORER_BASE}/contract`,
} as const;

/**
 * Get transaction URL for Stellar Explorer
 */
export function getTxUrl(txHash: string): string {
    return `${STELLAR_EXPLORER.TX}/${txHash}`;
}

/**
 * Get account URL for Stellar Explorer
 */
export function getAccountUrl(address: string): string {
    return `${STELLAR_EXPLORER.ACCOUNT}/${address}`;
}

/**
 * Get contract URL for Stellar Explorer
 */
export function getContractUrl(contractId: string): string {
    return `${STELLAR_EXPLORER.CONTRACT}/${contractId}`;
}

/**
 * Get current network configuration
 */
export function getNetworkConfig() {
    return STELLAR_CONFIG[CURRENT_NETWORK];
}
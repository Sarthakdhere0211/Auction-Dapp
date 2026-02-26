import { WalletState } from './types';
import {
    isConnected as freighterIsConnected,
    requestAccess as freighterRequestAccess,
    getAddress as freighterGetAddress,
    getNetwork as freighterGetNetwork,
    signTransaction as freighterSignTransaction,
} from '@stellar/freighter-api';

declare global {
    interface Window {
        albedo?: {
            isConnected?: () => Promise<boolean>;
            publicKey: () => Promise<{ pubkey: string }>;
            signTransaction: (opts: { xdr: string; network?: string }) => Promise<{ xdr: string }>;
        };
    }
}

export type WalletProvider = 'freighter' | 'albedo';

const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

export async function isFreighterInstalled(): Promise<boolean> {
    try {
        const result = await freighterIsConnected();
        return !!(result && !result.error && result.isConnected);
    } catch {
        return false;
    }
}

export async function isAlbedoInstalled(): Promise<boolean> {
    try {
        return typeof window.albedo?.publicKey === 'function';
    } catch {
        return false;
    }
}

export async function connectWallet(provider: WalletProvider = 'freighter'): Promise<WalletState> {
    if (provider === 'freighter') {
        try {
            const connectedRes = await freighterIsConnected();
            if (!connectedRes || connectedRes.error || !connectedRes.isConnected) {
                const installed = await isFreighterInstalled();
                if (!installed) {
                    throw new Error('Freighter not installed');
                }
            }
            const accessRes = await freighterRequestAccess();
            if (!accessRes || accessRes.error || !accessRes.address) {
                throw new Error(accessRes?.error || 'User rejected connection');
            }
            const networkResult = await freighterGetNetwork();
            const network = networkResult.error ? NETWORK_PASSPHRASE : networkResult.network;
            return {
                publicKey: accessRes.address,
                network: network || NETWORK_PASSPHRASE,
                balance: null,
                isConnected: true,
                isConnecting: false,
            };
        } catch (err) {
            throw new Error((err as Error).message || 'Wallet connection failed');
        }
    } else {
        try {
            const installed = await isAlbedoInstalled();
            if (!installed) {
                throw new Error('Albedo not installed');
            }
            const res = await window.albedo!.publicKey();
            const pubkey = res.pubkey;
            return {
                publicKey: pubkey,
                network: NETWORK_PASSPHRASE,
                balance: null,
                isConnected: true,
                isConnecting: false,
            };
        } catch (err) {
            throw new Error((err as Error).message || 'Wallet connection failed');
        }
    }
}

export async function getPublicKey(provider: WalletProvider = 'freighter'): Promise<string | null> {
    if (provider === 'freighter') {
        try {
            const res = await freighterGetAddress();
            return res && !res.error ? res.address : null;
        } catch {
            return null;
        }
    } else {
        try {
            const res = await window.albedo?.publicKey();
            return res?.pubkey ?? null;
        } catch {
            return null;
        }
    }
}

export async function signTransaction(xdr: string, networkPassphrase: string, provider: WalletProvider = 'freighter'): Promise<string> {
    if (provider === 'freighter') {
        try {
            const result = await freighterSignTransaction(xdr, { networkPassphrase });
            if (result.error) throw new Error(result.error);
            return result.signedTxXdr || '';
        } catch (err) {
            throw new Error(`Signing failed: ${(err as Error).message}`);
        }
    } else {
        try {
            const res = await window.albedo!.signTransaction({ xdr, network: 'testnet' });
            return res.xdr;
        } catch (err) {
            throw new Error(`Signing failed: ${(err as Error).message}`);
        }
    }
}

export async function checkWalletConnection(provider: WalletProvider = 'freighter'): Promise<WalletState> {
    if (provider === 'freighter') {
        try {
            const connectedRes = await freighterIsConnected();
            if (!connectedRes || connectedRes.error || !connectedRes.isConnected) {
                return { publicKey: null, network: null, balance: null, isConnected: false, isConnecting: false };
            }
            const addressRes = await freighterGetAddress();
            if (!addressRes || addressRes.error || !addressRes.address) {
                return { publicKey: null, network: null, balance: null, isConnected: false, isConnecting: false };
            }
            const networkResult = await freighterGetNetwork();
            const network = networkResult.error ? NETWORK_PASSPHRASE : networkResult.network;
            return {
                publicKey: addressRes.address,
                network: network || NETWORK_PASSPHRASE,
                balance: null,
                isConnected: true,
                isConnecting: false
            };
        } catch {
            return { publicKey: null, network: null, balance: null, isConnected: false, isConnecting: false };
        }
    } else {
        try {
            const installed = await isAlbedoInstalled();
            if (!installed) return { publicKey: null, network: null, balance: null, isConnected: false, isConnecting: false };
            const res = await window.albedo!.publicKey();
            return {
                publicKey: res.pubkey,
                network: NETWORK_PASSPHRASE,
                balance: null,
                isConnected: true,
                isConnecting: false,
            };
        } catch {
            return { publicKey: null, network: null, balance: null, isConnected: false, isConnecting: false };
        }
    }
}

import {
  isConnected as freighterIsConnected,
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";

/**
 * Connect to the Freighter wallet
 */
export const connectWallet = async () => {
  try {
    const status = await freighterIsConnected();
    if (status.isConnected) {
      const address = await freighterRequestAccess();
      console.log("[connectWallet] Address:", address);
      return address;
    }
    throw new Error("Freighter not installed");
  } catch (err) {
    console.error("[connectWallet] Error:", err);
    throw err;
  }
};

/**
 * Get the public key of the connected Freighter account
 */
export const getPublicKey = async () => {
  try {
    const address = await freighterRequestAccess();
    return address;
  } catch {
    return null;
  }
};

/**
 * Sign a transaction XDR with the Freighter wallet
 */
export const signTransaction = async (xdr: string, network: string = "TESTNET") => {
  try {
    const result = await freighterSign(xdr, { networkPassphrase: network });
    if (result.error) {
      throw new Error(result.error);
    }
    console.log("[signTransaction] Signed transaction successfully");
    return result.signedTxXdr || '';
  } catch (err) {
    console.error("[signTransaction] Error:", err);
    throw err;
  }
};

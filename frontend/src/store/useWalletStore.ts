import { create } from 'zustand'
import type { WalletState } from '../types'
import type { WalletProvider } from '../wallet'

type WalletStore = WalletState & {
  selectedWallet: WalletProvider | null
  setState: (partial: Partial<WalletState> & { selectedWallet?: WalletProvider | null }) => void
  reset: () => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  publicKey: null,
  network: null,
  balance: null,
  isConnected: false,
  isConnecting: false,
  selectedWallet: null,
  setState: (partial) => set((prev) => ({ ...prev, ...partial })),
  reset: () => set({
    publicKey: null,
    network: null,
    balance: null,
    isConnected: false,
    isConnecting: false,
    selectedWallet: null,
  }),
}))

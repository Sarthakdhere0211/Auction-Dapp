import { create } from 'zustand'
import { Auction, BidRecord } from '../types'

type State = {
  auctions: Auction[]
  bids: Record<number, BidRecord[]>
}

type Actions = {
  setAuctions: (a: Auction[]) => void
  setBids: (id: number, b: BidRecord[]) => void
}

export const useAuctionStore = create<State & Actions>((set) => ({
  auctions: [],
  bids: {},
  setAuctions: (a) => set({ auctions: a }),
  setBids: (id, b) => set((s) => ({ bids: { ...s.bids, [id]: b } })),
}))

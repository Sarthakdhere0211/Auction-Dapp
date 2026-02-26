export interface Auction {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    category: AuctionCategory;
    seller: string;
    startTime: number; // unix timestamp (seconds)
    endTime: number;   // unix timestamp (seconds)
    minBid: number;    // in XLM (stroops / 1e7)
    highestBid: number;
    highestBidder: string | null;
    isEnded: boolean;
}

export interface BidRecord {
    auctionId: number;
    bidder: string;
    amount: number;
    timestamp: number;
}

export type AuctionCategory = 'All' | 'Digital Art' | 'Real Estate' | 'Collectibles' | 'Luxury Goods' | 'Electronics';

export interface WalletState {
    publicKey: string | null;
    network: string | null;
    balance: string | null;
    isConnected: boolean;
    isConnecting: boolean;
}

export interface UserStats {
    totalBids: number;
    auctionsWon: number;
    activeAuctions: Auction[];
    pastWins: Auction[];
    bidsPlaced: BidRecord[];
}

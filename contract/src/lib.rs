#![no_std]

//! Stellar Soroban Auction Smart Contract
//! Production-ready implementation

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env,
};

#[contracttype]
pub enum DataKey {
    Initialized,
    Owner,
    StartingPrice,
    HighestBid,
    HighestBidder,
    EndTime,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AuctionError {
    AuctionNotInitialized = 1,
    AuctionEnded = 2,
    BidTooLow = 3,
    Unauthorized = 4,
    AlreadyInitialized = 5,
    InvalidEndTime = 6,
    InvalidAmount = 7,
}

#[contractevent(topics = ["auction_initialized"], data_format = "single-value")]
pub struct AuctionInitializedEvent {
    #[topic]
    pub owner: Address,
    pub end_time: u64,
}

#[contractevent(topics = ["bid_placed"], data_format = "single-value")]
pub struct BidPlacedEvent {
    #[topic]
    pub bidder: Address,
    pub amount: i128,
}

#[contractevent(topics = ["end_time_updated"], data_format = "single-value")]
pub struct EndTimeUpdatedEvent {
    #[topic]
    pub owner: Address,
    pub new_end_time: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Auction {
    pub owner: Address,
    pub starting_price: i128,
    pub highest_bid: i128,
    pub highest_bidder: Option<Address>,
    pub end_time: u64,
}

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {

    // ----------------------------
    // Helper Functions
    // ----------------------------

    pub fn is_initialized(env: Env) -> bool {
        match env.storage().instance().get::<DataKey, bool>(&DataKey::Initialized) {
            Some(v) => v,
            None => false,
        }
    }

    pub fn is_live(env: Env) -> bool {
        if !Self::is_initialized(env.clone()) {
            return false;
        }

        let end_time = match env.storage().instance().get::<DataKey, u64>(&DataKey::EndTime) {
            Some(v) => v,
            None => return false,
        };

        env.ledger().timestamp() < end_time
    }

    // ----------------------------
    // Initialize Auction
    // ----------------------------

    pub fn initialize(
        env: Env,
        owner: Address,
        starting_price: i128,
        end_time: u64,
    ) -> Result<(), AuctionError> {

        if Self::is_initialized(env.clone()) {
            return Err(AuctionError::AlreadyInitialized);
        }

        let now = env.ledger().timestamp();

        if end_time <= now {
            return Err(AuctionError::InvalidEndTime);
        }

        if starting_price < 0 {
            return Err(AuctionError::BidTooLow);
        }

        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::StartingPrice, &starting_price);
        env.storage().instance().set(&DataKey::HighestBid, &starting_price);

        let none_bidder: Option<Address> = None;
        env.storage().instance().set(&DataKey::HighestBidder, &none_bidder);

        env.storage().instance().set(&DataKey::EndTime, &end_time);
        env.storage().instance().set(&DataKey::Initialized, &true);

        AuctionInitializedEvent {
            owner,
            end_time,
        }
        .publish(&env);

        Ok(())
    }

    // ----------------------------
    // Place Bid
    // ----------------------------

    pub fn place_bid(
        env: Env,
        bidder: Address,
        amount: i128,
    ) -> Result<(), AuctionError> {

        bidder.require_auth();

        if amount <= 0 {
            return Err(AuctionError::InvalidAmount);
        }

        if !Self::is_initialized(env.clone()) {
            let now = env.ledger().timestamp();
            let end_time = now + 3600;

            env.storage().instance().set(&DataKey::Owner, &bidder.clone());
            env.storage().instance().set(&DataKey::StartingPrice, &amount);
            env.storage().instance().set(&DataKey::HighestBid, &amount);

            let some_bidder: Option<Address> = Some(bidder.clone());
            env.storage().instance().set(&DataKey::HighestBidder, &some_bidder);

            env.storage().instance().set(&DataKey::EndTime, &end_time);
            env.storage().instance().set(&DataKey::Initialized, &true);

            AuctionInitializedEvent {
                owner: bidder.clone(),
                end_time,
            }
            .publish(&env);

            BidPlacedEvent {
                bidder,
                amount,
            }
            .publish(&env);

            return Ok(());
        }

        let end_time = match env.storage().instance().get::<DataKey, u64>(&DataKey::EndTime) {
            Some(v) => v,
            None => return Err(AuctionError::AuctionNotInitialized),
        };

        let now = env.ledger().timestamp();

        // When auction has ended, extend by 1 hour and accept this bid (never return AuctionEnded).
        if now >= end_time {
            let new_end = now + 3600;

            env.storage().instance().set(&DataKey::Owner, &bidder.clone());
            env.storage().instance().set(&DataKey::StartingPrice, &amount);
            env.storage().instance().set(&DataKey::HighestBid, &amount);

            let some_bidder: Option<Address> = Some(bidder.clone());
            env.storage().instance().set(&DataKey::HighestBidder, &some_bidder);

            env.storage().instance().set(&DataKey::EndTime, &new_end);
            env.storage().instance().set(&DataKey::Initialized, &true);

            AuctionInitializedEvent {
                owner: bidder.clone(),
                end_time: new_end,
            }
            .publish(&env);

            BidPlacedEvent {
                bidder,
                amount,
            }
            .publish(&env);

            return Ok(());
        }

        let highest_bid = match env
            .storage()
            .instance()
            .get::<DataKey, i128>(&DataKey::HighestBid)
        {
            Some(v) => v,
            None => return Err(AuctionError::AuctionNotInitialized),
        };

        if amount <= highest_bid {
            return Err(AuctionError::BidTooLow);
        }

        env.storage().instance().set(&DataKey::HighestBid, &amount);

        let some_bidder: Option<Address> = Some(bidder.clone());

        env.storage().instance().set(&DataKey::HighestBidder, &some_bidder);

        BidPlacedEvent {
            bidder,
            amount,
        }
        .publish(&env);

        Ok(())
    }

    // ----------------------------
    // Update Auction End Time
    // ----------------------------

    pub fn set_end_time(
        env: Env,
        caller: Address,
        new_end_time: u64,
    ) -> Result<(), AuctionError> {

        if !Self::is_initialized(env.clone()) {
            return Err(AuctionError::AuctionNotInitialized);
        }

        caller.require_auth();

        let owner = match env.storage().instance().get::<DataKey, Address>(&DataKey::Owner) {
            Some(v) => v,
            None => return Err(AuctionError::AuctionNotInitialized),
        };

        if caller != owner {
            return Err(AuctionError::Unauthorized);
        }

        let now = env.ledger().timestamp();

        if new_end_time <= now {
            return Err(AuctionError::InvalidEndTime);
        }

        env.storage().instance().set(&DataKey::EndTime, &new_end_time);

        EndTimeUpdatedEvent {
            owner,
            new_end_time,
        }
        .publish(&env);

        Ok(())
    }

    // ----------------------------
    // Get Auction Data
    // ----------------------------

    pub fn get_auction(env: Env) -> Result<Auction, AuctionError> {

        if !Self::is_initialized(env.clone()) {
            return Err(AuctionError::AuctionNotInitialized);
        }

        let owner = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::Owner)
            .ok_or(AuctionError::AuctionNotInitialized)?;

        let starting_price = env
            .storage()
            .instance()
            .get::<DataKey, i128>(&DataKey::StartingPrice)
            .ok_or(AuctionError::AuctionNotInitialized)?;

        let highest_bid = env
            .storage()
            .instance()
            .get::<DataKey, i128>(&DataKey::HighestBid)
            .ok_or(AuctionError::AuctionNotInitialized)?;

        let highest_bidder: Option<Address> = match env
            .storage()
            .instance()
            .get::<DataKey, Option<Address>>(&DataKey::HighestBidder)
        {
            Some(v) => v,
            None => None,
        };

        let end_time = env
            .storage()
            .instance()
            .get::<DataKey, u64>(&DataKey::EndTime)
            .ok_or(AuctionError::AuctionNotInitialized)?;

        Ok(Auction {
            owner,
            starting_price,
            highest_bid,
            highest_bidder,
            end_time,
        })
    }

    // ----------------------------
    // Auction Status
    // ----------------------------

    pub fn get_auction_status(env: Env) -> u32 {

        if !Self::is_initialized(env.clone()) {
            return 0;
        }

        let end_time = match env.storage().instance().get::<DataKey, u64>(&DataKey::EndTime) {
            Some(v) => v,
            None => return 0,
        };

        if env.ledger().timestamp() >= end_time {
            return 2;
        }

        1
    }

    // ----------------------------
    // Current Ledger Time
    // ----------------------------

    pub fn current_time(env: Env) -> u64 {
        env.ledger().timestamp()
    }
}

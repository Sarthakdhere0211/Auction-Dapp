#![no_std]

//! Stellar Soroban Auction Smart Contract - Production Ready
//! Upgraded with Token Bidding, Anti-Sniping, and Buy Now features.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
};

#[contracttype]
pub enum DataKey {
    Initialized,
    Owner,
    TokenId,
    StartingPrice,
    HighestBid,
    HighestBidder,
    EndTime,
    BuyNowPrice,
    IsEnded,
    Finalized,
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
    InsufficientAllowance = 8,
    BuyNowNotSet = 9,
}

#[contractevent]
pub struct AuctionInitializedEvent {
    pub owner: Address,
    pub token_id: Address,
    pub end_time: u64,
}

#[contractevent]
pub struct BidPlacedEvent {
    pub bidder: Address,
    pub amount: i128,
}

#[contractevent]
pub struct AuctionEndedEvent {
    pub winner: Option<Address>,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Auction {
    pub owner: Address,
    pub token_id: Address,
    pub starting_price: i128,
    pub highest_bid: i128,
    pub highest_bidder: Option<Address>,
    pub end_time: u64,
    pub buy_now_price: Option<i128>,
    pub is_ended: bool,
    pub finalized: bool,
}

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {
    pub fn initialize(
        env: Env,
        owner: Address,
        token_id: Address,
        starting_price: i128,
        end_time: u64,
        buy_now_price: Option<i128>,
    ) -> Result<(), AuctionError> {
        if env.storage().instance().has(&DataKey::Initialized) {
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
        env.storage().instance().set(&DataKey::TokenId, &token_id);
        env.storage().instance().set(&DataKey::StartingPrice, &starting_price);
        env.storage().instance().set(&DataKey::HighestBid, &starting_price);
        env.storage().instance().set(&DataKey::HighestBidder, &Option::<Address>::None);
        env.storage().instance().set(&DataKey::EndTime, &end_time);
        env.storage().instance().set(&DataKey::BuyNowPrice, &buy_now_price);
        env.storage().instance().set(&DataKey::IsEnded, &false);
        env.storage().instance().set(&DataKey::Finalized, &false);
        env.storage().instance().set(&DataKey::Initialized, &true);

        AuctionInitializedEvent {
            owner,
            token_id,
            end_time,
        }
        .publish(&env);

        Ok(())
    }

    pub fn place_bid(env: Env, bidder: Address, amount: i128) -> Result<(), AuctionError> {
        bidder.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(AuctionError::AuctionNotInitialized);
        }

        let is_ended: bool = env.storage().instance().get(&DataKey::IsEnded).unwrap();
        let end_time: u64 = env.storage().instance().get(&DataKey::EndTime).unwrap();
        let now = env.ledger().timestamp();

        if is_ended || now >= end_time {
            return Err(AuctionError::AuctionEnded);
        }

        let highest_bid: i128 = env.storage().instance().get(&DataKey::HighestBid).unwrap();
        if amount <= highest_bid {
            return Err(AuctionError::BidTooLow);
        }

        let token_id: Address = env.storage().instance().get(&DataKey::TokenId).unwrap();
        let token_client = token::Client::new(&env, &token_id);

        // Check allowance
        let allowance = token_client.allowance(&bidder, &env.current_contract_address());
        if allowance < amount {
            return Err(AuctionError::InsufficientAllowance);
        }

        // Refund previous bidder if exists
        if let Some(prev_bidder) = env
            .storage()
            .instance()
            .get::<DataKey, Option<Address>>(&DataKey::HighestBidder)
            .unwrap()
        {
            token_client.transfer(&env.current_contract_address(), &prev_bidder, &highest_bid);
        }

        // Transfer tokens from new bidder to contract using transfer_from
        token_client.transfer_from(&env.current_contract_address(), &bidder, &env.current_contract_address(), &amount);

        // Update state
        env.storage().instance().set(&DataKey::HighestBid, &amount);
        env.storage().instance().set(&DataKey::HighestBidder, &Some(bidder.clone()));

        // Anti-sniping: If bid is placed within 5 minutes of end, extend by 5 minutes
        if end_time - now < 300 {
            let new_end_time = end_time + 300;
            env.storage().instance().set(&DataKey::EndTime, &new_end_time);
        }

        // Check Buy Now
        if let Some(buy_now_price) = env
            .storage()
            .instance()
            .get::<DataKey, Option<i128>>(&DataKey::BuyNowPrice)
            .unwrap()
        {
            if amount >= buy_now_price {
                env.storage().instance().set(&DataKey::IsEnded, &true);
                AuctionEndedEvent {
                    winner: Some(bidder.clone()),
                    amount,
                }
                .publish(&env);
            }
        }

        BidPlacedEvent { bidder, amount }.publish(&env);

        Ok(())
    }

    pub fn buy_now(env: Env, bidder: Address) -> Result<(), AuctionError> {
        bidder.require_auth();

        let buy_now_price = env
            .storage()
            .instance()
            .get::<DataKey, Option<i128>>(&DataKey::BuyNowPrice)
            .unwrap()
            .ok_or(AuctionError::BuyNowNotSet)?;

        Self::place_bid(env, bidder, buy_now_price)
    }

    pub fn finalize(env: Env) -> Result<(), AuctionError> {
        let is_ended: bool = env.storage().instance().get(&DataKey::IsEnded).unwrap();
        let finalized: bool = env.storage().instance().get(&DataKey::Finalized).unwrap();
        let end_time: u64 = env.storage().instance().get(&DataKey::EndTime).unwrap();
        let now = env.ledger().timestamp();

        if !is_ended && now < end_time {
            return Err(AuctionError::Unauthorized); // Too early
        }

        if finalized {
            return Ok(());
        }

        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        let highest_bid: i128 = env.storage().instance().get(&DataKey::HighestBid).unwrap();
        let highest_bidder: Option<Address> =
            env.storage().instance().get(&DataKey::HighestBidder).unwrap();

        let token_id: Address = env.storage().instance().get(&DataKey::TokenId).unwrap();
        let token_client = token::Client::new(&env, &token_id);

        if let Some(winner) = highest_bidder.clone() {
            token_client.transfer(&env.current_contract_address(), &owner, &highest_bid);
            AuctionEndedEvent {
                winner: Some(winner),
                amount: highest_bid,
            }
            .publish(&env);
        } else {
            AuctionEndedEvent {
                winner: None,
                amount: 0,
            }
            .publish(&env);
        }

        env.storage().instance().set(&DataKey::IsEnded, &true);
        env.storage().instance().set(&DataKey::Finalized, &true);
        Ok(())
    }

    pub fn get_auction(env: Env) -> Result<Auction, AuctionError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(AuctionError::AuctionNotInitialized);
        }

        Ok(Auction {
            owner: env.storage().instance().get(&DataKey::Owner).unwrap(),
            token_id: env.storage().instance().get(&DataKey::TokenId).unwrap(),
            starting_price: env.storage().instance().get(&DataKey::StartingPrice).unwrap(),
            highest_bid: env.storage().instance().get(&DataKey::HighestBid).unwrap(),
            highest_bidder: env.storage().instance().get(&DataKey::HighestBidder).unwrap(),
            end_time: env.storage().instance().get(&DataKey::EndTime).unwrap(),
            buy_now_price: env.storage().instance().get(&DataKey::BuyNowPrice).unwrap(),
            is_ended: env.storage().instance().get(&DataKey::IsEnded).unwrap(),
            finalized: env.storage().instance().get(&DataKey::Finalized).unwrap(),
        })
    }
}

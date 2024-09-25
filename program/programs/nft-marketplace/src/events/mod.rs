use anchor_lang::prelude::*;

use crate::state::{Listing, Marketplace, UserAccount};

#[event]
pub struct MarketplaceInitialized {
    pub marketplace: Marketplace,
    pub pubkey: Pubkey,
    #[index]
    pub label: String,
}

#[event]
pub struct ListingCreated {
    pub listing: Listing,
    pub pubkey: Pubkey,
    #[index]
    pub label: String,
}

#[event]
pub struct ListingDelisted {
    pub listing_pubkey: Pubkey,
    #[index]
    pub label: String,
}

#[event]
pub struct ListingEnded {
    pub listing_pubkey: Pubkey,
    #[index]
    pub label: String,
}

#[event]
pub struct BidPlaced {
    pub bidder: Pubkey,
    pub listing: Pubkey,
    pub current_bid: u64,
    pub end_time_in_slots: u64,
    #[index]
    pub label: String,
}

#[event]
pub struct UserCreated {
    pub user: UserAccount,
    pub pubkey: Pubkey,
    #[index]
    pub label: String,
}

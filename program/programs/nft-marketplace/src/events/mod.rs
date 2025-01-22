use anchor_lang::prelude::*;

#[event]
pub struct MarketplaceInitialized {
    pub marketplace_pubkey: Pubkey,
    #[index]
    pub label: String,
}

#[event]
pub struct ListingCreated {
    pub listing_pubkey: Pubkey,
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
    pub user_pubkey: Pubkey,
    #[index]
    pub label: String,
}

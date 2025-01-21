use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub bid_cost: u64,
    pub bid_increment: u64,
    pub current_bid: u64,
    pub highest_bidder: Pubkey,
    pub timer_extension_in_slots: u64,
    pub start_time_in_slots: u64,
    pub end_time_in_slots: u64,
    pub is_active: bool,
    pub buyout_price: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ListingV2 {
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub bid_cost: u64,
    pub bid_increment: u64,
    pub current_bid: u64,
    pub highest_bidder: Pubkey,
    pub timer_extension_in_slots: u64,
    pub start_time_in_slots: u64,
    pub end_time_in_slots: u64,
    pub is_active: bool,
    pub buyout_price: u64,
    pub seed: u64,
    pub bump: u8,

    pub padding: [u8; 6],
    pub _reserved: [u8; 32],
}

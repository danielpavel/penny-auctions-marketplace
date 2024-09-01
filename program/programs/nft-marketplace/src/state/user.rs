use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub total_bids_placed: u64,
    pub total_auctions_participated: u64,
    pub total_auctions_won: u64,

    pub points: u32,
    pub bump: u8,
}

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub total_bids_placed: u32,
    pub total_auctions_participated: u32,
    pub total_auctions_won: u32,

    pub points: u32,
    pub bump: u8,
}

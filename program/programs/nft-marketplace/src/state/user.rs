use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct UserAccount {
    pub owner: Pubkey,
    pub total_bids_placed: u32,
    pub total_auctions_participated: u32,
    pub total_auctions_won: u32,
    pub total_auctions_created: u32,

    pub points: u32,
    pub bump: u8,

    pub padding: [u8; 3],
    pub _reserved: [u8; 32],
}

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Marketplace {
    pub admin: Pubkey,
    pub bids_mint: Pubkey,
    pub bids_vault: Pubkey,
    pub fee: u16,
    #[max_len(32)]
    pub name: String,
    pub bump: u8,
    pub rewards_bump: u8,
    pub treasury_bump: u8,
}

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Debug, InitSpace)]
pub enum MintCostTier {
    Tier1,
    Tier2,
    Tier3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Debug, InitSpace)]
pub struct MintTier {
    pub tier: MintCostTier,
    pub amount: u64,
    pub cost: u64,
    pub bonus: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Marketplace {
    pub admin: Pubkey,
    pub sbid_mint: Pubkey,
    pub treasury: Pubkey,
    pub fee: u16,
    #[max_len(32)]
    pub name: String,
    pub mint_tiers: [MintTier; 3],
    pub bump: u8,
    pub treasury_bump: u8,
}

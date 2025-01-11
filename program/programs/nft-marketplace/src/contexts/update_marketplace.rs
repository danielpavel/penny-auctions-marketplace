use anchor_lang::prelude::*;

use crate::state::{Marketplace, MintTier};

#[derive(Accounts)]
pub struct UpdateMarketplace<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        has_one = admin,
        seeds = [b"marketplace", marketplace.admin.key().as_ref(), marketplace.sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    pub system_program: Program<'info, System>,
}

impl<'info> UpdateMarketplace<'info> {
    pub fn update_mint_tiers(&mut self, tiers: [MintTier; 3]) -> Result<()> {
        self.marketplace.mint_tiers = tiers;

        Ok(())
    }
}

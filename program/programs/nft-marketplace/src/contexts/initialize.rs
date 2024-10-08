use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{constants::MARKET_INITIALIZED_LABEL, state::Marketplace};
use crate::{errors::MarketplaceErrorCode, events::MarketplaceInitialized};

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [b"marketplace".as_ref(), name.as_str().as_bytes()],
        bump,
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        init,
        payer = admin,
        mint::authority = marketplace,
        mint::decimals = 6,
        mint::token_program = token_program,
        seeds = [b"rewards", marketplace.key().as_ref()],
        bump
    )]
    rewards_mint: InterfaceAccount<'info, Mint>,

    bids_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = bids_mint,
        associated_token::authority = marketplace,
    )]
    bids_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}

impl<'info> Initialize<'info> {
    pub fn init(&mut self, name: String, fee: u16, bumps: &InitializeBumps) -> Result<()> {
        require!(
            name.len() > 0 && name.len() < 33,
            MarketplaceErrorCode::MarketplaceNameTooLong
        );

        let inner = Marketplace {
            admin: self.admin.key(),
            bids_mint: self.bids_mint.key(),
            bids_vault: self.bids_vault.key(),
            fee,
            name,
            bump: bumps.marketplace,
            rewards_bump: bumps.rewards_mint,
            treasury_bump: bumps.treasury,
        };

        self.marketplace.set_inner(inner.clone());

        emit!(MarketplaceInitialized {
            marketplace: self.marketplace.clone().into_inner(),
            pubkey: self.marketplace.key(),
            label: MARKET_INITIALIZED_LABEL.to_string()
        });

        Ok(())
    }
}

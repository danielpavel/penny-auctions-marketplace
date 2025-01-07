use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},
};

use crate::state::Marketplace;

#[derive(Accounts)]
pub struct MintBidToken<'info> {
    #[account(
        address = marketplace.admin
    )]
    admin: Signer<'info>,

    #[account(mut)]
    user: Signer<'info>,

    #[account(
        has_one = sbid_mint,
        seeds = [b"marketplace", admin.key().as_ref(), sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(mut)]
    sbid_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = sbid_mint,
        associated_token::authority = user,
    )]
    user_sbid_ata: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> MintBidToken<'info> {
    pub fn mint_token(&mut self, amount: u64) -> Result<()> {
        let bump = [self.marketplace.bump];
        let signer_seeds: [&[&[u8]]; 1] = [&[
            b"marketplace",
            self.admin.to_account_info().key.as_ref(),
            self.sbid_mint.to_account_info().key.as_ref(),
            self.marketplace.name.as_str().as_bytes(),
            &bump,
        ][..]];

        let accounts = MintTo {
            mint: self.sbid_mint.to_account_info(),
            to: self.user_sbid_ata.to_account_info(),
            authority: self.marketplace.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        mint_to(cpi_context, amount)
    }
}

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_2022::{spl_token_2022, Token2022},
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},
};

use crate::state::Marketplace;

#[derive(Accounts)]
pub struct MintBidToken<'info> {
    #[account(
        mut,
        address = marketplace.admin
    )]
    admin: Signer<'info>,

    #[account(mut)]
    user: Signer<'info>,

    #[account(
        mut,
        has_one = sbid_mint,
        seeds = [b"marketplace".as_ref(), sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        address = marketplace.sbid_mint
    )]
    pub sbid_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = sbid_mint,
        associated_token::authority = user,
    )]
    user_sbid_ata: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    //pub token_program: Interface<'info, TokenInterface>,
    pub token_program: Program<'info, Token>,
    //pub token_program: Program<'info, Token2022>,
}

impl<'info> MintBidToken<'info> {
    pub fn mint_token(&mut self, amount: u64) -> Result<()> {
        // let bump = [self.marketplace.bump];
        // let signer_seeds: [&[&[u8]]; 1] = [&[
        //     b"marketplace",
        //     self.sbid_mint.to_account_info().key.as_ref(),
        //     self.marketplace.name.as_str().as_bytes(),
        //     &bump,
        // ][..]];
        //
        // let accounts = MintTo {
        //     mint: self.sbid_mint.to_account_info(),
        //     to: self.user_sbid_ata.to_account_info(),
        //     authority: self.marketplace.to_account_info(),
        // };

        // let cpi_context = CpiContext::new_with_signer(
        //     self.token_program_2022.to_account_info(),
        //     accounts,
        //     &signer_seeds,
        // );

        //mint_to(cpi_context, amount)
        Ok(())
    }
}

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{MasterEditionAccount, Metadata, MetadataAccount},
    token::Token,
    token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked},
};

use crate::state::{Listing, Marketplace};

#[derive(Accounts)]
pub struct List<'info> {
    #[account(mut)]
    seller: Signer<'info>,

    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", marketplace.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    listing: Box<Account<'info, Listing>>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub collection: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller
    )]
    seller_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    escrow: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [b"metadata", metadata_program.key().as_ref(), mint.key().as_ref()],
        seeds::program = metadata_program.key(),
        bump,
        constraint = metadata.collection.as_ref().unwrap().key.as_ref() == collection.key().as_ref(),
        constraint = metadata.collection.as_ref().unwrap().verified == true,
    )]
    pub metadata: Account<'info, MetadataAccount>,

    #[account(
    seeds = [b"metadata", metadata_program.key().as_ref(), mint.key().as_ref(), b"edition"],
        seeds::program = metadata_program.key(),
        bump
    )]
    pub master_edition: Account<'info, MasterEditionAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
}

impl<'info> List<'info> {
    pub fn create_listing(
        &mut self,
        bid_increment: u64,
        timer_extension: u64,
        start_time: i64,
        initial_duration: i64,
        buyout_price: u64,
        bumps: &ListBumps,
    ) -> Result<()> {
        self.listing.set_inner(Listing {
            mint: self.mint.key(),
            seller: self.seller.key(),
            bid_cost: 1,
            bid_increment,
            current_bid: 0,
            highest_bidder: Pubkey::default(),
            timer_extension,
            start_time,
            end_time: start_time + initial_duration,
            is_active: true,
            buyout_price,
            bump: bumps.listing,
        });

        Ok(())
    }

    pub fn transfer_to_escrow(&mut self) -> Result<()> {
        let accounts = TransferChecked {
            from: self.seller_ata.to_account_info(),
            to: self.escrow.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.seller.to_account_info(),
        };

        let cpi_context = CpiContext::new(self.token_program.to_account_info(), accounts);

        transfer_checked(cpi_context, 1, self.mint.decimals)
    }
}

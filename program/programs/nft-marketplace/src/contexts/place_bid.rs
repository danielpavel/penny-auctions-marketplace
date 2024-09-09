use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked},
};

use crate::{
    state::{Listing, Marketplace},
    utils::{assert_auction_active, MarketplaceErrorCode},
};

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    bidder: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = bids_mint,
        associated_token::authority = bidder,
    )]
    bidder_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        address = listing.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        has_one = mint,
        seeds = [b"listing", marketplace.key().as_ref(), listing.mint.key().as_ref()],
        bump = listing.bump
    )]
    listing: Box<Account<'info, Listing>>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        address = marketplace.bids_mint
    )]
    pub bids_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = bids_mint,
        associated_token::authority = marketplace,
    )]
    bids_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> PlaceBid<'info> {
    pub fn place_bid(&mut self) -> Result<()> {
        assert_auction_active(&self.listing)?;

        require!(
            self.listing.highest_bidder.key() != self.bidder.key(),
            MarketplaceErrorCode::BidderIsHighestBidder
        );

        // Transfer the bid token to the vault
        self.transfer_bid_token()?;

        let auction = &mut self.listing;
        auction.current_bid = auction
            .current_bid
            .checked_add(auction.bid_increment)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        auction.highest_bidder = self.bidder.key();
        auction.end_time_in_slots = auction
            .end_time_in_slots
            .checked_add(auction.timer_extension_in_slots)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }

    fn transfer_bid_token(&self) -> Result<()> {
        let accounts = TransferChecked {
            from: self.bidder_ata.to_account_info(),
            to: self.bids_vault.to_account_info(),
            mint: self.bids_mint.to_account_info(),
            authority: self.bidder.to_account_info(),
        };

        let cpi_context = CpiContext::new(self.token_program.to_account_info(), accounts);

        let decimals = self.bids_mint.decimals;
        let amount = self
            .listing
            .bid_cost
            .checked_mul(
                10u64
                    .checked_pow(decimals as u32)
                    .ok_or(ProgramError::ArithmeticOverflow)?,
            )
            .ok_or(ProgramError::ArithmeticOverflow)?;

        transfer_checked(cpi_context, amount, decimals)?;

        Ok(())
    }
}

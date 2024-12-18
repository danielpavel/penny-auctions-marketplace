use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked},
};

use crate::{
    constants::BID_PLACED_LABEL,
    events::BidPlaced,
    state::{ListingV2, Marketplace},
    utils::{
        assert_already_highest_bidder, assert_auction_active,
        assert_correct_highest_bidder_and_bid, MarketplaceErrorCode,
    },
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
        seeds = [b"listing", marketplace.key().as_ref(), listing.mint.key().as_ref(), listing.seed.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    listing: Box<Account<'info, ListingV2>>,

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
    pub fn place_bid(&mut self, current_highest_bidder: &Pubkey, current_bid: &u64) -> Result<()> {
        assert_auction_active(&self.listing)?;
        assert_correct_highest_bidder_and_bid(&self.listing, current_highest_bidder, current_bid)?;
        assert_already_highest_bidder(&self.listing, &self.bidder.to_account_info().key())?;

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

        emit!(BidPlaced {
            bidder: self.bidder.key(),
            listing: auction.key(),
            current_bid: auction.current_bid,
            end_time_in_slots: auction.end_time_in_slots,
            label: BID_PLACED_LABEL.to_string(),
        });

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

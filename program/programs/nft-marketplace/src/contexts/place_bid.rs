use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{burn, Burn, Mint, TokenAccount, TokenInterface},
};

use crate::{
    constants::{BID_PLACED_LABEL, REWARD_TIER_1},
    events::BidPlaced,
    state::{ListingV2, Marketplace, UserAccount},
    utils::{
        assert_already_highest_bidder, assert_auction_active,
        assert_correct_highest_bidder_and_bid, MarketplaceErrorCode,
    },
};

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", marketplace.key().as_ref(), bidder.key().as_ref()],
        bump = user_account.bump
        )
    ]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub sbid_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        // TODO: Fix this ...
        // associated_token::mint = sbid_mint,
        // associated_token::authority = bidder,
    )]
    pub bidder_sbid_ata: InterfaceAccount<'info, TokenAccount>,

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
        has_one = sbid_mint,
        seeds = [b"marketplace", marketplace.admin.key().as_ref(), sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
        self.burn_token()?;

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

    fn burn_token(&self) -> Result<()> {
        let bump = [self.marketplace.bump];
        let signer_seeds: [&[&[u8]]; 1] = [&[
            b"marketplace",
            self.marketplace.admin.as_ref(),
            self.marketplace.sbid_mint.as_ref(),
            self.marketplace.name.as_str().as_bytes(),
            &bump,
        ][..]];

        let accounts = Burn {
            mint: self.sbid_mint.to_account_info(),
            from: self.bidder_sbid_ata.to_account_info(),
            authority: self.bidder.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        let decimals = self.sbid_mint.decimals;
        let amount = self
            .listing
            .bid_cost
            .checked_mul(
                10u64
                    .checked_pow(decimals as u32)
                    .ok_or(ProgramError::ArithmeticOverflow)?,
            )
            .ok_or(ProgramError::ArithmeticOverflow)?;

        burn(cpi_context, amount)?;

        Ok(())
    }

    pub fn reward_user(&mut self) -> Result<()> {
        self.user_account.points = self
            .user_account
            .points
            .checked_add(REWARD_TIER_1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        self.user_account.total_bids_placed = self
            .user_account
            .total_bids_placed
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }
}

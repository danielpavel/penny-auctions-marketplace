use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TransferChecked,
    },
};

use crate::{
    constants::LISTING_ENDED_LABEL,
    events::ListingEnded,
    state::{Listing, Marketplace},
    utils::{assert_allowed_claimer, assert_auction_ended, transfer_sol, MarketplaceErrorCode},
};

#[derive(Accounts)]
pub struct EndListing<'info> {
    #[account(mut)]
    user: Signer<'info>,

    #[account(
        mut,
        address = listing.seller
    )]
    /// CHECK: This is the seller - "address" constraint will take care of that.
    seller: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    user_ata: InterfaceAccount<'info, TokenAccount>,

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
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        mut,
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> EndListing<'info> {
    pub fn end_listing(&mut self) -> Result<()> {
        //let auction = self.listing;

        require!(self.listing.is_active, MarketplaceErrorCode::AuctionEnded);
        assert_auction_ended(&self.listing)?;
        assert_allowed_claimer(&self.listing, &self.user.to_account_info())?;

        // Transfer the current_bid price to treasury
        transfer_sol(
            self.user.to_account_info(),
            self.treasury.to_account_info(),
            self.system_program.to_account_info(),
            self.listing.current_bid,
        )?;

        // Transfer the NFT to the highest bidder
        self.withdraw_and_close()?;

        self.listing.is_active = false;

        emit!(ListingEnded {
            listing_pubkey: self.listing.key(),
            label: LISTING_ENDED_LABEL.to_string(),
        });

        Ok(())
    }

    pub fn withdraw_and_close(&mut self) -> Result<()> {
        let bump = [self.listing.bump];
        let signer_seeds = [&[
            b"listing",
            self.marketplace.to_account_info().key.as_ref(),
            self.mint.to_account_info().key.as_ref(),
            &bump,
        ][..]];

        let accounts = TransferChecked {
            from: self.escrow.to_account_info(),
            to: self.user_ata.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        transfer_checked(cpi_context, 1, self.mint.decimals)?;

        // Close the escrow account
        let accounts = CloseAccount {
            account: self.escrow.to_account_info(),
            destination: self.seller.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        close_account(ctx)
    }
}

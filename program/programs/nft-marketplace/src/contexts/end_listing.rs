use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{MasterEditionAccount, Metadata, MetadataAccount},
    token::Token,
    token_interface::{close_account, CloseAccount, Mint, TokenAccount},
};

use crate::{
    constants::{LISTING_ENDED_LABEL, REWARD_TIER_3},
    events::ListingEnded,
    state::{ListingV2, Marketplace, UserAccount},
    transfer::transfer_asset,
    utils::{assert_allowed_claimer, assert_auction_ended, transfer_sol, MarketplaceErrorCode},
};

#[derive(Accounts)]
pub struct EndListing<'info> {
    #[account(mut)]
    user: Signer<'info>,

    #[account(
        address = marketplace.admin @ MarketplaceErrorCode::InvalidListingAuthority
    )]
    admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", marketplace.key().as_ref(), user.key().as_ref()],
        bump
        )
    ]
    pub user_account: Account<'info, UserAccount>,

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
    pub collection: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        has_one = mint,
        seeds = [b"listing", marketplace.key().as_ref(), listing.mint.key().as_ref(), listing.seed.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    listing: Box<Account<'info, ListingV2>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"metadata", metadata_program.key().as_ref(), mint.key().as_ref()],
        seeds::program = metadata_program.key(),
        bump,
        constraint = metadata.collection.as_ref().unwrap().key.as_ref() == collection.key().as_ref(),
        constraint = metadata.collection.as_ref().unwrap().verified == true,
    )]
    pub metadata: Box<Account<'info, MetadataAccount>>,

    #[account(
    seeds = [b"metadata", metadata_program.key().as_ref(), mint.key().as_ref(), b"edition"],
        seeds::program = metadata_program.key(),
        bump
    )]
    pub master_edition: Box<Account<'info, MasterEditionAccount>>,

    #[account(
        mut,
        seeds = [b"marketplace", marketplace.admin.key().as_ref(), marketplace.sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
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
    pub metadata_program: Program<'info, Metadata>,
    /// CHECK: The sysvar instructions account. This account is checked in metadata transfer
    pub sysvar_instructions: UncheckedAccount<'info>,
}

impl<'info> EndListing<'info> {
    pub fn end_listing<'a>(
        &mut self,
        amount: u64,
        remaining_accounts: &'a [AccountInfo<'info>],
    ) -> Result<()> {
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

        // Transfer the NFT to the user
        self.withdraw_and_close(amount, remaining_accounts)?;

        self.listing.is_active = false;

        emit!(ListingEnded {
            listing_pubkey: self.listing.key(),
            label: LISTING_ENDED_LABEL.to_string(),
        });

        Ok(())
    }

    pub fn withdraw_and_close<'a>(
        &mut self,
        amount: u64,
        remaining_accounts: &'a [AccountInfo<'info>],
    ) -> Result<()> {
        let bump = [self.listing.bump];
        let seed = self.listing.seed.to_le_bytes();
        let signer_seeds = [&[
            b"listing",
            self.marketplace.to_account_info().key.as_ref(),
            self.mint.to_account_info().key.as_ref(),
            seed.as_ref(),
            &bump,
        ][..]];

        transfer_asset(
            amount,
            &self.escrow.to_account_info(),
            &self.user_ata.to_account_info(),
            &self.listing.to_account_info(),
            &self.user.to_account_info(),
            &self.mint,
            &self.metadata.to_account_info(),
            &self.token_program,
            &self.system_program,
            &self.associated_token_program,
            &self.sysvar_instructions,
            remaining_accounts,
            Some(signer_seeds),
        )?;

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

    pub fn reward_user(&mut self, bump: u8) -> Result<()> {
        self.user_account.bump = bump;

        self.user_account.points = self
            .user_account
            .points
            .checked_add(REWARD_TIER_3)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        self.user_account.total_auctions_won = self
            .user_account
            .total_bids_placed
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }
}

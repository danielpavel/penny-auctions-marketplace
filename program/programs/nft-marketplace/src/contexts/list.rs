use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        mpl_token_metadata::{
            instructions::TransferCpiBuilder, programs::MPL_TOKEN_METADATA_ID, types::TransferArgs,
        },
        MasterEditionAccount, Metadata, MetadataAccount,
    },
    token::Token,
    token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked},
};

use crate::{
    constants::{LISTING_CREATED_LABEL, REWARD_TIER_2},
    events::ListingCreated,
    state::{ListingV2, Marketplace, UserAccount},
    transfer::transfer_asset,
    utils::MarketplaceErrorCode,
};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct List<'info> {
    #[account(mut)]
    seller: Signer<'info>,

    #[account(
        address = marketplace.admin @ MarketplaceErrorCode::InvalidListingAuthority
    )]
    admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = seller,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", marketplace.key().as_ref(), seller.key().as_ref()],
        bump
        )
    ]
    pub user_account: Box<Account<'info, UserAccount>>,

    #[account(
        init,
        payer = seller,
        space = 8 + ListingV2::INIT_SPACE,
        seeds = [b"listing", marketplace.key().as_ref(), mint.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump
    )]
    listing: Box<Account<'info, ListingV2>>,

    #[account(
        mut,
        seeds = [b"marketplace", admin.key().as_ref(), marketplace.sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Box<Account<'info, Marketplace>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,
    pub collection: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller
    )]
    pub seller_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow: Box<InterfaceAccount<'info, TokenAccount>>,

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
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
    /// CHECK: The sysvar instructions account. This account is checked in metadata transfer
    pub sysvar_instructions: UncheckedAccount<'info>,
}

impl<'info> List<'info> {
    pub fn create_listing(
        &mut self,
        seed: u64,
        bid_increment: u64,
        timer_extension_in_slots: u64,
        start_time_in_slots: u64,
        initial_duration_in_slots: u64,
        buyout_price: u64,
        bumps: &ListBumps,
    ) -> Result<()> {
        let end_time_in_slots = start_time_in_slots
            .checked_add(initial_duration_in_slots)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        self.listing.set_inner(ListingV2 {
            mint: self.mint.key(),
            seller: self.seller.key(),
            bid_cost: 1,
            bid_increment,
            current_bid: 0,
            highest_bidder: Pubkey::default(),
            timer_extension_in_slots,
            start_time_in_slots,
            end_time_in_slots,
            is_active: true,
            buyout_price,
            seed,
            bump: bumps.listing,
        });

        Ok(())
    }

    pub fn transfer_to_escrow2<'a>(
        &mut self,
        amount: u64,
        remaining_accounts: &'a [AccountInfo<'info>],
    ) -> Result<()> {
        transfer_asset(
            amount,
            &self.seller_ata.to_account_info(),
            &self.escrow.to_account_info(),
            &self.seller.to_account_info(),
            &self.listing.to_account_info(),
            &self.mint,
            &self.metadata.to_account_info(),
            &self.token_program,
            &self.system_program,
            &self.associated_token_program,
            &self.sysvar_instructions,
            remaining_accounts,
            None,
        )
    }

    pub fn transfer_to_escrow<'a>(
        &mut self,
        amount: u64,
        remaining_accounts: &'a [AccountInfo<'info>],
    ) -> Result<()> {
        let remaining_accounts = &mut remaining_accounts.iter();

        match next_account_info(remaining_accounts) {
            Ok(metadata_program) => {
                require!(
                    metadata_program.key() == MPL_TOKEN_METADATA_ID,
                    MarketplaceErrorCode::InvalidMetadataProgram
                );

                let seller_ata = self.seller_ata.to_account_info();
                let seller = self.seller.to_account_info();
                let escrow = self.escrow.to_account_info();
                let listing = self.listing.to_account_info();
                let mint = self.mint.to_account_info();
                let metadata = self.metadata.to_account_info();
                let system_program = self.system_program.to_account_info();
                let token_program = self.token_program.to_account_info();
                let associated_token_program = self.associated_token_program.to_account_info();
                let sysvar_instructions = self.sysvar_instructions.to_account_info();

                let edition = next_account_info(remaining_accounts).ok();
                let owner_tr = next_account_info(remaining_accounts).ok();
                let destination_tr = next_account_info(remaining_accounts).ok();
                let auth_rules_program = next_account_info(remaining_accounts).ok();
                let auth_rules = next_account_info(remaining_accounts).ok();

                // Create TransferArgs
                let transfer_args = TransferArgs::V1 {
                    amount,
                    authorization_data: None,
                };

                let mut mpl_cpi_transfer = TransferCpiBuilder::new(metadata_program);

                mpl_cpi_transfer
                    .token(&seller_ata)
                    .token_owner(&seller)
                    .destination_token(&escrow)
                    .destination_owner(&listing)
                    .mint(&mint)
                    .metadata(&metadata)
                    .edition(edition)
                    .token_record(owner_tr)
                    .destination_token_record(destination_tr)
                    .authority(&seller)
                    .payer(&seller)
                    .system_program(&system_program)
                    .sysvar_instructions(&sysvar_instructions)
                    .spl_token_program(&token_program)
                    .spl_ata_program(&associated_token_program)
                    .authorization_rules_program(auth_rules_program)
                    .authorization_rules(auth_rules)
                    .transfer_args(transfer_args);

                mpl_cpi_transfer.invoke().map_err(Into::into)
            }
            Err(_) => {
                let accounts = TransferChecked {
                    from: self.seller_ata.to_account_info(),
                    to: self.escrow.to_account_info(),
                    mint: self.mint.to_account_info(),
                    authority: self.seller.to_account_info(),
                };

                let cpi_context = CpiContext::new(self.token_program.to_account_info(), accounts);

                transfer_checked(cpi_context, amount, self.mint.decimals)
            }
        }
    }

    pub fn emit_listing_created(&self) {
        let inner_listing = self.listing.clone().into_inner();

        emit!(ListingCreated {
            listing: inner_listing,
            pubkey: self.listing.key(),
            label: LISTING_CREATED_LABEL.to_string(),
        });
    }

    pub fn reward_user(&mut self, bump: u8) -> Result<()> {
        self.user_account.bump = bump;
        self.user_account.owner = self.seller.key();

        self.user_account.points = self
            .user_account
            .points
            .checked_add(REWARD_TIER_2)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        self.user_account.total_auctions_created = self
            .user_account
            .total_auctions_created
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }
}

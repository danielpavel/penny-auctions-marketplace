use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::Metadata,
    token::Token,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TransferChecked,
    },
};
use solana_program::system_instruction;

use crate::state::{ListingV2, Marketplace};

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    buyer: Signer<'info>,

    #[account(mut)]
    /// CHECK: I dunno why Anchor is complaining about this one.
    /// I added the address field to the account attribute.
    seller: SystemAccount<'info>,

    #[account(
        address = listing.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    maker_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    taker_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = seller,
        has_one = seller,
        has_one = mint,
        seeds = [b"listing", marketplace.key().as_ref(), listing.mint.key().as_ref(), listing.seed.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    listing: Box<Account<'info, ListingV2>>,

    #[account(
        mut,
        seeds = [b"marketplace", marketplace.admin.key().as_ref(), marketplace.sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    vault: Box<InterfaceAccount<'info, TokenAccount>>,

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
}

impl<'info> Purchase<'info> {
    pub fn purchase(&mut self) -> Result<()> {
        let amount_to_treasury = self
            .listing
            .buyout_price
            .checked_mul(self.marketplace.fee as u64)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        // Transfer the amount to the treasury.
        self.transfer_sol(
            &self.buyer.to_account_info(),
            &self.treasury.to_account_info(),
            amount_to_treasury,
        )?;

        let amount_to_maker = self
            .listing
            .buyout_price
            .checked_sub(amount_to_treasury)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        // Transfer the remaining amount to the seller.
        self.transfer_sol(
            &self.buyer.to_account_info(),
            &self.seller.to_account_info(),
            amount_to_maker,
        )?;

        // Transfer the NFT to the buyer and close vault and listing account.
        self.withdraw_nft_and_close()
    }

    fn transfer_sol(
        &self,
        from: &AccountInfo<'info>,
        to: &AccountInfo<'info>,
        amount: u64,
    ) -> Result<()> {
        // Create the transfer instruction
        let transfer_instruction = system_instruction::transfer(from.key, to.key, amount);

        // Invoke the transfer instruction
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                from.to_account_info(),
                to.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn withdraw_nft_and_close(&mut self) -> Result<()> {
        let bump = [self.listing.bump];
        let signer_seeds = [&[
            b"listing",
            self.marketplace.to_account_info().key.as_ref(),
            self.mint.to_account_info().key.as_ref(),
            &bump,
        ][..]];

        let accounts = TransferChecked {
            from: self.vault.to_account_info(),
            to: self.taker_ata.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        transfer_checked(cpi_context, 1, self.mint.decimals)?;

        // Close the vault account
        let accounts = CloseAccount {
            account: self.vault.to_account_info(),
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

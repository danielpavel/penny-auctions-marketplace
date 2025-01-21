use anchor_lang::{
    prelude::*,
    system_program::{create_account, CreateAccount},
};

use anchor_spl::{
    token_2022::{
        initialize_mint2,
        spl_token_2022::{extension::ExtensionType, pod::PodMint},
        InitializeMint2,
    },
    token_interface::{
        metadata_pointer_initialize, non_transferable_mint_initialize,
        spl_token_metadata_interface, MetadataPointerInitialize, NonTransferableMintInitialize,
        Token2022,
    },
};

use solana_program::program::invoke_signed;

use crate::{
    constants::MARKET_INITIALIZED_LABEL,
    errors::MarketplaceErrorCode,
    events::MarketplaceInitialized,
    state::{Marketplace, MintTier},
};

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    admin: Signer<'info>,

    #[account(mut)]
    sbid_mint: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [b"marketplace", admin.key().as_ref(), sbid_mint.key().as_ref(), name.as_str().as_bytes()],
        bump,
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    token_program_2022: Program<'info, Token2022>,
    system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize_marketplace(
        &mut self,
        name: String,
        fee: u16,
        mint_tiers: [MintTier; 3],
        bumps: &InitializeBumps,
    ) -> Result<()> {
        require!(
            name.len() > 0 && name.len() < 33,
            MarketplaceErrorCode::MarketplaceNameTooLong
        );

        let inner = Marketplace {
            admin: self.admin.key(),
            sbid_mint: self.sbid_mint.key(),
            treasury: self.treasury.key(),
            fee,
            name,
            mint_tiers,
            bump: bumps.marketplace,
            treasury_bump: bumps.treasury,

            padding: [0; 2],
            _reserved: [0; 64],
        };

        self.marketplace.set_inner(inner.clone());

        emit!(MarketplaceInitialized {
            marketplace: self.marketplace.clone().into_inner(),
            pubkey: self.marketplace.key(),
            label: MARKET_INITIALIZED_LABEL.to_string()
        });

        Ok(())
    }

    pub fn initialize_non_transferable_mint(
        &mut self,
        token_name: String,
        token_symbol: String,
        uri: String,
    ) -> Result<()> {
        let bump = [self.marketplace.bump];
        let signer_seeds: [&[&[u8]]; 1] = [&[
            b"marketplace",
            self.admin.to_account_info().key.as_ref(),
            self.sbid_mint.to_account_info().key.as_ref(),
            self.marketplace.name.as_str().as_bytes(),
            &bump,
        ][..]];

        // Calculate space required for mint and extension data
        let mint_size = ExtensionType::try_calculate_account_len::<PodMint>(&[
            ExtensionType::NonTransferable,
            ExtensionType::MetadataPointer,
        ])?;

        // This is the space required for the metadata account.
        // We put the meta data into the mint account at the end so we
        // don't need to create and additional account.
        let meta_data_space = 250;

        // Calculate minimum lamports required for size of mint account with extensions
        let lamports = (Rent::get()?).minimum_balance(mint_size + meta_data_space);

        // Invoke System Program to create new account with space for mint and extension data
        create_account(
            CpiContext::new(
                self.system_program.to_account_info(),
                CreateAccount {
                    from: self.admin.to_account_info(),
                    to: self.sbid_mint.to_account_info(),
                },
            ),
            lamports,                       // Lamports
            mint_size as u64,               // Space
            &self.token_program_2022.key(), // Owner Program
        )?;

        // Initialize the Metadata Pointer
        // This instruction must come before the instruction to initialize the mint data
        metadata_pointer_initialize(
            CpiContext::new_with_signer(
                self.token_program_2022.to_account_info(),
                MetadataPointerInitialize {
                    token_program_id: self.token_program_2022.to_account_info(),
                    mint: self.sbid_mint.to_account_info(),
                },
                &signer_seeds,
            ),
            Some(self.marketplace.key()),
            Some(self.sbid_mint.key()),
        )?;

        // Initialize the NonTransferable extension
        // This instruction must come before the instruction to initialize the mint data
        non_transferable_mint_initialize(CpiContext::new(
            self.token_program_2022.to_account_info(),
            NonTransferableMintInitialize {
                token_program_id: self.token_program_2022.to_account_info(),
                mint: self.sbid_mint.to_account_info(),
            },
        ))?;

        // Initialize the standard mint account data
        initialize_mint2(
            CpiContext::new(
                self.token_program_2022.to_account_info(),
                InitializeMint2 {
                    mint: self.sbid_mint.to_account_info(),
                },
            ),
            6,                             // decimals
            &self.marketplace.key(),       // mint authority
            Some(&self.marketplace.key()), // freeze authority
        )?;

        // Initialize the metadata
        let initialize_mint_inst = spl_token_metadata_interface::instruction::initialize(
            &self.token_program_2022.key,
            &self.sbid_mint.key(),
            &self.marketplace.key(),
            &self.sbid_mint.key(),
            &self.marketplace.key(),
            token_name,
            token_symbol,
            uri,
        );

        invoke_signed(
            &initialize_mint_inst,
            &vec![
                // metadata_info
                self.sbid_mint.to_account_info(),
                // update_authority_info
                self.marketplace.to_account_info(),
                // mint_info
                self.sbid_mint.to_account_info(),
                // mint_authority_info
                self.marketplace.to_account_info(),
            ],
            &signer_seeds,
        )?;

        Ok(())
    }
}

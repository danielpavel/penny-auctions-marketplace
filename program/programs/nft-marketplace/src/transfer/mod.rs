use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::mpl_token_metadata::{
        instructions::TransferCpiBuilder, programs::MPL_TOKEN_METADATA_ID, types::TransferArgs,
    },
    token::Token,
    token_interface::{transfer_checked, Mint, TransferChecked},
};

use crate::utils::MarketplaceErrorCode;

pub fn transfer_asset<'info>(
    amount: u64,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority_from: &AccountInfo<'info>,
    authority_to: &AccountInfo<'info>,
    mint: &InterfaceAccount<'info, Mint>,
    metadata: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    system_program: &Program<'info, System>,
    associated_token_program: &Program<'info, AssociatedToken>,
    sysvar_instructions: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    transfer_seeds: Option<[&[&[u8]]; 1]>,
) -> Result<()> {
    let mut remaining_accounts_iter = &mut remaining_accounts.iter();

    match next_account_info(remaining_accounts_iter) {
        Ok(metadata_program) => {
            require!(
                metadata_program.key() == MPL_TOKEN_METADATA_ID,
                MarketplaceErrorCode::InvalidMetadataProgram
            );

            let from = from.clone();
            let to = to.clone();
            let auth_from = authority_from.clone();
            let auth_to = authority_to.clone();
            let mint = &mint.to_account_info().clone();

            let edition = next_account_info(&mut remaining_accounts_iter).ok();
            let owner_tr = next_account_info(&mut remaining_accounts_iter).ok();
            let destination_tr = next_account_info(&mut remaining_accounts_iter).ok();
            let auth_rules_program = next_account_info(&mut remaining_accounts_iter).ok();
            let auth_rules = next_account_info(&mut remaining_accounts_iter).ok();

            // Create TransferArgs
            let transfer_args = TransferArgs::V1 {
                amount,
                authorization_data: None,
            };

            let mut mpl_cpi_transfer = TransferCpiBuilder::new(metadata_program);

            mpl_cpi_transfer
                .token(&from)
                .token_owner(&auth_from)
                .destination_token(&to)
                .destination_owner(&auth_to)
                .mint(&mint)
                .metadata(&metadata)
                .edition(edition)
                .token_record(owner_tr)
                .destination_token_record(destination_tr)
                .authority(&auth_from)
                .payer(&auth_to)
                .system_program(&system_program)
                .sysvar_instructions(&sysvar_instructions)
                .spl_token_program(&token_program)
                .spl_ata_program(&associated_token_program)
                .authorization_rules_program(auth_rules_program)
                .authorization_rules(auth_rules)
                .transfer_args(transfer_args);

            match transfer_seeds {
                Some(signer_seeds) => mpl_cpi_transfer
                    .invoke_signed(&signer_seeds)
                    .map_err(Into::into),
                None => mpl_cpi_transfer.invoke().map_err(Into::into),
            }
        }
        Err(_) => {
            let accounts = TransferChecked {
                from: from.clone(),
                to: to.clone(),
                mint: mint.to_account_info(),
                authority: authority_from.clone(),
            };

            match transfer_seeds {
                Some(signer_seeds) => {
                    let cpi_context = CpiContext::new_with_signer(
                        token_program.to_account_info(),
                        accounts,
                        &signer_seeds,
                    );

                    transfer_checked(cpi_context, amount, mint.decimals)
                }
                None => {
                    let cpi_context = CpiContext::new(token_program.to_account_info(), accounts);

                    transfer_checked(cpi_context, amount, mint.decimals)
                }
            }
        }
    }
}

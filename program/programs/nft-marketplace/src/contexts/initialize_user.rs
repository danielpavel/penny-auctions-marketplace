use anchor_lang::prelude::*;

use crate::{
    constants::USER_CREATED_LABEL,
    events::UserCreated,
    state::{Marketplace, UserAccount},
};

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", marketplace.key().as_ref(), user.key().as_ref()],
        bump
        )
    ]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        seeds = [b"marketplace", marketplace.admin.key().as_ref(), marketplace.sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    marketplace: Account<'info, Marketplace>,

    system_program: Program<'info, System>,
}

impl<'info> InitializeUser<'info> {
    pub fn initialize_user(&mut self, bumps: &InitializeUserBumps) -> Result<()> {
        self.user_account.set_inner(UserAccount {
            total_bids_placed: 0,
            total_auctions_participated: 0,
            total_auctions_won: 0,
            total_auctions_created: 0,
            points: 0,
            bump: bumps.user_account,
        });

        emit!(UserCreated {
            user: self.user_account.clone().into_inner(),
            pubkey: self.user.key(),
            label: USER_CREATED_LABEL.to_string()
        });

        Ok(())
    }
}

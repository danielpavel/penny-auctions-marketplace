use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},
};

use crate::{
    constants::REWARD_TIER_1,
    state::{Marketplace, MintCostTier, UserAccount},
    utils::{assert_valid_mint_tier_costs, get_mint_tier},
};

#[derive(Accounts)]
pub struct MintBidToken<'info> {
    #[account(
        address = marketplace.admin
    )]
    admin: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", marketplace.key().as_ref(), user.key().as_ref()],
        bump
        )
    ]
    pub user_account: Box<Account<'info, UserAccount>>,

    #[account(
        has_one = sbid_mint,
        seeds = [b"marketplace", admin.key().as_ref(), sbid_mint.key().as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    #[account(mut)]
    pub sbid_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = user,
        associated_token::mint = sbid_mint,
        associated_token::authority = user,
    )]
    pub user_sbid_ata: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> MintBidToken<'info> {
    pub fn mint_token(&mut self, tier: MintCostTier) -> Result<()> {
        assert_valid_mint_tier_costs(tier)?;

        let mint_tier = get_mint_tier(&self.marketplace.mint_tiers, tier);

        let transfer_accounts = Transfer {
            from: self.user.to_account_info(),
            to: self.treasury.to_account_info(),
        };

        let cpi_context = CpiContext::new(self.system_program.to_account_info(), transfer_accounts);

        transfer(cpi_context, mint_tier.cost)?;

        let bump = [self.marketplace.bump];
        let signer_seeds: [&[&[u8]]; 1] = [&[
            b"marketplace",
            self.admin.to_account_info().key.as_ref(),
            self.sbid_mint.to_account_info().key.as_ref(),
            self.marketplace.name.as_str().as_bytes(),
            &bump,
        ][..]];

        let accounts = MintTo {
            mint: self.sbid_mint.to_account_info(),
            to: self.user_sbid_ata.to_account_info(),
            authority: self.marketplace.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        let amount = mint_tier
            .amount
            .checked_add(mint_tier.bonus)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        mint_to(cpi_context, amount)
    }

    pub fn reward_user(&mut self, bump: u8) -> Result<()> {
        self.user_account.bump = bump;

        self.user_account.points = self
            .user_account
            .points
            .checked_add(REWARD_TIER_1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        msg!("[mint_bid_token][reward_user] {:?}", self.user_account);

        Ok(())
    }
}

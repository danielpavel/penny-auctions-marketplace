use anchor_lang::prelude::*;

declare_id!("ATxkTBH2cbC28hV7n37QZ5d9hsc2Xpoio4ZHYSYFGHou");

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod events;
pub mod state;
pub mod transfer;
pub mod utils;

pub use contexts::*;

#[program]
pub mod nft_marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        ctx.accounts.init(name, fee, &ctx.bumps)
    }

    pub fn list<'info>(
        //ctx: Context<List>,
        ctx: Context<'_, '_, '_, 'info, List<'info>>,
        seed: u64,
        bid_increment: u64,
        timer_extension_in_slots: u64,
        start_time_in_slots: u64,
        initial_duration_in_slots: u64,
        buyout_price: u64,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.create_listing(
            seed,
            bid_increment,
            timer_extension_in_slots,
            start_time_in_slots,
            initial_duration_in_slots,
            buyout_price,
            &ctx.bumps,
        )?;

        ctx.accounts
            .transfer_to_escrow(amount, ctx.remaining_accounts)?;

        ctx.accounts.emit_listing_created();

        Ok(())
    }

    /* NOTE: currently disabled!
     *
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        ctx.accounts.initialize_user(&ctx.bumps)
    }

    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.withdraw_and_close()
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.purchase()
    }
    */

    pub fn place_bid(
        ctx: Context<PlaceBid>,
        highest_bidder: Pubkey,
        current_bid: u64,
    ) -> Result<()> {
        ctx.accounts.place_bid(&highest_bidder, &current_bid)
    }

    pub fn end_listing<'info>(
        ctx: Context<'_, '_, '_, 'info, EndListing<'info>>,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.end_listing(amount, ctx.remaining_accounts)
    }
}

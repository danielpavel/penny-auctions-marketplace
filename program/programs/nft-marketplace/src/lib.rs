use anchor_lang::prelude::*;

declare_id!("5HfaVk6UZTkPKfLYQy2d9vVCC4HFbVgQapTuUwe6WnYZ");

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod state;
pub mod utils;

pub use contexts::*;

#[program]
pub mod nft_marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        ctx.accounts.init(name, fee, &ctx.bumps)
    }

    pub fn list(
        ctx: Context<List>,
        bid_increment: u64,
        timer_extension: u64,
        start_time: i64,
        initial_duration: i64,
        buyout_price: u64,
    ) -> Result<()> {
        ctx.accounts.create_listing(
            bid_increment,
            timer_extension,
            start_time,
            initial_duration,
            buyout_price,
            &ctx.bumps,
        )?;
        ctx.accounts.transfer_to_escrow()
    }

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        ctx.accounts.initialize_user(&ctx.bumps)
    }

    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.withdraw_nft_and_close()
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.purchase()
    }

    pub fn place_bid(ctx: Context<PlaceBid>) -> Result<()> {
        ctx.accounts.place_bid()
    }
}

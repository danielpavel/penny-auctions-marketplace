use anchor_lang::prelude::*;

pub use crate::errors::MarketplaceErrorCode;
use crate::{constants::MS_IN_SEC, state::Listing};

pub fn assert_auction_active(listing: &Account<Listing>) -> Result<()> {
    let clock = Clock::get()?;
    let current_timestamp = clock
        .unix_timestamp
        .checked_mul(MS_IN_SEC)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    if !listing.is_active {
        return err!(MarketplaceErrorCode::AuctionNotActive);
    } else if current_timestamp < listing.start_time {
        return err!(MarketplaceErrorCode::AuctionNotStarted);
    } else if current_timestamp > listing.end_time {
        return err!(MarketplaceErrorCode::AuctionEnded);
    }

    Ok(())
}

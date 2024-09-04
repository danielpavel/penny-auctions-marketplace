use anchor_lang::prelude::*;

use solana_program::{program::invoke, system_instruction};

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

pub fn assert_auction_ended(listing: &Account<Listing>) -> Result<()> {
    let clock = Clock::get()?;
    let current_timestamp = clock
        .unix_timestamp
        .checked_mul(MS_IN_SEC)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    if current_timestamp < listing.end_time {
        return err!(MarketplaceErrorCode::AuctionNotEnded);
    }

    Ok(())
}

pub fn assert_highest_bidder(listing: &Account<Listing>, bidder: &AccountInfo) -> Result<()> {
    if listing.highest_bidder.key() != bidder.key() {
        return err!(MarketplaceErrorCode::ClaimerIsNotHighestBidder);
    }

    Ok(())
}

pub fn assert_auction_delist_eligible(listing: &Account<Listing>) -> Result<()> {
    if listing.highest_bidder.key() != Pubkey::default() {
        return err!(MarketplaceErrorCode::CannotDelistWithActiveBidder);
    }

    if listing.current_bid != 0 {
        return err!(MarketplaceErrorCode::CannotDelistWithActiveCurrentBidPrice);
    }

    Ok(())
}

pub fn transfer_sol<'a>(
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    amount: u64,
) -> Result<()> {
    // Create the transfer instruction
    let transfer_instruction = system_instruction::transfer(from.key, to.key, amount);

    // Invoke the transfer instruction
    invoke(&transfer_instruction, &[from, to, system_program])?;

    Ok(())
}

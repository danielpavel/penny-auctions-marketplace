use anchor_lang::prelude::*;

use solana_program::{program::invoke, system_instruction};

pub use crate::errors::MarketplaceErrorCode;
use crate::state::Listing;

pub fn assert_correct_highest_bidder_and_bid(
    listing: &Account<Listing>,
    current_highest_bidder: &Pubkey,
    current_bid: &u64,
) -> Result<()> {
    if listing.highest_bidder.key() != current_highest_bidder.key()
        || listing.current_bid.ne(current_bid)
    {
        return err!(MarketplaceErrorCode::InvalidCurrentHighestBidderAndPrice);
    }

    Ok(())
}

pub fn assert_already_highest_bidder(
    listing: &Account<Listing>,
    incomming_highest_bidder: &Pubkey,
) -> Result<()> {
    if listing.highest_bidder.key() == incomming_highest_bidder.key() {
        return err!(MarketplaceErrorCode::BidderIsHighestBidder);
    }

    Ok(())
}

pub fn assert_auction_active(listing: &Account<Listing>) -> Result<()> {
    let current_slot = Clock::get()?.slot;

    if !listing.is_active {
        return err!(MarketplaceErrorCode::AuctionNotActive);
    } else if current_slot < listing.start_time_in_slots {
        return err!(MarketplaceErrorCode::AuctionNotStarted);
    } else if current_slot > listing.end_time_in_slots {
        return err!(MarketplaceErrorCode::AuctionEnded);
    }

    Ok(())
}

pub fn assert_auction_ended(listing: &Account<Listing>) -> Result<()> {
    let current_slot = Clock::get()?.slot;

    if current_slot < listing.end_time_in_slots {
        return err!(MarketplaceErrorCode::AuctionNotEnded);
    }

    Ok(())
}

pub fn assert_allowed_claimer(listing: &Account<Listing>, bidder: &AccountInfo) -> Result<()> {
    if listing.highest_bidder.key() == Pubkey::default() {
        if listing.seller.key() != bidder.key() {
            return err!(MarketplaceErrorCode::ClaimerIsNotSeller);
        }
    } else if listing.highest_bidder.key() != bidder.key() {
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

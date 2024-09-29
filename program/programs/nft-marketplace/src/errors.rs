use anchor_lang::error_code;

#[error_code]
pub enum MarketplaceErrorCode {
    #[msg("Marketplace name too long")]
    MarketplaceNameTooLong,
    #[msg("Only the highest bidder can claim the auction")]
    ClaimerIsNotHighestBidder,
    #[msg("Only the listing seller can claim this auction")]
    ClaimerIsNotSeller,
    #[msg("You are already the highest bidder")]
    BidderIsHighestBidder,
    #[msg("The auction is not active")]
    AuctionNotActive,
    #[msg("The auction has not started")]
    AuctionNotStarted,
    #[msg("The auction has already ended")]
    AuctionEnded,
    #[msg("The auction has not ended yet")]
    AuctionNotEnded,
    #[msg("The auction has already been ended")]
    AuctionAlreadyEnded,

    #[msg("Cannot delist auction with active highest bidder")]
    CannotDelistWithActiveBidder,
    #[msg("Cannot delist auction with active current bid price")]
    CannotDelistWithActiveCurrentBidPrice,

    // Copied from mpl_token_metadata
    #[msg("Invalid metadata program")]
    InvalidMetadataProgram,
}

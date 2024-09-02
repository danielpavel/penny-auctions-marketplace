use anchor_lang::error_code;

#[error_code]
pub enum MarketplaceErrorCode {
    #[msg("Marketplace name too long")]
    MarketplaceNameTooLong,
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
}

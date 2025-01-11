use solana_program::native_token::LAMPORTS_PER_SOL;

pub const MS_IN_SEC: i64 = 1000;

pub const MARKET_INITIALIZED_LABEL: &str = "market_initialized";
pub const LISTING_CREATED_LABEL: &str = "listing_created";
pub const LISTING_ENDED_LABEL: &str = "listing_ended";
pub const LISTING_DELISTED_LABEL: &str = "listing_delisted";
pub const BID_PLACED_LABEL: &str = "bid_placed";
pub const USER_CREATED_LABEL: &str = "user_created";

pub const REWARD_TIER_1: u32 = 1;
pub const REWARD_TIER_2: u32 = 10;
pub const REWARD_TIER_3: u32 = 50;

pub const MINT_AMOUNT_TIER_1: u64 = 75 * 10_u64.pow(6);
pub const MINT_AMOUNT_TIER_2: u64 = 200 * 10_u64.pow(6);
pub const MINT_AMOUNT_TIER_3: u64 = 500 * 10_u64.pow(6);

pub const MINT_COST_TIER_1: u64 = LAMPORTS_PER_SOL * 1_000 / 10_000;
pub const MINT_COST_TIER_2: u64 = LAMPORTS_PER_SOL * 2_000 / 10_000;
pub const MINT_COST_TIER_3: u64 = LAMPORTS_PER_SOL * 4_000 / 10_000;

pub const MINT_TIER_1_BONUS: u64 = 10 * 10_u64.pow(6);
pub const MINT_TIER_2_BONUS: u64 = 25 * 10_u64.pow(6);
pub const MINT_TIER_3_BONUS: u64 = 100 * 10_u64.pow(6);

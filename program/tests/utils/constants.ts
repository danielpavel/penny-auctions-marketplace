import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MintTier } from "../../clients/generated/umi/src";
import { MintCostTier } from "../../clients/generated/umi/src";

export const MINT_TIER_COSTS_DUMMY: Array<MintTier> = [
  {
    tier: MintCostTier.Tier1,
    amount: BigInt(85 * 10 ** 6),
    cost: BigInt(0.1 * LAMPORTS_PER_SOL),
    bonus: BigInt(10 * 10 ** 6),
  },
  {
    tier: MintCostTier.Tier2,
    amount: BigInt(250 * 10 ** 6),
    cost: BigInt(0.2 * LAMPORTS_PER_SOL),
    bonus: BigInt(25 * 10 ** 6),
  },
  {
    tier: MintCostTier.Tier3,
    amount: BigInt(580 * 10 ** 6),
    cost: BigInt(0.4 * LAMPORTS_PER_SOL),
    bonus: BigInt(100 * 10 ** 6),
  },
];

export const MINT_TIER_COSTS: Array<MintTier> = [
  {
    tier: MintCostTier.Tier1,
    amount: BigInt(75 * 10 ** 6),
    cost: BigInt(0.1 * LAMPORTS_PER_SOL),
    bonus: BigInt(10 * 10 ** 6),
  },
  {
    tier: MintCostTier.Tier2,
    amount: BigInt(200 * 10 ** 6),
    cost: BigInt(0.2 * LAMPORTS_PER_SOL),
    bonus: BigInt(25 * 10 ** 6),
  },
  {
    tier: MintCostTier.Tier3,
    amount: BigInt(500 * 10 ** 6),
    cost: BigInt(0.4 * LAMPORTS_PER_SOL),
    bonus: BigInt(100 * 10 ** 6),
  },
];

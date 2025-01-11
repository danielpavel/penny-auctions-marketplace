/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import { Serializer, struct, u64 } from '@metaplex-foundation/umi/serializers';
import { MintCostTier, MintCostTierArgs, getMintCostTierSerializer } from '.';

export type MintTier = {
  tier: MintCostTier;
  amount: bigint;
  cost: bigint;
  bonus: bigint;
};

export type MintTierArgs = {
  tier: MintCostTierArgs;
  amount: number | bigint;
  cost: number | bigint;
  bonus: number | bigint;
};

export function getMintTierSerializer(): Serializer<MintTierArgs, MintTier> {
  return struct<MintTier>(
    [
      ['tier', getMintCostTierSerializer()],
      ['amount', u64()],
      ['cost', u64()],
      ['bonus', u64()],
    ],
    { description: 'MintTier' }
  ) as Serializer<MintTierArgs, MintTier>;
}
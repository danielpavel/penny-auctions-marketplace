/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import { PublicKey } from '@metaplex-foundation/umi';
import {
  Serializer,
  publicKey as publicKeySerializer,
  string,
  struct,
  u64,
} from '@metaplex-foundation/umi/serializers';

export type BidPlaced = {
  bidder: PublicKey;
  listing: PublicKey;
  currentBid: bigint;
  endTimeInSlots: bigint;
  label: string;
};

export type BidPlacedArgs = {
  bidder: PublicKey;
  listing: PublicKey;
  currentBid: number | bigint;
  endTimeInSlots: number | bigint;
  label: string;
};

export function getBidPlacedSerializer(): Serializer<BidPlacedArgs, BidPlaced> {
  return struct<BidPlaced>(
    [
      ['bidder', publicKeySerializer()],
      ['listing', publicKeySerializer()],
      ['currentBid', u64()],
      ['endTimeInSlots', u64()],
      ['label', string()],
    ],
    { description: 'BidPlaced' }
  ) as Serializer<BidPlacedArgs, BidPlaced>;
}
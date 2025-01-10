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
} from '@metaplex-foundation/umi/serializers';

export type ListingEnded = { listingPubkey: PublicKey; label: string };

export type ListingEndedArgs = ListingEnded;

export function getListingEndedSerializer(): Serializer<
  ListingEndedArgs,
  ListingEnded
> {
  return struct<ListingEnded>(
    [
      ['listingPubkey', publicKeySerializer()],
      ['label', string()],
    ],
    { description: 'ListingEnded' }
  ) as Serializer<ListingEndedArgs, ListingEnded>;
}
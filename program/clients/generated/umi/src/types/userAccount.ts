/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  Serializer,
  struct,
  u32,
  u8,
} from '@metaplex-foundation/umi/serializers';

export type UserAccount = {
  totalBidsPlaced: number;
  totalAuctionsParticipated: number;
  totalAuctionsWon: number;
  points: number;
  bump: number;
};

export type UserAccountArgs = UserAccount;

export function getUserAccountSerializer(): Serializer<
  UserAccountArgs,
  UserAccount
> {
  return struct<UserAccount>(
    [
      ['totalBidsPlaced', u32()],
      ['totalAuctionsParticipated', u32()],
      ['totalAuctionsWon', u32()],
      ['points', u32()],
      ['bump', u8()],
    ],
    { description: 'UserAccount' }
  ) as Serializer<UserAccountArgs, UserAccount>;
}

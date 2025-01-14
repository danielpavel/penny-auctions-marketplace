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
import { UserAccount, UserAccountArgs, getUserAccountSerializer } from '.';

export type UserCreated = {
  user: UserAccount;
  pubkey: PublicKey;
  label: string;
};

export type UserCreatedArgs = {
  user: UserAccountArgs;
  pubkey: PublicKey;
  label: string;
};

export function getUserCreatedSerializer(): Serializer<
  UserCreatedArgs,
  UserCreated
> {
  return struct<UserCreated>(
    [
      ['user', getUserAccountSerializer()],
      ['pubkey', publicKeySerializer()],
      ['label', string()],
    ],
    { description: 'UserCreated' }
  ) as Serializer<UserCreatedArgs, UserCreated>;
}

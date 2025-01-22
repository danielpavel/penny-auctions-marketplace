/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  Account,
  Context,
  Pda,
  PublicKey,
  RpcAccount,
  RpcGetAccountOptions,
  RpcGetAccountsOptions,
  assertAccountExists,
  deserializeAccount,
  gpaBuilder,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import {
  Serializer,
  array,
  bytes,
  mapSerializer,
  publicKey as publicKeySerializer,
  struct,
  u32,
  u8,
} from '@metaplex-foundation/umi/serializers';

export type UserAccount = Account<UserAccountAccountData>;

export type UserAccountAccountData = {
  discriminator: Uint8Array;
  owner: PublicKey;
  totalBidsPlaced: number;
  totalAuctionsParticipated: number;
  totalAuctionsWon: number;
  totalAuctionsCreated: number;
  points: number;
  bump: number;
  padding: Array<number>;
  reserved: Array<number>;
};

export type UserAccountAccountDataArgs = {
  owner: PublicKey;
  totalBidsPlaced: number;
  totalAuctionsParticipated: number;
  totalAuctionsWon: number;
  totalAuctionsCreated: number;
  points: number;
  bump: number;
  padding: Array<number>;
  reserved: Array<number>;
};

export function getUserAccountAccountDataSerializer(): Serializer<
  UserAccountAccountDataArgs,
  UserAccountAccountData
> {
  return mapSerializer<UserAccountAccountDataArgs, any, UserAccountAccountData>(
    struct<UserAccountAccountData>(
      [
        ['discriminator', bytes({ size: 8 })],
        ['owner', publicKeySerializer()],
        ['totalBidsPlaced', u32()],
        ['totalAuctionsParticipated', u32()],
        ['totalAuctionsWon', u32()],
        ['totalAuctionsCreated', u32()],
        ['points', u32()],
        ['bump', u8()],
        ['padding', array(u8(), { size: 3 })],
        ['reserved', array(u8(), { size: 32 })],
      ],
      { description: 'UserAccountAccountData' }
    ),
    (value) => ({
      ...value,
      discriminator: new Uint8Array([211, 33, 136, 16, 186, 110, 242, 127]),
    })
  ) as Serializer<UserAccountAccountDataArgs, UserAccountAccountData>;
}

export function deserializeUserAccount(rawAccount: RpcAccount): UserAccount {
  return deserializeAccount(rawAccount, getUserAccountAccountDataSerializer());
}

export async function fetchUserAccount(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<UserAccount> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'UserAccount');
  return deserializeUserAccount(maybeAccount);
}

export async function safeFetchUserAccount(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<UserAccount | null> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  return maybeAccount.exists ? deserializeUserAccount(maybeAccount) : null;
}

export async function fetchAllUserAccount(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<UserAccount[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts.map((maybeAccount) => {
    assertAccountExists(maybeAccount, 'UserAccount');
    return deserializeUserAccount(maybeAccount);
  });
}

export async function safeFetchAllUserAccount(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<UserAccount[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts
    .filter((maybeAccount) => maybeAccount.exists)
    .map((maybeAccount) => deserializeUserAccount(maybeAccount as RpcAccount));
}

export function getUserAccountGpaBuilder(
  context: Pick<Context, 'rpc' | 'programs'>
) {
  const programId = context.programs.getPublicKey(
    'nftMarketplace',
    '8dsRGc9QXnsvqa5aCm21wS2M9xCPoVqxPpD3j6bysfyt'
  );
  return gpaBuilder(context, programId)
    .registerFields<{
      discriminator: Uint8Array;
      owner: PublicKey;
      totalBidsPlaced: number;
      totalAuctionsParticipated: number;
      totalAuctionsWon: number;
      totalAuctionsCreated: number;
      points: number;
      bump: number;
      padding: Array<number>;
      reserved: Array<number>;
    }>({
      discriminator: [0, bytes({ size: 8 })],
      owner: [8, publicKeySerializer()],
      totalBidsPlaced: [40, u32()],
      totalAuctionsParticipated: [44, u32()],
      totalAuctionsWon: [48, u32()],
      totalAuctionsCreated: [52, u32()],
      points: [56, u32()],
      bump: [60, u8()],
      padding: [61, array(u8(), { size: 3 })],
      reserved: [64, array(u8(), { size: 32 })],
    })
    .deserializeUsing<UserAccount>((account) => deserializeUserAccount(account))
    .whereField(
      'discriminator',
      new Uint8Array([211, 33, 136, 16, 186, 110, 242, 127])
    );
}

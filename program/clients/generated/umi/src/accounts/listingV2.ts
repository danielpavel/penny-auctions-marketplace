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
  bool,
  bytes,
  mapSerializer,
  publicKey as publicKeySerializer,
  struct,
  u64,
  u8,
} from '@metaplex-foundation/umi/serializers';

export type ListingV2 = Account<ListingV2AccountData>;

export type ListingV2AccountData = {
  discriminator: Uint8Array;
  mint: PublicKey;
  seller: PublicKey;
  bidCost: bigint;
  bidIncrement: bigint;
  currentBid: bigint;
  highestBidder: PublicKey;
  timerExtensionInSlots: bigint;
  startTimeInSlots: bigint;
  endTimeInSlots: bigint;
  isActive: boolean;
  buyoutPrice: bigint;
  seed: bigint;
  bump: number;
  padding: Array<number>;
  reserved: Array<number>;
};

export type ListingV2AccountDataArgs = {
  mint: PublicKey;
  seller: PublicKey;
  bidCost: number | bigint;
  bidIncrement: number | bigint;
  currentBid: number | bigint;
  highestBidder: PublicKey;
  timerExtensionInSlots: number | bigint;
  startTimeInSlots: number | bigint;
  endTimeInSlots: number | bigint;
  isActive: boolean;
  buyoutPrice: number | bigint;
  seed: number | bigint;
  bump: number;
  padding: Array<number>;
  reserved: Array<number>;
};

export function getListingV2AccountDataSerializer(): Serializer<
  ListingV2AccountDataArgs,
  ListingV2AccountData
> {
  return mapSerializer<ListingV2AccountDataArgs, any, ListingV2AccountData>(
    struct<ListingV2AccountData>(
      [
        ['discriminator', bytes({ size: 8 })],
        ['mint', publicKeySerializer()],
        ['seller', publicKeySerializer()],
        ['bidCost', u64()],
        ['bidIncrement', u64()],
        ['currentBid', u64()],
        ['highestBidder', publicKeySerializer()],
        ['timerExtensionInSlots', u64()],
        ['startTimeInSlots', u64()],
        ['endTimeInSlots', u64()],
        ['isActive', bool()],
        ['buyoutPrice', u64()],
        ['seed', u64()],
        ['bump', u8()],
        ['padding', array(u8(), { size: 6 })],
        ['reserved', array(u8(), { size: 32 })],
      ],
      { description: 'ListingV2AccountData' }
    ),
    (value) => ({
      ...value,
      discriminator: new Uint8Array([11, 222, 201, 212, 70, 118, 240, 244]),
    })
  ) as Serializer<ListingV2AccountDataArgs, ListingV2AccountData>;
}

export function deserializeListingV2(rawAccount: RpcAccount): ListingV2 {
  return deserializeAccount(rawAccount, getListingV2AccountDataSerializer());
}

export async function fetchListingV2(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<ListingV2> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'ListingV2');
  return deserializeListingV2(maybeAccount);
}

export async function safeFetchListingV2(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<ListingV2 | null> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  return maybeAccount.exists ? deserializeListingV2(maybeAccount) : null;
}

export async function fetchAllListingV2(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<ListingV2[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts.map((maybeAccount) => {
    assertAccountExists(maybeAccount, 'ListingV2');
    return deserializeListingV2(maybeAccount);
  });
}

export async function safeFetchAllListingV2(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<ListingV2[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts
    .filter((maybeAccount) => maybeAccount.exists)
    .map((maybeAccount) => deserializeListingV2(maybeAccount as RpcAccount));
}

export function getListingV2GpaBuilder(
  context: Pick<Context, 'rpc' | 'programs'>
) {
  const programId = context.programs.getPublicKey(
    'nftMarketplace',
    '8dsRGc9QXnsvqa5aCm21wS2M9xCPoVqxPpD3j6bysfyt'
  );
  return gpaBuilder(context, programId)
    .registerFields<{
      discriminator: Uint8Array;
      mint: PublicKey;
      seller: PublicKey;
      bidCost: number | bigint;
      bidIncrement: number | bigint;
      currentBid: number | bigint;
      highestBidder: PublicKey;
      timerExtensionInSlots: number | bigint;
      startTimeInSlots: number | bigint;
      endTimeInSlots: number | bigint;
      isActive: boolean;
      buyoutPrice: number | bigint;
      seed: number | bigint;
      bump: number;
      padding: Array<number>;
      reserved: Array<number>;
    }>({
      discriminator: [0, bytes({ size: 8 })],
      mint: [8, publicKeySerializer()],
      seller: [40, publicKeySerializer()],
      bidCost: [72, u64()],
      bidIncrement: [80, u64()],
      currentBid: [88, u64()],
      highestBidder: [96, publicKeySerializer()],
      timerExtensionInSlots: [128, u64()],
      startTimeInSlots: [136, u64()],
      endTimeInSlots: [144, u64()],
      isActive: [152, bool()],
      buyoutPrice: [153, u64()],
      seed: [161, u64()],
      bump: [169, u8()],
      padding: [170, array(u8(), { size: 6 })],
      reserved: [176, array(u8(), { size: 32 })],
    })
    .deserializeUsing<ListingV2>((account) => deserializeListingV2(account))
    .whereField(
      'discriminator',
      new Uint8Array([11, 222, 201, 212, 70, 118, 240, 244])
    );
}

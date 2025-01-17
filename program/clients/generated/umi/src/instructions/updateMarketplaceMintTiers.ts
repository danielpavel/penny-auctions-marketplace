/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  Context,
  Pda,
  PublicKey,
  Signer,
  TransactionBuilder,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import {
  Serializer,
  array,
  bytes,
  mapSerializer,
  struct,
} from '@metaplex-foundation/umi/serializers';
import {
  ResolvedAccount,
  ResolvedAccountsWithIndices,
  getAccountMetasAndSigners,
} from '../shared';
import { MintTier, MintTierArgs, getMintTierSerializer } from '../types';

// Accounts.
export type UpdateMarketplaceMintTiersInstructionAccounts = {
  admin: Signer;
  marketplace: PublicKey | Pda;
  systemProgram?: PublicKey | Pda;
};

// Data.
export type UpdateMarketplaceMintTiersInstructionData = {
  discriminator: Uint8Array;
  tiers: Array<MintTier>;
};

export type UpdateMarketplaceMintTiersInstructionDataArgs = {
  tiers: Array<MintTierArgs>;
};

export function getUpdateMarketplaceMintTiersInstructionDataSerializer(): Serializer<
  UpdateMarketplaceMintTiersInstructionDataArgs,
  UpdateMarketplaceMintTiersInstructionData
> {
  return mapSerializer<
    UpdateMarketplaceMintTiersInstructionDataArgs,
    any,
    UpdateMarketplaceMintTiersInstructionData
  >(
    struct<UpdateMarketplaceMintTiersInstructionData>(
      [
        ['discriminator', bytes({ size: 8 })],
        ['tiers', array(getMintTierSerializer(), { size: 3 })],
      ],
      { description: 'UpdateMarketplaceMintTiersInstructionData' }
    ),
    (value) => ({
      ...value,
      discriminator: new Uint8Array([192, 57, 4, 228, 120, 111, 137, 54]),
    })
  ) as Serializer<
    UpdateMarketplaceMintTiersInstructionDataArgs,
    UpdateMarketplaceMintTiersInstructionData
  >;
}

// Args.
export type UpdateMarketplaceMintTiersInstructionArgs =
  UpdateMarketplaceMintTiersInstructionDataArgs;

// Instruction.
export function updateMarketplaceMintTiers(
  context: Pick<Context, 'programs'>,
  input: UpdateMarketplaceMintTiersInstructionAccounts &
    UpdateMarketplaceMintTiersInstructionArgs
): TransactionBuilder {
  // Program ID.
  const programId = context.programs.getPublicKey(
    'nftMarketplace',
    'ATxkTBH2cbC28hV7n37QZ5d9hsc2Xpoio4ZHYSYFGHou'
  );

  // Accounts.
  const resolvedAccounts = {
    admin: {
      index: 0,
      isWritable: true as boolean,
      value: input.admin ?? null,
    },
    marketplace: {
      index: 1,
      isWritable: true as boolean,
      value: input.marketplace ?? null,
    },
    systemProgram: {
      index: 2,
      isWritable: false as boolean,
      value: input.systemProgram ?? null,
    },
  } satisfies ResolvedAccountsWithIndices;

  // Arguments.
  const resolvedArgs: UpdateMarketplaceMintTiersInstructionArgs = { ...input };

  // Default values.
  if (!resolvedAccounts.systemProgram.value) {
    resolvedAccounts.systemProgram.value = context.programs.getPublicKey(
      'systemProgram',
      '11111111111111111111111111111111'
    );
    resolvedAccounts.systemProgram.isWritable = false;
  }

  // Accounts in order.
  const orderedAccounts: ResolvedAccount[] = Object.values(
    resolvedAccounts
  ).sort((a, b) => a.index - b.index);

  // Keys and Signers.
  const [keys, signers] = getAccountMetasAndSigners(
    orderedAccounts,
    'programId',
    programId
  );

  // Data.
  const data =
    getUpdateMarketplaceMintTiersInstructionDataSerializer().serialize(
      resolvedArgs as UpdateMarketplaceMintTiersInstructionDataArgs
    );

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 0;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}
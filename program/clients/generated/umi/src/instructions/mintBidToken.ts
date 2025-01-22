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
  bytes,
  mapSerializer,
  publicKey as publicKeySerializer,
  struct,
} from '@metaplex-foundation/umi/serializers';
import {
  ResolvedAccount,
  ResolvedAccountsWithIndices,
  expectPublicKey,
  getAccountMetasAndSigners,
} from '../shared';
import {
  MintCostTier,
  MintCostTierArgs,
  getMintCostTierSerializer,
} from '../types';

// Accounts.
export type MintBidTokenInstructionAccounts = {
  admin: Signer;
  user: Signer;
  userAccount?: PublicKey | Pda;
  marketplace: PublicKey | Pda;
  treasury?: PublicKey | Pda;
  sbidMint: PublicKey | Pda;
  userSbidAta?: PublicKey | Pda;
  systemProgram?: PublicKey | Pda;
  tokenProgram: PublicKey | Pda;
  associatedTokenProgram?: PublicKey | Pda;
};

// Data.
export type MintBidTokenInstructionData = {
  discriminator: Uint8Array;
  tier: MintCostTier;
};

export type MintBidTokenInstructionDataArgs = { tier: MintCostTierArgs };

export function getMintBidTokenInstructionDataSerializer(): Serializer<
  MintBidTokenInstructionDataArgs,
  MintBidTokenInstructionData
> {
  return mapSerializer<
    MintBidTokenInstructionDataArgs,
    any,
    MintBidTokenInstructionData
  >(
    struct<MintBidTokenInstructionData>(
      [
        ['discriminator', bytes({ size: 8 })],
        ['tier', getMintCostTierSerializer()],
      ],
      { description: 'MintBidTokenInstructionData' }
    ),
    (value) => ({
      ...value,
      discriminator: new Uint8Array([249, 7, 61, 163, 79, 38, 70, 201]),
    })
  ) as Serializer<MintBidTokenInstructionDataArgs, MintBidTokenInstructionData>;
}

// Args.
export type MintBidTokenInstructionArgs = MintBidTokenInstructionDataArgs;

// Instruction.
export function mintBidToken(
  context: Pick<Context, 'eddsa' | 'programs'>,
  input: MintBidTokenInstructionAccounts & MintBidTokenInstructionArgs
): TransactionBuilder {
  // Program ID.
  const programId = context.programs.getPublicKey(
    'nftMarketplace',
    '8dsRGc9QXnsvqa5aCm21wS2M9xCPoVqxPpD3j6bysfyt'
  );

  // Accounts.
  const resolvedAccounts = {
    admin: {
      index: 0,
      isWritable: false as boolean,
      value: input.admin ?? null,
    },
    user: { index: 1, isWritable: true as boolean, value: input.user ?? null },
    userAccount: {
      index: 2,
      isWritable: true as boolean,
      value: input.userAccount ?? null,
    },
    marketplace: {
      index: 3,
      isWritable: false as boolean,
      value: input.marketplace ?? null,
    },
    treasury: {
      index: 4,
      isWritable: true as boolean,
      value: input.treasury ?? null,
    },
    sbidMint: {
      index: 5,
      isWritable: true as boolean,
      value: input.sbidMint ?? null,
    },
    userSbidAta: {
      index: 6,
      isWritable: true as boolean,
      value: input.userSbidAta ?? null,
    },
    systemProgram: {
      index: 7,
      isWritable: false as boolean,
      value: input.systemProgram ?? null,
    },
    tokenProgram: {
      index: 8,
      isWritable: false as boolean,
      value: input.tokenProgram ?? null,
    },
    associatedTokenProgram: {
      index: 9,
      isWritable: false as boolean,
      value: input.associatedTokenProgram ?? null,
    },
  } satisfies ResolvedAccountsWithIndices;

  // Arguments.
  const resolvedArgs: MintBidTokenInstructionArgs = { ...input };

  // Default values.
  if (!resolvedAccounts.userAccount.value) {
    resolvedAccounts.userAccount.value = context.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.marketplace.value)
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.user.value)
      ),
    ]);
  }
  if (!resolvedAccounts.treasury.value) {
    resolvedAccounts.treasury.value = context.eddsa.findPda(programId, [
      bytes().serialize(
        new Uint8Array([116, 114, 101, 97, 115, 117, 114, 121])
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.marketplace.value)
      ),
    ]);
  }
  if (!resolvedAccounts.userSbidAta.value) {
    resolvedAccounts.userSbidAta.value = context.eddsa.findPda(programId, [
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.user.value)
      ),
      bytes().serialize(
        new Uint8Array([
          6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235,
          121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126,
          255, 0, 169,
        ])
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.sbidMint.value)
      ),
    ]);
  }
  if (!resolvedAccounts.systemProgram.value) {
    resolvedAccounts.systemProgram.value = context.programs.getPublicKey(
      'systemProgram',
      '11111111111111111111111111111111'
    );
    resolvedAccounts.systemProgram.isWritable = false;
  }
  if (!resolvedAccounts.associatedTokenProgram.value) {
    resolvedAccounts.associatedTokenProgram.value =
      context.programs.getPublicKey(
        'associatedTokenProgram',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
      );
    resolvedAccounts.associatedTokenProgram.isWritable = false;
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
  const data = getMintBidTokenInstructionDataSerializer().serialize(
    resolvedArgs as MintBidTokenInstructionDataArgs
  );

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 0;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}

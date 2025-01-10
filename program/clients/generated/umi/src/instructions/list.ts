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
  u64,
} from '@metaplex-foundation/umi/serializers';
import {
  ResolvedAccount,
  ResolvedAccountsWithIndices,
  expectPublicKey,
  expectSome,
  getAccountMetasAndSigners,
} from '../shared';

// Accounts.
export type ListInstructionAccounts = {
  seller: Signer;
  admin: Signer;
  userAccount?: PublicKey | Pda;
  listing?: PublicKey | Pda;
  marketplace: PublicKey | Pda;
  mint: PublicKey | Pda;
  collection: PublicKey | Pda;
  sellerAta?: PublicKey | Pda;
  escrow?: PublicKey | Pda;
  metadata?: PublicKey | Pda;
  masterEdition?: PublicKey | Pda;
  associatedTokenProgram?: PublicKey | Pda;
  systemProgram?: PublicKey | Pda;
  tokenProgram?: PublicKey | Pda;
  metadataProgram?: PublicKey | Pda;
  sysvarInstructions: PublicKey | Pda;
};

// Data.
export type ListInstructionData = {
  discriminator: Uint8Array;
  seed: bigint;
  bidIncrement: bigint;
  timerExtensionInSlots: bigint;
  startTimeInSlots: bigint;
  initialDurationInSlots: bigint;
  buyoutPrice: bigint;
  amount: bigint;
};

export type ListInstructionDataArgs = {
  seed: number | bigint;
  bidIncrement: number | bigint;
  timerExtensionInSlots: number | bigint;
  startTimeInSlots: number | bigint;
  initialDurationInSlots: number | bigint;
  buyoutPrice: number | bigint;
  amount: number | bigint;
};

export function getListInstructionDataSerializer(): Serializer<
  ListInstructionDataArgs,
  ListInstructionData
> {
  return mapSerializer<ListInstructionDataArgs, any, ListInstructionData>(
    struct<ListInstructionData>(
      [
        ['discriminator', bytes({ size: 8 })],
        ['seed', u64()],
        ['bidIncrement', u64()],
        ['timerExtensionInSlots', u64()],
        ['startTimeInSlots', u64()],
        ['initialDurationInSlots', u64()],
        ['buyoutPrice', u64()],
        ['amount', u64()],
      ],
      { description: 'ListInstructionData' }
    ),
    (value) => ({
      ...value,
      discriminator: new Uint8Array([54, 174, 193, 67, 17, 41, 132, 38]),
    })
  ) as Serializer<ListInstructionDataArgs, ListInstructionData>;
}

// Args.
export type ListInstructionArgs = ListInstructionDataArgs;

// Instruction.
export function list(
  context: Pick<Context, 'eddsa' | 'programs'>,
  input: ListInstructionAccounts & ListInstructionArgs
): TransactionBuilder {
  // Program ID.
  const programId = context.programs.getPublicKey(
    'nftMarketplace',
    'ATxkTBH2cbC28hV7n37QZ5d9hsc2Xpoio4ZHYSYFGHou'
  );

  // Accounts.
  const resolvedAccounts = {
    seller: {
      index: 0,
      isWritable: true as boolean,
      value: input.seller ?? null,
    },
    admin: {
      index: 1,
      isWritable: false as boolean,
      value: input.admin ?? null,
    },
    userAccount: {
      index: 2,
      isWritable: true as boolean,
      value: input.userAccount ?? null,
    },
    listing: {
      index: 3,
      isWritable: true as boolean,
      value: input.listing ?? null,
    },
    marketplace: {
      index: 4,
      isWritable: true as boolean,
      value: input.marketplace ?? null,
    },
    mint: { index: 5, isWritable: false as boolean, value: input.mint ?? null },
    collection: {
      index: 6,
      isWritable: false as boolean,
      value: input.collection ?? null,
    },
    sellerAta: {
      index: 7,
      isWritable: true as boolean,
      value: input.sellerAta ?? null,
    },
    escrow: {
      index: 8,
      isWritable: true as boolean,
      value: input.escrow ?? null,
    },
    metadata: {
      index: 9,
      isWritable: true as boolean,
      value: input.metadata ?? null,
    },
    masterEdition: {
      index: 10,
      isWritable: false as boolean,
      value: input.masterEdition ?? null,
    },
    associatedTokenProgram: {
      index: 11,
      isWritable: false as boolean,
      value: input.associatedTokenProgram ?? null,
    },
    systemProgram: {
      index: 12,
      isWritable: false as boolean,
      value: input.systemProgram ?? null,
    },
    tokenProgram: {
      index: 13,
      isWritable: false as boolean,
      value: input.tokenProgram ?? null,
    },
    metadataProgram: {
      index: 14,
      isWritable: false as boolean,
      value: input.metadataProgram ?? null,
    },
    sysvarInstructions: {
      index: 15,
      isWritable: false as boolean,
      value: input.sysvarInstructions ?? null,
    },
  } satisfies ResolvedAccountsWithIndices;

  // Arguments.
  const resolvedArgs: ListInstructionArgs = { ...input };

  // Default values.
  if (!resolvedAccounts.userAccount.value) {
    resolvedAccounts.userAccount.value = context.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.marketplace.value)
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.seller.value)
      ),
    ]);
  }
  if (!resolvedAccounts.listing.value) {
    resolvedAccounts.listing.value = context.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([108, 105, 115, 116, 105, 110, 103])),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.marketplace.value)
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.mint.value)
      ),
      u64().serialize(expectSome(resolvedArgs.seed)),
    ]);
  }
  if (!resolvedAccounts.sellerAta.value) {
    resolvedAccounts.sellerAta.value = context.eddsa.findPda(programId, [
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.seller.value)
      ),
      bytes().serialize(
        new Uint8Array([
          6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235,
          121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126,
          255, 0, 169,
        ])
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.mint.value)
      ),
    ]);
  }
  if (!resolvedAccounts.escrow.value) {
    resolvedAccounts.escrow.value = context.eddsa.findPda(programId, [
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.listing.value)
      ),
      bytes().serialize(
        new Uint8Array([
          6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235,
          121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126,
          255, 0, 169,
        ])
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.mint.value)
      ),
    ]);
  }
  if (!resolvedAccounts.metadataProgram.value) {
    resolvedAccounts.metadataProgram.value = context.programs.getPublicKey(
      'metadataProgram',
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );
    resolvedAccounts.metadataProgram.isWritable = false;
  }
  if (!resolvedAccounts.metadata.value) {
    resolvedAccounts.metadata.value = context.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([109, 101, 116, 97, 100, 97, 116, 97])),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.metadataProgram.value)
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.mint.value)
      ),
    ]);
  }
  if (!resolvedAccounts.masterEdition.value) {
    resolvedAccounts.masterEdition.value = context.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([109, 101, 116, 97, 100, 97, 116, 97])),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.metadataProgram.value)
      ),
      publicKeySerializer().serialize(
        expectPublicKey(resolvedAccounts.mint.value)
      ),
      bytes().serialize(new Uint8Array([101, 100, 105, 116, 105, 111, 110])),
    ]);
  }
  if (!resolvedAccounts.associatedTokenProgram.value) {
    resolvedAccounts.associatedTokenProgram.value =
      context.programs.getPublicKey(
        'associatedTokenProgram',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
      );
    resolvedAccounts.associatedTokenProgram.isWritable = false;
  }
  if (!resolvedAccounts.systemProgram.value) {
    resolvedAccounts.systemProgram.value = context.programs.getPublicKey(
      'systemProgram',
      '11111111111111111111111111111111'
    );
    resolvedAccounts.systemProgram.isWritable = false;
  }
  if (!resolvedAccounts.tokenProgram.value) {
    resolvedAccounts.tokenProgram.value = context.programs.getPublicKey(
      'tokenProgram',
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    );
    resolvedAccounts.tokenProgram.isWritable = false;
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
  const data = getListInstructionDataSerializer().serialize(
    resolvedArgs as ListInstructionDataArgs
  );

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 0;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}
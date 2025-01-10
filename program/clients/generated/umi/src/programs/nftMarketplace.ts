/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  ClusterFilter,
  Context,
  Program,
  PublicKey,
} from '@metaplex-foundation/umi';
import {
  getNftMarketplaceErrorFromCode,
  getNftMarketplaceErrorFromName,
} from '../errors';

export const NFT_MARKETPLACE_PROGRAM_ID =
  'ATxkTBH2cbC28hV7n37QZ5d9hsc2Xpoio4ZHYSYFGHou' as PublicKey<'ATxkTBH2cbC28hV7n37QZ5d9hsc2Xpoio4ZHYSYFGHou'>;

export function createNftMarketplaceProgram(): Program {
  return {
    name: 'nftMarketplace',
    publicKey: NFT_MARKETPLACE_PROGRAM_ID,
    getErrorFromCode(code: number, cause?: Error) {
      return getNftMarketplaceErrorFromCode(code, this, cause);
    },
    getErrorFromName(name: string, cause?: Error) {
      return getNftMarketplaceErrorFromName(name, this, cause);
    },
    isOnCluster() {
      return true;
    },
  };
}

export function getNftMarketplaceProgram<T extends Program = Program>(
  context: Pick<Context, 'programs'>,
  clusterFilter?: ClusterFilter
): T {
  return context.programs.get<T>('nftMarketplace', clusterFilter);
}

export function getNftMarketplaceProgramId(
  context: Pick<Context, 'programs'>,
  clusterFilter?: ClusterFilter
): PublicKey {
  return context.programs.getPublicKey(
    'nftMarketplace',
    NFT_MARKETPLACE_PROGRAM_ID,
    clusterFilter
  );
}
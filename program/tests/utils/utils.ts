import { BN, web3 } from "@coral-xyz/anchor";
import { Umi, PublicKey } from "@metaplex-foundation/umi";
import {
  bytes,
  publicKey as publicKeySerializer,
} from "@metaplex-foundation/umi/serializers";

export function generateRandomU64Seed(): BN {
  const randomBytes = web3.Keypair.generate().secretKey.slice(0, 8);

  return new BN(randomBytes);
}

export function printObj(accounts: any) {
  Object.entries(accounts).forEach(([key, value]) => {
    console.log(`Key: ${key}, Value: ${value.toString()}`);
  });
}

export function parseAnchorError(logs: string[]) {
  let error = {
    filePath: null,
    errorCode: null,
    errorNumber: null,
    errorMessage: null,
  };

  if (!Array.isArray(logs)) return error;

  for (const log of logs) {
    const anchorErrorRegex =
      /Program log: AnchorError thrown in (.+?)\. Error Code: (.+?)\. Error Number: (\d+)\. Error Message: (.+?)\.$/;
    const match = log.match(anchorErrorRegex);

    if (!match) continue;

    return {
      filePath: match[1],
      errorCode: match[2],
      errorNumber: parseInt(match[3]),
      errorMessage: match[4],
    };
  }

  return error;
}

export function fetchUserAccountPDA(
  umi: Umi,
  programId: PublicKey,
  marketplace: PublicKey,
  user: PublicKey
) {
  return umi.eddsa.findPda(programId, [
    bytes().serialize(new Uint8Array([117, 115, 101, 114])),
    publicKeySerializer().serialize(marketplace),
    publicKeySerializer().serialize(user),
  ]);
}

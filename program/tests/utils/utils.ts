import { BN, web3 } from "@coral-xyz/anchor";

export function generateRandomU64Seed(): BN {
  const randomBytes = web3.Keypair.generate().secretKey.slice(0, 8);

  return new BN(randomBytes);
}

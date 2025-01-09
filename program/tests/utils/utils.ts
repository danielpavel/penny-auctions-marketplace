import { BN, web3 } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

export function generateRandomU64Seed(): BN {
  const randomBytes = web3.Keypair.generate().secretKey.slice(0, 8);

  return new BN(randomBytes);
}

export function printObj(accounts: any) {
  Object.entries(accounts).forEach(([key, value]) => {
    console.log(`Key: ${key}, Value: ${value.toString()}`);
  });
}

export const getTokenBalance = async (
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  isToken2022: boolean = false
) => {
  const [ata] = web3.PublicKey.findProgramAddressSync(
    [owner.toBytes(), TOKEN_2022_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  try {
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch (error) {
    console.log("Error getting token balance:", error);
    return 0n;
  }
};

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

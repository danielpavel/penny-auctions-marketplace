import * as anchor from "@coral-xyz/anchor";

import {
  generateSigner,
  percentAmount,
  Umi,
  some,
} from "@metaplex-foundation/umi";
import {
  mintV1,
  TokenStandard,
  createFungible,
} from "@metaplex-foundation/mpl-token-metadata";
import { fromWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";

export async function createBidToken(umi: Umi) {
  const mint = generateSigner(umi);

  const txResult = await createFungible(umi, {
    mint,
    name: "Bid Token",
    uri: "https://arweave.net/123",
    sellerFeeBasisPoints: percentAmount(5.5),
    decimals: some(6),
  }).sendAndConfirm(umi);

  if (txResult.result.value.err) {
    return null;
  }

  return mint;
}

export async function mintBidToken(
  umi: Umi,
  mint: anchor.web3.PublicKey,
  amount: number,
  toAddress: anchor.web3.PublicKey
) {
  await mintV1(umi, {
    mint: fromWeb3JsPublicKey(mint),
    authority: umi.payer,
    amount,
    tokenOwner: fromWeb3JsPublicKey(toAddress),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);
}

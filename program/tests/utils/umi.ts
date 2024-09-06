import { web3 } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";

import { Keypair } from "@solana/web3.js";

// Stupid hack to make the types work. PS: I hate typescript
type BothWorldsKeypair = Keypair & web3.Keypair;

export function initUmi(connection: web3.Connection, wallet: NodeWallet) {
  const umi = createUmi(connection.rpcEndpoint, "confirmed");

  const myKeypairSigner = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(wallet.payer as BothWorldsKeypair)
  );

  umi.use(signerIdentity(myKeypairSigner));
  umi.use(mplTokenMetadata());

  return umi;
}

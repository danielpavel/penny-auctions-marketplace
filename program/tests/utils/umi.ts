import { web3 } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";

export function initUmi(connection: web3.Connection, wallet: NodeWallet) {
  const umi = createUmi(connection.rpcEndpoint, "confirmed");

  const myKeypairSigner = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(wallet.payer)
  );

  umi.use(signerIdentity(myKeypairSigner));
  umi.use(mplTokenMetadata());

  return umi;
}

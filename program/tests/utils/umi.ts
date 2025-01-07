import { Provider, web3 } from "@coral-xyz/anchor";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

import { Keypair } from "@solana/web3.js";

export function initUmi(provider: Provider) {
  const umi = createUmi(provider.connection.rpcEndpoint, {
    commitment: "confirmed",
  });

  // Anchor Wallet interface is a wrapper over NodeWallet which has payer keypair that we need not exposed to Provider
  const admin = umi.eddsa.createKeypairFromSecretKey(
    // @ts-ignore
    (provider.wallet.payer as Keypair).secretKey
  );

  umi.use(keypairIdentity(admin));
  umi.use(mplTokenMetadata());
  umi.use(mplToolbox());

  return umi;
}

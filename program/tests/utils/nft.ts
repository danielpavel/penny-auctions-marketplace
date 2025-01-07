import {
  generateSigner,
  percentAmount,
  publicKey,
  TransactionBuilder,
  Umi,
} from "@metaplex-foundation/umi";
import {
  createNft,
  createProgrammableNft,
  findMetadataPda,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import { getAssociatedTokenAddress } from "@solana/spl-token";

import { PublicKey } from "@solana/web3.js";

export async function createCollectionNft(umi: Umi) {
  const collectionMint = generateSigner(umi);

  const result = await createNft(umi, {
    mint: collectionMint,
    name: "My Collection",
    uri: "https://arweave.net/123",
    sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
    isCollection: true,
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  return result.result.value.err
    ? null
    : toWeb3JsPublicKey(collectionMint.publicKey);
}

export async function mintNft({
  umi,
  randomNumber,
  account,
  collection,
  pNft,
}: {
  umi: Umi;
  randomNumber: number;
  account: PublicKey;
  collection: PublicKey;
  pNft: boolean;
}) {
  const mint = generateSigner(umi);

  try {
    // Generate ATA for the NFT owner
    const ata = await getAssociatedTokenAddress(
      toWeb3JsPublicKey(mint.publicKey),
      account
    );
    const owner = fromWeb3JsPublicKey(account);

    let txBuilder: TransactionBuilder = null;
    if (pNft) {
      // Decide on a ruleset for the Nft.
      // Metaplex ruleset - publicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9")
      // Compatability ruleset - publicKey("AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5")
      //const ruleset = publicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"); // or set a publicKey from above
      const ruleset = null;

      txBuilder = createProgrammableNft(umi, {
        name: `My pNft ${randomNumber}`,
        mint,
        token: fromWeb3JsPublicKey(ata),
        tokenOwner: owner,
        sellerFeeBasisPoints: percentAmount(5),
        isCollection: false,
        collection: { key: fromWeb3JsPublicKey(collection), verified: false },
        uri: "https://arweave.net/123",
        ruleSet: ruleset,
      });
    } else {
      txBuilder = createNft(umi, {
        name: `My Nft ${randomNumber}`,
        mint,
        token: fromWeb3JsPublicKey(ata),
        tokenOwner: owner,
        authority: umi.payer,
        sellerFeeBasisPoints: percentAmount(5),
        isCollection: false,
        collection: { key: fromWeb3JsPublicKey(collection), verified: false },
        uri: "https://arweave.net/123",
      });
    }

    let result = await txBuilder.sendAndConfirm(umi, {
      confirm: { commitment: "confirmed" },
    });

    if (result.result.value.err) {
      return null;
    }

    return { mint, ata };
  } catch (error) {
    throw Error(`[mintNft] ${error}`);
  }
}

export async function mintNftAndVerify({
  umi,
  randomNumber,
  account,
  collection,
  pNft,
}: {
  umi: Umi;
  randomNumber: number;
  account: PublicKey;
  collection: PublicKey;
  pNft: boolean;
}) {
  try {
    const { mint, ata } = await mintNft({
      umi,
      randomNumber,
      account,
      collection,
      pNft,
    });

    // first find the metadata PDA to use later
    const metadata = findMetadataPda(umi, {
      mint: mint.publicKey,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: fromWeb3JsPublicKey(collection),
      authority: umi.payer,
    }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

    return { mint: toWeb3JsPublicKey(mint.publicKey), ata };
  } catch (error) {
    throw Error(`[mintNft] ${error}`);
  }
}

export async function createAndMintNftForCollection(
  umi: Umi,
  randomNumber: number,
  account: PublicKey,
  pNft?: boolean
) {
  try {
    const collection = await createCollectionNft(umi);

    const { mint, ata } = await mintNft({
      umi,
      randomNumber,
      account,
      collection: collection,
      pNft,
    });

    // first find the metadata PDA to use later
    const metadata = findMetadataPda(umi, {
      mint: mint.publicKey,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: fromWeb3JsPublicKey(collection),
      authority: umi.payer,
    }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

    return {
      mint: toWeb3JsPublicKey(mint.publicKey),
      ata,
      collection: collection,
    };
  } catch (err) {
    throw Error(`[createAndMintNftForCollection] ${err}`);
  }
}

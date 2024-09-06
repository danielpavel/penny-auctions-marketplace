import { generateSigner, percentAmount, Umi } from "@metaplex-foundation/umi";
import {
  createNft,
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
  }).sendAndConfirm(umi);

  return result.result.value.err
    ? null
    : toWeb3JsPublicKey(collectionMint.publicKey);
}

export async function mintNft({
  umi,
  randomNumber,
  account,
  collection,
}: {
  umi: Umi;
  randomNumber: number;
  account: PublicKey;
  collection: PublicKey;
}) {
  const mint = generateSigner(umi);

  try {
    // Generate ATA for the NFT owner
    const ata = await getAssociatedTokenAddress(
      toWeb3JsPublicKey(mint.publicKey),
      account
    );
    const owner = fromWeb3JsPublicKey(account);

    const txBuilder = createNft(umi, {
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

    let result = await txBuilder.sendAndConfirm(umi);

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
}: {
  umi: Umi;
  randomNumber: number;
  account: PublicKey;
  collection: PublicKey;
}) {
  try {
    const { mint, ata } = await mintNft({
      umi,
      randomNumber,
      account,
      collection,
    });

    // first find the metadata PDA to use later
    const metadata = findMetadataPda(umi, {
      mint: mint.publicKey,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: fromWeb3JsPublicKey(collection),
      authority: umi.payer,
    }).sendAndConfirm(umi);

    return { mint: toWeb3JsPublicKey(mint.publicKey), ata };
  } catch (error) {
    throw Error(`[mintNft] ${error}`);
  }
}

export async function createAndMintNftForCollection(
  umi: Umi,
  randomNumber: number,
  account: PublicKey
) {
  try {
    const collection = await createCollectionNft(umi);

    const { mint, ata } = await mintNft({
      umi,
      randomNumber,
      account,
      collection: collection,
    });

    // first find the metadata PDA to use later
    const metadata = findMetadataPda(umi, {
      mint: mint.publicKey,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: fromWeb3JsPublicKey(collection),
      authority: umi.payer,
    }).sendAndConfirm(umi);

    return {
      mint: toWeb3JsPublicKey(mint.publicKey),
      ata,
      collection: collection,
    };
  } catch (err) {
    throw Error(`[createAndMintNftForCollection] ${err}`);
  }
}

import {
  createNft,
  createProgrammableNft,
  findMetadataPda,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";
import { findAssociatedTokenPda } from "@metaplex-foundation/mpl-toolbox";
import {
  generateSigner,
  percentAmount,
  PublicKey,
  TransactionBuilder,
  TransactionBuilderSendAndConfirmOptions,
  Umi,
} from "@metaplex-foundation/umi";
import {
  bytes,
  publicKey as publicKeySerializer,
} from "@metaplex-foundation/umi/serializers";

export const getUserAccountPda = (
  umi: Umi,
  marketplace: PublicKey,
  user: PublicKey
) => {
  return umi.eddsa.findPda(umi.programs.getPublicKey("nftMarketplace"), [
    bytes().serialize(new Uint8Array([117, 115, 101, 114])),
    publicKeySerializer().serialize(marketplace),
    publicKeySerializer().serialize(user),
  ]);
};

export const getMarketplaceTreasuryPda = (umi: Umi, marketplace: PublicKey) => {
  return umi.eddsa.findPda(umi.programs.getPublicKey("nftMarketplace"), [
    bytes().serialize(new Uint8Array([116, 114, 101, 97, 115, 117, 114, 121])),
    publicKeySerializer().serialize(marketplace),
  ]);
};

/**
 * Create Test NFT
 */
export async function createCollectionNft(
  umi: Umi,
  options: TransactionBuilderSendAndConfirmOptions
) {
  const collectionMint = generateSigner(umi);

  const result = await createNft(umi, {
    mint: collectionMint,
    name: "My Collection",
    uri: "https://arweave.net/123",
    sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
    isCollection: true,
  }).sendAndConfirm(umi, options);

  return result.result.value.err ? null : collectionMint.publicKey;
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
      mint: mint,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: collection,
      authority: umi.payer,
    }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

    return { mint, ata };
  } catch (error) {
    throw Error(`[mintNft] ${error}`);
  }
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
    const [ata] = findAssociatedTokenPda(umi, {
      mint: mint.publicKey,
      owner: account,
    });

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
        token: ata,
        tokenOwner: account,
        sellerFeeBasisPoints: percentAmount(5),
        isCollection: false,
        collection: { key: collection, verified: false },
        uri: "https://arweave.net/123",
        ruleSet: ruleset,
      });
    } else {
      txBuilder = createNft(umi, {
        name: `My Nft ${randomNumber}`,
        mint,
        token: ata,
        tokenOwner: account,
        authority: umi.payer,
        sellerFeeBasisPoints: percentAmount(5),
        isCollection: false,
        collection: { key: collection, verified: false },
        uri: "https://arweave.net/123",
      });
    }

    let result = await txBuilder.sendAndConfirm(umi, {
      confirm: { commitment: "confirmed" },
    });

    if (result.result.value.err) {
      return null;
    }

    return { mint: mint.publicKey, ata };
  } catch (error) {
    throw Error(`[mintNft] ${error}`);
  }
}

export async function createAndMintNftForCollection(
  umi: Umi,
  randomNumber: number,
  account: PublicKey,
  options: TransactionBuilderSendAndConfirmOptions,
  pNft?: boolean
) {
  try {
    const collection = await createCollectionNft(umi, options);
    if (!collection) {
      throw new Error("Collection failed to create");
    }

    const { mint, ata } = await mintNft({
      umi,
      randomNumber,
      account,
      collection: collection,
      pNft,
    });

    const metadata = findMetadataPda(umi, {
      mint: mint,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: collection,
      authority: umi.payer,
    }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

    return {
      mint,
      ata,
      collection,
    };
  } catch (err) {
    throw Error(`[createAndMintNftForCollection] ${err}`);
  }
}

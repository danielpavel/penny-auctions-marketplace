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
  Signer,
  TransactionBuilder,
  TransactionBuilderSendAndConfirmOptions,
  Umi,
} from "@metaplex-foundation/umi";
import {
  base58,
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

  console.log("Creating Collection ", collectionMint.publicKey, " ...");

  const result = await createNft(umi, {
    mint: collectionMint,
    authority: umi.payer,
    name: "My Collection",
    uri: "https://arweave.net/123",
    sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
    isCollection: true,
  }).sendAndConfirm(umi, options);

  if (result.result.value.err) {
    console.error("❌ Failed with err", result.result.value.err);
    return null;
  }

  console.log("✅ Done with sig:", base58.deserialize(result.signature)[0]);
  return collectionMint.publicKey;
}

export async function mintNftAndVerify({
  umi,
  randomNumber,
  owner,
  collection,
  pNft,
  opts,
}: {
  umi: Umi;
  randomNumber: number;
  owner: PublicKey;
  collection: PublicKey;
  pNft: boolean;
  opts: TransactionBuilderSendAndConfirmOptions;
}) {
  try {
    const { mint, ata } = await mintNft({
      umi,
      randomNumber,
      owner,
      collection,
      pNft,
      opts,
    });

    // first find the metadata PDA to use later
    const metadata = findMetadataPda(umi, {
      mint: mint,
    });

    await verifyCollectionV1(umi, {
      metadata,
      collectionMint: collection,
      authority: umi.payer,
    }).sendAndConfirm(umi, opts);

    return { mint, ata };
  } catch (error) {
    throw Error(`[mintNft] ${error}`);
  }
}

export async function mintNft({
  umi,
  randomNumber,
  owner,
  collection,
  pNft,
  opts,
}: {
  umi: Umi;
  randomNumber: number;
  owner: PublicKey;
  collection: PublicKey;
  pNft: boolean;
  opts: TransactionBuilderSendAndConfirmOptions;
}) {
  const mint = generateSigner(umi);

  console.log("Minting NFT", mint.publicKey.toString(), "...");

  try {
    const [ata] = findAssociatedTokenPda(umi, {
      mint: mint.publicKey,
      owner,
    });

    let txBuilder: TransactionBuilder = null;
    const input = {
      mint,
      token: ata,
      tokenOwner: owner,
      authority: umi.payer,
      sellerFeeBasisPoints: percentAmount(5),
      isCollection: false,
      collection: { key: collection, verified: false },
      uri: "https://arweave.net/123",
    };

    if (pNft) {
      // Decide on a ruleset for the Nft.
      // Metaplex ruleset - publicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9")
      // Compatability ruleset - publicKey("AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5")
      //const ruleset = publicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"); // or set a publicKey from above
      const ruleset = null;

      txBuilder = createProgrammableNft(umi, {
        name: `My pNft ${randomNumber}`,
        ...input,
        ruleSet: ruleset,
      });
    } else {
      txBuilder = createNft(umi, {
        name: `My Nft ${randomNumber}`,
        ...input,
      });
    }

    let result = await txBuilder.sendAndConfirm(umi, opts);

    if (result.result.value.err) {
      console.error("❌ Failed with error", result.result.value.err);
      return { mint: null, ata: null };
    }

    console.log("✅ Done with sig:", base58.deserialize(result.signature)[0]);
    return { mint: mint.publicKey, ata };
  } catch (error) {
    console.error("[mintNft][error]", error);
    throw error;
  }
}

export async function createAndMintNftForCollection(
  umi: Umi,
  payer: Signer,
  options: TransactionBuilderSendAndConfirmOptions,
  pNft?: boolean,
  collection?: PublicKey
) {
  try {
    const rand = Math.floor(Math.random() * 1000) + 1;
    let newCollection = collection;

    if (!newCollection) {
      newCollection = await createCollectionNft(umi, options);
      if (!newCollection) {
        throw new Error("Collection failed to create");
      }
    }

    const { mint, ata } = await mintNftAndVerify({
      umi,
      randomNumber: rand,
      owner: payer.publicKey,
      collection: newCollection,
      pNft,
      opts: options,
    });

    return {
      mint,
      ata,
      collection,
    };
  } catch (err) {
    throw Error(`[createAndMintNftForCollection] ${err}`);
  }
}

import { clusterApiUrl } from "@solana/web3.js";

import dotenv from "dotenv";
import {
  generateSigner,
  keypairIdentity,
  Signer,
  TransactionBuilderSendAndConfirmOptions,
  Umi,
  Program as UmiProgram,
  createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import path from "path";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  getNftMarketplaceProgram,
  initialize,
  InitializeInstructionArgs,
} from "../clients/generated/umi/src";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { getKeypairFromFile } from "@solana-developers/helpers";
import {
  bytes,
  string,
  publicKey as publicKeySerializer,
  base58,
} from "@metaplex-foundation/umi/serializers";

dotenv.config();

type Cluster = "mainnet-beta" | "devnet" | "testnet";

/**
 * Initialize Marketplace
 */
export const intializeMarketplace = async (
  umi: Umi,
  program: UmiProgram,
  admin: Signer,
  args: InitializeInstructionArgs,
  sendAndConfirmOpts: TransactionBuilderSendAndConfirmOptions
) => {
  try {
    const { fee, tokenName, tokenSymbol, uri, name, mintCosts } = args;

    const sBidMint = generateSigner(umi);
    const marketplacePDA = umi.eddsa.findPda(program.publicKey, [
      bytes().serialize(
        new Uint8Array([109, 97, 114, 107, 101, 116, 112, 108, 97, 99, 101])
      ),
      publicKeySerializer().serialize(admin.publicKey),
      publicKeySerializer().serialize(sBidMint.publicKey),
      string().serialize(name),
    ]);

    const txResult = await initialize(umi, {
      admin,
      sbidMint: sBidMint,
      marketplace: marketplacePDA,
      fee,
      name,
      tokenName,
      tokenSymbol,
      uri,
      mintCosts,
    }).sendAndConfirm(umi, sendAndConfirmOpts);

    console.log("✅ Done with sig:", base58.deserialize(txResult.signature)[0]);
  } catch (error) {
    console.error("❌ Initialize Marketplace Error:", error);
  }
};

/**
 * Create Auction Listing
 */
export const createAuctionListing = async () => {};

/**
 * Place a bid
 */
export const placeBid = async () => {};

/**
 * End an auction
 */
export const endAuction = async () => {};

export const getAuctionListing = async () => {};

export const getAllAuctionListings = async () => {};

export const getMarketplace = async () => {};

export const getAllMarketplaces = async () => {};

export const mintBidTokens = async () => {};

// Utility Functions
export const initializePrereqs = async (
  cluster: Cluster,
  adminPath: string
) => {
  const umi = createUmi(clusterApiUrl(cluster), {
    commitment: "confirmed",
  });

  const keypairPath = path.join(process.cwd(), adminPath);
  const kp = await getKeypairFromFile(keypairPath);
  const admin = umi.eddsa.createKeypairFromSecretKey(kp.secretKey);

  umi.use(keypairIdentity(admin));
  umi.use(mplTokenMetadata());
  umi.use(mplToolbox());

  return {
    umi,
    program: getNftMarketplaceProgram(umi),
    admin: createSignerFromKeypair(umi, admin),
  };
};

/**
 * Create Test NFT
 */
// export const initTestNftCollection = async () => {
//   collection = await createCollectionNft(umi);
//
//   console.log("Collection: ", collection.toBase58());
// };

/**
 * Create Test NFT
 */
// export const mintTestNft = async (
//   toAccount: PublicKey,
//   collection: PublicKey,
//   pNft: boolean
// ) => {
//   console.log(
//     `Minting ${
//       pNft ? "pNFT" : "NFT"
//     } into Collection ${collection.toBase58()} to ${toAccount.toBase58()}...`
//   );
//
//   const rand = Math.floor(Math.random() * 100);
//   const { mint, ata } = await mintNftAndVerify({
//     umi,
//     randomNumber: rand,
//     account: toAccount,
//     collection,
//     pNft,
//   });
//
//   console.log("Mint: ", mint.toBase58());
//   console.log("Ata: ", ata.toBase58());
// };

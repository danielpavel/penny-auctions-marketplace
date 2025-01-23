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
  UmiPlugin,
  publicKey,
  PublicKey as UmiPublicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import path from "path";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  getNftMarketplaceProgram,
  initialize,
  InitializeInstructionArgs,
  createNftMarketplaceProgram,
  fetchMarketplace,
  mintBidToken,
  fetchUserAccount,
  safeFetchUserAccount,
  initializeUser,
  safeFetchMarketplace,
} from "../clients/generated/umi/src";
import {
  findAssociatedTokenPda,
  mplToolbox,
} from "@metaplex-foundation/mpl-toolbox";
import { getKeypairFromFile } from "@solana-developers/helpers";
import {
  bytes,
  string,
  publicKey as publicKeySerializer,
  base58,
} from "@metaplex-foundation/umi/serializers";
import { getMarketplaceTreasuryPda, getUserAccountPda } from "./utils";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { fromWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { use } from "chai";

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

    console.log("Initializing Marketplace with config:");
    console.log(args);

    const sBidMint = generateSigner(umi);
    const marketplacePDA = umi.eddsa.findPda(program.publicKey, [
      bytes().serialize(
        new Uint8Array([109, 97, 114, 107, 101, 116, 112, 108, 97, 99, 101])
      ),
      publicKeySerializer().serialize(admin.publicKey),
      publicKeySerializer().serialize(sBidMint.publicKey),
      string({ size: "variable" }).serialize(name),
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

export const getAllMarketplaces = async () => {};

export const mintBidTokens = async (
  umi: Umi,
  admin: Signer,
  marketplace: string,
  keypairFilePath: string,
  opts: TransactionBuilderSendAndConfirmOptions,
  tier: number
) => {
  try {
    console.log("Fetching Marketplace...");
    const marketplacePubkey = publicKey(marketplace);
    const marketplaceAccount = await fetchMarketplace(umi, marketplacePubkey);
    console.log("✅ Done!");

    const sBidMint = marketplaceAccount.sbidMint;
    const userSigner = await getSignerFromSecretKeyFile(umi, keypairFilePath);

    console.log("Minting Tokens...");

    const [ata] = findAssociatedTokenPda(umi, {
      mint: sBidMint,
      owner: userSigner.publicKey,
      tokenProgramId: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
    });

    const [userAccountPDA] = await getOrCreateUserAccount(
      umi,
      userSigner,
      marketplacePubkey,
      opts
    );

    const [treasuryPDA] = getMarketplaceTreasuryPda(umi, marketplacePubkey);

    const txResult = await mintBidToken(umi, {
      admin,
      user: userSigner,
      userAccount: userAccountPDA,
      marketplace: marketplacePubkey,
      treasury: treasuryPDA,
      sbidMint: sBidMint,
      userSbidAta: ata,
      tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
      tier,
    }).sendAndConfirm(umi, opts);

    console.log(
      "✅ Done! With sig:",
      base58.deserialize(txResult.signature)[0]
    );
  } catch (err) {
    console.error("Error details:", err);
    throw err;
  }
};

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

  // Register Nft Marketplace Program
  const nftMarketplaceProgram = (): UmiPlugin => ({
    install(umi) {
      umi.programs.add(createNftMarketplaceProgram());
    },
  });

  umi.use(nftMarketplaceProgram());

  return {
    umi,
    program: getNftMarketplaceProgram(umi),
    admin: createSignerFromKeypair(umi, admin),
  };
};

export const getSignerFromSecretKeyFile = async (
  umi: Umi,
  secretKeyPath: string
) => {
  const keypairPath = path.join(process.cwd(), secretKeyPath);
  const kp = await getKeypairFromFile(keypairPath);

  return createSignerFromKeypair(
    umi,
    umi.eddsa.createKeypairFromSecretKey(kp.secretKey)
  );
};

export const getOrCreateUserAccount = async (
  umi: Umi,
  user: Signer,
  marketplace: UmiPublicKey,
  options: TransactionBuilderSendAndConfirmOptions
) => {
  const userAccountPDA = getUserAccountPda(umi, marketplace, user.publicKey);

  const userAccount = await safeFetchUserAccount(umi, userAccountPDA);
  if (userAccount) {
    return userAccountPDA;
  }

  console.log(
    "userAccount: ",
    userAccountPDA[0].toString(),
    " not found. Creating it..."
  );

  try {
    const txResult = await initializeUser(umi, {
      user,
      userAccount: userAccountPDA,
      marketplace,
    }).sendAndConfirm(umi, options);

    console.log("✅ Done with sig:", base58.deserialize(txResult.signature)[0]);
  } catch (err) {
    throw new Error("❌ Creating User Account Tx Failed with:", err);
  }

  return userAccountPDA;
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

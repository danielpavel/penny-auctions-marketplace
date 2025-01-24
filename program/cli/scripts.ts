import {
  clusterApiUrl,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";

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
  TransactionBuilder,
  AccountMeta,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import path from "path";
import {
  fetchMetadata,
  findMasterEditionPda,
  findMetadataPda,
  findTokenRecordPda,
  mplTokenMetadata,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  getNftMarketplaceProgram,
  initialize,
  InitializeInstructionArgs,
  createNftMarketplaceProgram,
  fetchMarketplace,
  mintBidToken,
  list,
} from "../clients/generated/umi/src";
import {
  fetchMint,
  fetchToken,
  findAssociatedTokenPda,
  mplToolbox,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-toolbox";
import { getKeypairFromFile } from "@solana-developers/helpers";
import {
  bytes,
  string,
  publicKey as publicKeySerializer,
  base58,
} from "@metaplex-foundation/umi/serializers";
import {
  generateRandomU64Seed,
  getListingPDA,
  getMarketplaceTreasuryPda,
  getOrCreateUserAccount,
} from "./utils";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";

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
export const createAuctionListing = async (
  umi: Umi,
  seller: Signer,
  mint: UmiPublicKey,
  collection: UmiPublicKey,
  marketplace: UmiPublicKey,
  options: TransactionBuilderSendAndConfirmOptions
) => {
  try {
    const [userAccount] = await getOrCreateUserAccount(
      umi,
      seller,
      marketplace,
      options
    );

    const price = BigInt(500000000);
    const bidIncrement = (price * BigInt(10)) / BigInt(10_000);
    const seed = generateRandomU64Seed(umi);
    const durationInSlots = BigInt((30 * 60 * 1000) / 400); // 30 mins in slots
    const timerExtensionInSlots = BigInt((30 * 1000) / 400); // 30 seconds in slots

    const [listing] = getListingPDA(umi, marketplace, mint, seed);
    // `findAssociatedTokenPda` does not support off-curve :(
    const escrow = getAssociatedTokenAddressSync(
      toWeb3JsPublicKey(mint),
      toWeb3JsPublicKey(listing),
      true
    );
    const [sellerAta] = findAssociatedTokenPda(umi, {
      mint,
      owner: seller.publicKey,
    });

    const [metadata] = findMetadataPda(umi, {
      mint,
    });
    const [editionAccount] = findMasterEditionPda(umi, {
      mint,
    });

    const slot = await umi.rpc.getSlot();

    console.log("Creating Listing Acution", listing.toString(), "...");

    const accounts = {
      seller,
      admin: umi.payer,
      userAccount,
      listing,
      marketplace,
      mint,
      collection,
      sellerAta,
      escrow: fromWeb3JsPublicKey(escrow),
      metadata,
      masterEdition: editionAccount,
      tokenProgram: fromWeb3JsPublicKey(TOKEN_PROGRAM_ID), // this looks ugly
      sysvarInstructions: fromWeb3JsPublicKey(SYSVAR_INSTRUCTIONS_PUBKEY), // so does this ...
      seed,
      bidIncrement,
      timerExtensionInSlots,
      startTimeInSlots: slot,
      initialDurationInSlots: durationInSlots,
      buyoutPrice: price,
      amount: BigInt(1),
    };

    let txResult;
    const metadataAccount = await fetchMetadata(umi, metadata);
    if (
      metadataAccount.programmableConfig?.__option === "Some" &&
      metadataAccount.programmableConfig?.value.__kind === "V1"
    ) {
      // We're dealing with a pNFT
      const [ownerTr] = findTokenRecordPda(umi, {
        mint,
        token: sellerAta,
      });
      const [destinationTr] = findTokenRecordPda(umi, {
        mint,
        token: escrow,
      });

      const AUTH_RULES_PROGRAM = umi.programs.getPublicKey(
        "authRulesProgram",
        "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
      );

      const remainingAccounts: Array<AccountMeta> = [
        {
          pubkey: MPL_TOKEN_METADATA_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: editionAccount, isSigner: false, isWritable: false },
        { pubkey: ownerTr, isSigner: false, isWritable: true },
        { pubkey: destinationTr, isSigner: false, isWritable: true },
        { pubkey: AUTH_RULES_PROGRAM, isSigner: false, isWritable: true },
      ];

      const txBuilder = new TransactionBuilder();

      txResult = await txBuilder
        .add(list(umi, accounts).addRemainingAccounts(remainingAccounts))
        .add(setComputeUnitLimit(umi, { units: 600_000 }))
        .sendAndConfirm(umi, options);
    } else {
      // Regular NFT
      txResult = await list(umi, accounts).sendAndConfirm(umi, options);
    }

    console.log("✅ Done with sig:", base58.deserialize(txResult.signature)[0]);
  } catch (error) {
    console.error("❌ Failed with error:", error);
    throw error;
  }
};

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

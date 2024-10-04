import * as anchor from "@coral-xyz/anchor";
import {
  Program,
  Provider,
  AnchorProvider,
  BN,
  utils,
  web3,
} from "@coral-xyz/anchor";
import fs from "fs";

import { PublicKey, clusterApiUrl } from "@solana/web3.js";

import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { NftMarketplace } from "../target/types/nft_marketplace";

import {
  createListTx,
  createPlaceBidTx,
  createInitializeMarketplaceTx,
  createEndAuctionTx,
} from "../lib/tx";
import { execTx } from "../lib/util";

import { createCollectionNft, mintNftAndVerify } from "../tests/utils/nft";

import { initUmi } from "../tests/utils/umi";
import { createBidToken } from "../tests/utils/bidToken";
import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import dotenv from "dotenv";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { LISTING_SEED, REWARDS_SEED, TREASURY_SEED } from "../lib/constants";
import { Umi } from "@metaplex-foundation/umi";
import { mintBidToken } from "../tests/utils/bidToken";

dotenv.config();

let connection: web3.Connection = null;
let program: Program<NftMarketplace> = null;
let provider: Provider = null;
let payer: NodeWallet = null;
let payerKp: web3.Keypair = null;

let umi: Umi = null;
let marketplace = new PublicKey(process.env.MARKETPLACE || PublicKey.default);
let bidTokenMint = new PublicKey(process.env.BIDS_MINT || PublicKey.default);
let collection = new PublicKey(process.env.COLLECTION || PublicKey.default);

type Cluster = "localhost" | "mainnet-beta" | "devnet" | "testnet";

/**
 * Set cluster, provider, program
 * If rpc != null use rpc, otherwise use cluster param
 * @param cluster - cluster ex. mainnet-beta, devnet ...
 * @param keypair - wallet keypair
 * @param rpc - rpc
 */
export const setClusterConfig = async (
  cluster: Cluster,
  keypair: string,
  rpc?: string
) => {
  if (!rpc) {
    const endpoint =
      cluster == "localhost" ? "http://127.0.0.1:8899" : clusterApiUrl(cluster);

    console.log("Cluster:", endpoint);
    connection = new web3.Connection(endpoint);
  } else {
    connection = new web3.Connection(rpc);
  }

  const walletKeypair = web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8"))),
    { skipValidation: true }
  );
  payerKp = walletKeypair;
  const wallet = new NodeWallet(walletKeypair);

  // Configure the client to use the local cluster.
  anchor.setProvider(
    new AnchorProvider(connection, wallet, {
      skipPreflight: true,
      commitment: "confirmed",
    })
  );
  payer = wallet;

  provider = anchor.getProvider();
  console.log("Wallet Address: ", wallet.publicKey.toBase58());

  // Generate the program client from IDL.
  program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;

  console.log("ProgramId: ", program.programId.toBase58());
};

export const initializeUmi = () => {
  umi = initUmi(connection, payer);
};

/**
 * Create Bid Token Mint
 */
export const initBidTokenMint = async () => {
  bidTokenMint = toWeb3JsPublicKey((await createBidToken(umi)).publicKey);

  console.log("Bid Token Mint: ", bidTokenMint.toBase58());
};

/**
 * Create Test NFT
 */
export const initTestNftCollection = async () => {
  collection = await createCollectionNft(umi);

  console.log("Collection: ", collection.toBase58());
};

/**
 * Create Test NFT
 */
export const mintTestNft = async (
  toAccount: PublicKey,
  collection: PublicKey,
  pNft: boolean
) => {
  console.log(
    `Minting ${
      pNft ? "pNFT" : "NFT"
    } into Collection ${collection.toBase58()} to ${toAccount.toBase58()}...`
  );

  const rand = Math.floor(Math.random() * 100);
  const { mint, ata } = await mintNftAndVerify({
    umi,
    randomNumber: rand,
    account: toAccount,
    collection,
    pNft,
  });

  console.log("Mint: ", mint.toBase58());
  console.log("Ata: ", ata.toBase58());
};

/**
 * Initialize program
 * Called by admin right after the program deployment
 * to initialize marketplace, vault, rewardsMint and treasury accounts
 */
export const initProject = async () => {
  const account = await connection.getAccountInfo(marketplace);

  if (!account) {
    const name = "Penny NFT Marketplace";
    console.log(`Initializing ${name}...`);

    const result = await createInitializeMarketplaceTx(
      name,
      0,
      payer.publicKey,
      program,
      bidTokenMint
    );

    result.tx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    await execTx(result.tx, connection, payer);

    marketplace = result.marketplace;
    console.log("🟢 Done!");
  }

  console.log("Marketplace: ", marketplace.toBase58());
};

/**
 * Create Auction
 */
export const createAuctionListing = async (
  buyoutPrice: number,
  initialDurationInSlots: number,
  seller: anchor.web3.Keypair,
  mint: PublicKey,
  collection: PublicKey
) => {
  const timerExtensionInSlots = 12;

  const currentSlot = await provider.connection.getSlot();

  let config = {
    bidIncrement: new BN(buyoutPrice / 1000),
    timerExtensionInSlots: new BN(timerExtensionInSlots), // 12 slots ~ 5 seconds
    startTimeInSlots: new BN(currentSlot),
    initialDurationInSlots: new BN(initialDurationInSlots),
    buyoutPrice: new BN(buyoutPrice),
    amount: new BN(1),
  };

  console.log("Creating auction with config: ", {
    bidIncrement: config.bidIncrement.toNumber(),
    timerExtensionInSlots: config.timerExtensionInSlots.toNumber(),
    startTimestamp: config.startTimeInSlots.toNumber(),
    initialDurationInSlots: config.initialDurationInSlots.toNumber(),
    buyoutPrice: config.buyoutPrice.toNumber(),
  });

  const sellerWallet = new NodeWallet(seller);
  const sellerAta = getAssociatedTokenAddressSync(mint, seller.publicKey);

  const tx = await createListTx(
    seller.publicKey,
    sellerAta,
    marketplace,
    mint,
    collection,
    program,
    config
  );

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  await execTx(tx, connection, sellerWallet);
};

/**
 * Place a bid
 */
export const placeBid = async (
  bidder: anchor.web3.Keypair,
  mint: PublicKey,
  bidTokenMint: PublicKey
) => {
  const bidderWallet = new NodeWallet(bidder);

  console.log("[place_bid] mint", mint.toBase58());
  console.log("[place_bid] bidTokenMint", bidTokenMint.toBase58());

  const tx = await createPlaceBidTx(
    bidder.publicKey,
    marketplace,
    mint,
    bidTokenMint,
    program
  );

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  await execTx(tx, connection, bidderWallet);
};

/**
 * End an auction
 */
export const endAuction = async (
  winner: anchor.web3.Keypair,
  mint: PublicKey
) => {
  const winnerWallet = new NodeWallet(winner);

  // TODO: We currently need `seller` to end the auction such that we know where to transfer rent to
  // after we're closing the auction. This is not ideal and should be fixed in the future.
  const [listing, _listingBump] = PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode(LISTING_SEED),
      marketplace.toBuffer(),
      mint.toBuffer(),
    ],
    program.programId
  );

  const listingAccount = await program.account.listing.fetch(listing);

  const tx = await createEndAuctionTx(
    winner.publicKey,
    listingAccount.seller,
    listing,
    marketplace,
    mint,
    program,
    bidTokenMint
  );

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  await execTx(tx, connection, winnerWallet);
};

/**
 * -----------------
 * Utility functions
 * -----------------
 */

/**
 * Find auction program addres
 */
export const findAuctionProgramAddress = (mint: PublicKey) => {
  const [listing] = PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode(LISTING_SEED),
      marketplace.toBuffer(),
      mint.toBuffer(),
    ],
    program.programId
  );

  return listing;
};

/**
 * Get auction
 */
export const getAuctionInfo = async (auction: PublicKey) => {
  const auctionInfo = await program.account.listing.fetch(auction);
  const escrow = getAssociatedTokenAddressSync(auctionInfo.mint, auction, true);

  console.log("Auction Address:", auction.toBase58());
  return {
    state: {
      mint: auctionInfo.mint.toBase58(),
      seller: auctionInfo.seller.toBase58(),
      bidCost: auctionInfo.bidCost.toNumber(),
      bidIncrement: auctionInfo.bidIncrement.toNumber(),
      currentBid: auctionInfo.currentBid.toNumber(),
      highestBidder: auctionInfo.highestBidder.toBase58(),
      timerExtensionInSlots: auctionInfo.timerExtensionInSlots.toNumber(),
      startTimeInSlots: auctionInfo.startTimeInSlots.toNumber(),
      endTimeInSlots: auctionInfo.endTimeInSlots.toNumber(),
      isActive: auctionInfo.isActive,
      buyoutPrice: auctionInfo.buyoutPrice.toNumber(),
    },
    relatedAccounts: {
      escrow: escrow.toBase58(),
    },
  };
};

export const getAllAuctions = async () => {
  const auctions = await program.account.listing.all();

  auctions.forEach(async (auction) => {
    console.log("Auction: ", await getAuctionInfo(auction.publicKey));
  });
};

export const getMarketplace = async (marketplace: PublicKey) => {
  const marketplaceInfo = await program.account.marketplace.fetch(marketplace);

  if (!marketplaceInfo) {
    throw new Error("Marketplace not found");
  }

  const marketplaceAccount = {
    admin: marketplaceInfo.admin.toBase58(),
    bidsMint: marketplaceInfo.bidsMint.toBase58(),
    bidsVault: marketplaceInfo.bidsVault.toBase58(),
    fee: marketplaceInfo.fee,
    name: marketplaceInfo.name,
    bump: marketplaceInfo.bump,
    rewardsBump: marketplaceInfo.rewardsBump,
    treasuryBump: marketplaceInfo.treasuryBump,
  };

  console.log("Marketplace: ", marketplace.toBase58());
  console.log("--------------------------");
  console.log(marketplaceAccount);
  console.log("--------------------------");
  const [rewardsMint, _rewardsBump] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(REWARDS_SEED), marketplace.toBuffer()],
    program.programId
  );
  console.log("Rewards Mint: ", rewardsMint.toBase58());

  const [treasury, _treasuryBump] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(TREASURY_SEED), marketplace.toBuffer()],
    program.programId
  );
  console.log("Treasury: ", treasury.toBase58());

  console.log("BidsVault: ", marketplaceInfo.bidsVault.toBase58());
  console.log("--------------------------");
};

export const getAllMarketplaces = async () => {
  const marketplaces = await program.account.marketplace.all();
  marketplaces.forEach(async (marketplace) => {
    console.log("Marketplace: ", await getMarketplace(marketplace.publicKey));
  });
};

export const mintBidTokens = async (
  amount: number,
  to: PublicKey,
  mint: PublicKey
) => {
  console.log(`Minting ${amount} bid tokens to ${to.toBase58()}...`);

  await mintBidToken(umi, mint, amount * 10 ** 6, to);

  console.log("✅ Done!");
};

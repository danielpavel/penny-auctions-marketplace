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

import { Cluster, PublicKey, clusterApiUrl } from "@solana/web3.js";

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
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import dotenv from "dotenv";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { LISTING_SEED } from "../lib/constants";
import { Umi } from "@metaplex-foundation/umi";

dotenv.config();

let connection: web3.Connection = null;
let program: Program<NftMarketplace> = null;
let provider: Provider = null;
let payer: NodeWallet = null;
let payerKp: web3.Keypair = null;

let umi: Umi = null;
let marketplace: PublicKey = null;
let bidTokenMint = new PublicKey(process.env.BIDS_MINT || PublicKey.default);
let collection = new PublicKey(process.env.COLLECTION || PublicKey.default);

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
    connection = new web3.Connection(clusterApiUrl(cluster));
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
  if (bidTokenMint == PublicKey.default) {
    console.warn("Bids mint not set. Creating a new one...");
    bidTokenMint = toWeb3JsPublicKey((await createBidToken(umi)).publicKey);
  }

  console.log("Bid Token Mint: ", bidTokenMint.toBase58());
};

/**
 * Create Test NFT
 */
export const initTestNftCollection = async () => {
  const collection = await createCollectionNft(umi);

  console.log("Collection: ", collection.toBase58());
};

/**
 * Create Test NFT
 */
export const mintTestNft = async (toAccount: PublicKey) => {
  console.log(`Minting NFT to ${toAccount.toBase58()}...`);

  const rand = Math.floor(Math.random() * 100);
  //const anchorTypedCollection = new web3.PublicKey(collection);
  const { mint, ata } = await mintNftAndVerify({
    umi,
    randomNumber: rand,
    account: toAccount,
    collection,
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
  const name = "Penny NFT Marketplace";
  const result = await createInitializeMarketplaceTx(
    name,
    0,
    payer.publicKey,
    program,
    bidTokenMint
  );

  result.tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  await execTx(result.tx, connection, payer);

  marketplace = result.marketplace;
};

/**
 * Create Auction
 */
export const createAuctionListing = async (
  buyoutPrice: number,
  initialDuration: number,
  seller: anchor.web3.Keypair,
  mint: PublicKey,
  collection: PublicKey
) => {
  let config = {
    bidIncrement: new BN(buyoutPrice / 1000),
    timerExtension: new BN(20 * 1000), // 20 seconds
    startTimestamp: new BN(Date.now()),
    initialDuration: new BN(initialDuration), // 30 minutes
    buyoutPrice: new BN(buyoutPrice),
  };

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
  mint: PublicKey
) => {
  const bidderWallet = new NodeWallet(bidder);

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

  return {
    mint: auctionInfo.mint.toBase58(),
    seller: auctionInfo.seller.toBase58(),
    bidCost: auctionInfo.bidCost.toNumber(),
    currentBid: auctionInfo.currentBid.toNumber(),
    highestBidder: auctionInfo.highestBidder.toBase58(),
    timerExtension: auctionInfo.timerExtension.toNumber(),
    startTime: new Date(auctionInfo.startTime.toNumber() * 1000),
    endTime: new Date(auctionInfo.endTime.toNumber() * 1000),
    isActive: auctionInfo.isActive,
    buyoutPrice: auctionInfo.buyoutPrice.toNumber(),
  };
};

import { program as commander } from "commander";
import { PublicKey } from "@solana/web3.js";
import { web3 } from "@coral-xyz/anchor";
import fs from "fs";

import {
  createAuctionListing,
  endAuction,
  findAuctionProgramAddress,
  getAuctionInfo,
  initBidTokenMint,
  initProject,
  initTestNftCollection,
  mintTestNft,
  placeBid,
  setClusterConfig,
} from "./scripts";

commander.version("0.1.0").description("CLI for testing Penny Auction program");

commander
  .command("init")
  .description("Initialize Marketplace")
  .option("-c, --cluster localhost | devnet | mainnet-beta", "Solana Cluster")
  .option("-k, --keypair <path>", "Path to keypair file")
  .option("-r, --rpc <url>", "RPC URL")
  .action(async (options) => {
    const { cluster, keypair, rpc } = options;

    try {
      await initBidTokenMint();
      await initTestNftCollection();

      console.log("Solana Cluster:", cluster);
      console.log("Keypair Path:", keypair);
      console.log("RPC URL:", rpc);

      await setClusterConfig(cluster, keypair, rpc);

      console.log("Initializing project...");
      await initProject();
      console.log("🟢 Done!");
    } catch (err) {
      console.error("Error initializing project:", err);
    }
  });

commander
  .command("mint-nft")
  .description("Mint a new test NFT")
  .option("-a, --account <address>", "Account address")
  .action(async (options) => {
    const address = new PublicKey(options.account);

    try {
      await mintTestNft(address);
    } catch (err) {
      console.error("Error minting NFT:", err);
    }
  });

commander
  .command("create-auction")
  .description("Create a new auction")
  .option("-k, --keypair `user1` | `user2`", "Seller address")
  .option("-n, --nft <address>", "NFT mint address")
  .option("-c, --collection <address>", "Collection NFT mint address")
  .option("-d, --duration <number>", "Auction duration in seconds")
  .option("-p, --price <number>", "Auction buyout price (in LAMPORTS)")
  .action(async (options) => {
    try {
      const { keypair, nft, duration, price, collection } = options;

      if (!keypair || keypair != "user1" || keypair != "user2") {
        throw new Error("Invalid keypair. Use `user1` or `user2`");
      }

      const walletKeypair = web3.Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8"))),
        { skipValidation: true }
      );

      try {
        await createAuctionListing(
          Number(price),
          Number(duration),
          walletKeypair, // Seller
          new PublicKey(nft),
          new PublicKey(collection)
        );

        console.log("Auction created");
      } catch (error) {
        throw new Error(error);
      }
    } catch (err) {
      console.error("Error creating auction:", err);
    }
  });

commander
  .command("place-bid")
  .description("Place a bid on an auction")
  //.option("-a, --auction <address>", "Auction PDA address")
  .option("-n, --nft <address>", "NFT mint address")
  .option("-k, --keypair `user1` | `user2`", "User address")
  .action(async (options) => {
    try {
      const { nft, keypair } = options;

      if (!keypair || keypair != "user1" || keypair != "user2") {
        throw new Error("Invalid keypair. Use `user1` or `user2`");
      }

      const walletKeypair = web3.Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8"))),
        { skipValidation: true }
      );

      try {
        const mint = new PublicKey(nft);

        await placeBid(walletKeypair, mint);

        console.log(
          `Bid placed on auction: ${findAuctionProgramAddress(mint)}`
        );
      } catch (err) {
        throw new Error(err);
      }
    } catch (error) {
      console.error("Error placing bid:", error);
    }
  });

commander
  .command("end-auction")
  .description("End an auction")
  //.option("-a, --auction <address>", "Auction PDA address")
  .option("-n, --nft <address>", "NFT mint address")
  .option("-k, --keypair `user1` | `user2`", "Winner address")
  .action(async (options) => {
    try {
      const { nft, keypair } = options;

      if (!keypair || keypair != "user1" || keypair != "user2") {
        throw new Error("Invalid keypair. Use `user1` or `user2`");
      }

      const walletKeypair = web3.Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8"))),
        { skipValidation: true }
      );

      try {
        const mint = new PublicKey(nft);

        await endAuction(walletKeypair, mint);

        console.log(`Auction ended: ${findAuctionProgramAddress(mint)}`);
      } catch (err) {
        throw new Error(err);
      }
    } catch (error) {
      console.error("Error ending auction:", error);
    }
  });

commander
  .command("get-auction-info")
  .description("Get information about an auction")
  .option("-a, --auction <address>", "Auction PDA address")
  .action(async (options) => {
    try {
      const auctionPda = new PublicKey(options.auction);

      const auctionData = await getAuctionInfo(auctionPda);

      console.log("Auction Info:", auctionData);
    } catch (error) {
      console.error("Error fetching auction info:", error);
    }
  });

commander.parse(process.argv);

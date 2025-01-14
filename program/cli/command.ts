import { program as commander } from "commander";
import { PublicKey } from "@solana/web3.js";

import { initializeUmi, mintBidTokens, setClusterConfig } from "./scripts";

commander.version("0.1.0").description("CLI for testing Penny Auction program");

// commander
//   .command("init")
//   .description("Initialize Marketplace")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-k, --keypair <path>", "Path to keypair file")
//   .option("-r, --rpc <url>", "RPC URL")
//   .action(async (options) => {
//     const { cluster, keypair, rpc } = options;
//     console.log("Solana Cluster:", typeof cluster);
//     console.log("Keypair Path:", keypair);
//     console.log("RPC URL:", rpc);
//
//     try {
//       if (
//         !cluster ||
//         !["localhost", "devnet", "mainnet-beta"].includes(cluster)
//       ) {
//         throw new Error(
//           "Invalid cluster. Use `localhost`, `devnet` or `mainnet-beta`"
//         );
//       }
//
//       await setClusterConfig(cluster, keypair, rpc);
//
//       initializeUmi();
//
//       await initBidTokenMint();
//       await initTestNftCollection();
//
//       await initProject();
//     } catch (err) {
//       console.error("Error initializing project:", err);
//     }
//   });
//
// commander
//   .command("mint-nft")
//   .description("Mint a new test NFT")
//   .option("-a, --account <address>", "Account address")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("--collection <value>", "NFT Collection address")
//   .option("-k, --keypair <path>", "Seller address")
//   .option(
//     "-p, --programmable",
//     "Have this flag if you want to mint a programmable NFT"
//   )
//   .action(async (options) => {
//     const { account, cluster, keypair, programmable, collection } = options;
//
//     const address = new PublicKey(account);
//     const collectionAddress = new PublicKey(collection);
//
//     await setClusterConfig(cluster, keypair);
//     initializeUmi();
//
//     try {
//       await mintTestNft(address, collectionAddress, programmable);
//     } catch (err) {
//       console.error("Error minting NFT:", err);
//     }
//   });
//
// commander
//   .command("create-auction")
//   .description("Create a new auction")
//   .option("-k, --keypair <path>", "Seller address")
//   .option("-n, --nft <address>", "NFT mint address")
//   .option("--collection <address>", "Collection NFT mint address")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-d, --duration <number>", "Auction duration in seconds")
//   .option("-p, --price <number>", "Auction buyout price (in LAMPORTS)")
//   .action(async (options) => {
//     try {
//       const { keypair, cluster, nft, duration, price, collection } = options;
//
//       console.log("Creating auction...");
//       console.log("NFT:", nft);
//       console.log("Collection:", collection);
//       console.log("Duration:", duration);
//       console.log("Price:", price);
//       console.log("-------------------");
//
//       await setClusterConfig(cluster, keypair);
//       await initProject();
//
//       console.log("-------------------");
//
//       const walletKeypair = web3.Keypair.fromSecretKey(
//         Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8"))),
//         { skipValidation: true }
//       );
//
//       const durationInSlots = Math.floor(Number(duration) * 0.4); // 400ms per slot
//
//       try {
//         await createAuctionListing(
//           Number(price),
//           Number(durationInSlots),
//           walletKeypair, // Seller
//           new PublicKey(nft),
//           new PublicKey(collection)
//         );
//
//         console.log("Auction created");
//       } catch (error) {
//         throw new Error(error);
//       }
//     } catch (err) {
//       console.error("Error creating auction:", err);
//     }
//   });
//
// commander
//   .command("place-bid")
//   .description("Place a bid on an auction")
//   .option("-a, --auction <address>", "Auction PDA address")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-b, --bids <value>", "Mint of the bid token")
//   .option("-k, --keypair <path>", "User address")
//   .action(async (options) => {
//     try {
//       const { nft, cluster, keypair, bids } = options;
//
//       try {
//         const mint = new PublicKey(nft);
//         const bidsMint = new PublicKey(bids);
//
//         await setClusterConfig(cluster, keypair);
//
//         const walletKeypair = web3.Keypair.fromSecretKey(
//           Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8"))),
//           { skipValidation: true }
//         );
//
//         // TODO: Fetch auction first and fix placeBid!
//
//         await placeBid(walletKeypair, mint, bidsMint);
//
//         console.log(
//           `Bid placed on auction: ${findAuctionProgramAddress(mint)}`
//         );
//       } catch (err) {
//         throw new Error(err);
//       }
//     } catch (error) {
//       console.error("Error placing bid:", error);
//     }
//   });
//
// commander
//   .command("end-auction")
//   .description("End an auction")
//   //.option("-a, --auction <address>", "Auction PDA address")
//   .option("-n, --nft <address>", "NFT mint address")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-w, --winner <path>", "Winner address")
//   .action(async (options) => {
//     try {
//       const { nft, cluster, winner } = options;
//
//       await setClusterConfig(cluster, winner);
//
//       const winnerWalletKeypair = web3.Keypair.fromSecretKey(
//         Uint8Array.from(JSON.parse(fs.readFileSync(winner, "utf-8"))),
//         { skipValidation: true }
//       );
//
//       try {
//         const mint = new PublicKey(nft);
//
//         await endAuction(winnerWalletKeypair, mint);
//
//         console.log(`Auction ended: ${findAuctionProgramAddress(mint)}`);
//       } catch (err) {
//         throw new Error(err);
//       }
//     } catch (error) {
//       console.error("Error ending auction:", error);
//     }
//   });
//
// commander
//   .command("get-auction-info")
//   .description("Get information about an auction")
//   .option("-a, --auction <address>", "Auction PDA address")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-k, --keypair <path>", "Path to keypair file")
//   .action(async (options) => {
//     try {
//       const { cluster, keypair, auction } = options;
//
//       await setClusterConfig(cluster, keypair);
//       const auctionData = await getAuctionInfo(new PublicKey(auction));
//       console.log("Auction:", auctionData);
//     } catch (error) {
//       console.error("Error fetching auction info:", error);
//     }
//   });
//
// commander
//   .command("get-all-auctions")
//   .description("Get information about all auction within marketplace")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-k, --keypair <path>", "Path to keypair file")
//   .action(async (options) => {
//     try {
//       const { cluster, keypair } = options;
//
//       await setClusterConfig(cluster, keypair);
//       await getAllAuctions();
//     } catch (error) {
//       console.error("Error fetching auction info:", error);
//     }
//   });
//
// commander
//   .command("get-marketplace-info")
//   .description("Get information about a marketplace")
//   .option("-a, --marketplace <address>", "Marketplace PDA address")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-k, --keypair <path>", "Path to keypair file")
//   .action(async (options) => {
//     try {
//       const { cluster, keypair, marketplace } = options;
//
//       const address = new PublicKey(marketplace);
//
//       await setClusterConfig(cluster, keypair);
//
//       await getMarketplace(address);
//     } catch (error) {
//       console.error("Error fetching marketplace info:", error);
//     }
//   });
//
// commander
//   .command("get-all-marketplaces")
//   .description("Get information on all marketplaces owned by this program")
//   .option("-c, --cluster <value>", "Solana Cluster")
//   .option("-k, --keypair <path>", "Path to keypair file")
//   .action(async (options) => {
//     try {
//       const { cluster, keypair } = options;
//
//       await setClusterConfig(cluster, keypair);
//
//       await getAllMarketplaces();
//     } catch (error) {
//       console.error("Error fetching marketplace info:", error);
//     }
//   });

commander
  .command("mint-bid-token")
  .description("Mine bid tokens")
  .option("-a --amount <number>", "Address of the receiver wallet")
  .option("-r --receiver <address>", "Address of the receiver wallet")
  .option("-c, --cluster <value>", "Solana Cluster")
  .option("-k, --keypair <path>", "Path to keypair file")
  .option("-m, --mint <value>", "Mint of the bid token")
  .action(async (options) => {
    try {
      const { cluster, keypair, receiver, amount, mint } = options;

      console.log("Amount:", amount);
      console.log("To:", receiver);
      console.log("Cluster:", cluster);
      console.log("Keypair:", keypair);

      const to = new PublicKey(receiver);

      await setClusterConfig(cluster, keypair);
      initializeUmi();

      await mintBidTokens(amount, to, new PublicKey(mint));
    } catch (error) {
      console.error("Error fetching marketplace info:", error);
    }
  });

commander.parse(process.argv);

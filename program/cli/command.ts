import { program as commander } from "commander";

import {
  bid,
  createAuctionListing,
  getSignerFromSecretKeyFile,
  initializePrereqs,
  intializeMarketplace,
  mintBidTokens,
} from "./scripts";
import {
  fetchListingV2,
  InitializeInstructionArgs,
  safeFetchMarketplace,
} from "../clients/generated/umi/src";

import fs from "fs";
import {
  TransactionBuilderSendAndConfirmOptions,
  publicKey,
} from "@metaplex-foundation/umi";
import { createAndMintNftForCollection } from "./utils";

const opts: TransactionBuilderSendAndConfirmOptions = {
  send: { skipPreflight: false },
  confirm: { commitment: "confirmed" },
};

const CLUSTER = "devnet";
const ADMIN = "./wallets/admin.json";

commander.version("0.1.0").description("CLI for testing Sandcastle program");

commander
  .command("initialize")
  .description("Initialize Markeplace")
  .requiredOption("-a, --admin <pubkey>", "Admin wallet")
  .requiredOption("-c, --config <json>", "Initialize Configuration JSON")
  .action(async (options) => {
    try {
      const { umi, program, admin } = await initializePrereqs(
        CLUSTER,
        options.admin
      );

      const configFile = fs.readFileSync(options.config, "utf-8");
      const args: InitializeInstructionArgs = JSON.parse(configFile);

      await intializeMarketplace(umi, program, admin, args, opts);
    } catch (error) {
      console.error("Error:", error);
    }
  });

commander
  .command("mint-nft")
  .description("Mint a new test NFT")
  .requiredOption("-a, --admin <pubkey>", "Admin wallet")
  .option("-k, --keypair <path>", "Seller address")
  .option(
    "-c, --collection <address>",
    "PublicKey of collection, if absent a new collection will be created"
  )
  .option(
    "-p, --programmable",
    "Have this flag if you want to mint a programmable NFT"
  )
  .action(async (options) => {
    try {
      const { umi } = await initializePrereqs(CLUSTER, options.admin);

      const { collection, programmable, keypair } = options;

      const user = await getSignerFromSecretKeyFile(umi, keypair);

      console.log("Creating mint...");

      const {
        mint,
        ata,
        collection: outCollection,
      } = await createAndMintNftForCollection(
        umi,
        user,
        opts,
        !!(programmable != undefined),
        collection
      );

      console.log("✅ Done.");
      console.log("mint:", mint);
      console.log("ata:", ata);
      console.log("collection:", outCollection);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

commander
  .command("create-auction")
  .description("Create a new auction")
  .option("-k, --keypair <path>", "Seller address")
  .option("-t, --token <address>", "NFT mint address")
  .requiredOption("-m, --marketplace <address>", "Marketplace PDA address")
  .option("-c, --collection <address>", "Collection NFT mint address")
  .action(async (options) => {
    try {
      const { keypair, token, collection, marketplace } = options;
      const { umi } = await initializePrereqs(CLUSTER, ADMIN);

      const seller = await getSignerFromSecretKeyFile(umi, keypair);

      await createAuctionListing(
        umi,
        seller,
        token,
        collection,
        marketplace,
        opts
      );
    } catch (err) {
      console.error("Error creating auction:", err);
    }
  });

commander
  .command("place-bid")
  .description("Place a bid on an auction")
  .requiredOption("-k, --keypair <path>", "User address")
  .requiredOption("-a, --auction <address>", "Auction Listing PDA address")
  .requiredOption("-m, --marketplace <address>", "Marketplace PDA address")
  .action(async (options) => {
    try {
      const { auction, keypair, marketplace } = options;
      const { umi } = await initializePrereqs(CLUSTER, ADMIN);
      const marketplacePubkey = publicKey(marketplace);

      const marketplaceAccount = await safeFetchMarketplace(
        umi,
        marketplacePubkey
      );
      if (!marketplaceAccount) {
        throw new Error(`Markeplace ${marketplacePubkey.toString()} not found`);
      }

      const bidder = await getSignerFromSecretKeyFile(umi, keypair);

      await bid(
        umi,
        bidder,
        marketplaceAccount.sbidMint,
        publicKey(auction),
        marketplacePubkey,
        opts
      );
    } catch (error) {
      console.log("❌ Place Bid failed with error", error);
    }
  });
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
commander
  .command("get-auction-info")
  .description("Get information about an auction")
  .option("-a, --auction <address>", "Auction Listing Account address")
  .action(async (options) => {
    try {
      const { auction } = options;
      const { umi } = await initializePrereqs(CLUSTER, ADMIN);

      console.log(await fetchListingV2(umi, publicKey(auction)));
    } catch (error) {
      console.error("Error fetching auction info:", error);
    }
  });

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

commander
  .command("get-marketplace")
  .description("Fetch information about a marketplace")
  .requiredOption("-m, --marketplace <address>", "Marketplace PDA address")
  .action(async (options) => {
    try {
      const { umi } = await initializePrereqs(CLUSTER, "wallets/admin.json");
      const marketplacePubkey = publicKey(options.marketplace);

      console.log("marketplace key", marketplacePubkey);

      const account = await safeFetchMarketplace(umi, marketplacePubkey);
      if (!account) {
        throw new Error(`Markeplace ${marketplacePubkey.toString()} not found`);
      }

      console.log("Marketplace:", account);
    } catch (error) {
      console.error("Error fetching marketplace info:", error);
    }
  });
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
  .requiredOption("-k, --keypair <path>", "Path to keypair file")
  .requiredOption("-m, --marketplace <address>", "Marketplace publicKey")
  .requiredOption("-t, --tier <number>", "Mint Tier (0 | 1 | 2)")
  .action(async (options) => {
    try {
      const { umi, admin } = await initializePrereqs(
        CLUSTER,
        "wallets/admin.json"
      );

      const tier = Number(options.tier);
      if (tier < 0 || tier > 2) {
        throw new Error("Tier must be 0, 1, or 2");
      }

      await mintBidTokens(
        umi,
        admin,
        options.marketplace,
        options.keypair,
        opts,
        tier
      );
    } catch (error) {
      console.log("❌ Mint Bid Tokens Failed with error", error);
    }
  });

commander.parse(process.argv);

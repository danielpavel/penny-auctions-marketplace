import { Program, utils, web3, BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

import { NftMarketplace } from "../target/types/nft_marketplace";

import {
  LISTING_SEED,
  MARKETPLACE_SEED,
  REWARDS_SEED,
  TREASURY_SEED,
} from "./constants";

export const createInitializeMarketplaceTx = async (
  name: string,
  fee: number = 0,
  admin: PublicKey,
  program: Program<NftMarketplace>,
  bidTokenMint: PublicKey
) => {
  const [marketplace] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(MARKETPLACE_SEED), utils.bytes.utf8.encode(name)],
    program.programId
  );
  console.log("Marketplace: ", marketplace.toBase58());

  const [rewardsMint] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(REWARDS_SEED), marketplace.toBuffer()],
    program.programId
  );
  console.log("Rewards Mint: ", rewardsMint.toBase58());

  const [treasury] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(TREASURY_SEED), marketplace.toBuffer()],
    program.programId
  );
  console.log("Treasury: ", treasury.toBase58());

  const bidsVault = getAssociatedTokenAddressSync(
    bidTokenMint,
    marketplace,
    true
  );
  console.log("BidsVault: ", bidsVault.toBase58());

  const tx = new web3.Transaction();

  let accounts = {
    admin,
    marketplace,
    rewardsMint,
    bidsMint: bidTokenMint,
    bidsVault,
    treasury,
    tokenProgram: TOKEN_PROGRAM_ID,
  };

  tx.add(
    await program.methods.initialize(name, fee).accounts(accounts).instruction()
  );

  tx.feePayer = admin;

  return { tx, marketplace };
};

// export const createListTx = async (
//   seller: PublicKey,
//   sellerAta: PublicKey,
//   marketplace: PublicKey,
//   nftMint: PublicKey,
//   nftCollection: PublicKey,
//   program: Program<NftMarketplace>,
//   listingConfig: any
// ) => {
//   const [listing, _listingBump] = PublicKey.findProgramAddressSync(
//     [
//       utils.bytes.utf8.encode(LISTING_SEED),
//       marketplace.toBuffer(),
//       nftMint.toBuffer(),
//     ],
//     program.programId
//   );
//
//   console.log("Listing: ", listing.toBase58());
//
//   const escrow = getAssociatedTokenAddressSync(nftMint, listing, true);
//
//   let accounts = {
//     seller,
//     listing,
//     marketplace,
//     mint: nftMint,
//     collection: nftCollection,
//     sellerAta,
//     escrow,
//     tokenProgram: TOKEN_PROGRAM_ID,
//     sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
//   };
//
//   const tx = new web3.Transaction();
//
//   tx.add(
//     await program.methods
//       .list(
//         listingConfig.bidIncrement,
//         listingConfig.timerExtensionInSlots,
//         listingConfig.startTimeInSlots,
//         listingConfig.initialDurationInSlots,
//         listingConfig.buyoutPrice,
//         listingConfig.amount
//       )
//       .accounts(accounts)
//       .instruction()
//   );
//
//   tx.feePayer = seller;
//
//   return tx;
// };
//
// export const createPlaceBidTx = async (
//   listing: PublicKey,
//   bidder: PublicKey,
//   highestBidder: PublicKey,
//   currentBid: BN,
//   marketplace: PublicKey,
//   mint: PublicKey,
//   bidTokenMint: PublicKey,
//   program: Program<NftMarketplace>
// ) => {
//   const bidderBidTokenATA = getAssociatedTokenAddressSync(bidTokenMint, bidder);
//   const bidsVault = getAssociatedTokenAddressSync(
//     bidTokenMint,
//     marketplace,
//     true
//   );
//
//   let accounts = {
//     bidder,
//     bidderAta: bidderBidTokenATA,
//     mint,
//     listing,
//     marketplace,
//     bidsMint: bidTokenMint,
//     bidsVault,
//     tokenProgram: TOKEN_PROGRAM_ID,
//   };
//
//   const tx = new web3.Transaction();
//
//   tx.add(
//     await program.methods
//       .placeBid(highestBidder, currentBid)
//       .accounts(accounts)
//       .instruction()
//   );
//
//   tx.feePayer = bidder;
//
//   return tx;
// };
//
// export const createEndAuctionTx = async (
//   user: PublicKey,
//   seller: PublicKey,
//   listing: PublicKey,
//   marketplace: PublicKey,
//   nftMint: PublicKey,
//   program: Program<NftMarketplace>,
//   bidTokenMint: PublicKey
// ) => {
//   const userAta = getAssociatedTokenAddressSync(nftMint, user);
//   const escrow = getAssociatedTokenAddressSync(nftMint, listing, true);
//
//   let accounts = {
//     user,
//     seller,
//     userAta,
//     mint: nftMint,
//     listing,
//     marketplace,
//     bidsMint: bidTokenMint,
//     escrow,
//     tokenProgram: TOKEN_PROGRAM_ID,
//   };
//
//   const tx = new web3.Transaction().add(
//     await program.methods.endListing(new BN(1)).accounts(accounts).instruction()
//   );
//
//   tx.feePayer = user;
//
//   return tx;
// };

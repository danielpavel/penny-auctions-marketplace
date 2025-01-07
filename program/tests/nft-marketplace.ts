import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey as UmiPublicKey,
  assertAccountExists,
  createSignerFromKeypair,
  Signer,
  TransactionBuilder,
  TransactionBuilderSendAndConfirmOptions,
  Umi,
  Pda,
} from "@metaplex-foundation/umi";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { createAndMintNftForCollection } from "./utils/nft";
import { initUmi } from "./utils/umi";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import {
  fetchListingV2,
  fetchMarketplace,
  getNftMarketplaceProgramId,
  initialize,
  list,
  mintBidToken,
  placeBid,
} from "../clients/generated/umi/src/";
import { getAccount } from "@solana/spl-token";
import {
  fetchMint,
  fetchAllTokenByOwner,
} from "@metaplex-foundation/mpl-toolbox";

import {
  findMetadataPda,
  fetchMetadata,
  findTokenRecordPda,
  findMasterEditionPda,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

import {
  fromWeb3JsKeypair,
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import {
  generateRandomU64Seed,
  getTokenBalance,
  printObj,
} from "./utils/utils";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { fetchData } from "@coral-xyz/anchor/dist/cjs/utils/registry";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import {
  bytes,
  string,
  publicKey as publicKeySerializer,
} from "@metaplex-foundation/umi/serializers";

const options: TransactionBuilderSendAndConfirmOptions = {
  send: { skipPreflight: false },
  confirm: { commitment: "confirmed" },
};

const confirmOpts: anchor.web3.ConfirmOptions = {
  //preflightCommitment: "finalized",
  commitment: "confirmed",
}; // processed, confirmed, finalized

type Nft = {
  mint: anchor.web3.PublicKey;
  ata: anchor.web3.PublicKey;
  collection: anchor.web3.PublicKey;
};

describe("nft-marketplace", () => {
  // Configure the client manually to enable "commitment": confirmed
  // const connection = new anchor.web3.Connection(
  //   "http://127.0.0.1:8899",
  //   confirmOpts.preflightCommitment
  // );
  // const wallet = NodeWallet.local();
  // const provider = new anchor.AnchorProvider(connection, wallet, confirmOpts);
  //
  // anchor.setProvider(provider);

  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;

  let umi: Umi;

  let initializer = anchor.web3.Keypair.generate();
  let user1 = anchor.web3.Keypair.generate();
  let user2 = anchor.web3.Keypair.generate();
  let user3 = anchor.web3.Keypair.generate();

  const marketplaceName = "Penny Auctions Marketplace";
  let marketplacePDA: Pda;
  let marketplace: PublicKey;

  let treasury: anchor.web3.PublicKey;

  let sBidMint = anchor.web3.Keypair.generate();
  let sBidVault: anchor.web3.PublicKey;

  let seed = generateRandomU64Seed();
  let seedPnftListing = generateRandomU64Seed();

  let nft: Nft;
  let pNft: Nft;

  let programId: UmiPublicKey;

  let admin: Signer;

  before(async () => {
    await Promise.all(
      [initializer, user1, user2, user3].map(async (k) => {
        return await provider.connection.requestAirdrop(
          k.publicKey,
          10 * anchor.web3.LAMPORTS_PER_SOL
        );
      })
    ).then(confirmTxs);

    console.log("🟢 Airdrop Done!");

    umi = initUmi(provider);
    console.log("🟢 Umi initialized!");

    try {
      const { mint, ata, collection } = await createAndMintNftForCollection(
        umi,
        1,
        user1.publicKey
      );

      const {
        mint: pMint,
        ata: pAta,
        collection: pCollection,
      } = await createAndMintNftForCollection(
        umi,
        2,
        initializer.publicKey,
        true
      );

      nft = { mint, ata, collection };
      pNft = { mint: pMint, ata: pAta, collection: pCollection };

      admin = createSignerFromKeypair(
        umi,
        umi.eddsa.createKeypairFromSecretKey(initializer.secretKey)
      );

      programId = getNftMarketplaceProgramId(umi);
      marketplacePDA = umi.eddsa.findPda(programId, [
        bytes().serialize(
          new Uint8Array([109, 97, 114, 107, 101, 116, 112, 108, 97, 99, 101])
        ),
        publicKeySerializer().serialize(admin.publicKey),
        publicKeySerializer().serialize(
          fromWeb3JsPublicKey(sBidMint.publicKey)
        ),
        string().serialize(marketplaceName),
      ]);
    } catch (error) {
      console.error(`Oops.. Something went wrong: ${error}`);
    }
  });

  // it("Initialize Marketplace", async () => {
  //   const fee = 500; // 5% in basis points
  //   const tokenName = "Sandcastle Bid Token";
  //   const tokenSymbol = "sBid";
  //   const tokenUri = "";
  //
  //   const sBidMintPubkey = sBidMint.publicKey;
  //   const [_marketplace, _marketplaceBump] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         anchor.utils.bytes.utf8.encode("marketplace"),
  //         sBidMint.publicKey.toBuffer(),
  //         anchor.utils.bytes.utf8.encode(name),
  //       ],
  //       program.programId
  //     );
  //
  //   marketplace = _marketplace;
  //   marketplaceBump = _marketplaceBump;
  //
  //   const [_treasury, treasuryBump] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [anchor.utils.bytes.utf8.encode("treasury"), marketplace.toBuffer()],
  //       program.programId
  //     );
  //
  //   treasury = _treasury;
  //
  //   sBidVault = getAssociatedTokenAddressSync(
  //     sBidMintPubkey,
  //     marketplace,
  //     true
  //   );
  //
  //   let accounts = {
  //     admin: initializer.publicKey,
  //     marketplace,
  //     sbidMint: sBidMint.publicKey,
  //     treasury,
  //     // tokenProgram: TOKEN_PROGRAM_ID,
  //     // tokenProgram2022: TOKEN_2022_PROGRAM_ID,
  //   };
  //
  //   try {
  //     let tx = await program.methods
  //       .initialize(name, fee, tokenName, tokenSymbol, tokenUri)
  //       .accounts(accounts)
  //       .signers([initializer, sBidMint])
  //       .rpc();
  //
  //     const marketplaceAccount = await program.account.marketplace.fetch(
  //       marketplace
  //     );
  //
  //     expect(marketplaceAccount.name).to.be.equal(name);
  //     expect(marketplaceAccount.admin).deep.equal(initializer.publicKey);
  //     expect(marketplaceAccount.sbidMint.toBase58()).to.equal(
  //       sBidMint.publicKey.toBase58()
  //     );
  //     expect(marketplaceAccount.fee).to.be.equal(fee);
  //     expect(marketplaceAccount.bump).to.be.equal(marketplaceBump);
  //     expect(marketplaceAccount.treasuryBump).to.be.equal(treasuryBump);
  //
  //     console.log("Your transaction signature", tx);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // });

  it("Initialize Marketplace", async () => {
    try {
      const fee = 500; // 5% in basis points
      const tokenName = "Sandcastle Bid Token";
      const tokenSymbol = "sBid";
      const tokenUri = "";

      const sBidMintSigner = createSignerFromKeypair(
        umi,
        umi.eddsa.createKeypairFromSecretKey(sBidMint.secretKey)
      );

      // For reasons beyound my comprehension right now and at this hour
      // marketplacePDA is not the same as the PDA computed in the contract
      // and nor it's the one computed by the client :shrug:
      const [_marketplace] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("marketplace"),
          toWeb3JsPublicKey(admin.publicKey).toBuffer(),
          sBidMint.publicKey.toBuffer(),
          anchor.utils.bytes.utf8.encode(marketplaceName),
        ],
        toWeb3JsPublicKey(programId)
      );
      marketplace = _marketplace;

      await initialize(umi, {
        admin,
        sbidMint: sBidMintSigner,
        //marketplace: marketplacePDA,
        marketplace: fromWeb3JsPublicKey(marketplace),
        fee,
        name: marketplaceName,
        tokenName,
        tokenSymbol,
        uri: tokenUri,
      }).sendAndConfirm(umi, options);

      const marketplaceAccount = await fetchMarketplace(
        umi,
        fromWeb3JsPublicKey(marketplace)
      );

      expect(marketplaceAccount.name).to.be.equal(marketplaceName);
      expect(marketplaceAccount.admin).deep.equal(admin.publicKey);
      expect(marketplaceAccount.sbidMint.toString()).deep.equal(
        sBidMint.publicKey.toString()
      );
      expect(marketplaceAccount.fee).to.be.equal(fee);
    } catch (error) {
      console.error("Initialize Marketplace Error:", error);
      expect.fail("❌ Initialize Markeplace Tx Failed");
    }
  });

  it("Create Listing", async () => {
    const price = 3 * anchor.web3.LAMPORTS_PER_SOL;
    // TODO: I hate umi ...
    // const [listing] = umi.eddsa.findPda(programId, [
    //   string().serialize("listing"),
    //   publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
    //   publicKeySerializer().serialize(fromWeb3JsPublicKey(nft.mint)),
    //   bytes().serialize(seed.toArrayLike(Buffer, "le", 8)),
    // ]);

    const mint = nft.mint;
    const collection = nft.collection;
    const ata = nft.ata;

    const [listing] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("listing"),
        marketplace.toBuffer(),
        mint.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const escrow = getAssociatedTokenAddressSync(mint, listing, true);
    const currentSlot = await provider.connection.getSlot();

    let listingConfig = {
      bidIncrement: BigInt(price / 1000),
      timerExtension: BigInt(12), // 12 slots ~ 5 seconds
      startTimestamp: BigInt(currentSlot),
      initialDuration: BigInt(24), // 24 slots ~ 10 seconds
      buyoutPrice: BigInt(price),
      amount: BigInt(1),
      seed,
    };

    const sellerSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(user1.secretKey)
    );
    const adminSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(initializer.secretKey)
    );

    const [metadata] = findMetadataPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    });
    const editionAccount = findMasterEditionPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    })[0];

    // const ownerTr = findTokenRecordPda(umi, {
    //   mint: fromWeb3JsPublicKey(pNft.mint),
    //   token: fromWeb3JsPublicKey(pNft.ata),
    // })[0];
    // const destinationTr = findTokenRecordPda(umi, {
    //   mint: fromWeb3JsPublicKey(pNft.mint),
    //   token: fromWeb3JsPublicKey(escrow),
    // })[0];
    // const authRulesProgram = new anchor.web3.PublicKey(
    //   "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
    // );

    try {
      const tx = await list(umi, {
        seller: sellerSigner,
        admin: adminSigner,
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        mint: fromWeb3JsPublicKey(mint),
        collection: fromWeb3JsPublicKey(collection),
        sellerAta: fromWeb3JsPublicKey(ata),
        escrow: fromWeb3JsPublicKey(escrow),
        metadata,
        masterEdition: editionAccount,
        tokenProgram: fromWeb3JsPublicKey(TOKEN_PROGRAM_ID),
        sysvarInstructions: fromWeb3JsPublicKey(
          anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY
        ),
        seed: BigInt(listingConfig.seed.toString()),
        bidIncrement: listingConfig.bidIncrement,
        timerExtensionInSlots: listingConfig.timerExtension,
        startTimeInSlots: listingConfig.startTimestamp,
        initialDurationInSlots: listingConfig.initialDuration,
        buyoutPrice: listingConfig.buyoutPrice,
        amount: listingConfig.amount,
      }).sendAndConfirm(umi, options);

      const listingAccount = await fetchListingV2(
        umi,
        fromWeb3JsPublicKey(listing)
      );

      expect(listingAccount.mint.toString()).to.equal(mint.toString());
      expect(listingAccount.seller.toString()).to.equal(
        user1.publicKey.toString()
      );
      expect(listingAccount.bidCost).to.eq(BigInt(1));
      expect(listingAccount.bidIncrement).deep.eq(listingConfig.bidIncrement);
      expect(listingAccount.currentBid).eq(BigInt(0));
      expect(listingAccount.highestBidder.toString()).to.deep.eq(
        PublicKey.default.toString()
      );
      expect(listingAccount.timerExtensionInSlots).deep.eq(
        listingConfig.timerExtension
      );
      expect(listingAccount.startTimeInSlots).deep.eq(BigInt(currentSlot));
      expect(listingAccount.endTimeInSlots).deep.eq(
        BigInt(currentSlot) + BigInt(listingConfig.initialDuration)
      );
      expect(listingAccount.isActive).to.eq(true);
      expect(listingAccount.buyoutPrice).deep.eq(listingConfig.buyoutPrice);

      //Check seller ATA has been debited
      const sellerAta = await provider.connection.getTokenAccountBalance(ata);
      expect(sellerAta.value.amount).to.equal("0");

      //Check escrow ATA has been credited
      const escrowAccount = await provider.connection.getTokenAccountBalance(
        escrow
      );
      expect(escrowAccount.value.amount).to.equal("1");

      //console.log("✅ Done wit sig:", tx.signature);
    } catch (err) {
      console.error(err);
      expect.fail("❌ Create Listing tx failed!");
    }
  });

  // it("List", async () => {
  //   const price = 3 * anchor.web3.LAMPORTS_PER_SOL;
  //   const [listing, listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       anchor.utils.bytes.utf8.encode("listing"),
  //       marketplace.toBuffer(),
  //       nft.mint.toBuffer(),
  //       seed.toArrayLike(Buffer, "le", 8),
  //     ],
  //     program.programId
  //   );
  //
  //   const escrow = getAssociatedTokenAddressSync(nft.mint, listing, true);
  //   const currentSlot = await provider.connection.getSlot();
  //
  //   const timerExtensionInSlots = 12;
  //   const initialDurationInSlots = 24;
  //
  //   let listingConfig = {
  //     bidIncrement: new anchor.BN(price / 1000),
  //     timerExtension: new anchor.BN(timerExtensionInSlots), // 12 slots ~ 5 seconds
  //     startTimestamp: new anchor.BN(currentSlot),
  //     initialDuration: new anchor.BN(initialDurationInSlots), // 24 slots ~ 10 seconds
  //     buyoutPrice: new anchor.BN(price),
  //     amount: new anchor.BN(1),
  //     seed,
  //   };
  //
  //   let accounts = {
  //     seller: user1.publicKey,
  //     admin: initializer.publicKey,
  //     listing,
  //     marketplace,
  //     mint: nft.mint,
  //     collection: nft.collection,
  //     sellerAta: nft.ata,
  //     escrow,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   };
  //
  //   try {
  //     let tx = await program.methods
  //       .list(
  //         listingConfig.seed,
  //         listingConfig.bidIncrement,
  //         listingConfig.timerExtension,
  //         listingConfig.startTimestamp,
  //         listingConfig.initialDuration,
  //         listingConfig.buyoutPrice,
  //         listingConfig.amount
  //       )
  //       .accounts(accounts)
  //       .signers([user1, initializer])
  //       .rpc();
  //
  //     // const sellerSigner = createSignerFromKeypair(
  //     //   umi,
  //     //   umi.eddsa.createKeypairFromSecretKey(user1.secretKey)
  //     // );
  //     // const adminSigner = createSignerFromKeypair(
  //     //   umi,
  //     //   umi.eddsa.createKeypairFromSecretKey(initializer.secretKey)
  //     // );
  //     //
  //     // await list(umi, {
  //     //   seller: sellerSigner,
  //     //   admin: adminSigner,
  //     //   listing: fromWeb3JsPublicKey(listing),
  //     //   marketplace: fromWeb3JsPublicKey(marketplace),
  //     //   mint: fromWeb3JsPublicKey(nft.mint),
  //     //   collection: fromWeb3JsPublicKey(nft.collection),
  //     //   sellerAta: fromWeb3JsPublicKey(nft.ata),
  //     //   escrow: fromWeb3JsPublicKey(escrow),
  //     //   tokenProgram: fromWeb3JsPublicKey(TOKEN_PROGRAM_ID),
  //     //   sysvarInstructions: fromWeb3JsPublicKey(
  //     //     anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY
  //     //   ),
  //     //   seed: BigInt(listingConfig.seed.toString()),
  //     //   bidIncrement: BigInt(listingConfig.bidIncrement.toString()),
  //     //   timerExtensionInSlots: BigInt(listingConfig.timerExtension.toString()),
  //     //   startTimeInSlots: BigInt(listingConfig.startTimestamp.toString()),
  //     //   initialDurationInSlots: BigInt(
  //     //     listingConfig.initialDuration.toString()
  //     //   ),
  //     //   buyoutPrice: BigInt(listingConfig.buyoutPrice.toString()),
  //     //   amount: BigInt(listingConfig.amount.toString()),
  //     // }).sendAndConfirm(umi, options);
  //   } catch (error) {
  //     console.error(error);
  //   }
  //
  //   // const listingAccount = await program.account.listingV2.fetch(listing);
  //   // const listingAccount = await fetchListingV2(fromWeb3JsPublicKey(listing);
  //
  //   // expect(listingAccount.mint).deep.equal(nft.mint);
  //   // expect(listingAccount.seller).deep.equal(user1.publicKey);
  //   // expect(listingAccount.bidCost.eq(new anchor.BN(1))).to.eq(true);
  //   // expect(listingAccount.bidIncrement.eq(listingConfig.bidIncrement)).to.eq(
  //   //   true
  //   // );
  //   // expect(listingAccount.currentBid.eq(new anchor.BN(0))).to.eq(true);
  //   // expect(listingAccount.highestBidder).to.deep.eq(
  //   //   anchor.web3.PublicKey.default
  //   // );
  //   // expect(listingAccount.timerExtensionInSlots.toNumber()).to.eq(
  //   //   timerExtensionInSlots
  //   // );
  //   // expect(listingAccount.startTimeInSlots.toNumber()).to.eq(currentSlot);
  //   // expect(listingAccount.endTimeInSlots.toNumber()).to.eq(
  //   //   currentSlot + initialDurationInSlots
  //   // );
  //   // expect(listingAccount.isActive).to.eq(true);
  //   // expect(listingAccount.buyoutPrice.eq(listingConfig.buyoutPrice)).to.eq(
  //   //   true
  //   // );
  //   // expect(listingAccount.bump).to.equal(listingBump);
  //   // expect(listingAccount.seed.eq(seed)).eq(true);
  //
  //   // Check seller ATA has been debited
  //   // const sellerAta = await provider.connection.getTokenAccountBalance(nft.ata);
  //   // expect(sellerAta.value.amount).to.equal("0");
  //
  //   // Check escrow ATA has been credited
  //   // const escrowAccount = await provider.connection.getTokenAccountBalance(
  //   //   escrow
  //   // );
  //   // expect(escrowAccount.value.amount).to.equal("1");
  // });

  it("User 2 place a bid", async () => {
    const mint = nft.mint;
    const [listing] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("listing"),
        marketplace.toBuffer(),
        mint.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    let listingAccount = await fetchListingV2(umi, listing);

    let oldEndTimeInSlots = listingAccount.endTimeInSlots;
    let bidIncrement = listingAccount.bidIncrement;
    let timerExtensionInSlots = listingAccount.timerExtensionInSlots;

    let highestBidder = listingAccount.highestBidder;
    let currentBid = listingAccount.currentBid;

    const [ata] = PublicKey.findProgramAddressSync(
      [
        user2.publicKey.toBytes(),
        TOKEN_2022_PROGRAM_ID.toBytes(),
        sBidMint.publicKey.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const userSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(user2.secretKey)
    );
    const sbidMintPubkey = fromWeb3JsPublicKey(sBidMint.publicKey);

    // Mint Some bid tokens.
    const amount = 100 * 10 ** 6;
    try {
      const mintTxResult = await mintBidToken(umi, {
        admin,
        user: userSigner,
        marketplace: fromWeb3JsPublicKey(marketplace),
        sbidMint: sbidMintPubkey,
        userSbidAta: fromWeb3JsPublicKey(ata),
        tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        amount: BigInt(amount),
      }).sendAndConfirm(umi, options);

      if (mintTxResult.result.value.err) {
        throw new Error(mintTxResult.result.value.err.toString());
      }

      const balance = await provider.connection.getTokenAccountBalance(ata);
      expect(balance.value.uiAmount).to.eq(100);

      const placeBidTxResult = await placeBid(umi, {
        bidder: userSigner,
        sbidMint: sbidMintPubkey,
        bidderSbidAta: fromWeb3JsPublicKey(ata),
        mint: fromWeb3JsPublicKey(mint),
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        highestBidder: highestBidder,
        currentBid: listingAccount.currentBid,
      }).sendAndConfirm(umi, options);

      if (placeBidTxResult.result.value.err) {
        throw new Error(placeBidTxResult.result.value.err.toString());
      }

      // const listingAccountNew = await fetchListingV2(
      //   umi,
      //   fromWeb3JsPublicKey(listing)
      // );
      //console.log(listingAccountNew);
    } catch (err) {
      console.error("something is bad here", err);
      expect.fail("mintBidToken IX failed");
    }

    // try {
    //         listingAccount = await program.account.listingV2.fetch(listing);
    //
    //   expect(listingAccount.currentBid.toNumber()).to.equal(bidIncrement);
    //   expect(listingAccount.highestBidder).to.deep.equal(user2.publicKey);
    //   expect(listingAccount.endTimeInSlots.toNumber()).to.equal(
    //     oldEndTimeInSlots + timerExtensionInSlots
    //   );
    //
    //   // check one bid token was debited from user2
    //   const user2Ata = await provider.connection.getTokenAccountBalance(
    //     user2BidTokenATA
    //   );
    //   expect(user2Ata.value.uiAmount).to.equal(9);
    //
    //   // check one bid token has been credited to vault
    //   let vaultBalance = await provider.connection.getTokenAccountBalance(
    //     bidsVault
    //   );
    //   expect(vaultBalance.value.uiAmount).to.equal(1);
    //
    //   console.log("Bid 1 transaction signature", tx);
    //
    //   oldEndTime = listingAccount.endTime.toNumber();
    //
    //   accounts = {
    //     bidder: user3.publicKey,
    //     bidderAta: user3BidTokenATA,
    //     mint: nft.mint,
    //     listing,
    //     marketplace,
    //     bidsMint: bidTokenMint,
    //     bidsVault,
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //   };
    //
    //   tx = await program.methods
    //     .placeBid()
    //     .accounts(accounts)
    //     .signers([user3])
    //     .rpc();
    //
    //   listingAccount = await program.account.listing.fetch(listing);
    //
    //   expect(listingAccount.currentBid.toNumber()).to.equal(2 * bidIncrement);
    //   expect(listingAccount.highestBidder).to.deep.equal(user3.publicKey);
    //   expect(listingAccount.endTime.toNumber()).to.equal(
    //     oldEndTime + timerExtension
    //   );
    //
    //   // check one bid token was debited from user2
    //   const user3Ata = await provider.connection.getTokenAccountBalance(
    //     user3BidTokenATA
    //   );
    //   expect(user3Ata.value.uiAmount).to.equal(9);
    //
    //   // check one bid token has been credited to vault
    //   vaultBalance = await provider.connection.getTokenAccountBalance(
    //     bidsVault
    //   );
    //   expect(vaultBalance.value.uiAmount).to.equal(2);
    //
    //   console.log("Bid 2 transaction signature", tx);
    // } catch (error) {
    //   console.error(error);
    // }
  });

  // it("User 2 bids again - should fail.", async () => {
  //   const [listing] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       anchor.utils.bytes.utf8.encode("listing"),
  //       marketplace.toBuffer(),
  //       nft.mint.toBuffer(),
  //       seed.toArrayLike(Buffer, "le", 8),
  //     ],
  //     program.programId
  //   );
  //
  //   let listingAccount = await program.account.listingV2.fetch(listing);
  //
  //   let accounts = {
  //     bidder: user2.publicKey,
  //     bidderAta: user2BidTokenATA,
  //     mint: nft.mint,
  //     listing,
  //     marketplace,
  //     bidsMint: bidTokenMint,
  //     bidsVault,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //   };
  //
  //   try {
  //     await program.methods
  //       .placeBid(listingAccount.highestBidder, listingAccount.currentBid)
  //       .accounts(accounts)
  //       .signers([user2])
  //       .rpc();
  //   } catch (error) {
  //     const errMsg = "Incomming bidder is already the highest bidder";
  //     expect(error.error.errorMessage).to.eq(errMsg);
  //   }
  // });

  // it("User 1 bid with wrong Highest Bidder and Current Bid values should fail.", async () => {
  //   const [listing] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       anchor.utils.bytes.utf8.encode("listing"),
  //       marketplace.toBuffer(),
  //       nft.mint.toBuffer(),
  //       seed.toArrayLike(Buffer, "le", 8),
  //     ],
  //     program.programId
  //   );
  //
  //   let highestBidder = PublicKey.unique();
  //   let currentBid = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  //
  //   let accounts = {
  //     bidder: user1.publicKey,
  //     bidderAta: user1BidTokenATA,
  //     mint: nft.mint,
  //     listing,
  //     marketplace,
  //     bidsMint: bidTokenMint,
  //     bidsVault,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //   };
  //
  //   try {
  //     await program.methods
  //       .placeBid(highestBidder, currentBid)
  //       .accounts(accounts)
  //       .signers([user1])
  //       .rpc();
  //   } catch (error) {
  //     const errMsg = "Invalid current highest bidder and price";
  //     expect(error.error.errorMessage).to.eq(errMsg);
  //   }
  // });

  // it("End Auction", async () => {
  //   const amount = 1;
  //   const [listing] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       anchor.utils.bytes.utf8.encode("listing"),
  //       marketplace.toBuffer(),
  //       nft.mint.toBuffer(),
  //       seed.toArrayLike(Buffer, "le", 8),
  //     ],
  //     program.programId
  //   );
  //
  //   console.log("[End][listing] ", listing.toBase58());
  //
  //   let listingAccount = await program.account.listingV2.fetch(listing);
  //
  //   //const listingData = {
  //   //  mint: listingAccount.mint.toBase58(),
  //   //  seller: listingAccount.seller.toBase58(),
  //   //  bidCost: listingAccount.bidCost.toNumber(),
  //   //  currentBid: listingAccount.currentBid.toNumber(),
  //   //  highestBidder: listingAccount.highestBidder.toBase58(),
  //   //  timerExtensionInSlots: listingAccount.timerExtensionInSlots.toNumber(),
  //   //  startTimeInSlots: listingAccount.startTimeInSlots.toNumber(),
  //   //  endTimeInSlots: listingAccount.endTimeInSlots.toNumber(),
  //   //  isActive: listingAccount.isActive,
  //   //  buyoutPrice: listingAccount.buyoutPrice.toNumber(),
  //   //  bump: listingAccount.bump,
  //   //};
  //
  //   //console.log("Listing Data:", listingData);
  //
  //   console.log("Sleeping for 50 slots...");
  //   await new Promise((resolve) => setTimeout(resolve, 20 * 1000));
  //
  //   const currentSlot = await provider.connection.getSlot();
  //   console.log("Tring to close with current_slot:", currentSlot);
  //
  //   const user2NftAta = getAssociatedTokenAddressSync(
  //     nft.mint,
  //     user2.publicKey
  //   );
  //   const escrow = getAssociatedTokenAddressSync(nft.mint, listing, true);
  //
  //   let accounts = {
  //     user: user2.publicKey,
  //     admin: initializer.publicKey,
  //     seller: user1.publicKey,
  //     userAta: user2NftAta,
  //     mint: nft.mint,
  //     collection: nft.collection,
  //     listing,
  //     escrow,
  //     treasury,
  //     marketplace,
  //     bidsVault,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   };
  //
  //   try {
  //     let tx = await program.methods
  //       .endListing(new anchor.BN(amount))
  //       .accounts(accounts)
  //       .signers([user2, initializer])
  //       .rpc();
  //
  //     console.log("Your transaction signature", tx);
  //   } catch (err) {
  //     console.error(err);
  //   }
  //
  //   listingAccount = await program.account.listingV2.fetch(listing);
  //   expect(listingAccount.isActive).to.eq(false);
  //
  //   try {
  //     // check escrow ATA has been closed
  //     await provider.connection.getTokenAccountBalance(escrow);
  //   } catch (err) {
  //     const msg =
  //       "failed to get token account balance: Invalid param: could not find account";
  //     expect(err.message).to.equal(msg);
  //   }
  //
  //   // check user2 has received the NFT
  //   const user2NftAtaBalance = await provider.connection.getTokenAccountBalance(
  //     user2NftAta
  //   );
  //   expect(user2NftAtaBalance.value.amount).to.equal("1");
  //
  //   // check treasury has received the current bid amount
  //   const treasuryBalance = await provider.connection.getBalance(treasury);
  //   expect(treasuryBalance).to.equal(listingAccount.currentBid.toNumber());
  // });

  // it("List pNFT", async () => {
  //   const price = 1.23 * anchor.web3.LAMPORTS_PER_SOL;
  //   const [listing, listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       anchor.utils.bytes.utf8.encode("listing"),
  //       marketplace.toBuffer(),
  //       pNft.mint.toBuffer(),
  //       seedPnftListing.toArrayLike(Buffer, "le", 8),
  //     ],
  //     program.programId
  //   );
  //
  //   console.log("[List pNFT][listing]:", listing.toBase58());
  //
  //   const escrow = getAssociatedTokenAddressSync(pNft.mint, listing, true);
  //   const currentSlot = await provider.connection.getSlot();
  //
  //   const timerExtensionInSlots = 12;
  //   const initialDurationInSlots = 24;
  //
  //   console.log("Current slot", currentSlot);
  //
  //   let listingConfig = {
  //     bidIncrement: new anchor.BN(price / 1000),
  //     timerExtension: new anchor.BN(timerExtensionInSlots), // 12 slots ~ 5 seconds
  //     startTimestamp: new anchor.BN(currentSlot),
  //     initialDuration: new anchor.BN(initialDurationInSlots), // 24 slots ~ 10 seconds
  //     buyoutPrice: new anchor.BN(price),
  //     amount: new anchor.BN(1),
  //     seed: seedPnftListing,
  //   };
  //
  //   const metadata = findMetadataPda(umi, {
  //     mint: fromWeb3JsPublicKey(pNft.mint),
  //   });
  //   console.log("Metadata:", metadata.toString());
  //   const metadataAccount = await fetchMetadata(umi, metadata);
  //
  //   //console.log("----------------------------");
  //   //console.log("Metadata", metadataAccount);
  //   //console.log("----------------------------");
  //
  //   const sysvarInstructions = anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY;
  //   let accounts = {
  //     seller: initializer.publicKey,
  //     admin: initializer.publicKey,
  //     listing,
  //     marketplace,
  //     mint: pNft.mint,
  //     collection: pNft.collection,
  //     sellerAta: pNft.ata,
  //     escrow,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     sysvarInstructions,
  //   };
  //
  //   const metadataProgram = new anchor.web3.PublicKey(
  //     "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  //   );
  //   const edition = toWeb3JsPublicKey(
  //     findMasterEditionPda(umi, {
  //       mint: fromWeb3JsPublicKey(pNft.mint),
  //     })[0]
  //   );
  //   const ownerTr = toWeb3JsPublicKey(
  //     findTokenRecordPda(umi, {
  //       mint: fromWeb3JsPublicKey(pNft.mint),
  //       token: fromWeb3JsPublicKey(pNft.ata),
  //     })[0]
  //   );
  //   const destinationTr = toWeb3JsPublicKey(
  //     findTokenRecordPda(umi, {
  //       mint: fromWeb3JsPublicKey(pNft.mint),
  //       token: fromWeb3JsPublicKey(escrow),
  //     })[0]
  //   );
  //
  //   const authRulesProgram = new anchor.web3.PublicKey(
  //     "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
  //   );
  //
  //   let authRules: anchor.web3.PublicKey;
  //   //console.log("ProgrammableConfig", metadataAccount.programmableConfig);
  //   if (
  //     metadataAccount.programmableConfig.__option == "Some" &&
  //     metadataAccount.programmableConfig.value.ruleSet.__option === "Some"
  //   ) {
  //     authRules = toWeb3JsPublicKey(
  //       metadataAccount.programmableConfig.value.ruleSet.value
  //     );
  //   } else {
  //     authRules = null;
  //   }
  //
  //   let remainingAccounts = [
  //     metadataProgram,
  //     edition,
  //     ownerTr,
  //     destinationTr,
  //     authRulesProgram,
  //     ...(authRules ? [authRules] : []),
  //   ].map((key) => {
  //     let accountInfo = {
  //       pubkey: key,
  //       isWritable: key == ownerTr || key == destinationTr ? true : false,
  //       isSigner: false,
  //     };
  //
  //     return accountInfo;
  //   });
  //
  //   try {
  //     let computeUnitLimitTx =
  //       anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
  //         units: 400000,
  //       });
  //     let tx = await program.methods
  //       .list(
  //         listingConfig.seed,
  //         listingConfig.bidIncrement,
  //         listingConfig.timerExtension,
  //         listingConfig.startTimestamp,
  //         listingConfig.initialDuration,
  //         listingConfig.buyoutPrice,
  //         listingConfig.amount
  //       )
  //       .accounts(accounts)
  //       .preInstructions([computeUnitLimitTx])
  //       .remainingAccounts(remainingAccounts)
  //       .signers([initializer, initializer])
  //       .rpc();
  //
  //     console.log("Your transaction signature", tx);
  //   } catch (error) {
  //     console.error(error);
  //   }
  //
  //   const listingAccount = await program.account.listingV2.fetch(listing);
  //
  //   //const listingData = {
  //   //  mint: listingAccount.mint.toBase58(),
  //   //  seller: listingAccount.seller.toBase58(),
  //   //  bidCost: listingAccount.bidCost.toNumber(),
  //   //  currentBid: listingAccount.currentBid.toNumber(),
  //   //  highestBidder: listingAccount.highestBidder.toBase58(),
  //   //  timerExtensionInSlots: listingAccount.timerExtensionInSlots.toNumber(),
  //   //  startTimeInSlots: listingAccount.startTimeInSlots.toNumber(),
  //   //  endTimeInSlots: listingAccount.endTimeInSlots.toNumber(),
  //   //  isActive: listingAccount.isActive,
  //   //  buyoutPrice: listingAccount.buyoutPrice.toNumber(),
  //   //  bump: listingAccount.bump,
  //   //};
  //
  //   //console.log("Listing Data:", listingData);
  //
  //   expect(listingAccount.mint).deep.equal(pNft.mint);
  //   expect(listingAccount.seller).deep.equal(initializer.publicKey);
  //   expect(listingAccount.bidCost.eq(new anchor.BN(1))).to.eq(true);
  //   expect(listingAccount.bidIncrement.eq(listingConfig.bidIncrement)).to.eq(
  //     true
  //   );
  //   expect(listingAccount.currentBid.eq(new anchor.BN(0))).to.eq(true);
  //   expect(listingAccount.highestBidder).to.deep.eq(
  //     anchor.web3.PublicKey.default
  //   );
  //   expect(listingAccount.timerExtensionInSlots.toNumber()).to.eq(
  //     timerExtensionInSlots
  //   );
  //   expect(listingAccount.startTimeInSlots.toNumber()).to.eq(currentSlot);
  //   expect(listingAccount.endTimeInSlots.toNumber()).to.eq(
  //     currentSlot + initialDurationInSlots
  //   );
  //   expect(listingAccount.isActive).to.eq(true);
  //   expect(listingAccount.buyoutPrice.eq(listingConfig.buyoutPrice)).to.eq(
  //     true
  //   );
  //   expect(listingAccount.bump).to.equal(listingBump);
  //   expect(listingAccount.seed.eq(seedPnftListing)).eq(true);
  //
  //   // Check seller ATA has been debited
  //   const sellerAta = await provider.connection.getTokenAccountBalance(
  //     pNft.ata
  //   );
  //   expect(sellerAta.value.amount).to.equal("0");
  //
  //   // Check escrow ATA has been credited
  //   const escrowAccount = await provider.connection.getTokenAccountBalance(
  //     escrow
  //   );
  //   expect(escrowAccount.value.amount).to.equal("1");
  // });
  //
  // it("Bid pNFT", async () => {
  //   const [listing] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       anchor.utils.bytes.utf8.encode("listing"),
  //       marketplace.toBuffer(),
  //       pNft.mint.toBuffer(),
  //       seedPnftListing.toArrayLike(Buffer, "le", 8),
  //     ],
  //     program.programId
  //   );
  //
  //   console.log("[Bid pNFT][listing]:", listing.toBase58());
  //
  //   let listingAccount = await program.account.listingV2.fetch(listing);
  //
  //   let oldEndTimeInSlots = listingAccount.endTimeInSlots.toNumber();
  //   let bidIncrement = listingAccount.bidIncrement.toNumber();
  //   let timerExtensionInSlots = listingAccount.timerExtensionInSlots.toNumber();
  //
  //   let accounts = {
  //     bidder: user2.publicKey,
  //     bidderAta: user2BidTokenATA,
  //     mint: pNft.mint,
  //     listing,
  //     marketplace,
  //     bidsMint: bidTokenMint,
  //     bidsVault,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //   };
  //
  //   try {
  //     let tx = await program.methods
  //       .placeBid(listingAccount.highestBidder, listingAccount.currentBid)
  //       .accounts(accounts)
  //       .signers([user2])
  //       .rpc();
  //
  //     listingAccount = await program.account.listingV2.fetch(listing);
  //
  //     expect(listingAccount.currentBid.toNumber()).to.equal(bidIncrement);
  //     expect(listingAccount.highestBidder).to.deep.equal(user2.publicKey);
  //     expect(listingAccount.endTimeInSlots.toNumber()).to.equal(
  //       oldEndTimeInSlots + timerExtensionInSlots
  //     );
  //
  //     // check one bid token was debited from user2
  //     const user2Ata = await provider.connection.getTokenAccountBalance(
  //       user2BidTokenATA
  //     );
  //     expect(user2Ata.value.uiAmount).to.equal(8);
  //
  //     // check one bid token has been credited to vault
  //     let vaultBalance = await provider.connection.getTokenAccountBalance(
  //       bidsVault
  //     );
  //     expect(vaultBalance.value.uiAmount).to.equal(2);
  //
  //     console.log("Bid 1 transaction signature", tx);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // });
  //
  // it("Delist / End auction pNFT", async () => {
  //   const expectedTreasuryBalance = 4230000;
  //   const amount = 1;
  //   const [listing] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       anchor.utils.bytes.utf8.encode("listing"),
  //       marketplace.toBuffer(),
  //       pNft.mint.toBuffer(),
  //       seedPnftListing.toArrayLike(Buffer, "le", 8),
  //     ],
  //     program.programId
  //   );
  //
  //   let listingAccount = await program.account.listingV2.fetch(listing);
  //
  //   //const _listingData = {
  //   //  mint: listingAccount.mint.toBase58(),
  //   //  seller: listingAccount.seller.toBase58(),
  //   //  bidCost: listingAccount.bidCost.toNumber(),
  //   //  currentBid: listingAccount.currentBid.toNumber(),
  //   //  highestBidder: listingAccount.highestBidder.toBase58(),
  //   //  timerExtensionInSlots: listingAccount.timerExtensionInSlots.toNumber(),
  //   //  startTimeInSlots: listingAccount.startTimeInSlots.toNumber(),
  //   //  endTimeInSlots: listingAccount.endTimeInSlots.toNumber(),
  //   //  isActive: listingAccount.isActive,
  //   //  buyoutPrice: listingAccount.buyoutPrice.toNumber(),
  //   //  bump: listingAccount.bump,
  //   //};
  //
  //   //console.log("Listing Data:", listingData);
  //
  //   console.log("Sleeping for 50 slots...");
  //   await new Promise((resolve) => setTimeout(resolve, 20 * 1000));
  //
  //   const userAta = getAssociatedTokenAddressSync(pNft.mint, user2.publicKey);
  //   const escrow = getAssociatedTokenAddressSync(pNft.mint, listing, true);
  //
  //   let accounts = {
  //     user: user2.publicKey,
  //     admin: initializer.publicKey,
  //     seller: initializer.publicKey,
  //     userAta: userAta,
  //     mint: pNft.mint,
  //     collection: pNft.collection,
  //     listing,
  //     escrow,
  //     treasury,
  //     marketplace,
  //     bidsVault,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   };
  //
  //   const metadata = findMetadataPda(umi, {
  //     mint: fromWeb3JsPublicKey(pNft.mint),
  //   });
  //   console.log("Metadata:", metadata.toString());
  //   const metadataAccount = await fetchMetadata(umi, metadata);
  //
  //   const metadataProgram = new anchor.web3.PublicKey(
  //     "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  //   );
  //   const edition = toWeb3JsPublicKey(
  //     findMasterEditionPda(umi, {
  //       mint: fromWeb3JsPublicKey(pNft.mint),
  //     })[0]
  //   );
  //   const ownerTr = toWeb3JsPublicKey(
  //     findTokenRecordPda(umi, {
  //       mint: fromWeb3JsPublicKey(pNft.mint),
  //       token: fromWeb3JsPublicKey(escrow),
  //     })[0]
  //   );
  //   const destinationTr = toWeb3JsPublicKey(
  //     findTokenRecordPda(umi, {
  //       mint: fromWeb3JsPublicKey(pNft.mint),
  //       token: fromWeb3JsPublicKey(userAta),
  //     })[0]
  //   );
  //
  //   const authRulesProgram = new anchor.web3.PublicKey(
  //     "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
  //   );
  //
  //   let authRules: anchor.web3.PublicKey;
  //   //console.log("ProgrammableConfig", metadataAccount.programmableConfig);
  //   if (
  //     metadataAccount.programmableConfig.__option == "Some" &&
  //     metadataAccount.programmableConfig.value.ruleSet.__option === "Some"
  //   ) {
  //     authRules = toWeb3JsPublicKey(
  //       metadataAccount.programmableConfig.value.ruleSet.value
  //     );
  //   } else {
  //     authRules = null;
  //   }
  //
  //   let remainingAccounts = [
  //     metadataProgram,
  //     edition,
  //     ownerTr,
  //     destinationTr,
  //     authRulesProgram,
  //     ...(authRules ? [authRules] : []),
  //   ].map((key) => {
  //     let accountInfo = {
  //       pubkey: key,
  //       isWritable: key == ownerTr || key == destinationTr ? true : false,
  //       isSigner: false,
  //     };
  //
  //     return accountInfo;
  //   });
  //
  //   try {
  //     let computeUnitLimitTx =
  //       anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
  //         units: 400000,
  //       });
  //     let tx = await program.methods
  //       .endListing(new anchor.BN(amount))
  //       .accounts(accounts)
  //       .preInstructions([computeUnitLimitTx])
  //       .remainingAccounts(remainingAccounts)
  //       .signers([user2, initializer])
  //       .rpc();
  //
  //     console.log("Your transaction signature", tx);
  //   } catch (error) {
  //     console.error(error);
  //   }
  //
  //   listingAccount = await program.account.listingV2.fetch(listing);
  //   expect(listingAccount.isActive).to.eq(false);
  //
  //   try {
  //     // check escrow ATA has been closed
  //     await provider.connection.getTokenAccountBalance(escrow);
  //   } catch (err) {
  //     const msg =
  //       "failed to get token account balance: Invalid param: could not find account";
  //     expect(err.message).to.equal(msg);
  //   }
  //
  //   const userAtaBalance = await provider.connection.getTokenAccountBalance(
  //     userAta
  //   );
  //   expect(userAtaBalance.value.amount).to.equal("1");
  //
  //   // check treasury has received the current bid amount
  //   const treasuryBalance = await provider.connection.getBalance(treasury);
  //   expect(treasuryBalance).to.equal(expectedTreasuryBalance);
  // });

  /* NOTE: Disabled!
   *
  it("initialize user", async () => {
    const [user, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("user"), user1.publicKey.toBuffer()],
      program.programId
    );

    let accounts = {
      user: user1.publicKey,
      user_account: user,
    };

    try {
      let tx = await program.methods
        .initializeUser()
        .accounts(accounts)
        .signers([user1])
        .rpc();

      console.log("Your transaction signature", tx);
    } catch (error) {
      console.error(error);
    }

    const userAccount = await program.account.userAccount.fetch(user);
    expect(userAccount.totalBidsPlaced).to.equal(0);
    expect(userAccount.totalAuctionsWon).to.equal(0);
    expect(userAccount.totalAuctionsParticipated).to.equal(0);
    expect(userAccount.points).to.equal(0);
    expect(userAccount.bump).to.equal(bump);
  });
  */
});

// Helpers
const confirmTx = async (signature: string) => {
  const latestBlockhash = await anchor
    .getProvider()
    .connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    confirmOpts.commitment
  );
};

const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx));
};

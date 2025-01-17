import * as anchor from "@coral-xyz/anchor";

import { Program } from "@coral-xyz/anchor";
import {
  PublicKey as UmiPublicKey,
  createSignerFromKeypair,
  Signer,
  TransactionBuilderSendAndConfirmOptions,
  Umi,
  Pda,
  AccountMeta,
  TransactionBuilder,
} from "@metaplex-foundation/umi";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { createAndMintNftForCollection } from "./utils/nft";
import { initUmi } from "./utils/umi";

import {
  endListing,
  fetchListingV2,
  fetchMarketplace,
  fetchUserAccount,
  getNftMarketplaceProgramId,
  initialize,
  list,
  mintBidToken,
  MintCostTier,
  MintTier,
  placeBid,
  updateMarketplaceMintTiers,
} from "../clients/generated/umi/src/";
import {
  fetchToken,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-toolbox";

import {
  findMetadataPda,
  findMasterEditionPda,
  MPL_TOKEN_METADATA_PROGRAM_ID,
  findTokenRecordPda,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import {
  fetchUserAccountPDA,
  generateRandomU64Seed,
  parseAnchorError,
} from "./utils/utils";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  bytes,
  string,
  publicKey as publicKeySerializer,
} from "@metaplex-foundation/umi/serializers";
import { MINT_TIER_COSTS_DUMMY, MINT_TIER_COSTS } from "./utils/constants";

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

  let sBidMint = anchor.web3.Keypair.generate();

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
        mintCosts: MINT_TIER_COSTS_DUMMY,
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

      marketplaceAccount.mintTiers.map((tier: MintTier, index: number) => {
        expect(tier).deep.equal(MINT_TIER_COSTS_DUMMY[index]);
      });
    } catch (error) {
      console.error("Initialize Marketplace Error:", error);
      expect.fail("❌ Initialize Markeplace Tx Failed");
    }
  });

  it("Update Mint Tiers", async () => {
    try {
      await updateMarketplaceMintTiers(umi, {
        admin,
        marketplace: fromWeb3JsPublicKey(marketplace),
        tiers: MINT_TIER_COSTS,
      }).sendAndConfirm(umi, options);

      const marketplaceAccount = await fetchMarketplace(
        umi,
        fromWeb3JsPublicKey(marketplace)
      );

      marketplaceAccount.mintTiers.map((tier: MintTier, index: number) => {
        expect(tier).deep.equal(MINT_TIER_COSTS[index]);
      });
    } catch (err) {
      console.error("Update Mint Tiers Error:", err);
      expect.fail("❌ Update Mint Tiers Tx Failed");
    }
  });

  it("Create Listing", async () => {
    const price = 3 * anchor.web3.LAMPORTS_PER_SOL;

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

    const [metadata] = findMetadataPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    });
    const editionAccount = findMasterEditionPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    })[0];

    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(sellerSigner.publicKey),
    ]);

    try {
      const tx = await list(umi, {
        seller: sellerSigner,
        admin,
        userAccount,
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

      const user = await fetchUserAccount(umi, userAccount);

      expect(user.totalAuctionsCreated).to.eq(1);
      expect(user.points).to.eq(10);
      expect(user.owner).to.eq(sellerSigner.publicKey);

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

  it("Users mint some sBid Tokens", async () => {
    await Promise.all(
      [user1, user2, user3].map(async (u) => {
        try {
          const userSigner = createSignerFromKeypair(
            umi,
            umi.eddsa.createKeypairFromSecretKey(u.secretKey)
          );
          const [ata] = PublicKey.findProgramAddressSync(
            [
              u.publicKey.toBytes(),
              TOKEN_2022_PROGRAM_ID.toBytes(),
              sBidMint.publicKey.toBytes(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
          );

          const [userAccount] = umi.eddsa.findPda(programId, [
            bytes().serialize(new Uint8Array([117, 115, 101, 114])),
            publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
            publicKeySerializer().serialize(userSigner.publicKey),
          ]);

          const txResult = await mintBidToken(umi, {
            admin,
            userAccount,
            user: userSigner,
            marketplace: fromWeb3JsPublicKey(marketplace),
            sbidMint: fromWeb3JsPublicKey(sBidMint.publicKey),
            userSbidAta: fromWeb3JsPublicKey(ata),
            tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
            tier: MintCostTier.Tier3,
          }).sendAndConfirm(umi, options);

          if (txResult.result.value.err) {
            throw new Error(txResult.result.value.err.toString());
          }

          const ta = await fetchToken(umi, fromWeb3JsPublicKey(ata));
          const expectedAmount =
            MINT_TIER_COSTS[MintCostTier.Tier3].amount +
            MINT_TIER_COSTS[MintCostTier.Tier3].bonus;
          expect(ta.amount).to.eq(expectedAmount);

          const user = await fetchUserAccount(umi, userAccount);
          expect(user.points).to.eq(
            u.publicKey.toString() === user1.publicKey.toString() ? 11 : 1
          );
        } catch (err) {
          console.error(err);
          expect.fail("❌ Mint sBid Token tx failed!");
        }
      })
    );
  });

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

    const listingAccountOld = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    const [ata] = PublicKey.findProgramAddressSync(
      [
        user2.publicKey.toBytes(),
        TOKEN_2022_PROGRAM_ID.toBytes(),
        sBidMint.publicKey.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const taOld = await fetchToken(umi, fromWeb3JsPublicKey(ata));

    const userSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(user2.secretKey)
    );
    const sbidMintPubkey = fromWeb3JsPublicKey(sBidMint.publicKey);

    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(userSigner.publicKey),
    ]);

    try {
      await placeBid(umi, {
        bidder: userSigner,
        sbidMint: sbidMintPubkey,
        userAccount,
        bidderSbidAta: fromWeb3JsPublicKey(ata),
        mint: fromWeb3JsPublicKey(mint),
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        highestBidder: listingAccountOld.highestBidder,
        currentBid: listingAccountOld.currentBid,
      }).sendAndConfirm(umi, options);
    } catch (err) {
      const { errorNumber, errorCode, errorMessage } = parseAnchorError(
        err.transactionLogs
      );

      console.error("errorNumber", errorNumber);
      console.error("errorCode", errorCode);
      console.error("errorMessage", errorMessage);

      expect.fail("❌ Place Bid tx failed!");
    }

    const ta = await fetchToken(umi, fromWeb3JsPublicKey(ata));
    expect(ta.amount).to.equal(taOld.amount - BigInt(10 ** 6));

    const listingAccountNew = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    expect(listingAccountNew.highestBidder.toString()).to.equal(
      userSigner.publicKey.toString()
    );
    expect(listingAccountNew.currentBid).to.equal(
      BigInt(1) * listingAccountNew.bidIncrement
    );
    expect(listingAccountNew.endTimeInSlots).to.equal(
      listingAccountOld.endTimeInSlots + listingAccountOld.timerExtensionInSlots
    );

    const user = await fetchUserAccount(umi, userAccount);
    expect(user.points).to.eq(2);
    expect(user.totalBidsPlaced).to.eq(1);
    expect(user.owner).to.eq(userSigner.publicKey);
  });

  it("User 2 place a bid again - should fail!", async () => {
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

    let listingAccount = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

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
    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(userSigner.publicKey),
    ]);

    try {
      const txResult = await placeBid(umi, {
        bidder: userSigner,
        sbidMint: sbidMintPubkey,
        userAccount,
        bidderSbidAta: fromWeb3JsPublicKey(ata),
        mint: fromWeb3JsPublicKey(mint),
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        highestBidder: listingAccount.highestBidder,
        currentBid: listingAccount.currentBid,
      }).sendAndConfirm(umi, options);

      if (txResult.result.value.err) {
        const transaction = await umi.rpc.getTransaction(txResult.signature);
        const { errorNumber, errorCode, errorMessage } = parseAnchorError(
          transaction.meta.logs
        );

        expect(errorNumber).to.eq(6003);
        expect(errorCode).to.eq("BidderIsHighestBidder");
        expect(errorMessage).to.eq(
          "Incomming bidder is already the highest bidder"
        );

        return;
      }

      expect.fail("❌ Place Bid tx should have failed!");
    } catch (err) {
      const { errorNumber, errorCode, errorMessage } = parseAnchorError(
        err.transactionLogs
      );

      expect(errorNumber).to.eq(6003);
      expect(errorCode).to.eq("BidderIsHighestBidder");
      expect(errorMessage).to.eq(
        "Incomming bidder is already the highest bidder"
      );
    }
  });

  it("User 2 place a bid again with wrong highestBidder and / or currentBid - should fail!", async () => {
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

    let highestBidder = fromWeb3JsPublicKey(listing);
    let currentBid = BigInt(30);

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
    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(userSigner.publicKey),
    ]);

    try {
      const txResult = await placeBid(umi, {
        bidder: userSigner,
        sbidMint: sbidMintPubkey,
        userAccount,
        bidderSbidAta: fromWeb3JsPublicKey(ata),
        mint: fromWeb3JsPublicKey(mint),
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        highestBidder: highestBidder,
        currentBid: currentBid,
      }).sendAndConfirm(umi, options);

      if (txResult.result.value.err) {
        const transaction = await umi.rpc.getTransaction(txResult.signature);
        const { errorNumber, errorCode, errorMessage } = parseAnchorError(
          transaction.meta.logs
        );

        expect(errorNumber).to.equal(6012);
        expect(errorCode).to.equal("InvalidCurrentHighestBidderAndPrice");
        expect(errorMessage).to.equal(
          "Invalid current highest bidder and price"
        );

        return;
      }

      expect.fail("❌ Place Bid tx should have failed!");
    } catch (err) {
      const { errorCode, errorMessage, errorNumber } = parseAnchorError(
        err.transactionLogs
      );

      expect(errorCode).to.equal("InvalidCurrentHighestBidderAndPrice");
      expect(errorNumber).to.equal(6012);
      expect(errorMessage).to.equal("Invalid current highest bidder and price");
    }
  });

  it("User 3 place a bid", async () => {
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

    const listingAccountOld = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    const [ata] = PublicKey.findProgramAddressSync(
      [
        user3.publicKey.toBytes(),
        TOKEN_2022_PROGRAM_ID.toBytes(),
        sBidMint.publicKey.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const taOld = await fetchToken(umi, fromWeb3JsPublicKey(ata));

    const userSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(user3.secretKey)
    );
    const sbidMintPubkey = fromWeb3JsPublicKey(sBidMint.publicKey);

    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(userSigner.publicKey),
    ]);

    try {
      await placeBid(umi, {
        bidder: userSigner,
        sbidMint: sbidMintPubkey,
        userAccount,
        bidderSbidAta: fromWeb3JsPublicKey(ata),
        mint: fromWeb3JsPublicKey(mint),
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        highestBidder: listingAccountOld.highestBidder,
        currentBid: listingAccountOld.currentBid,
      }).sendAndConfirm(umi, options);
    } catch (err) {
      const { errorNumber, errorCode, errorMessage } = parseAnchorError(
        err.transactionLogs
      );

      console.error("errorNumber", errorNumber);
      console.error("errorCode", errorCode);
      console.error("errorMessage", errorMessage);

      expect.fail("❌ Place Bid tx failed!");
    }

    const ta = await fetchToken(umi, fromWeb3JsPublicKey(ata));
    expect(ta.amount).to.equal(taOld.amount - BigInt(10 ** 6));

    const listingAccountNew = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    expect(listingAccountNew.highestBidder.toString()).to.equal(
      userSigner.publicKey.toString()
    );
    expect(listingAccountNew.currentBid).to.equal(
      BigInt(2) * listingAccountNew.bidIncrement
    );
    expect(listingAccountNew.endTimeInSlots).to.equal(
      listingAccountOld.endTimeInSlots + listingAccountOld.timerExtensionInSlots
    );

    const user = await fetchUserAccount(umi, userAccount);
    expect(user.points).to.eq(2);
    expect(user.totalBidsPlaced).to.eq(1);
    expect(user.owner).to.eq(userSigner.publicKey);
  });

  it("User 3 Ends Auction", async () => {
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

    const listingAccountOld = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    const userSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(user3.secretKey)
    );

    const ata = getAssociatedTokenAddressSync(nft.mint, user3.publicKey);
    const escrow = getAssociatedTokenAddressSync(nft.mint, listing, true);

    const [metadata] = findMetadataPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    });
    const editionAccount = findMasterEditionPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    })[0];

    const [treasury] = umi.eddsa.findPda(programId, [
      bytes().serialize(
        new Uint8Array([116, 114, 101, 97, 115, 117, 114, 121])
      ),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
    ]);

    const treasuryBalanceOld = await provider.connection.getBalance(
      toWeb3JsPublicKey(treasury)
    );

    // We sleep 'till auction end time passes
    await new Promise((resolve) => setTimeout(resolve, 30 * 1000));

    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(userSigner.publicKey),
    ]);

    try {
      await endListing(umi, {
        user: userSigner,
        admin,
        seller: listingAccountOld.seller,
        userAccount,
        userAta: fromWeb3JsPublicKey(ata),
        mint: fromWeb3JsPublicKey(nft.mint),
        collection: fromWeb3JsPublicKey(nft.collection),
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        escrow: fromWeb3JsPublicKey(escrow),
        metadata,
        masterEdition: editionAccount,
        sysvarInstructions: fromWeb3JsPublicKey(
          anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY
        ),
        amount: BigInt(1),
      }).sendAndConfirm(umi, options);
    } catch (err) {
      console.log(err);
    }

    const listingAccount = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    expect(listingAccount.isActive).to.eq(false);

    try {
      // check escrow ATA has been closed
      await provider.connection.getTokenAccountBalance(escrow);
    } catch (err) {
      const msg =
        "failed to get token account balance: Invalid param: could not find account";
      expect(err.message).to.equal(msg);
    }

    // check user1 has received the NFT
    const user1NftAtaBalance = await provider.connection.getTokenAccountBalance(
      ata
    );
    expect(user1NftAtaBalance.value.amount).to.equal("1");

    // check treasury has received the current bid amount
    const treasuryBalanceNew = await provider.connection.getBalance(
      toWeb3JsPublicKey(treasury)
    );
    expect(treasuryBalanceNew).to.equal(
      treasuryBalanceOld + Number(listingAccount.currentBid)
    );

    const user = await fetchUserAccount(umi, userAccount);
    expect(user.totalBidsPlaced).to.eq(1);
    expect(user.points).to.eq(52);
  });

  it("Create List pNFT Listing", async () => {
    const price = 1.23 * LAMPORTS_PER_SOL;
    const mint = pNft.mint;
    const collection = pNft.collection;
    const ata = pNft.ata;
    const seed = seedPnftListing;

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
    const timerExtensionInSlots = 12;
    const initialDurationInSlots = 24;

    let listingConfig = {
      bidIncrement: BigInt(price / 1000),
      timerExtension: BigInt(12), // 12 slots ~ 5 seconds
      startTimestamp: BigInt(currentSlot),
      initialDuration: BigInt(24), // 24 slots ~ 10 seconds
      buyoutPrice: BigInt(price),
      amount: BigInt(1),
      seed,
    };

    const [metadata] = findMetadataPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    });
    const editionAccount = findMasterEditionPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    })[0];

    const initializerSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(initializer.secretKey)
    );

    const [userAccount] = fetchUserAccountPDA(
      umi,
      programId,
      fromWeb3JsPublicKey(marketplace),
      initializer.publicKey
    );

    const AUTH_RULES_PROGRAM = umi.programs.getPublicKey(
      "authRulesProgram",
      "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
    );

    const ownerTr = findTokenRecordPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
      token: fromWeb3JsPublicKey(ata),
    })[0];
    const destinationTr = findTokenRecordPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
      token: fromWeb3JsPublicKey(escrow),
    })[0];

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

    try {
      const txBuilder = new TransactionBuilder();

      await txBuilder
        .add(
          list(umi, {
            seller: initializerSigner,
            admin,
            userAccount,
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
          }).addRemainingAccounts(remainingAccounts)
        )
        .add(setComputeUnitLimit(umi, { units: 600_000 }))
        .sendAndConfirm(umi, options);
    } catch (err) {
      console.log("err:", err);
    }

    const user = await fetchUserAccount(umi, userAccount);

    expect(user.totalAuctionsCreated).to.eq(1);
    expect(user.points).to.eq(10);
    expect(user.owner).to.eq(initializerSigner.publicKey);

    const listingAccount = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    expect(listingAccount.mint.toString()).to.equal(mint.toString());
    expect(listingAccount.seller.toString()).to.equal(
      initializer.publicKey.toString()
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
  });

  it("User 2 place a bid to pNft Listing", async () => {
    const mint = pNft.mint;
    const seed = seedPnftListing;
    const [listing] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("listing"),
        marketplace.toBuffer(),
        mint.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const listingAccountOld = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    const [ata] = PublicKey.findProgramAddressSync(
      [
        user2.publicKey.toBytes(),
        TOKEN_2022_PROGRAM_ID.toBytes(),
        sBidMint.publicKey.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const taOld = await fetchToken(umi, fromWeb3JsPublicKey(ata));

    const userSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(user2.secretKey)
    );
    const sbidMintPubkey = fromWeb3JsPublicKey(sBidMint.publicKey);

    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(userSigner.publicKey),
    ]);

    try {
      await placeBid(umi, {
        bidder: userSigner,
        sbidMint: sbidMintPubkey,
        userAccount,
        bidderSbidAta: fromWeb3JsPublicKey(ata),
        mint: fromWeb3JsPublicKey(mint),
        listing: fromWeb3JsPublicKey(listing),
        marketplace: fromWeb3JsPublicKey(marketplace),
        tokenProgram: fromWeb3JsPublicKey(TOKEN_2022_PROGRAM_ID),
        highestBidder: listingAccountOld.highestBidder,
        currentBid: listingAccountOld.currentBid,
      }).sendAndConfirm(umi, options);
    } catch (err) {
      const { errorNumber, errorCode, errorMessage } = parseAnchorError(
        err.transactionLogs
      );

      console.error("errorNumber", errorNumber);
      console.error("errorCode", errorCode);
      console.error("errorMessage", errorMessage);

      expect.fail("❌ Place Bid tx failed!");
    }

    const ta = await fetchToken(umi, fromWeb3JsPublicKey(ata));
    expect(ta.amount).to.equal(taOld.amount - BigInt(10 ** 6));

    const listingAccountNew = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    expect(listingAccountNew.highestBidder.toString()).to.equal(
      userSigner.publicKey.toString()
    );
    expect(listingAccountNew.currentBid).to.equal(
      BigInt(1) * listingAccountNew.bidIncrement
    );
    expect(listingAccountNew.endTimeInSlots).to.equal(
      listingAccountOld.endTimeInSlots + listingAccountOld.timerExtensionInSlots
    );

    const user = await fetchUserAccount(umi, userAccount);
    expect(user.points).to.eq(3);
    expect(user.totalBidsPlaced).to.eq(2);
    expect(user.owner).to.eq(userSigner.publicKey);
  });

  it("User 2 Ends pNFT Listing Auction", async () => {
    const mint = pNft.mint;
    const collection = pNft.collection;
    const seed = seedPnftListing;

    const [listing] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("listing"),
        marketplace.toBuffer(),
        mint.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const listingAccountOld = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    const userSigner = createSignerFromKeypair(
      umi,
      umi.eddsa.createKeypairFromSecretKey(user2.secretKey)
    );

    const ata = getAssociatedTokenAddressSync(mint, user2.publicKey);
    const escrow = getAssociatedTokenAddressSync(mint, listing, true);

    const [metadata] = findMetadataPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    });
    const editionAccount = findMasterEditionPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
    })[0];

    const [treasury] = umi.eddsa.findPda(programId, [
      bytes().serialize(
        new Uint8Array([116, 114, 101, 97, 115, 117, 114, 121])
      ),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
    ]);

    const treasuryBalanceOld = await provider.connection.getBalance(
      toWeb3JsPublicKey(treasury)
    );

    await new Promise((resolve) => setTimeout(resolve, 20 * 1000));

    const [userAccount] = umi.eddsa.findPda(programId, [
      bytes().serialize(new Uint8Array([117, 115, 101, 114])),
      publicKeySerializer().serialize(fromWeb3JsPublicKey(marketplace)),
      publicKeySerializer().serialize(userSigner.publicKey),
    ]);
    const AUTH_RULES_PROGRAM = umi.programs.getPublicKey(
      "authRulesProgram",
      "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
    );

    const ownerTr = findTokenRecordPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
      token: fromWeb3JsPublicKey(escrow),
    })[0];
    const destinationTr = findTokenRecordPda(umi, {
      mint: fromWeb3JsPublicKey(mint),
      token: fromWeb3JsPublicKey(ata),
    })[0];

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

    try {
      const txBuilder = new TransactionBuilder();

      await txBuilder
        .add(
          endListing(umi, {
            user: userSigner,
            admin,
            seller: listingAccountOld.seller,
            userAccount,
            userAta: fromWeb3JsPublicKey(ata),
            mint: fromWeb3JsPublicKey(mint),
            collection: fromWeb3JsPublicKey(collection),
            listing: fromWeb3JsPublicKey(listing),
            marketplace: fromWeb3JsPublicKey(marketplace),
            escrow: fromWeb3JsPublicKey(escrow),
            metadata,
            masterEdition: editionAccount,
            sysvarInstructions: fromWeb3JsPublicKey(
              anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY
            ),
            amount: BigInt(1),
          }).addRemainingAccounts(remainingAccounts)
        )
        .add(setComputeUnitLimit(umi, { units: 600_000 }))
        .sendAndConfirm(umi, options);
    } catch (err) {
      console.log(err);
    }

    const listingAccount = await fetchListingV2(
      umi,
      fromWeb3JsPublicKey(listing)
    );

    expect(listingAccount.isActive).to.eq(false);

    try {
      // check escrow ATA has been closed
      await provider.connection.getTokenAccountBalance(escrow);
    } catch (err) {
      const msg =
        "failed to get token account balance: Invalid param: could not find account";
      expect(err.message).to.equal(msg);
    }

    // check user1 has received the NFT
    const user1NftAtaBalance = await provider.connection.getTokenAccountBalance(
      ata
    );
    expect(user1NftAtaBalance.value.amount).to.equal("1");

    // check treasury has received the current bid amount
    const treasuryBalanceNew = await provider.connection.getBalance(
      toWeb3JsPublicKey(treasury)
    );
    expect(treasuryBalanceNew).to.equal(
      treasuryBalanceOld + Number(listingAccount.currentBid)
    );

    const user = await fetchUserAccount(umi, userAccount);
    expect(user.totalAuctionsWon).to.eq(1);
    expect(user.points).to.eq(53);
  });

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

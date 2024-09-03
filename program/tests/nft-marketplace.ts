import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Commitment, Umi } from "@metaplex-foundation/umi";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { createAndMintNftForCollection } from "./utils/nft";
import { initUmi } from "./utils/umi";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

import { createBidToken, mintBidToken } from "./utils/bidToken";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";

const confirmOpts: anchor.web3.ConfirmOptions = {
  preflightCommitment: "confirmed",
  commitment: "confirmed",
}; // processed, confirmed, finalized

describe("nft-marketplace", () => {
  // Configure the client manually to enable "commitment": confirmed
  const connection = new anchor.web3.Connection(
    "http://127.0.0.1:8899",
    confirmOpts.preflightCommitment
  );
  const wallet = NodeWallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, confirmOpts);

  anchor.setProvider(provider);

  const program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;

  let umi: Umi;

  let initializer = anchor.web3.Keypair.generate();
  let user1 = anchor.web3.Keypair.generate();
  let user2 = anchor.web3.Keypair.generate();
  let user3 = anchor.web3.Keypair.generate();

  let user1BidTokenATA: anchor.web3.PublicKey;
  let user2BidTokenATA: anchor.web3.PublicKey;
  let user3BidTokenATA: anchor.web3.PublicKey;

  let marketplace: anchor.web3.PublicKey;
  let rewardsMint: anchor.web3.PublicKey;
  let treasury: anchor.web3.PublicKey;
  let bidTokenMint: anchor.web3.PublicKey;
  let bidsVault: anchor.web3.PublicKey;

  let nft: {
    mint: anchor.web3.PublicKey;
    ata: anchor.web3.PublicKey;
    collection: anchor.web3.PublicKey;
  };

  before(async () => {
    await Promise.all(
      [initializer, user1, user2, user3].map(async (k) => {
        return await anchor
          .getProvider()
          .connection.requestAirdrop(
            k.publicKey,
            10 * anchor.web3.LAMPORTS_PER_SOL
          );
      })
    ).then(confirmTxs);

    console.log("🟢 Airdrop Done!");

    umi = initUmi(connection, wallet);

    try {
      const { mint, ata, collection } = await createAndMintNftForCollection(
        umi,
        1,
        user1.publicKey
      );

      console.log("[before] Collection mint", collection.toString());
      console.log("[before] Mint", mint.toString());
      console.log("[before] Ata", ata.toString());

      nft = { mint, ata, collection };

      // Create the mint for bid tokens
      bidTokenMint = toWeb3JsPublicKey((await createBidToken(umi)).publicKey);

      user1BidTokenATA = getAssociatedTokenAddressSync(
        bidTokenMint,
        user1.publicKey
      );
      user2BidTokenATA = getAssociatedTokenAddressSync(
        bidTokenMint,
        user2.publicKey
      );
      user3BidTokenATA = getAssociatedTokenAddressSync(
        bidTokenMint,
        user3.publicKey
      );

      await mintBidToken(umi, bidTokenMint, 10 * 10 ** 6, user1.publicKey);
      await mintBidToken(umi, bidTokenMint, 10 * 10 ** 6, user2.publicKey);
      await mintBidToken(umi, bidTokenMint, 10 * 10 ** 6, user3.publicKey);

      //console.log("---------------------");
      //console.log("[before] Bid Token Mint", bidTokenMint.toString());
      //console.log("[before] User1 Bid Token ATA", user1BidTokenATA.toString());
      //console.log("[before] User2 Bid Token ATA", user2BidTokenATA.toString());
      //console.log("[before] User3 Bid Token ATA", user3BidTokenATA.toString());
      //console.log("---------------------");
      //
      console.log(
        "[before] User3 Bid Token ATA balance",
        (await connection.getTokenAccountBalance(user2BidTokenATA)).value
          .uiAmount
      );
    } catch (error) {
      console.error(`Oops.. Something went wrong: ${error}`);
    }
  });

  it("Initialize Marketplace", async () => {
    const name = "Penny Auction NFT Marketplace";
    const fee = 500; // 5% in basis points

    const [_marketplace, marketplaceBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("marketplace"),
          anchor.utils.bytes.utf8.encode(name),
        ],
        program.programId
      );

    marketplace = _marketplace;

    const [_rewardsMint, rewardsBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("rewards"), marketplace.toBuffer()],
        program.programId
      );

    rewardsMint = _rewardsMint;

    const [_treasury, treasuryBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("treasury"), marketplace.toBuffer()],
        program.programId
      );

    treasury = _treasury;

    bidsVault = getAssociatedTokenAddressSync(bidTokenMint, marketplace, true);

    //console.log("[initialize] Marketplace", marketplace.toString());
    //console.log("[initialize] Rewards Mint", rewardsMint.toString());
    //console.log("[initialize] Treasury", treasury.toString());
    //console.log("[initialize] Bids Mint", bidTokenMint.toString());
    //console.log("[initialize] Bids Vault", bidsVault.toString());
    //console.log("---------------------");

    let accounts = {
      admin: initializer.publicKey,
      marketplace,
      rewardsMint,
      bidsMint: bidTokenMint,
      bidsVault,
      treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    try {
      let tx = await program.methods
        .initialize(name, fee)
        .accounts(accounts)
        .signers([initializer])
        .rpc();

      const marketplaceAccount = await program.account.marketplace.fetch(
        marketplace
      );

      expect(marketplaceAccount.name).to.be.equal(name);
      expect(marketplaceAccount.admin).deep.equal(initializer.publicKey);
      expect(marketplaceAccount.bidsVault.toBase58()).to.equal(
        bidsVault.toBase58()
      );
      expect(marketplaceAccount.bidsMint.toBase58()).to.equal(
        bidTokenMint.toBase58()
      );
      expect(marketplaceAccount.fee).to.be.equal(fee);
      expect(marketplaceAccount.bump).to.be.equal(marketplaceBump);
      expect(marketplaceAccount.rewardsBump).to.be.equal(rewardsBump);
      expect(marketplaceAccount.treasuryBump).to.be.equal(treasuryBump);

      console.log("Your transaction signature", tx);
    } catch (err) {
      console.error(err);
    }
  });

  it("List", async () => {
    const price = 3 * anchor.web3.LAMPORTS_PER_SOL;
    const [listing, listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("listing"),
        marketplace.toBuffer(),
        nft.mint.toBuffer(),
      ],
      program.programId
    );

    const escrow = getAssociatedTokenAddressSync(nft.mint, listing, true);

    let listingConfig = {
      bidIncrement: new anchor.BN(price / 1000),
      timerExtension: new anchor.BN(20 * 1000), // 20 seconds
      startTimestamp: new anchor.BN(Date.now() - 2000),
      initialDuration: new anchor.BN(60 * 60 * 1000), // 1 hour
      buyoutPrice: new anchor.BN(price),
    };

    let accounts = {
      seller: user1.publicKey,
      listing,
      marketplace,
      mint: nft.mint,
      collection: nft.collection,
      sellerAta: nft.ata,
      escrow,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    try {
      let tx = await program.methods
        .list(
          listingConfig.bidIncrement,
          listingConfig.timerExtension,
          listingConfig.startTimestamp,
          listingConfig.initialDuration,
          listingConfig.buyoutPrice
        )
        .accounts(accounts)
        .signers([user1])
        .rpc();

      console.log("Your transaction signature", tx);
    } catch (error) {
      console.error(error);
    }

    const listingAccount = await program.account.listing.fetch(listing);

    //console.log(JSON.stringify(listingAccount, null, 2));

    expect(listingAccount.mint).deep.equal(nft.mint);
    expect(listingAccount.seller).deep.equal(user1.publicKey);
    expect(listingAccount.bidCost.eq(new anchor.BN(1))).to.eq(true);
    expect(listingAccount.bidIncrement.eq(listingConfig.bidIncrement)).to.eq(
      true
    );
    expect(listingAccount.currentBid.eq(new anchor.BN(0))).to.eq(true);
    expect(listingAccount.highestBidder).to.deep.eq(
      anchor.web3.PublicKey.default
    );
    expect(
      listingAccount.timerExtension.eq(listingConfig.timerExtension)
    ).to.eq(true);
    expect(listingAccount.startTime.eq(listingConfig.startTimestamp)).to.eq(
      true
    );
    expect(
      listingAccount.endTime.eq(
        listingConfig.startTimestamp.add(listingConfig.initialDuration)
      )
    ).to.eq(true);
    expect(listingAccount.isActive).to.eq(true);
    expect(listingAccount.buyoutPrice.eq(listingConfig.buyoutPrice)).to.eq(
      true
    );
    expect(listingAccount.bump).to.equal(listingBump);

    // Check seller ATA has been debited
    const sellerAta = await provider.connection.getTokenAccountBalance(nft.ata);
    expect(sellerAta.value.amount).to.equal("0");

    // Check escrow ATA has been credited
    const escrowAccount = await provider.connection.getTokenAccountBalance(
      escrow
    );
    expect(escrowAccount.value.amount).to.equal("1");
  });

  it("Bid", async () => {
    const [listing, listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("listing"),
        marketplace.toBuffer(),
        nft.mint.toBuffer(),
      ],
      program.programId
    );

    let listingAccount = await program.account.listing.fetch(listing);

    let oldEndTime = listingAccount.endTime.toNumber();
    let bidIncrement = listingAccount.bidIncrement.toNumber();
    let timerExtension = listingAccount.timerExtension.toNumber();

    let accounts = {
      bidder: user2.publicKey,
      bidderAta: user2BidTokenATA,
      mint: nft.mint,
      listing,
      marketplace,
      bidsMint: bidTokenMint,
      bidsVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    try {
      let tx = await program.methods
        .placeBid()
        .accounts(accounts)
        .signers([user2])
        .rpc();

      listingAccount = await program.account.listing.fetch(listing);

      expect(listingAccount.currentBid.toNumber()).to.equal(bidIncrement);
      expect(listingAccount.highestBidder).to.deep.equal(user2.publicKey);
      expect(listingAccount.endTime.toNumber()).to.equal(
        oldEndTime + timerExtension
      );

      // check one bid token was debited from user2
      const user2Ata = await provider.connection.getTokenAccountBalance(
        user2BidTokenATA
      );
      expect(user2Ata.value.uiAmount).to.equal(9);

      // check one bid token has been credited to vault
      let vaultBalance = await provider.connection.getTokenAccountBalance(
        bidsVault
      );
      expect(vaultBalance.value.uiAmount).to.equal(1);

      console.log("Bid 1 transaction signature", tx);

      oldEndTime = listingAccount.endTime.toNumber();

      accounts = {
        bidder: user3.publicKey,
        bidderAta: user3BidTokenATA,
        mint: nft.mint,
        listing,
        marketplace,
        bidsMint: bidTokenMint,
        bidsVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      tx = await program.methods
        .placeBid()
        .accounts(accounts)
        .signers([user3])
        .rpc();

      listingAccount = await program.account.listing.fetch(listing);

      expect(listingAccount.currentBid.toNumber()).to.equal(2 * bidIncrement);
      expect(listingAccount.highestBidder).to.deep.equal(user3.publicKey);
      expect(listingAccount.endTime.toNumber()).to.equal(
        oldEndTime + timerExtension
      );

      // check one bid token was debited from user2
      const user3Ata = await provider.connection.getTokenAccountBalance(
        user3BidTokenATA
      );
      expect(user3Ata.value.uiAmount).to.equal(9);

      // check one bid token has been credited to vault
      vaultBalance = await provider.connection.getTokenAccountBalance(
        bidsVault
      );
      expect(vaultBalance.value.uiAmount).to.equal(2);

      console.log("Bid 2 transaction signature", tx);
    } catch (error) {
      console.error(error);
    }
  });

  /*
  it("Delist", async () => {
    const [listing, _listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("listing"),
        marketplace.toBuffer(),
        nft.mint.toBuffer(),
      ],
      program.programId
    );

    const vault = await getAssociatedTokenAddress(nft.mint, listing, true);

    let accounts = {
      maker: user1.publicKey,
      marketplace,
      makerMint: nft.mint,
      makerAta: nft.ata,
      listing,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    try {
      let tx = await program.methods
        .delist()
        .accounts(accounts)
        .signers([user1])
        .rpc();

      console.log("Your transaction signature", tx);
    } catch (error) {
      console.error(error);
    }

    const errorMessage = `Account does not exist or has no data ${listing.toBase58()}`;
    try {
      await program.account.listing.fetch(listing);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).to.deep.equal(errorMessage);
      }
    }

    const vaultAccount = await provider.connection.getAccountInfo(
      vault
    );
    expect(vaultAccount).to.be.null;

    const userAta = await provider.connection.getTokenAccountBalance(nft.ata);
    expect(userAta.value.amount).to.equal("1");
  });
  */

  /*
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
    expect(userAccount.totalBidsPlaced).to.equal(new anchor.BN(0));
    expect(userAccount.totalAuctionsWon).to.equal(new anchor.BN(0));
    expect(userAccount.totalAuctionsParticipated).to.equal(new anchor.BN(0));
    expect(userAccount.points).to.equal(new anchor.BN(0));
    expect(userAccount.bump).to.equal(bump);
  })
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

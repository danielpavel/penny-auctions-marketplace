import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Commitment, KeypairSigner, Umi } from "@metaplex-foundation/umi";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { createAndMintNftForCollection } from "./utils/nft";
import { initUmi } from "./utils/umi";

import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";

const commitment: Commitment = "finalized"; // processed, confirmed, finalized

describe("nft-marketplace", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;

  let umi: Umi;

  let initializer = anchor.web3.Keypair.generate();
  let user1 = anchor.web3.Keypair.generate();
  let user2 = anchor.web3.Keypair.generate();

  let marketplace: anchor.web3.PublicKey;
  let rewardsMint: anchor.web3.PublicKey;
  let treasury: anchor.web3.PublicKey;

  let nft: {
    mint: anchor.web3.PublicKey;
    ata: anchor.web3.PublicKey;
    collection: anchor.web3.PublicKey;
  };

  before(async () => {
    await Promise.all(
      [initializer, user1, user2].map(async (k) => {
        return await anchor
          .getProvider()
          .connection.requestAirdrop(
            k.publicKey,
            10 * anchor.web3.LAMPORTS_PER_SOL
          );
      })
    ).then(confirmTxs);

    console.log("🟢 Airdrop Done!");

    umi = initUmi(provider);

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

    let accounts = {
      admin: initializer.publicKey,
      marketplace,
      rewardsMint,
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
      expect(marketplaceAccount.fee).to.be.equal(fee);
      expect(marketplaceAccount.bump).to.be.equal(marketplaceBump);
      expect(marketplaceAccount.admin).deep.equal(initializer.publicKey);
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

    const vault = await getAssociatedTokenAddress(nft.mint, listing, true);

    let listingConfig = {
      bidIncrement: new anchor.BN(price / 1000),
      timerExtension: new anchor.BN(20 * 1000), // 20 seconds
      startTimestamp: new anchor.BN(Date.now()),
      initialDuration: new anchor.BN(60 * 60 * 1000), // 1 hour
      buyoutPrice: new anchor.BN(price),
    }

    let accounts = {
      maker: user1.publicKey,
      marketplace,
      makerMint: nft.mint,
      collection: nft.collection,
      makerAta: nft.ata,
      listing,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    try {
      let tx = await program.methods
        .list(
          listingConfig.bidIncrement,
          listingConfig.timerExtension,
          listingConfig.startTimestamp,
          listingConfig.initialDuration,
          listingConfig.buyoutPrice,
        )
        .accounts(accounts)
        .signers([user1])
        .rpc();

      console.log("Your transaction signature", tx);
    } catch (error) {
      console.error(error);
    }

    const listingAccount = await program.account.listing.fetch(listing);
    expect(listingAccount.mint).deep.equal(nft.mint);
    expect(listingAccount.seller).deep.equal(user1.publicKey);
    expect(listingAccount.bidCost).to.eq(new anchor.BN(1));
    expect(listingAccount.bidIncrement).to.eq(listingConfig.bidIncrement);
    expect(listingAccount.currentBid).to.eq(new anchor.BN(0));
    expect(listingAccount.highestBidder).to.eq(anchor.web3.PublicKey.default);
    expect(listingAccount.timerExtension).to.eq(listingConfig.timerExtension);
    expect(listingAccount.startTime).to.eq(listingConfig.startTimestamp);
    expect(listingAccount.endTime).to.eq(listingConfig.startTimestamp.add(listingConfig.initialDuration));
    expect(listingAccount.isActive).to.eq(true);
    expect(listingAccount.buyoutPrice).to.eq(listingConfig.buyoutPrice);
    expect(listingAccount.bump).to.equal(listingBump);

    const vaultAccount = await provider.connection.getTokenAccountBalance(
      vault
    );
    expect(vaultAccount.value.amount).to.equal("1");
  });

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
  })

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
    commitment
  );
};

const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx));
};

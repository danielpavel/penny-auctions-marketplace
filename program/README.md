<h1 align="center">
  <br>
  <img src="https://shdw-drive.genesysgo.net/AjrX4GfkKrStohvx5yR7PYk9mJPDu2kkf1oGWADJRfwi/sandcastle.png" alt="Sandcastle Deals" width="500">
  <br>
</h1>

<h4 align="center">Beat the Market: Snag Top-Tier NFTs for Lamports</h4>

<p align="center">
  <a href="#description">Description</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#how-to-use">How To Use</a> •
  <a href="#how-to-use">Future Work</a>
</p>

## Description

This repository hosts the Solana program implementation of the Sandcastle Deals Marketplace.

## Key Features

- **`initialize`** -> initializes the marketplace account state
- **`list`** -> create a listing account state -> transfer the nft fot that listing to an escrow account
- **`delist`** -> withdraws a listing which has no bids
- **`place_bid`** -> places a bid for that listing which means transfering a bid token to the markeplace treasury and the listing account state will bump the end time by 20 seconds - write the user that placed a bid as "last bidder" and also increase the current_bid price by a fixed amount
- **`end_list`** -> user pays the current_bid amount in sol in the marketplace treasury and receives the nft
- **`initialize_user`** -> initializes user state account that holds information such as: _total_bids_placed_, _total_auctions_participated_, _total_auctions_won_, _reward_points_

## How To Use

### Build and deploy

To clone and run this program, you'll need [Git](https://git-scm.com), [Node.js](https://nodejs.org/en/download/), [Rust](https://www.rust-lang.org/tools/install), [Solana](https://docs.solana.com/cli/install-solana-cli-tools) and [Anchor](https://www.anchor-lang.com/docs/installation])

From your command line:

```bash
# Clone this repository
$ git clone https://github.com/danielpavel/penny-auctions-marketplace.git

# Go into the repository
$ cd penny-auctions-marketplace

# Build the program
$ anchor build

# Run Unit-Tests
$ anchor test
```

### Run Local Validator

⚠️ **Important!** Run the tests because `anchor` will create a solana local validator config directory which contains the extra programs necessarry later on.

After building the program you can run a local solana validator in a diferent terminal:

```bash
# Run the validator
$ solana-test-validator --ledger .anchor/test-ledget
```

and deploy your program:

```bash
# Run the validator
$ solana program deploy --program-id ./target/deploy/nft_marketplace-keypair.json ./target/deploy/nft_marketplace.so
```

## CLI

⚠️ **Important!** You need to create an admin keypair and put it a `wallets` folder:

```bash
$  solana-keygen pubkey ./wallets/admin.json
```

**Initialize the marketplace**

```bash
# initialize the marketplace:
yarn script init --cluster localhost -k ./wallets/admin.json
```

**Create a listing**

```bash
# create a user keypair:
solana-keygen pubkey ./wallets/user1.json

# mint an NFT owned by user1:
yarn script mint-nft -c localhost -a <user1_pubkey> --collection <collection_mint_pubkey> -k ./wallets/user1.json

# create listing:
yarn script create-auction -c localhost -k ./wallets/user1.json --collection <collection_mint_pubkey> -n <nft_mint_pubkey> -d <duration_of_auction_in_slots> -p <buyout_price_in_lamports>
```

**Place a bid**

```bash
# create a user 2:
$ solana-keygen pubkey ./wallets/user1.json

# mint some bid tokens:
$ yarn script mint-bid-token -c localhost -k ./wallets/admin.json --receiver <user2_pubkey> --amount <amount> --mint <bid_token_mint>

# place a bid
$ yarn script place-bid -c localhost -k ./wallets/user2.json -n <nft_mint_pubkey> -b <bid_token_mint>
```

**End an auction**

```bash
$ yarn script end-auction -c localhost -w <winner_wallet> -n <nft_mint_pubkey>
```

**Show auction information**

```bash
$ yarn script get-auction-info -a <nft_mint_pubkey> -c localhost -k ./wallets/admin.json
```

**Show marketplace information**

```bash
$ yarn script get-marketplace-info -c localhost -k ./wallets/admin.json -a <marketplace_pda_pubkey>
```

## Future Work

Further improvements are on the horizon such as:

1. Add extra seed when creating a listing such that the listing account of a subsequent listing of the same NFT will not collide with the 1st
2. Add support for Metaplex Core Assets

## 👋

> GitHub [@danielpavel](https://github.com/danielpavel)
> Twitter [@\_daneilpavel](https://twitter.com/_danielpavel)
> Telegram [@\_daneilpavel19](https://t.me/_danielpavel19)

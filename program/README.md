<h1 align="center">
  <br>
  <img src="https://shdw-drive.genesysgo.net/AjrX4GfkKrStohvx5yR7PYk9mJPDu2kkf1oGWADJRfwi/sandcastle.png" alt="Sandcastle Deals" width="500">
  <br>
</h1>

<h4 align="center">Beat the Market: Snag Top-Tier NFTs for Lamports</h4>

<p align="center">
  <a href="#key-features">User Stories</a> •
  <a href="#key-features">Architectural Diagram</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#how-to-use">How To Use</a>
</p>

## User Stories

<a href="User-Stories.md">User Stories</a>

## Architectural Diagram

<img src="https://shdw-drive.genesysgo.net/AjrX4GfkKrStohvx5yR7PYk9mJPDu2kkf1oGWADJRfwi/arch-diagram.png" alt="Sandcastle Deals" width="700">

## Key Features

- **Blockchain Transparency**: All auction activities are recorded on-chain, ensuring full transparency and preventing manipulation.
- **NFT Integration**: Bid on unique digital assets backed by the security of the Solana blockchain.
- **Decentralized Escrow**: NFTs are held in a secure, decentralized escrow until the auction concludes.
- **Automatic Time Extension**: Auction end times are automatically extended with each bid, preventing last-second sniping.

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

## 👋

> GitHub [@danielpavel](https://github.com/danielpavel)
> Twitter [@\_daneilpavel](https://twitter.com/_danielpavel)
> Telegram [@\_daneilpavel19](https://t.me/_danielpavel19)


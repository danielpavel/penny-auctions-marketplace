#!/bin/bash

# Function to display usage information
usage() {
  echo "Usage: $0 <cluster>"
  echo "Clusters: localhost, devnet, mainnet-beta"
  exit 1
}

# Check if correct number of arguments are provided
if [ "$#" -ne 1 ]; then
  usage
fi

# Assign arguments to variables
CLUSTER=$1
PROGRAMS=("${PWD}/target/deploy/nft_marketplace.so" "${PWD}/tests/programs/metaplex_token_metadata_program.so")

# Validate cluster input
case $CLUSTER in
devnet | localhost | mainnet-beta) ;;
*)
  echo "Invalid cluster. Please use localhost, devnet, or mainnet-beta."
  exit 1
  ;;
esac

# Function to deploy a program
deploy_program() {
  local program_path=$1
  local program_name=$(basename "$program_path")
  echo "Deploying $program_path to $CLUSTER..."

  # Deploy the program
  output=$(solana program deploy --url "$CLUSTER" "$program_path" 2>&1)

  # Check if deployment was successful
  if echo "$output" | grep -q "Program Id:"; then
    program_id=$(echo "$output" | grep "Program Id:" | awk '{print $3}')
    echo "$program_name deployed successfully. Program ID: $program_id"
  else
    echo "Failed to deploy $program_name. Error:"
    echo "$output"
    exit 1
  fi
}

# Main script execution

# Ensure Solana CLI is installed
if ! command -v solana &>/dev/null; then
  echo "Solana CLI could not be found. Please install it and try again."
  exit 1
fi

# Check Solana configuration
echo "Current Solana configuration:"
solana config get

# Confirm with user
read -p "Are you sure you want to deploy to $CLUSTER? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# Deploy programs
for program in ${PROGRAMS[@]}; do
  deploy_program "$program"
done

echo "Deployment completed successfully!"

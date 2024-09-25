import { web3 } from "@coral-xyz/anchor";

import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

export const execTx = async (
  transaction: web3.Transaction | web3.VersionedTransaction,
  connection: web3.Connection,
  payer: NodeWallet
) => {
  try {
    //  Add recent blockhash if it's not a versioned transaction
    if (transaction instanceof web3.Transaction) {
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
    }

    //  Sign the transaction with payer wallet
    const signedTx = await payer.signTransaction(transaction);

    console.log(
      "accounts: ",
      (signedTx as web3.Transaction).compileMessage().accountKeys.length
    );

    // Serialize, send and confirm the transaction
    const rawTransaction = signedTx.serialize();

    const result = await connection.simulateTransaction(
      transaction as web3.Transaction
    );
    console.log("simulate result");
    console.log(result);

    if (result.value.err) return;

    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
      preflightCommitment: "processed",
    });
    console.log(`https://solscan.io/tx/${txid}`);

    const confirmed = await connection.confirmTransaction(txid, "confirmed");

    console.log("err ", confirmed.value.err);
  } catch (e) {
    throw new Error("Error executing transaction" + e);
  }
};

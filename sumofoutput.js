const { BigNumber, utils } = require("ethers");
const output = require("./src/output.json");

function calculatetotal() {
  let totalAmountInWei = BigNumber.from(0);
  const uniqueKeys = new Set();
  let totalTxHashLength = 0;

  for (const key in output) {
    if (output.hasOwnProperty(key)) {
      const amountInWei = BigNumber.from(output[key].amount);
      totalAmountInWei = totalAmountInWei.add(amountInWei);
      uniqueKeys.add(key);

      const txHashes = output[key].txHash;

      totalTxHashLength += txHashes.length;
    }
  }

  const totalAmountInEthers = utils.formatEther(totalAmountInWei);

  console.log(`Total amount in OP: ${totalAmountInEthers}`);
  console.log(`Total number of unique Address: ${uniqueKeys.size}`);
  console.log(`Total number of Transactions  ${totalTxHashLength}`);
}

// Call the function to calculate the total
calculatetotal();

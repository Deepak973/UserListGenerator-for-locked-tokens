import { BigNumber, Event, providers } from "ethers";
import { IERC20__factory } from "./IERC20_factory";
import * as fs from "fs";
import * as path from "path";

const JSON_RPC_PROVIDER =
  "https://opt-mainnet.g.alchemy.com/v2/9WBG_MVRsmOhaR5bEVKYclPwb_q9tIiw";

async function fetchTxns(
  to: string,
  name?: string,
  validateEvent?: (events: Event[]) => Promise<Event[]>
): Promise<Record<string, { amount: string; txHash: string[] }>> {
  const token = "0x4200000000000000000000000000000000000042";
  console.log("1");
  const provider = new providers.StaticJsonRpcProvider(JSON_RPC_PROVIDER);
  console.log("provider", provider);
  const factory = IERC20__factory;
  const contract = factory.connect(token, provider);
  const event = contract.filters.Transfer(null, to);
  console.log("2");
  async function getPastLogs(
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> {
    if (fromBlock <= toBlock) {
      try {
        const events = await contract.queryFilter(event, fromBlock, toBlock);
        console.log("3");
        return events;
      } catch (error) {
        // @ts-expect-error

        if (error.error?.message?.indexOf("[") > -1) {
          // alchemy specific solution, that optimizes, taking into account
          // alchemy error information
          // @ts-expect-error
          const { 0: newFromBlock, 1: newToBlock } = error.error.message
            .split("[")[1]
            .split("]")[0]
            .split(", ");

          console.log(
            contract.address,
            "4 Error code: ",
            // @ts-expect-error
            error.error?.code,
            " fromBloc: ",
            Number(newFromBlock),
            " toBlock: ",
            Number(newToBlock)
          );

          const arr1 = await getPastLogs(
            Number(newFromBlock),
            Number(newToBlock)
          );
          const arr2 = await getPastLogs(Number(newToBlock) + 1, toBlock);
          return [...arr1, ...arr2];
        } else {
          // solution that will work with generic rpcs or
          // if alchemy fails with different error
          const midBlock = (fromBlock + toBlock) >> 1;
          const arr1 = await getPastLogs(fromBlock, midBlock);
          const arr2 = await getPastLogs(midBlock + 1, toBlock);
          return [...arr1, ...arr2];
        }
      }
    }
    return [];
  }

  const currentBlockNumber = await provider.getBlockNumber();
  let events = await getPastLogs(0, currentBlockNumber);
  if (validateEvent) events = await validateEvent(events);

  const addressValueMap: Record<string, { amount: string; txHash: string[] }> =
    {};
  let totalValue = BigNumber.from(0);
  let latestBlockNumber = 0;
  events.forEach((e: Event) => {
    if (e.args) {
      let value = BigNumber.from(e.args.value.toString());
      if (value.gt(0)) {
        if (e.blockNumber >= latestBlockNumber) {
          latestBlockNumber = e.blockNumber;
        }

        totalValue = totalValue.add(value);
        // if (symbol === 'LEND') {
        //     value = BigNumber.from(e.args.value.toString()).div(100);
        // }
        if (addressValueMap[e.args.from]) {
          const aggregatedValue = value
            .add(BigNumber.from(addressValueMap[e.args.from].amount))
            .toString();
          addressValueMap[e.args.from].amount = aggregatedValue;
          addressValueMap[e.args.from].txHash.push(e.transactionHash);
        } else {
          addressValueMap[e.args.from] = {
            amount: value.toString(),
            txHash: [e.transactionHash],
          };
        }
      }
    }
  });

  console.log(
    `Total amount for ${name} in wei: ${totalValue}  latestBlock: ${latestBlockNumber}`
  );

  return addressValueMap;
}

async function main() {
  const to = "0x4200000000000000000000000000000000000042";
  const mappedContract = await fetchTxns(to, "OP");
  const filePath = path.join(__dirname, "output.json");

  // Save the data to a JSON file
  fs.writeFileSync(filePath, JSON.stringify(mappedContract, null, 2));

  console.log(`Data saved to ${filePath}`);
}

main();

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const IERC20_factory_1 = require("./IERC20_factory");
const JSON_RPC_PROVIDER = "https://opt-mainnet.g.alchemy.com/v2/9WBG_MVRsmOhaR5bEVKYclPwb_q9tIiw";
function fetchTxns(to, name, validateEvent) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = "0x4200000000000000000000000000000000000042";
        console.log("1");
        const provider = new ethers_1.providers.StaticJsonRpcProvider(JSON_RPC_PROVIDER);
        console.log("provider", provider);
        const contract = IERC20_factory_1.IERC20__factory.connect(token, provider);
        const event = contract.filters.Transfer(null, to);
        console.log("2");
        function getPastLogs(fromBlock, toBlock) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                if (fromBlock <= toBlock) {
                    try {
                        const events = yield contract.queryFilter(event, fromBlock, toBlock);
                        console.log("3");
                        return events;
                    }
                    catch (error) {
                        // @ts-expect-error
                        if (((_b = (_a = error.error) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.indexOf("[")) > -1) {
                            // alchemy specific solution, that optimizes, taking into account
                            // alchemy error information
                            // @ts-expect-error
                            const { 0: newFromBlock, 1: newToBlock } = error.error.message
                                .split("[")[1]
                                .split("]")[0]
                                .split(", ");
                            console.log(contract.address, "4 Error code: ", 
                            // @ts-expect-error
                            (_c = error.error) === null || _c === void 0 ? void 0 : _c.code, " fromBloc: ", Number(newFromBlock), " toBlock: ", Number(newToBlock));
                            const arr1 = yield getPastLogs(Number(newFromBlock), Number(newToBlock));
                            const arr2 = yield getPastLogs(Number(newToBlock) + 1, toBlock);
                            return [...arr1, ...arr2];
                        }
                        else {
                            // solution that will work with generic rpcs or
                            // if alchemy fails with different error
                            const midBlock = (fromBlock + toBlock) >> 1;
                            const arr1 = yield getPastLogs(fromBlock, midBlock);
                            const arr2 = yield getPastLogs(midBlock + 1, toBlock);
                            return [...arr1, ...arr2];
                        }
                    }
                }
                return [];
            });
        }
        const currentBlockNumber = yield provider.getBlockNumber();
        let events = yield getPastLogs(0, currentBlockNumber);
        if (validateEvent)
            events = yield validateEvent(events);
        const addressValueMap = {};
        let totalValue = ethers_1.BigNumber.from(0);
        let latestBlockNumber = 0;
        events.forEach((e) => {
            if (e.args) {
                let value = ethers_1.BigNumber.from(e.args.value.toString());
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
                            .add(ethers_1.BigNumber.from(addressValueMap[e.args.from].amount))
                            .toString();
                        addressValueMap[e.args.from].amount = aggregatedValue;
                        addressValueMap[e.args.from].txHash.push(e.transactionHash);
                    }
                    else {
                        addressValueMap[e.args.from] = {
                            amount: value.toString(),
                            txHash: [e.transactionHash],
                        };
                    }
                }
            }
        });
        console.log(`Total amount for ${name} in wei: ${totalValue}  latestBlock: ${latestBlockNumber}`);
        return addressValueMap;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const to = "0x4200000000000000000000000000000000000042";
        const mappedContract = yield fetchTxns(to, "OP");
        console.log(mappedContract);
    });
}
main();

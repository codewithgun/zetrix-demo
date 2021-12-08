import { Configuration, zetrix } from "../constants/configuration";

export const extractOrAlertIfError = <T>(response: Zetrix.ResponseWrapper<T>): T | undefined => {
	const { errorCode, errorDesc, result } = response;
	if (errorCode) {
		alert(errorDesc);
		return;
	}
	return result;
};

export const getAddressNextNonce = async (address: string) => {
	const nonce = String(await zetrix.account.getNonce(address).then((res) => Number(res.result.nonce) + 1));
	return nonce;
};

export const convertUInt8ArrayToHex = (uint8Array: any) => {
	if (Array.isArray(uint8Array)) {
		return Buffer.from(uint8Array).toString("hex");
	} else if (typeof uint8Array === "string") {
		return Buffer.from(uint8Array.split(",")).toString("hex");
	}
	throw new Error("Invalid uint8 array");
};

const getInvokeByGasOperation = async (sourceAddress: string, input: string) => {
	const invokeContractByGas = await zetrix.operation.contractInvokeByGasOperation({
		sourceAddress,
		contractAddress: Configuration.ContractAddress,
		gasAmount: "0",
		input,
	});
	if (invokeContractByGas.errorCode) {
		throw new Error(invokeContractByGas.errorDesc);
	}
	return invokeContractByGas.result.operation;
};

const getTxBlobOperation = async (sourceAddress: string, operations: Zetrix.BaseOperation[], gasPrice?: string, feeLimit?: string) => {
	const buildTxBlob = zetrix.transaction.buildBlob({
		sourceAddress,
		gasPrice: gasPrice || Configuration.DefaultGasPrice,
		feeLimit: feeLimit || Configuration.DefaultFeeLimit,
		nonce: await getAddressNextNonce(sourceAddress),
		operations,
	});
	if (buildTxBlob.errorCode) {
		throw new Error(buildTxBlob.errorDesc);
	}
	return buildTxBlob.result.transactionBlob;
};

const getSignedTransaction = async (
	sourceAddress: string,
	privateKey: string,
	input: string,
	gasPrice?: string,
	feeLimit?: string
): Promise<{
	blob: string;
	signature: Zetrix.Signature[];
}> => {
	const invokeByGasOperation = await getInvokeByGasOperation(sourceAddress, input);
	const buildTxBlob = await getTxBlobOperation(sourceAddress, [invokeByGasOperation], gasPrice, feeLimit);
	const blob = convertUInt8ArrayToHex(buildTxBlob);
	const signTx = zetrix.transaction.sign({
		privateKeys: [privateKey],
		blob,
	});
	if (signTx.errorCode) {
		throw new Error(signTx.errorDesc);
	}
	return {
		blob,
		signature: signTx.result.signatures,
	};
};

export const simulateAndGetFee = async (sourceAddress: string, input: string) => {
	const invokeByGasOperation = await getInvokeByGasOperation(sourceAddress, input);
	const feeResponse = await zetrix.transaction.evaluateFee({
		nonce: await getAddressNextNonce(sourceAddress),
		sourceAddress,
		operations: [invokeByGasOperation],
	});
	if (feeResponse.errorCode) {
		throw new Error("The contract interaction will fail with the following error:" + feeResponse.errorDesc);
	}
	return feeResponse.result;
};

export const invokeContract = (sourceAddress: string, privateKey: string, input: object) => {
	return new Promise<string>(async (resolve, reject) => {
		try {
			const strInput = JSON.stringify(input);
			const { feeLimit, gasPrice } = await simulateAndGetFee(sourceAddress, strInput);
			const { blob, signature } = await getSignedTransaction(sourceAddress, privateKey, strInput, gasPrice, feeLimit);
			const txSubmit = await zetrix.transaction.submit({
				blob,
				signature,
			});
			if (txSubmit.errorCode) {
				reject(txSubmit.errorDesc);
			}
			let isPolling = false;
			let timer = setInterval(() => {
				(async () => {
					if (!isPolling) {
						isPolling = true;
						const tx = await zetrix.transaction.getInfo(txSubmit.result.hash);
						isPolling = false;
						if (!tx.errorCode) {
							clearInterval(timer);
							resolve(txSubmit.result.hash);
						}
					}
				})();
			}, 1000);
		} catch (error) {
			reject(error);
		}
	});
};

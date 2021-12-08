import ZetrixChainSdk from "zetrix-sdk-nodejs";
// import ZetrixChainSdk from "./../../secret/zetrix-sdk-nodejs";

export const Configuration = {
	ZetrixRpcUrl: "20.205.238.226:19333",
	ContractAddress: "ZTX3bp3RrNCHMh5vHDJX9xoSYq9MXZbcD6FZj",
	ExplorerURL: "https://explorer.zetrix.com",
	DefaultGasPrice: "1000",
	DefaultFeeLimit: "1000000",
};

export const zetrix: ZetrixChainSdk = new ZetrixChainSdk({
	host: Configuration.ZetrixRpcUrl,
});

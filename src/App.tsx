import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import { Col, Container, Form, Row } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import LoadingOverlay from "react-loading-overlay";
import { BeatLoader } from "react-spinners";
import ZetrixEncryption from "zetrix-encryption-nodejs";
import "./App.css";
import { Configuration, zetrix } from "./constants/configuration";
import { extractOrAlertIfError, invokeContract } from "./utility/utility";

function App() {
	const [privateKey, setPrivateKey] = useState<string>("");
	const [address, setAddress] = useState<string>("");
	const [balance, setBalance] = useState<string>("0");
	const [keyToAdd, setKeyToAdd] = useState<string>("");
	const [valueToAdd, setValueToAdd] = useState<string>("");
	const [keyToDelete, setKeyToDelete] = useState<string>("");
	const [showOverlay, setShowOverlay] = useState<boolean>(false);
	const [transactionList, setTransactionList] = useState<string[]>([]);
	const [items, setItems] = useState<{ key: string; value: string }[]>([]);

	let counter: number = 0;

	const showLoading = (shouldShow: boolean) => {
		if (shouldShow) {
			setShowOverlay(true);
			counter++;
		} else {
			if (--counter <= 0) {
				setShowOverlay(false);
				counter = 0;
			}
		}
	};

	const transactions = transactionList.map((hash) => {
		let url = `${Configuration.ExplorerURL}/tx/${hash}`;
		return (
			<Row key={hash}>
				<Col>
					<a href={url}>{hash}</a>
				</Col>
			</Row>
		);
	});

	const setBalanceWithDecimal = (value: string, dp: number) => {
		setBalance(String(Number(value) / Math.pow(10, 8)));
	};

	const updateBalance = async () => {
		if (address) {
			showLoading(true);
			const balanceResponse = await zetrix.account.getBalance(address);
			showLoading(false);
			const result = extractOrAlertIfError(balanceResponse);
			if (result) {
				setBalanceWithDecimal(result.balance, 8);
				setAddress(address);
			} else {
				setBalance("0");
				setAddress("");
			}
		}
	};

	const getOwnerStorage = async () => {
		if (address) {
			showLoading(true);
			const queryResponse = await zetrix.contract.call({
				optType: 2,
				contractAddress: Configuration.ContractAddress,
				input: JSON.stringify({
					owner: address,
				}),
			});
			if (queryResponse.errorCode) {
				alert(queryResponse.errorDesc);
			}
			//@ts-ignore
			const result = queryResponse.result.query_rets[0].result;
			const ownerItems = JSON.parse(result.value);
			setItems(
				Object.entries(ownerItems).map(([key, value]) => {
					return {
						key,
						value: String(value || ""),
					};
				})
			);
			// console.log(ownerItems);
			showLoading(false);
		}
	};

	useEffect(() => {
		updateBalance();
		getOwnerStorage();
	}, [transactionList, address]);

	const btnDeleteOnClick = async () => {
		if (!address || !privateKey) {
			alert("Please import private key");
			return;
		}
		if (keyToDelete) {
			showLoading(true);
			try {
				const txHash = await invokeContract(address, privateKey, {
					name: "remove",
					values: [keyToDelete],
				});
				if (txHash) {
					alert("Completed");
					setTransactionList([...transactionList, txHash]);
				}
			} catch (err) {
				console.log(err);
				alert(err);
			} finally {
				showLoading(false);
			}
		} else {
			alert("Please enter key to delete");
		}
	};

	const btnAddOnClick = async () => {
		if (!address || !privateKey) {
			alert("Please import private key");
			return;
		}
		if (keyToAdd && valueToAdd) {
			showLoading(true);
			try {
				const txHash = await invokeContract(address, privateKey, {
					name: "upsert",
					values: [keyToAdd, valueToAdd],
				});
				if (txHash) {
					alert("Completed");
					setTransactionList([...transactionList, txHash]);
				}
			} catch (err) {
				console.log(err);
				alert(err);
			} finally {
				showLoading(false);
			}
		} else {
			alert("Please fill in key and value to add");
		}
	};

	const btnImportOnClick = async () => {
		const isPrivateKeyValid = ZetrixEncryption.keypair.checkEncPrivateKey(privateKey);
		if (!isPrivateKeyValid) {
			alert("Invalid private key");
			return;
		}
		const publicKey = ZetrixEncryption.keypair.getEncPublicKey(privateKey);
		const address = ZetrixEncryption.keypair.getAddress(publicKey);
		console.log(ZetrixEncryption.keypair.getKeyPair());
		setAddress(address);
	};

	const onKeyToAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setKeyToAdd(e.target.value);
	};

	const onKeyToDeleteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setKeyToDelete(e.target.value);
	};

	const onValueToAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setValueToAdd(e.target.value);
	};

	const onPrivateKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPrivateKey(e.target.value);
	};

	return (
		<LoadingOverlay active={showOverlay} spinner={<BeatLoader color="#FFFFFF" />}>
			<div className="App">
				<Container>
					<Row>
						<Col>
							<Container className="section">
								<Row>
									<Col>
										<h3>Wallet</h3>
									</Col>
								</Row>
								<Row>
									<Col>
										<Form.Control type="password" placeholder="Enter private key" onChange={onPrivateKeyChange} />
									</Col>
									<Col>
										<Button variant="primary" onClick={btnImportOnClick}>
											Import
										</Button>
									</Col>
								</Row>
								<Row>
									<Col>Address : {address}</Col>
								</Row>
								<Row>
									<Col>Balance : {balance} ZTX</Col>
								</Row>
							</Container>
						</Col>
						<Col>
							<Container className="section">
								<Row>
									<Col>
										<h3>Transactions</h3>
									</Col>
								</Row>
								{transactions.length ? (
									transactions
								) : (
									<Row>
										<Col>No transctions</Col>
									</Row>
								)}
							</Container>
						</Col>
					</Row>
					<Row>
						<Col>
							<Container className="section">
								<Row>
									<Col>
										<h3>Contract</h3>
									</Col>
								</Row>
								<Row>
									<Col>
										Address: <a href={Configuration.ExplorerURL + "/account/" + Configuration.ContractAddress}>{Configuration.ContractAddress}</a>
									</Col>
								</Row>
							</Container>
						</Col>
					</Row>
					<Row>
						<Col>
							<Container className="section">
								<Row>
									<Col>
										<h3>Actions</h3>
									</Col>
								</Row>
								<Row>
									<Col>
										<div className="section">
											<div>Add/Update value</div>
											<div>
												<Form.Control type="string" placeholder="Enter key" onChange={onKeyToAddChange} />
											</div>
											<div>
												<Form.Control type="string" placeholder="Enter value" onChange={onValueToAddChange} />
											</div>
											<div>
												<Button variant="success" onClick={btnAddOnClick}>
													Add
												</Button>
											</div>
										</div>
									</Col>
									<Col>
										<div className="section">
											<div>Delete value</div>
											<div>
												<Form.Control type="string" placeholder="Enter key" onChange={onKeyToDeleteChange} />
											</div>
											<div>
												<Button variant="danger" onClick={btnDeleteOnClick}>
													Delete
												</Button>
											</div>
										</div>
									</Col>
								</Row>
							</Container>
						</Col>
					</Row>
					<Row>
						<Col>
							<Container className="section">
								<Row>
									<Col>
										<h3>Value stored in contract</h3>
									</Col>
								</Row>
								<Row>
									<Col>
										<Table>
											<thead>
												<tr>
													<th>#</th>
													<th>Key</th>
													<th>Value</th>
												</tr>
											</thead>
											<tbody>
												{items.map((item, i) => {
													return (
														<tr key={i}>
															<td>{i + 1}</td>
															<td>{item.key}</td>
															<td>{item.value}</td>
														</tr>
													);
												})}
											</tbody>
										</Table>
									</Col>
								</Row>
							</Container>
						</Col>
					</Row>
				</Container>
			</div>
		</LoadingOverlay>
	);
}

export default App;

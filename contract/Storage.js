"use strict";

/**
 * @typedef MainInput
 * @type {object}
 * @property {string} name - method name to invoke
 * @property {any} values - value to be passed to the method
 */

/**
 * @typedef QueryInput
 * @type {object}
 * @property {string} owner - storage owner
 */

let TLog = {
	Update: "Update",
	Insert: "Insert",
	Delete: "Delete",
};

function init() {
	return;
}

/**
 *
 * @param {string} owner
 * @returns {object} storage
 */
function loadStorageOf(owner) {
	let storage = Chain.load(owner);
	return storage ? JSON.parse(storage) : {};
}

/**
 *
 * @param {string} owner
 * @param {object} storage
 */
function saveStorageOf(owner, storage) {
	Chain.store(owner, JSON.stringify(storage));
}

let globalMethods = {
	/**
	 *
	 * @param {string} key
	 * @param {string | number | boolean} value
	 * @param {string} owner
	 */
	upsert: function (key, value, owner) {
		let storage = loadStorageOf(owner);
		let isUpdate = storage.hasOwnProperty(key);
		if (isUpdate) {
			let oldValue = storage[key];
			storage[key] = value;
			saveStorageOf(owner, storage);
			Chain.tlog(TLog.Update, owner, oldValue, value);
		} else {
			storage[key] = value;
			saveStorageOf(owner, storage);
			Chain.tlog(TLog.Insert, owner, value);
		}
	},
	/**
	 *
	 * @param {string} key
	 * @param {string} owner
	 */
	remove: function (key, owner) {
		let storage = loadStorageOf(owner);
		Utils.assert(storage.hasOwnProperty(key), "unknown key");
		delete storage[key];
		saveStorageOf(owner, storage);
		Chain.tlog(TLog.Delete, owner, key);
	},
};

/**
 * @param {string} input
 */
function main(input) {
	/**
	 * @type {MainInput}
	 */
	let method = JSON.parse(input);
	Utils.assert(globalMethods.hasOwnProperty(method.name), "invalid method");
	globalMethods[method.name](...method.values, Chain.msg.sender);
}

/**
 *
 * @param {string} input
 * @returns {string}
 */
function query(input) {
	/**
	 * @type {QueryInput}
	 */
	let queryInput = JSON.parse(input);
	return JSON.stringify(loadStorageOf(queryInput.owner));
}

/**
 * High level crypto api that invokes native crypto (if available) and
 * gracefully degrades to JS crypto (if unavailable)
 */
app.crypto.Crypto = function(window, util) {
	'use strict';

	var symmetricUserKey = null, // the user's secret key used to encrypt item-keys
		keyId = null, // the key ID linking the user's key set
		aes = new app.crypto.AesCBC(forge); // use AES-CBC mode by default

	/**
	 * Initializes the crypto modules by fetching the user's
	 * encrypted secret key from storage and storing it in memory.
	 */
	this.init = function(emailAddress, password, keySize, ivSize, callback) {
		this.emailAddress = emailAddress;
		this.keySize = keySize;
		this.ivSize = ivSize;

		// derive PBKDF2 from password in web worker thread
		this.deriveKey(password, keySize, function(pbkdf2) {

			// fetch user's encrypted secret key from keychain/storage
			var keyStore = new app.dao.LocalStorageDAO(window);
			var storageId = emailAddress + '_encryptedSymmetricKey';
			var storedKey = keyStore.read(storageId);

			// check if key exists
			if (!storedKey) {
				// generate key, encrypt and persist if none exists
				symmetricUserKey = util.random(keySize);
				var iv = util.random(ivSize);
				var key = aes.encrypt(symmetricUserKey, pbkdf2, iv);
				storedKey = {
					_id: util.UUID(),
					userId: emailAddress,
					encryptedKey: key,
					keyIV: iv
				};
				keyStore.persist(storageId, storedKey);
			} else {
				// decrypt key
				try {
					symmetricUserKey = aes.decrypt(storedKey.encryptedKey, pbkdf2, storedKey.keyIV);
				} catch (ex) {
					callback({
						errMsg: 'Wrong password!'
					});
					return;
				}

			}
			keyId = storedKey._id;

			callback();
		});
	};

	/**
	 * Do PBKDF2 key derivation in a WebWorker thread
	 */
	this.deriveKey = function(password, keySize, callback) {
		// check for WebWorker support
		if (window.Worker) {

			// init webworker thread
			var worker = new Worker(app.config.workerPath + '/crypto/pbkdf2-worker.js');

			worker.onmessage = function(e) {
				// return derived key from the worker
				callback(e.data);
			};

			// send plaintext data to the worker
			worker.postMessage({
				password: password,
				keySize: keySize
			});

		} else {
			// no WebWorker support... do synchronous call
			var pbkdf2 = new app.crypto.PBKDF2();
			var key = pbkdf2.getKey(password, keySize);
			callback(key);
		}
	};

	/**
	 * Derive an asymmetric keypait from the user's secret
	 */
	this.deriveKeyPair = function(naclCrypto, callback) {
		naclCrypto.generateKeypair(symmetricUserKey, function(keys) {
			if (keyId) {
				keys.id = keyId;
			}
			callback(keys);
		});
	};

	//
	// En/Decrypts single item
	//

	this.aesEncrypt = function(plaintext, key, iv, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'encrypt',
				plaintext: plaintext,
				key: key,
				iv: iv
			});

		} else {
			var ct = this.aesEncryptSync(plaintext, key, iv);
			callback(ct);
		}
	};

	this.aesDecrypt = function(ciphertext, key, iv, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'decrypt',
				ciphertext: ciphertext,
				key: key,
				iv: iv
			});

		} else {
			var pt = this.aesDecryptSync(ciphertext, key, iv);
			callback(pt);
		}
	};

	this.aesEncryptSync = function(plaintext, key, iv) {
		return aes.encrypt(plaintext, key, iv);
	};

	this.aesDecryptSync = function(ciphertext, key, iv) {
		return aes.decrypt(ciphertext, key, iv);
	};

	//
	// En/Decrypt a list of items with AES in a WebWorker thread
	//

	this.aesEncryptList = function(list, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-batch-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'encrypt',
				list: list
			});

		} else {
			var encryptedList = util.encryptList(aes, list);
			callback(encryptedList);
		}
	};

	this.aesDecryptList = function(list, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-batch-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'decrypt',
				list: list
			});

		} else {
			var decryptedList = util.decryptList(aes, list);
			callback(decryptedList);
		}
	};

	//
	// En/Decrypt something speficially using the user's secret key
	//

	this.aesEncryptForUser = function(plaintext, iv, callback) {
		var ciphertext = aes.encrypt(plaintext, symmetricUserKey, iv);
		callback(ciphertext);
	};
	this.aesDecryptForUser = function(ciphertext, iv, callback) {
		var decrypted = aes.decrypt(ciphertext, symmetricUserKey, iv);
		callback(decrypted);
	};
	this.aesEncryptForUserSync = function(plaintext, iv) {
		return aes.encrypt(plaintext, symmetricUserKey, iv);
	};
	this.aesDecryptForUserSync = function(ciphertext, iv) {
		return aes.decrypt(ciphertext, symmetricUserKey, iv);
	};

	this.aesEncryptListForUser = function(list, callback) {
		var envelope, envelopes = [],
			self = this;

		// package objects into batchable envelope format
		list.forEach(function(i) {
			envelope = {
				id: i.id,
				plaintext: i,
				key: util.random(self.keySize),
				iv: util.random(self.ivSize)
			};
			envelopes.push(envelope);
		});

		// encrypt list
		this.aesEncryptList(envelopes, function(encryptedList) {

			// encrypt keys for user
			encryptedList.forEach(function(i) {
				// process new values
				i.itemIV = i.iv;
				i.keyIV = util.random(self.ivSize);
				i.encryptedKey = self.aesEncryptForUserSync(i.key, i.keyIV);
				// delete old ones
				delete i.iv;
				delete i.key;
			});

			callback(encryptedList);
		});
	};

	this.aesDecryptListForUser = function(encryptedList, callback) {
		var list = [],
			self = this;

		// decrypt keys for user
		encryptedList.forEach(function(i) {
			// decrypt item key
			i.key = self.aesDecryptForUserSync(i.encryptedKey, i.keyIV);
			i.iv = i.itemIV;
			// delete old values
			delete i.keyIV;
			delete i.itemIV;
			delete i.encryptedKey;
		});

		// decrypt list
		this.aesDecryptList(encryptedList, function(decryptedList) {
			// add plaintext to list
			decryptedList.forEach(function(i) {
				list.push(i.plaintext);
			});

			callback(list);
		});
	};

};
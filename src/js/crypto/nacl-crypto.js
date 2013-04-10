/**
 * A Wrapper for NaCl's asymmetric/symmetric crypto
 */
var NaclCrypto = function(nacl, util) {
	'use strict';

	/**
	 * Generates a baes64 encoded keypair for use with NaCl
	 * @param seed [String] A base64 encoded (pseudo) random seed e.g. PBKDF2
	 */
	this.generateKeypair = function(seed) {
		var keys;

		if (seed) {
			var seedBuf = nacl.encode_latin1(util.base642Str(seed));
			keys = nacl.crypto_box_keypair_from_seed(seedBuf);
		} else {
			keys = nacl.crypto_box_keypair();
		}

		return {
			boxPk: util.str2Base64(nacl.decode_latin1(keys.boxPk)),
			boxSk: util.str2Base64(nacl.decode_latin1(keys.boxSk))
		};
	};

	/**
	 * Asymmetrically encrypt a String
	 * @param plaintext [String] The input string in UTF8
	 * @param recipientBoxPk [String] The receiver's base64 encoded public key
	 * @param senderBoxSk [String] The sender's base64 encoded private key
	 * @return [Object] The base64 encoded ciphertext and nonce
	 */
	this.asymmetricEncrypt = function(plaintext, recipientBoxPk, senderBoxSk) {
		// convert to Uint8Array
		var ptBuf = nacl.encode_utf8(plaintext);
		var recipientBoxPkBuf = nacl.encode_latin1(util.base642Str(recipientBoxPk));
		var senderBoxSkBuf = nacl.encode_latin1(util.base642Str(senderBoxSk));
		// generate nonce
		var nonce = nacl.crypto_secretbox_random_nonce();
		// encrypt
		var ct = nacl.crypto_box(ptBuf, nonce, recipientBoxPkBuf, senderBoxSkBuf);
		// encode to base64
		var ctBase64 = util.str2Base64(nacl.decode_latin1(ct));
		var nonceBase64 = util.str2Base64(nacl.decode_latin1(nonce));

		return {
			ct: ctBase64,
			nonce: nonceBase64
		};
	};

	/**
	 * Asymmetrically decrypt a String
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param nonce [String] The base64 encoded nonce
	 * @param senderBoxPk [String] The sender's base64 encoded public key
	 * @param recipientBoxSk [String] The receiver's base64 encoded private key
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.asymmetricDecrypt = function(ciphertext, nonce, senderBoxPk, recipientBoxSk) {
		// convert to Uint8Array
		var ctBuf = nacl.encode_latin1(util.base642Str(ciphertext));
		var nonceBuf = nacl.encode_latin1(util.base642Str(nonce));
		var senderBoxPkBuf = nacl.encode_latin1(util.base642Str(senderBoxPk));
		var recipientBoxSkBuf = nacl.encode_latin1(util.base642Str(recipientBoxSk));
		// decrypt
		var pt = nacl.crypto_box_open(ctBuf, nonceBuf, senderBoxPkBuf, recipientBoxSkBuf);
		// decode to string
		var ptStr = nacl.decode_utf8(pt);

		return ptStr;
	};

	/**
	 * Symmetrically encrypt a String
	 * @param plaintext [String] The input string in UTF8
	 * @param secretKey [String] The receiver's base64 encoded public key
	 * @return [Object] The base64 encoded ciphertext and nonce
	 */
	this.symmetricEncrypt = function(plaintext, secretKey) {
		// convert to Uint8Array
		var ptBuf = nacl.encode_utf8(plaintext);
		var secretKeyBuf = nacl.encode_latin1(util.base642Str(secretKey));
		// generate nonce
		var nonce = nacl.crypto_secretbox_random_nonce();
		// encrypt
		var ct = nacl.crypto_secretbox(ptBuf, nonce, secretKeyBuf);
		// encode to base64
		var ctBase64 = util.str2Base64(nacl.decode_latin1(ct));
		var nonceBase64 = util.str2Base64(nacl.decode_latin1(nonce));

		return {
			ct: ctBase64,
			nonce: nonceBase64
		};
	};

	/**
	 * Symmetrically decrypt a String
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param nonce [String] The base64 encoded nonce
	 * @param secretKey [String] The sender's base64 encoded public key
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.symmetricDecrypt = function(ciphertext, nonce, secretKey) {
		// convert to Uint8Array
		var ctBuf = nacl.encode_latin1(util.base642Str(ciphertext));
		var nonceBuf = nacl.encode_latin1(util.base642Str(nonce));
		var secretKeyBuf = nacl.encode_latin1(util.base642Str(secretKey));
		// decrypt
		var pt = nacl.crypto_secretbox_open(ctBuf, nonceBuf, secretKeyBuf);
		// decode to string
		var ptStr = nacl.decode_utf8(pt);

		return ptStr;
	};

};

if (typeof module !== 'undefined' && module.exports) {
	module.exports = NaclCrypto;
} else {
	app.crypto.NaclCrypto = NaclCrypto;
}
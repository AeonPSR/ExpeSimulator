/**
 * Hash
 *
 * Generic hashing utilities with no dependencies.
 */
const Hash = {

	/**
	 * Computes the CRC32b hash of a UTF-8 string, matching PHP's
	 * hash('crc32', $str).  Returns an *unsigned* 32-bit integer so that
	 * a subsequent modulo always lands in a positive range, just like
	 * PHP's intval() on the hex representation.
	 *
	 * @param {string} str
	 * @returns {number}
	 */
	crc32(str) {
		const table = new Uint32Array(256);
		for (let i = 0; i < 256; i++) {
			let c = i;
			for (let j = 0; j < 8; j++) {
				c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
			}
			table[i] = c;
		}

		// Encode as UTF-8 bytes (mirrors PHP string → CRC32 behaviour).
		// Use Buffer in Node.js/Jest environments where TextEncoder is unavailable.
		const bytes = (typeof TextEncoder !== 'undefined')
			? new TextEncoder().encode(str)
			: Buffer.from(str, 'utf8');

		let crc = 0xFFFFFFFF;
		for (const byte of bytes) {
			crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF];
		}

		// >>> 0 keeps the result unsigned (matches PHP intval of hex string)
		return (crc ^ 0xFFFFFFFF) >>> 0;
	}

};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.Hash = Hash;

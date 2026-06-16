/**
 * Hash utility tests
 */

describe('Hash', () => {

	describe('crc32', () => {

		test('returns an unsigned 32-bit integer (>= 0)', () => {
			const result = Hash.crc32('anything');
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(0xFFFFFFFF);
		});

		test('is deterministic — same input always yields the same output', () => {
			expect(Hash.crc32('Vie Heureuse')).toBe(Hash.crc32('Vie Heureuse'));
		});

		test('is sensitive to case', () => {
			expect(Hash.crc32('fugubos')).not.toBe(Hash.crc32('Fugubos'));
		});

		// Ground-truth values verified against PHP hash('crc32', ...) via the
		// same CRC32b algorithm used by the game server.
		test.each([
			['Rocky World',    3223245548],
			['Fugubos',        4136742940],
			['Vie Heureuse',   2855688966],
			['Polyphemus',     1378042749],
			['Museum',         1709916481],
			['Thousands Cuts', 2534595022],
		])('matches PHP crc32 for "%s"', (name, expected) => {
			expect(Hash.crc32(name)).toBe(expected);
		});

	});

});

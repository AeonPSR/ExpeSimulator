/**
 * Format utility tests
 */

describe('Format', () => {

	describe('resourceValue', () => {

		test('returns "0" for zero', () => {
			expect(Format.resourceValue(0)).toBe('0');
		});

		test('returns "<0.1" for values between 0 and 0.1', () => {
			expect(Format.resourceValue(0.05)).toBe('<0.1');
			expect(Format.resourceValue(0.099)).toBe('<0.1');
		});

		test('returns one decimal place for values >= 0.1', () => {
			expect(Format.resourceValue(0.1)).toBe('0.1');
			expect(Format.resourceValue(1.5)).toBe('1.5');
			expect(Format.resourceValue(3)).toBe('3.0');
		});

	});

	describe('prob', () => {

		test('returns empty string for undefined', () => {
			expect(Format.prob(undefined)).toBe('');
		});

		test('returns "(0%)" for zero probability', () => {
			expect(Format.prob(0)).toBe('(0%)');
		});

		test('returns "(<0.1%)" for very small non-zero probability', () => {
			expect(Format.prob(0.0005)).toBe('(<0.1%)');
		});

		test('returns formatted percentage with one decimal place', () => {
			expect(Format.prob(0.5)).toBe('(50.0%)');
			expect(Format.prob(1)).toBe('(100.0%)');
			expect(Format.prob(0.123)).toBe('(12.3%)');
		});

	});

});

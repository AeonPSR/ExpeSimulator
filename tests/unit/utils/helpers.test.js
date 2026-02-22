/**
 * Helpers Tests
 * 
 * Tests for utility helper functions.
 */

describe('Helpers', () => {

	// ========================================
	// getResourceURL()
	// ========================================

	describe('getResourceURL', () => {

		test('returns path directly when chrome is undefined', () => {
			const originalChrome = global.chrome;
			global.chrome = undefined;

			expect(getResourceURL('images/test.png')).toBe('images/test.png');

			global.chrome = originalChrome;
		});

		test('returns path when chrome.runtime is undefined', () => {
			const originalChrome = global.chrome;
			global.chrome = {};

			expect(getResourceURL('images/test.png')).toBe('images/test.png');

			global.chrome = originalChrome;
		});

		test('uses chrome.runtime.getURL when available', () => {
			const originalChrome = global.chrome;
			global.chrome = {
				runtime: {
					getURL: jest.fn((path) => `chrome-extension://abc123/${path}`)
				}
			};

			const result = getResourceURL('images/test.png');

			expect(result).toBe('chrome-extension://abc123/images/test.png');
			expect(chrome.runtime.getURL).toHaveBeenCalledWith('images/test.png');

			global.chrome = originalChrome;
		});
	});

	// ========================================
	// formatSectorName()
	// ========================================

	describe('formatSectorName', () => {

		test('converts UPPER_SNAKE_CASE to Title Case', () => {
			expect(formatSectorName('CRISTAL_FIELD')).toBe('Cristal Field');
		});

		test('handles single word', () => {
			expect(formatSectorName('DESERT')).toBe('Desert');
		});

		test('handles multiple underscores', () => {
			expect(formatSectorName('SOME_LONG_NAME')).toBe('Some Long Name');
		});

		test('returns empty string for null', () => {
			expect(formatSectorName(null)).toBe('');
		});

		test('returns empty string for undefined', () => {
			expect(formatSectorName(undefined)).toBe('');
		});

		test('returns empty string for empty string', () => {
			expect(formatSectorName('')).toBe('');
		});
	});

	// ========================================
	// isExtensionContextValid()
	// ========================================

	describe('isExtensionContextValid', () => {

		test('returns true when chrome is undefined', () => {
			const originalChrome = global.chrome;
			global.chrome = undefined;

			expect(isExtensionContextValid()).toBe(true);

			global.chrome = originalChrome;
		});

		test('returns true when chrome.runtime.id exists', () => {
			const originalChrome = global.chrome;
			global.chrome = {
				runtime: { id: 'abc123' }
			};

			expect(isExtensionContextValid()).toBe(true);

			global.chrome = originalChrome;
		});

		test('returns false when chrome.runtime.id is undefined', () => {
			const originalChrome = global.chrome;
			global.chrome = {
				runtime: { id: undefined }
			};

			expect(isExtensionContextValid()).toBe(false);

			global.chrome = originalChrome;
		});
	});

	// ========================================
	// debounce()
	// ========================================

	describe('debounce', () => {

		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		test('delays function execution', () => {
			const fn = jest.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn();
			expect(fn).not.toHaveBeenCalled();

			jest.advanceTimersByTime(100);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		test('only calls once for rapid invocations', () => {
			const fn = jest.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn();
			debouncedFn();
			debouncedFn();

			jest.advanceTimersByTime(100);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		test('resets timer on each call', () => {
			const fn = jest.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn();
			jest.advanceTimersByTime(50);
			debouncedFn();
			jest.advanceTimersByTime(50);
			
			expect(fn).not.toHaveBeenCalled();

			jest.advanceTimersByTime(50);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		test('passes arguments to the function', () => {
			const fn = jest.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn('arg1', 'arg2');
			jest.advanceTimersByTime(100);

			expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
		});
	});

	// ========================================
	// clamp()
	// ========================================

	describe('clamp', () => {

		test('returns value when within range', () => {
			expect(clamp(5, 0, 10)).toBe(5);
		});

		test('returns min when value is below', () => {
			expect(clamp(-5, 0, 10)).toBe(0);
		});

		test('returns max when value is above', () => {
			expect(clamp(15, 0, 10)).toBe(10);
		});

		test('returns min when value equals min', () => {
			expect(clamp(0, 0, 10)).toBe(0);
		});

		test('returns max when value equals max', () => {
			expect(clamp(10, 0, 10)).toBe(10);
		});

		test('works with negative ranges', () => {
			expect(clamp(-5, -10, -1)).toBe(-5);
		});
	});

	// ========================================
	// generateId()
	// ========================================

	describe('generateId', () => {

		test('generates unique IDs', () => {
			const id1 = generateId();
			const id2 = generateId();

			expect(id1).not.toBe(id2);
		});

		test('uses default prefix when none provided', () => {
			const id = generateId();
			expect(id.startsWith('id-')).toBe(true);
		});

		test('uses custom prefix when provided', () => {
			const id = generateId('player');
			expect(id.startsWith('player-')).toBe(true);
		});

		test('generates string output', () => {
			const id = generateId();
			expect(typeof id).toBe('string');
		});
	});

	// ========================================
	// filenameToId()
	// ========================================

	describe('filenameToId', () => {

		test('removes .png extension and uppercases', () => {
			expect(filenameToId('pilot.png')).toBe('PILOT');
		});

		test('removes .jpg extension and uppercases', () => {
			expect(filenameToId('white_flag.jpg')).toBe('WHITE_FLAG');
		});

		test('removes .gif extension and uppercases', () => {
			expect(filenameToId('animation.gif')).toBe('ANIMATION');
		});

		test('handles case-insensitive extensions', () => {
			expect(filenameToId('test.PNG')).toBe('TEST');
			expect(filenameToId('test.JPG')).toBe('TEST');
		});

		test('preserves underscores', () => {
			expect(filenameToId('space_suit.png')).toBe('SPACE_SUIT');
		});

		test('returns uppercase string without extension', () => {
			expect(filenameToId('blaster.jpg')).toBe('BLASTER');
		});
	});
});

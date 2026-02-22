/**
 * ValidationUtils Tests
 * 
 * Tests for validation utility functions.
 */

describe('ValidationUtils', () => {

	// Store originals for restoration
	let originalSectorData;
	let originalConstants;

	beforeAll(() => {
		// Save originals
		originalSectorData = global.SectorData;
		originalConstants = global.Constants;

		// Mock SectorData
		global.SectorData = {
			getMaxPerPlanet: jest.fn((sectorName) => {
				const limits = {
					DESERT: 4,
					FOREST: 4,
					OXYGEN: 1,
					LANDING: 1
				};
				return limits[sectorName] || 2;
			}),
			isSpecialSector: jest.fn((sectorName) => {
				return ['LANDING', 'LOST'].includes(sectorName);
			}),
			getUniqueSectorNames: jest.fn(() => {
				return ['DESERT', 'FOREST', 'OXYGEN', 'LANDING', 'LOST'];
			})
		};

		// Mock Constants (should already be loaded but ensure MAX_SECTORS is set)
		global.Constants = {
			...global.Constants,
			MAX_SECTORS: 20
		};
	});

	afterAll(() => {
		global.SectorData = originalSectorData;
		global.Constants = originalConstants;
	});

	beforeEach(() => {
		SectorData.getMaxPerPlanet.mockClear();
		SectorData.isSpecialSector.mockClear();
		SectorData.getUniqueSectorNames.mockClear();
	});

	// ========================================
	// validateSectorLimit()
	// ========================================

	describe('validateSectorLimit', () => {

		test('returns valid when under limit', () => {
			const result = ValidationUtils.validateSectorLimit('DESERT', ['DESERT', 'FOREST']);

			expect(result.isValid).toBe(true);
			expect(result.currentCount).toBe(1);
			expect(result.maxAllowed).toBe(4);
			expect(result.message).toBeNull();
		});

		test('returns invalid when at limit', () => {
			const result = ValidationUtils.validateSectorLimit('DESERT', ['DESERT', 'DESERT', 'DESERT', 'DESERT']);

			expect(result.isValid).toBe(false);
			expect(result.currentCount).toBe(4);
			expect(result.maxAllowed).toBe(4);
			expect(result.message).toContain('Maximum 4 DESERT sectors');
		});

		test('returns valid when sector not present', () => {
			const result = ValidationUtils.validateSectorLimit('OXYGEN', ['DESERT', 'FOREST']);

			expect(result.isValid).toBe(true);
			expect(result.currentCount).toBe(0);
		});

		test('validates single-occurrence sectors', () => {
			const result = ValidationUtils.validateSectorLimit('OXYGEN', ['OXYGEN']);

			expect(result.isValid).toBe(false);
			expect(result.maxAllowed).toBe(1);
		});
	});

	// ========================================
	// validateTotalSectorLimit()
	// ========================================

	describe('validateTotalSectorLimit', () => {

		test('returns valid when under limit', () => {
			const sectors = Array(10).fill('DESERT');
			const result = ValidationUtils.validateTotalSectorLimit(sectors);

			expect(result.isValid).toBe(true);
			expect(result.currentTotal).toBe(10);
			expect(result.maxTotal).toBe(20);
		});

		test('returns invalid when at limit', () => {
			const sectors = Array(20).fill('DESERT');
			const result = ValidationUtils.validateTotalSectorLimit(sectors);

			expect(result.isValid).toBe(false);
			expect(result.currentTotal).toBe(20);
			expect(result.message).toContain('Maximum 20 sectors');
		});

		test('excludes special sectors from count', () => {
			const sectors = [...Array(19).fill('DESERT'), 'LANDING', 'LOST'];
			const result = ValidationUtils.validateTotalSectorLimit(sectors);

			// Only 19 non-special sectors
			expect(result.isValid).toBe(true);
			expect(result.currentTotal).toBe(19);
		});
	});

	// ========================================
	// validateAddSector()
	// ========================================

	describe('validateAddSector', () => {

		test('returns valid when all checks pass', () => {
			const result = ValidationUtils.validateAddSector('FOREST', ['LANDING', 'DESERT']);

			expect(result.isValid).toBe(true);
			expect(result.message).toBeNull();
		});

		test('fails when total limit reached', () => {
			const sectors = Array(20).fill('FOREST');
			const result = ValidationUtils.validateAddSector('DESERT', sectors);

			expect(result.isValid).toBe(false);
			expect(result.message).toContain('Maximum 20 sectors');
		});

		test('fails when per-sector limit reached', () => {
			const sectors = ['OXYGEN', 'DESERT'];
			const result = ValidationUtils.validateAddSector('OXYGEN', sectors);

			expect(result.isValid).toBe(false);
			expect(result.message).toContain('OXYGEN');
		});
	});

	// ========================================
	// getSectorUsageStats()
	// ========================================

	describe('getSectorUsageStats', () => {

		test('returns stats for all sector types', () => {
			const result = ValidationUtils.getSectorUsageStats(['DESERT', 'DESERT', 'FOREST']);

			expect(result.DESERT.current).toBe(2);
			expect(result.DESERT.max).toBe(4);
			expect(result.DESERT.remaining).toBe(2);
			expect(result.FOREST.current).toBe(1);
		});

		test('marks sectors at limit', () => {
			const result = ValidationUtils.getSectorUsageStats(['OXYGEN']);

			expect(result.OXYGEN.isAtLimit).toBe(true);
			expect(result.OXYGEN.remaining).toBe(0);
		});

		test('calculates percentage correctly', () => {
			const result = ValidationUtils.getSectorUsageStats(['DESERT', 'DESERT']);

			expect(result.DESERT.percentage).toBe(50);
		});

		test('handles empty sectors array', () => {
			const result = ValidationUtils.getSectorUsageStats([]);

			expect(result.DESERT.current).toBe(0);
			expect(result.DESERT.remaining).toBe(4);
		});
	});
});

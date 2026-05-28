/**
 * Tests for ProjectModifiers
 * 
 * Applies project effects that modify event probabilities.
 */

describe('ProjectModifiers', () => {
	
	describe('applyAntigravPropeller', () => {
		test('removes damage events from LANDING (same effect as Pilot)', () => {
			const events = {
				TIRED_2: 5,
				ACCIDENT_3_5: 3,
				DISASTER_3_5: 2,
				NOTHING_TO_REPORT: 10,
				HARVEST_1: 8
			};
			
			const result = ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			
			expect(result.TIRED_2).toBeUndefined();
			expect(result.ACCIDENT_3_5).toBeUndefined();
			expect(result.DISASTER_3_5).toBeUndefined();
			expect(result.NOTHING_TO_REPORT).toBe(10);
			expect(result.HARVEST_1).toBe(8);
		});
		
		test('has no effect on non-LANDING sectors', () => {
			const events = {
				TIRED_2: 5,
				ACCIDENT_3_5: 3,
				HARVEST_1: 8
			};
			
			const result = ProjectModifiers.applyAntigravPropeller(events, 'FOREST');
			
			expect(result.TIRED_2).toBe(5);
			expect(result.ACCIDENT_3_5).toBe(3);
			expect(result.HARVEST_1).toBe(8);
		});
		
		test('has no effect on PREDATOR sector', () => {
			const events = {
				TIRED_2: 5,
				FIGHT_12: 5
			};
			
			const result = ProjectModifiers.applyAntigravPropeller(events, 'PREDATOR');
			
			expect(result.TIRED_2).toBe(5);
			expect(result.FIGHT_12).toBe(5);
		});
		
		test('handles events missing some damage types', () => {
			const events = {
				TIRED_2: 5,
				NOTHING_TO_REPORT: 10
				// Missing ACCIDENT_3_5 and DISASTER_3_5
			};
			
			const result = ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			
			expect(result.TIRED_2).toBeUndefined();
			expect(result.NOTHING_TO_REPORT).toBe(10);
		});
		
		test('is idempotent: calling twice yields the same result', () => {
			const events = {
				TIRED_2: 5,
				ACCIDENT_3_5: 3,
				DISASTER_3_5: 2,
				NOTHING_TO_REPORT: 10
			};
			
			ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			
			expect(events.TIRED_2).toBeUndefined();
			expect(events.ACCIDENT_3_5).toBeUndefined();
			expect(events.DISASTER_3_5).toBeUndefined();
			expect(events.NOTHING_TO_REPORT).toBe(10);
		});
		
		test('returns the modified events object', () => {
			const events = { TIRED_2: 5 };
			const result = ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			expect(result).toBe(events); // Same reference
		});
	});
});

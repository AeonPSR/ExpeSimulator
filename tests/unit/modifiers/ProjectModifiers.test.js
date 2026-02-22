/**
 * Tests for ProjectModifiers
 * 
 * Applies project effects that modify event probabilities.
 */

describe('ProjectModifiers', () => {
	
	describe('applyAntigravPropeller', () => {
		test('doubles NOTHING_TO_REPORT in LANDING', () => {
			const events = {
				NOTHING_TO_REPORT: 10,
				TIRED_2: 5,
				ACCIDENT_3_5: 3
			};
			
			const result = ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			
			expect(result.NOTHING_TO_REPORT).toBe(20);
			expect(result.TIRED_2).toBe(5);
			expect(result.ACCIDENT_3_5).toBe(3);
		});
		
		test('has no effect on non-LANDING sectors', () => {
			const events = {
				NOTHING_TO_REPORT: 10,
				HARVEST_1: 8
			};
			
			const result = ProjectModifiers.applyAntigravPropeller(events, 'FOREST');
			
			expect(result.NOTHING_TO_REPORT).toBe(10);
			expect(result.HARVEST_1).toBe(8);
		});
		
		test('has no effect on PREDATOR sector', () => {
			const events = {
				NOTHING_TO_REPORT: 10,
				FIGHT_12: 5
			};
			
			const result = ProjectModifiers.applyAntigravPropeller(events, 'PREDATOR');
			
			expect(result.NOTHING_TO_REPORT).toBe(10);
			expect(result.FIGHT_12).toBe(5);
		});
		
		test('handles missing NOTHING_TO_REPORT', () => {
			const events = {
				TIRED_2: 5,
				ACCIDENT_3_5: 3
			};
			
			// Should not throw or add NOTHING_TO_REPORT
			const result = ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			
			expect(result.NOTHING_TO_REPORT).toBeUndefined();
			expect(result.TIRED_2).toBe(5);
		});
		
		test('stacks correctly with multiple calls', () => {
			const events = {
				NOTHING_TO_REPORT: 10
			};
			
			ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			
			expect(events.NOTHING_TO_REPORT).toBe(40); // 10 * 2 * 2
		});
		
		test('returns the modified events object', () => {
			const events = { NOTHING_TO_REPORT: 10 };
			const result = ProjectModifiers.applyAntigravPropeller(events, 'LANDING');
			expect(result).toBe(events); // Same reference
		});
	});
});

/**
 * Tests for AbilityModifiers
 * 
 * Applies ability effects that modify event probabilities.
 */

describe('AbilityModifiers', () => {
	
	describe('applyPilot', () => {
		test('removes damage events from LANDING', () => {
			const events = {
				TIRED_2: 5,
				ACCIDENT_3_5: 3,
				DISASTER_3_5: 2,
				NOTHING_TO_REPORT: 10,
				HARVEST_1: 8
			};
			
			const result = AbilityModifiers.applyPilot(events, 'LANDING');
			
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
				FIGHT_12: 8
			};
			
			const result = AbilityModifiers.applyPilot(events, 'FOREST');
			
			expect(result.TIRED_2).toBe(5);
			expect(result.ACCIDENT_3_5).toBe(3);
			expect(result.FIGHT_12).toBe(8);
		});
		
		test('handles PREDATOR sector unchanged', () => {
			const events = {
				TIRED_2: 5,
				FIGHT_12: 8
			};
			
			const result = AbilityModifiers.applyPilot(events, 'PREDATOR');
			
			expect(result.TIRED_2).toBe(5);
			expect(result.FIGHT_12).toBe(8);
		});
		
		test('handles events missing some damage types', () => {
			const events = {
				TIRED_2: 5,
				NOTHING_TO_REPORT: 10
				// Missing ACCIDENT_3_5 and DISASTER_3_5
			};
			
			const result = AbilityModifiers.applyPilot(events, 'LANDING');
			
			expect(result.TIRED_2).toBeUndefined();
			expect(result.NOTHING_TO_REPORT).toBe(10);
		});
	});
	
	describe('applyDiplomacy', () => {
		test('removes all FIGHT_* events from any sector', () => {
			const events = {
				FIGHT_12: 5,
				FIGHT_8: 3,
				FIGHT_8_10_12_15_18_32: 2,
				HARVEST_1: 10
			};
			
			const result = AbilityModifiers.applyDiplomacy(events, 'PREDATOR');
			
			expect(result.FIGHT_12).toBeUndefined();
			expect(result.FIGHT_8).toBeUndefined();
			expect(result.FIGHT_8_10_12_15_18_32).toBeUndefined();
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('works on INTELLIGENT sector', () => {
			const events = {
				FIGHT_12: 5,
				ARTEFACT: 8
			};
			
			const result = AbilityModifiers.applyDiplomacy(events, 'INTELLIGENT');
			
			expect(result.FIGHT_12).toBeUndefined();
			expect(result.ARTEFACT).toBe(8);
		});
		
		test('works on LANDING sector', () => {
			const events = {
				FIGHT_12: 5,
				TIRED_2: 3
			};
			
			const result = AbilityModifiers.applyDiplomacy(events, 'LANDING');
			
			expect(result.FIGHT_12).toBeUndefined();
			expect(result.TIRED_2).toBe(3);
		});
		
		test('handles sector with no fights', () => {
			const events = {
				HARVEST_1: 10,
				OXYGEN: 5
			};
			
			const result = AbilityModifiers.applyDiplomacy(events, 'OXYGEN');
			
			expect(result.HARVEST_1).toBe(10);
			expect(result.OXYGEN).toBe(5);
		});
	});
	
	describe('applyTracker', () => {
		test('removes KILL_LOST from LOST sector', () => {
			const events = {
				KILL_LOST: 5,
				PLAYER_LOST: 3,
				NOTHING_TO_REPORT: 10
			};
			
			const result = AbilityModifiers.applyTracker(events, 'LOST');
			
			expect(result.KILL_LOST).toBeUndefined();
			expect(result.PLAYER_LOST).toBe(3);
			expect(result.NOTHING_TO_REPORT).toBe(10);
		});
		
		test('has no effect on non-LOST sectors', () => {
			const events = {
				KILL_LOST: 5,
				FIGHT_12: 8
			};
			
			const result = AbilityModifiers.applyTracker(events, 'FOREST');
			
			expect(result.KILL_LOST).toBe(5);
			expect(result.FIGHT_12).toBe(8);
		});
		
		test('handles LANDING sector unchanged', () => {
			const events = {
				KILL_LOST: 5,
				TIRED_2: 3
			};
			
			const result = AbilityModifiers.applyTracker(events, 'LANDING');
			
			expect(result.KILL_LOST).toBe(5);
			expect(result.TIRED_2).toBe(3);
		});
		
		test('handles missing KILL_LOST event', () => {
			const events = {
				PLAYER_LOST: 3,
				NOTHING_TO_REPORT: 10
			};
			
			// Should not throw
			const result = AbilityModifiers.applyTracker(events, 'LOST');
			
			expect(result.PLAYER_LOST).toBe(3);
			expect(result.NOTHING_TO_REPORT).toBe(10);
		});
	});
});

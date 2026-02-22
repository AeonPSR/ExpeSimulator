/**
 * Tests for EventModifier
 * 
 * Core utility functions for modifying sector event weights.
 */

describe('EventModifier', () => {
	
	describe('cloneSectorConfig', () => {
		test('creates deep copy', () => {
			const original = {
				name: 'FOREST',
				explorationEvents: {
					HARVEST_1: 10,
					FIGHT_12: 5
				}
			};
			
			const clone = EventModifier.cloneSectorConfig(original);
			
			// Modify clone
			clone.explorationEvents.HARVEST_1 = 999;
			clone.name = 'MODIFIED';
			
			// Original should be unchanged
			expect(original.explorationEvents.HARVEST_1).toBe(10);
			expect(original.name).toBe('FOREST');
		});
		
		test('handles nested objects', () => {
			const original = {
				level1: {
					level2: {
						value: 42
					}
				}
			};
			
			const clone = EventModifier.cloneSectorConfig(original);
			clone.level1.level2.value = 999;
			
			expect(original.level1.level2.value).toBe(42);
		});
		
		test('handles arrays', () => {
			const original = {
				items: [1, 2, 3]
			};
			
			const clone = EventModifier.cloneSectorConfig(original);
			clone.items.push(4);
			
			expect(original.items).toHaveLength(3);
		});
	});
	
	describe('removeEvents', () => {
		test('removes specified events', () => {
			const events = {
				TIRED_2: 5,
				ACCIDENT_3_5: 3,
				DISASTER_3_5: 2,
				HARVEST_1: 10
			};
			
			const result = EventModifier.removeEvents(events, ['TIRED_2', 'ACCIDENT_3_5']);
			
			expect(result.TIRED_2).toBeUndefined();
			expect(result.ACCIDENT_3_5).toBeUndefined();
			expect(result.DISASTER_3_5).toBe(2);
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('handles missing events gracefully', () => {
			const events = {
				HARVEST_1: 10
			};
			
			// Should not throw
			expect(() => {
				EventModifier.removeEvents(events, ['NON_EXISTENT', 'ALSO_MISSING']);
			}).not.toThrow();
			
			expect(events.HARVEST_1).toBe(10);
		});
		
		test('returns the modified events object', () => {
			const events = { A: 1 };
			const result = EventModifier.removeEvents(events, ['A']);
			expect(result).toBe(events); // Same reference
		});
		
		test('handles empty removal list', () => {
			const events = { A: 1, B: 2 };
			const result = EventModifier.removeEvents(events, []);
			expect(result).toEqual({ A: 1, B: 2 });
		});
	});
	
	describe('removeEventsByPrefix', () => {
		test('removes all events matching prefix', () => {
			const events = {
				FIGHT_12: 5,
				FIGHT_8: 3,
				FIGHT_8_10_12_15_18_32: 2,
				HARVEST_1: 10,
				ACCIDENT_3_5: 4
			};
			
			const result = EventModifier.removeEventsByPrefix(events, 'FIGHT_');
			
			expect(result.FIGHT_12).toBeUndefined();
			expect(result.FIGHT_8).toBeUndefined();
			expect(result.FIGHT_8_10_12_15_18_32).toBeUndefined();
			expect(result.HARVEST_1).toBe(10);
			expect(result.ACCIDENT_3_5).toBe(4);
		});
		
		test('handles no matching events', () => {
			const events = {
				HARVEST_1: 10,
				ACCIDENT_3_5: 4
			};
			
			const result = EventModifier.removeEventsByPrefix(events, 'FIGHT_');
			
			expect(result.HARVEST_1).toBe(10);
			expect(result.ACCIDENT_3_5).toBe(4);
		});
		
		test('removes AGAIN events', () => {
			const events = {
				AGAIN: 8,
				HARVEST_1: 10
			};
			
			const result = EventModifier.removeEventsByPrefix(events, 'AGAIN');
			
			expect(result.AGAIN).toBeUndefined();
			expect(result.HARVEST_1).toBe(10);
		});
	});
	
	describe('multiplyEventWeight', () => {
		test('multiplies existing event weight', () => {
			const events = {
				ARTEFACT: 5,
				HARVEST_1: 10
			};
			
			const result = EventModifier.multiplyEventWeight(events, 'ARTEFACT', 2);
			
			expect(result.ARTEFACT).toBe(10);
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('handles missing event gracefully', () => {
			const events = {
				HARVEST_1: 10
			};
			
			const result = EventModifier.multiplyEventWeight(events, 'ARTEFACT', 2);
			
			expect(result.ARTEFACT).toBeUndefined();
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('handles zero multiplier', () => {
			const events = {
				ARTEFACT: 5
			};
			
			const result = EventModifier.multiplyEventWeight(events, 'ARTEFACT', 0);
			
			expect(result.ARTEFACT).toBe(0);
		});
		
		test('handles fractional multiplier', () => {
			const events = {
				ARTEFACT: 10
			};
			
			const result = EventModifier.multiplyEventWeight(events, 'ARTEFACT', 0.5);
			
			expect(result.ARTEFACT).toBe(5);
		});
		
		test('returns the modified events object', () => {
			const events = { A: 1 };
			const result = EventModifier.multiplyEventWeight(events, 'A', 2);
			expect(result).toBe(events); // Same reference
		});
	});
});

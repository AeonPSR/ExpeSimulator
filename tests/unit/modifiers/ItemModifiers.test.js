/**
 * Tests for ItemModifiers
 * 
 * Applies item effects that modify event probabilities.
 */

describe('ItemModifiers', () => {
	
	describe('applyWhiteFlag', () => {
		test('removes fights from INTELLIGENT only', () => {
			const events = {
				FIGHT_12: 5,
				FIGHT_8: 3,
				ARTEFACT: 8,
				HARVEST_1: 10
			};
			
			const result = ItemModifiers.applyWhiteFlag(events, 'INTELLIGENT');
			
			expect(result.FIGHT_12).toBeUndefined();
			expect(result.FIGHT_8).toBeUndefined();
			expect(result.ARTEFACT).toBe(8);
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('has no effect on PREDATOR sector', () => {
			const events = {
				FIGHT_12: 5,
				FIGHT_8: 3
			};
			
			const result = ItemModifiers.applyWhiteFlag(events, 'PREDATOR');
			
			expect(result.FIGHT_12).toBe(5);
			expect(result.FIGHT_8).toBe(3);
		});
		
		test('has no effect on FOREST sector', () => {
			const events = {
				FIGHT_12: 5,
				HARVEST_1: 10
			};
			
			const result = ItemModifiers.applyWhiteFlag(events, 'FOREST');
			
			expect(result.FIGHT_12).toBe(5);
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('has no effect on LANDING sector', () => {
			const events = {
				FIGHT_12: 5,
				TIRED_2: 3
			};
			
			const result = ItemModifiers.applyWhiteFlag(events, 'LANDING');
			
			expect(result.FIGHT_12).toBe(5);
			expect(result.TIRED_2).toBe(3);
		});
	});
	
	describe('applyQuadCompass', () => {
		test('removes AGAIN events from any sector', () => {
			const events = {
				AGAIN: 8,
				HARVEST_1: 10,
				FIGHT_12: 5
			};
			
			const result = ItemModifiers.applyQuadCompass(events, 'FOREST');
			
			expect(result.AGAIN).toBeUndefined();
			expect(result.HARVEST_1).toBe(10);
			expect(result.FIGHT_12).toBe(5);
		});
		
		test('works on DESERT sector', () => {
			const events = {
				AGAIN: 8,
				FUEL_1: 10
			};
			
			const result = ItemModifiers.applyQuadCompass(events, 'DESERT');
			
			expect(result.AGAIN).toBeUndefined();
			expect(result.FUEL_1).toBe(10);
		});
		
		test('works on LANDING sector', () => {
			const events = {
				AGAIN: 8,
				TIRED_2: 3
			};
			
			const result = ItemModifiers.applyQuadCompass(events, 'LANDING');
			
			expect(result.AGAIN).toBeUndefined();
			expect(result.TIRED_2).toBe(3);
		});
		
		test('handles sector without AGAIN event', () => {
			const events = {
				HARVEST_1: 10,
				FIGHT_12: 5
			};
			
			const result = ItemModifiers.applyQuadCompass(events, 'PREDATOR');
			
			expect(result.HARVEST_1).toBe(10);
			expect(result.FIGHT_12).toBe(5);
		});
	});
	
	describe('applyTradModule', () => {
		test('doubles ARTEFACT in INTELLIGENT', () => {
			const events = {
				ARTEFACT: 5,
				HARVEST_1: 10
			};
			
			const result = ItemModifiers.applyTradModule(events, 'INTELLIGENT');
			
			expect(result.ARTEFACT).toBe(10);
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('has no effect on non-INTELLIGENT sectors', () => {
			const events = {
				ARTEFACT: 5,
				HARVEST_1: 10
			};
			
			const result = ItemModifiers.applyTradModule(events, 'FOREST');
			
			expect(result.ARTEFACT).toBe(5);
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('has no effect on LANDING sector', () => {
			const events = {
				ARTEFACT: 5,
				TIRED_2: 3
			};
			
			const result = ItemModifiers.applyTradModule(events, 'LANDING');
			
			expect(result.ARTEFACT).toBe(5);
			expect(result.TIRED_2).toBe(3);
		});
		
		test('handles missing ARTEFACT in INTELLIGENT', () => {
			const events = {
				HARVEST_1: 10,
				FIGHT_12: 5
			};
			
			// Should not throw or add ARTEFACT
			const result = ItemModifiers.applyTradModule(events, 'INTELLIGENT');
			
			expect(result.ARTEFACT).toBeUndefined();
			expect(result.HARVEST_1).toBe(10);
		});
		
		test('stacks correctly with multiple calls', () => {
			const events = {
				ARTEFACT: 5
			};
			
			ItemModifiers.applyTradModule(events, 'INTELLIGENT');
			ItemModifiers.applyTradModule(events, 'INTELLIGENT');
			
			expect(events.ARTEFACT).toBe(20); // 5 * 2 * 2
		});
	});
});

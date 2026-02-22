/**
 * Tests for ModifierApplicator
 * 
 * Orchestrates applying all ability, item, and project modifiers
 * to a sector's event configuration.
 */

describe('ModifierApplicator', () => {
	
	// Sample sector config for testing
	const createLandingConfig = () => ({
		name: 'LANDING',
		explorationEvents: {
			NOTHING_TO_REPORT: 10,
			TIRED_2: 5,
			ACCIDENT_3_5: 3,
			DISASTER_3_5: 2,
			FIGHT_12: 4,
			AGAIN: 6
		}
	});
	
	const createIntelligentConfig = () => ({
		name: 'INTELLIGENT',
		explorationEvents: {
			ARTEFACT: 5,
			FIGHT_12: 8,
			FIGHT_8: 3,
			HARVEST_1: 10,
			AGAIN: 4
		}
	});
	
	const createLostConfig = () => ({
		name: 'LOST',
		explorationEvents: {
			KILL_LOST: 5,
			PLAYER_LOST: 3,
			NOTHING_TO_REPORT: 10
		}
	});
	
	describe('apply', () => {
		test('returns cloned config', () => {
			const original = createLandingConfig();
			const loadout = { abilities: [], items: [], projects: [] };
			
			const result = ModifierApplicator.apply(original, 'LANDING', loadout);
			
			// Should be different object
			expect(result).not.toBe(original);
			expect(result.explorationEvents).not.toBe(original.explorationEvents);
			
			// Original unchanged
			expect(original.explorationEvents.TIRED_2).toBe(5);
		});
		
		test('calls correct ability modifiers', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: ['PILOT'],
				items: [],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'LANDING', loadout);
			
			// Pilot removes TIRED_2, ACCIDENT_3_5, DISASTER_3_5 from LANDING
			expect(result.explorationEvents.TIRED_2).toBeUndefined();
			expect(result.explorationEvents.ACCIDENT_3_5).toBeUndefined();
			expect(result.explorationEvents.DISASTER_3_5).toBeUndefined();
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(10);
		});
		
		test('Pilot + Diplomacy both applied', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: ['PILOT', 'DIPLOMACY'],
				items: [],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'LANDING', loadout);
			
			// Pilot removes damage events
			expect(result.explorationEvents.TIRED_2).toBeUndefined();
			expect(result.explorationEvents.ACCIDENT_3_5).toBeUndefined();
			expect(result.explorationEvents.DISASTER_3_5).toBeUndefined();
			
			// Diplomacy removes fights
			expect(result.explorationEvents.FIGHT_12).toBeUndefined();
			
			// Other events remain
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(10);
		});
		
		test('calls correct item modifiers', () => {
			const config = createIntelligentConfig();
			const loadout = {
				abilities: [],
				items: ['WHITE_FLAG'],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'INTELLIGENT', loadout);
			
			// White Flag removes fights from INTELLIGENT
			expect(result.explorationEvents.FIGHT_12).toBeUndefined();
			expect(result.explorationEvents.FIGHT_8).toBeUndefined();
			expect(result.explorationEvents.ARTEFACT).toBe(5);
		});
		
		test('WHITE_FLAG + QUAD_COMPASS both applied', () => {
			const config = createIntelligentConfig();
			const loadout = {
				abilities: [],
				items: ['WHITE_FLAG', 'QUAD_COMPASS'],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'INTELLIGENT', loadout);
			
			// White Flag removes fights
			expect(result.explorationEvents.FIGHT_12).toBeUndefined();
			expect(result.explorationEvents.FIGHT_8).toBeUndefined();
			
			// Quad Compass removes AGAIN
			expect(result.explorationEvents.AGAIN).toBeUndefined();
			
			// Other events remain
			expect(result.explorationEvents.ARTEFACT).toBe(5);
			expect(result.explorationEvents.HARVEST_1).toBe(10);
		});
		
		test('TRAD_MODULE doubles ARTEFACT in INTELLIGENT', () => {
			const config = createIntelligentConfig();
			const loadout = {
				abilities: [],
				items: ['TRAD_MODULE'],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'INTELLIGENT', loadout);
			
			expect(result.explorationEvents.ARTEFACT).toBe(10); // 5 * 2
		});
		
		test('calls correct project modifiers', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: [],
				items: [],
				projects: ['ANTIGRAV_PROPELLER']
			};
			
			const result = ModifierApplicator.apply(config, 'LANDING', loadout);
			
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(20); // 10 * 2
		});
		
		test('Tracker removes KILL_LOST from LOST', () => {
			const config = createLostConfig();
			const loadout = {
				abilities: ['TRACKER'],
				items: [],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'LOST', loadout);
			
			expect(result.explorationEvents.KILL_LOST).toBeUndefined();
			expect(result.explorationEvents.PLAYER_LOST).toBe(3);
		});
		
		test('handles empty loadout', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: [],
				items: [],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'LANDING', loadout);
			
			// All events unchanged
			expect(result.explorationEvents.TIRED_2).toBe(5);
			expect(result.explorationEvents.ACCIDENT_3_5).toBe(3);
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(10);
		});
		
		test('handles undefined loadout properties', () => {
			const config = createLandingConfig();
			const loadout = {}; // No abilities, items, or projects
			
			// Should not throw
			expect(() => {
				ModifierApplicator.apply(config, 'LANDING', loadout);
			}).not.toThrow();
		});
		
		test('handles unknown ability names gracefully', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: ['UNKNOWN_ABILITY', 'ALSO_UNKNOWN'],
				items: [],
				projects: []
			};
			
			// Should not throw
			expect(() => {
				ModifierApplicator.apply(config, 'LANDING', loadout);
			}).not.toThrow();
			
			// Events unchanged
			const result = ModifierApplicator.apply(config, 'LANDING', loadout);
			expect(result.explorationEvents.TIRED_2).toBe(5);
		});
		
		test('handles unknown item names gracefully', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: [],
				items: ['UNKNOWN_ITEM'],
				projects: []
			};
			
			// Should not throw
			expect(() => {
				ModifierApplicator.apply(config, 'LANDING', loadout);
			}).not.toThrow();
		});
		
		test('handles unknown project names gracefully', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: [],
				items: [],
				projects: ['UNKNOWN_PROJECT']
			};
			
			// Should not throw
			expect(() => {
				ModifierApplicator.apply(config, 'LANDING', loadout);
			}).not.toThrow();
		});
		
		test('combines abilities, items, and projects', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: ['PILOT'],
				items: ['QUAD_COMPASS'],
				projects: ['ANTIGRAV_PROPELLER']
			};
			
			const result = ModifierApplicator.apply(config, 'LANDING', loadout);
			
			// Pilot removes damage
			expect(result.explorationEvents.TIRED_2).toBeUndefined();
			expect(result.explorationEvents.ACCIDENT_3_5).toBeUndefined();
			expect(result.explorationEvents.DISASTER_3_5).toBeUndefined();
			
			// Quad Compass removes AGAIN
			expect(result.explorationEvents.AGAIN).toBeUndefined();
			
			// Antigrav doubles NOTHING_TO_REPORT
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(20);
		});
	});
	
	describe('_applyModifiers', () => {
		test('is generic helper that works for any modifier map', () => {
			const events = { TEST_EVENT: 10 };
			let callCount = 0;
			
			const modifierMap = {
				'KEY1': (e, s) => { callCount++; return e; },
				'KEY2': (e, s) => { callCount++; return e; }
			};
			
			ModifierApplicator._applyModifiers(events, 'SECTOR', ['KEY1', 'KEY2'], modifierMap);
			
			expect(callCount).toBe(2);
		});
		
		test('skips unknown keys', () => {
			const events = { TEST_EVENT: 10 };
			let callCount = 0;
			
			const modifierMap = {
				'KEY1': (e, s) => { callCount++; return e; }
			};
			
			// UNKNOWN not in map, should be skipped
			ModifierApplicator._applyModifiers(events, 'SECTOR', ['KEY1', 'UNKNOWN'], modifierMap);
			
			expect(callCount).toBe(1);
		});
	});
});

/**
 * Tests for ModifierApplicator
 * 
 * Orchestrates applying all ability, item, and project modifiers
 * to a sector's event configuration.
 */

describe('ModifierApplicator', () => {
	
	// Sample sector configs matching real config.js data
	const createLandingConfig = () => ({
		name: 'LANDING',
		explorationEvents: {
			NOTHING_TO_REPORT: 4,
			TIRED_2: 3,
			ACCIDENT_3_5: 2,
			DISASTER_3_5: 1
		}
	});
	
	const createIntelligentConfig = () => ({
		name: 'INTELLIGENT',
		explorationEvents: {
			FIGHT_12: 4,
			PROVISION_2: 3,
			ARTEFACT: 2,
			ITEM_LOST: 1
		}
	});
	
	const createLostConfig = () => ({
		name: 'LOST',
		explorationEvents: {
			FIND_LOST: 7,
			AGAIN: 2,
			KILL_LOST: 1
		}
	});

	const createPredatorConfig = () => ({
		name: 'PREDATOR',
		explorationEvents: {
			FIGHT_12: 4,
			ACCIDENT_3_5: 3,
			NOTHING_TO_REPORT: 2,
			PROVISION_3: 1
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
			expect(original.explorationEvents.TIRED_2).toBe(3);
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
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(4);
		});
		
		test('Diplomacy replaces fight events with NOTHING_TO_REPORT', () => {
			const config = createPredatorConfig();
			const loadout = {
				abilities: ['DIPLOMACY'],
				items: [],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'PREDATOR', loadout);
			
			// Diplomacy replaces FIGHT_12 (weight 4) with NOTHING_TO_REPORT
			expect(result.explorationEvents.FIGHT_12).toBeUndefined();
			// NOTHING_TO_REPORT gains fight weight: 2 + 4 = 6
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(6);
			// Other events unchanged
			expect(result.explorationEvents.ACCIDENT_3_5).toBe(3);
			expect(result.explorationEvents.PROVISION_3).toBe(1);
		});
		
		test('calls correct item modifiers', () => {
			const config = createIntelligentConfig();
			const loadout = {
				abilities: [],
				items: ['WHITE_FLAG'],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'INTELLIGENT', loadout);
			
			// White Flag replaces FIGHT_12 (weight 4) with NOTHING_TO_REPORT
			expect(result.explorationEvents.FIGHT_12).toBeUndefined();
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(4);
			expect(result.explorationEvents.ARTEFACT).toBe(2);
			expect(result.explorationEvents.PROVISION_2).toBe(3);
		});
		
		test('WHITE_FLAG + QUAD_COMPASS both applied', () => {
			const config = createIntelligentConfig();
			const loadout = {
				abilities: [],
				items: ['WHITE_FLAG', 'QUAD_COMPASS'],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'INTELLIGENT', loadout);
			
			// White Flag replaces FIGHT_12 (weight 4) with NOTHING_TO_REPORT
			expect(result.explorationEvents.FIGHT_12).toBeUndefined();
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(4);
			
			// INTELLIGENT has no AGAIN, so Quad Compass is a no-op here
			// Other events remain
			expect(result.explorationEvents.ARTEFACT).toBe(2);
			expect(result.explorationEvents.PROVISION_2).toBe(3);
			expect(result.explorationEvents.ITEM_LOST).toBe(1);
		});
		
		test('TRAD_MODULE doubles ARTEFACT in INTELLIGENT', () => {
			const config = createIntelligentConfig();
			const loadout = {
				abilities: [],
				items: ['TRAD_MODULE'],
				projects: []
			};
			
			const result = ModifierApplicator.apply(config, 'INTELLIGENT', loadout);
			
			expect(result.explorationEvents.ARTEFACT).toBe(4); // 2 * 2
		});
		
		test('calls correct project modifiers', () => {
			const config = createLandingConfig();
			const loadout = {
				abilities: [],
				items: [],
				projects: ['ANTIGRAV_PROPELLER']
			};
			
			const result = ModifierApplicator.apply(config, 'LANDING', loadout);
			
			// Antigrav removes damage events on LANDING, same as Pilot
			expect(result.explorationEvents.TIRED_2).toBeUndefined();
			expect(result.explorationEvents.ACCIDENT_3_5).toBeUndefined();
			expect(result.explorationEvents.DISASTER_3_5).toBeUndefined();
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(4);
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
			expect(result.explorationEvents.FIND_LOST).toBe(7);
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
			expect(result.explorationEvents.TIRED_2).toBe(3);
			expect(result.explorationEvents.ACCIDENT_3_5).toBe(2);
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(4);
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
			expect(result.explorationEvents.TIRED_2).toBe(3);
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
			
			// Pilot + Antigrav remove damage events (redundant, both have same effect)
			expect(result.explorationEvents.TIRED_2).toBeUndefined();
			expect(result.explorationEvents.ACCIDENT_3_5).toBeUndefined();
			expect(result.explorationEvents.DISASTER_3_5).toBeUndefined();
			// LANDING has no AGAIN, so Quad Compass is a no-op here
			expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(4);
		});
	});
});

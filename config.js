// Planet Sector Configuration Data converted from PHP
const PlanetSectorConfigData = [
	{
		name: 'FOREST_default',
		sectorName: 'FOREST',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 12,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'HARVEST_2': 4,
			'AGAIN': 3,
			'DISEASE': 2,
			'PLAYER_LOST': 1
		}
	},
	{
		name: 'MOUNTAIN_default',
		sectorName: 'MOUNTAIN',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 8,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'ACCIDENT_ROPE_3_5': 4,
			'FUEL_1': 3,
			'TIRED_2': 2,
			'HARVEST_1': 1
		}
	},
	{
		name: 'SWAMP_default',
		sectorName: 'SWAMP',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 8,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'DISEASE': 4,
			'HARVEST_2': 3,
			'TIRED_2': 2,
			'NOTHING_TO_REPORT': 1
		}
	},
	{
		name: 'DESERT_default',
		sectorName: 'DESERT',
		weightAtPlanetGeneration: 12,
		weightAtPlanetAnalysis: 12,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'NOTHING_TO_REPORT': 5,
			'TIRED_2': 4,
			'AGAIN': 1
		}
	},
	{
		name: 'OCEAN_default',
		sectorName: 'OCEAN',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 12,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'NOTHING_TO_REPORT': 7,
			'PROVISION_3': 2,
			'PLAYER_LOST': 1
		}
	},
	{
		name: 'CAVE_default',
		sectorName: 'CAVE',
		weightAtPlanetGeneration: 4,
		weightAtPlanetAnalysis: 2,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'FUEL_2': 4,
			'ACCIDENT_ROPE_3_5': 3,
			'AGAIN': 2,
			'ARTEFACT': 1
		}
	},
	{
		name: 'RUINS_default',
		sectorName: 'RUINS',
		weightAtPlanetGeneration: 2,
		weightAtPlanetAnalysis: 2,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		fightVsDamageThreshold: 6,
		explorationEvents: {
			'ARTEFACT': 4,
			'NOTHING_TO_REPORT': 3,
			'FIGHT_15': 2,
			'ACCIDENT_3_5': 1
		}
	},
	{
		name: 'WRECK_default',
		sectorName: 'WRECK',
		weightAtPlanetGeneration: 2,
		weightAtPlanetAnalysis: 1,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'ARTEFACT': 4,
			'FUEL_3': 3,
			'NOTHING_TO_REPORT': 2,
			'FIGHT_8_10_12_15_18_32': 1
		}
	},
	{
		name: 'FRUIT_TREES_default',
		sectorName: 'FRUIT_TREES',
		weightAtPlanetGeneration: 3,
		weightAtPlanetAnalysis: 1,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'HARVEST_3': 4,
			'HARVEST_1': 3,
			'NOTHING_TO_REPORT': 3
		}
	},
	{
		name: 'CRISTAL_FIELD_default',
		sectorName: 'CRISTAL_FIELD',
		weightAtPlanetGeneration: 2,
		weightAtPlanetAnalysis: 4,
		weightAtPlanetExploration: 10,
		maxPerPlanet: 1,
		explorationEvents: {
			'MUSH_TRAP': 4,
			'STARMAP': 3,
			'FIGHT_18': 2,
			'PLAYER_LOST': 1
		}
	},
	{
		name: 'RUMINANT_default',
		sectorName: 'RUMINANT',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 4,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		fightVsDamageThreshold: 3,
		explorationEvents: {
			'PROVISION_4': 4,
			'PROVISION_2': 3,
			'ACCIDENT_3_5': 2,
			'FIGHT_8': 1
		}
	},
	{
		name: 'PREDATOR_default',
		sectorName: 'PREDATOR',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 2,
		weightAtPlanetExploration: 6,
		maxPerPlanet: 4,
		fightVsDamageThreshold: 4,
		explorationEvents: {
			'FIGHT_12': 4,
			'ACCIDENT_3_5': 3,
			'NOTHING_TO_REPORT': 2,
			'PROVISION_3': 1
		}
	},
	{
		name: 'INTELLIGENT_default',
		sectorName: 'INTELLIGENT',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 4,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'FIGHT_12': 4,
			'PROVISION_2': 3,
			'ARTEFACT': 2,
			'ITEM_LOST': 1
		}
	},
	{
		name: 'INSECT_default',
		sectorName: 'INSECT',
		weightAtPlanetGeneration: 10,
		weightAtPlanetAnalysis: 2,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		fightVsDamageThreshold: 4,
		explorationEvents: {
			'ACCIDENT_3_5': 4,
			'DISEASE': 3,
			'PROVISION_1': 2,
			'FIGHT_10': 1
		}
	},
	{
		name: 'MANKAROG_default',
		sectorName: 'MANKAROG',
		weightAtPlanetGeneration: 2,
		weightAtPlanetAnalysis: 4,
		weightAtPlanetExploration: 6,
		maxPerPlanet: 1,
		explorationEvents: {
			'KILL_RANDOM': 4,
			'FIGHT_32': 3,
			'BACK': 2,
			'ARTEFACT': 1
		}
	},
	{
		name: 'COLD_default',
		sectorName: 'COLD',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 8,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'NOTHING_TO_REPORT': 4,
			'TIRED_2': 3,
			'PLAYER_LOST': 2,
			'ACCIDENT_3_5': 1
		}
	},
	{
		name: 'HOT_default',
		sectorName: 'HOT',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 8,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'TIRED_2': 4,
			'NOTHING_TO_REPORT': 3,
			'HARVEST_2': 2,
			'ACCIDENT_3_5': 1
		}
	},
	{
		name: 'STRONG_WIND_default',
		sectorName: 'STRONG_WIND',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 8,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'NOTHING_TO_REPORT': 6,
			'TIRED_2': 3,
			'ITEM_LOST': 1
		}
	},
	{
		name: 'SEISMIC_ACTIVITY_default',
		sectorName: 'SEISMIC_ACTIVITY',
		weightAtPlanetGeneration: 3,
		weightAtPlanetAnalysis: 8,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		explorationEvents: {
			'NOTHING_TO_REPORT': 4,
			'BACK': 3,
			'ACCIDENT_ROPE_3_5': 2,
			'KILL_RANDOM': 1
		}
	},
	{
		name: 'VOLCANIC_ACTIVITY_default',
		sectorName: 'VOLCANIC_ACTIVITY',
		weightAtPlanetGeneration: 3,
		weightAtPlanetAnalysis: 8,
		weightAtPlanetExploration: 6,
		maxPerPlanet: 4,
		explorationEvents: {
			'NOTHING_TO_REPORT': 7,
			'BACK': 2,
			'KILL_ALL': 1
		}
	},
	{
		name: 'HYDROCARBON_default',
		sectorName: 'HYDROCARBON',
		weightAtPlanetGeneration: 5,
		weightAtPlanetAnalysis: 2,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 2,
		explorationEvents: {
			'FUEL_3': 4,
			'FUEL_4': 3,
			'FUEL_5': 2,
			'FUEL_6': 1
		}
	},
	{
		name: 'OXYGEN_default',
		sectorName: 'OXYGEN',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 12,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 1,
		explorationEvents: {
			'OXYGEN_24': 4,
			'OXYGEN_16': 3,
			'OXYGEN_8': 2,
			'NOTHING_TO_REPORT': 1
		}
	},
	{
		name: 'LANDING_default',
		sectorName: 'LANDING',
		weightAtPlanetGeneration: 0,
		weightAtPlanetAnalysis: 0,
		weightAtPlanetExploration: 0,
		maxPerPlanet: 1,
		explorationEvents: {
			'NOTHING_TO_REPORT': 4,
			'TIRED_2': 3,
			'ACCIDENT_3_5': 2,
			'DISASTER_3_5': 1
		}
	},
	{
		name: 'LOST_default',
		sectorName: 'LOST',
		weightAtPlanetGeneration: 0,
		weightAtPlanetAnalysis: 0,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 15,
		explorationEvents: {
			'FIND_LOST': 7,
			'AGAIN': 2,
			'KILL_LOST': 1
		}
	},
	{
		name: 'UNKNOWN_default',
		sectorName: 'UNKNOWN',
		weightAtPlanetGeneration: 0,
		weightAtPlanetAnalysis: 0,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 20,
		explorationEvents: {
			'NOTHING_TO_REPORT': 1
		}
	},
];

// Ability Effects Configuration
const AbilityEffects = {
	'survival': {
		name: 'Survival',
		description: 'Reduces damage taken from all sources by 1 point, increases steak gains by 1, and prevents being targeted by single-player execution events',
		effects: {
			damageReduction: 1,
			appliesTo: ['ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5', 'TIRED_2', 'FIGHT_8', 'FIGHT_10', 'FIGHT_12', 'FIGHT_15', 'FIGHT_18', 'FIGHT_32', 'FIGHT_8_10_12_15_18_32'],
			steakBonus: 1,
			immuneToSingleTargetExecution: true
		}
	},
	'pilot': {
		name: 'Pilot',
		description: 'Removes dangerous events from LANDING sector',
		effects: {
			sectorModifications: {
				'LANDING': {
					removeEvents: ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5']
				}
			}
		}
	},
	'botanic': {
		name: 'Botanic',
		description: 'Increases all fruit gains by 1',
		effects: {
			fruitBonus: 1
		}
	},
	'gunman': {
		name: 'Gunman',
		description: 'Increases combat power by 1 if wielder has any gun',
		effects: {
			combatPowerBonus: 1,
			requiresGun: true,
			gunTypes: ['blaster', 'machine_gun', 'missile_launcher', 'natamy_riffle', 'sniper_riffle']
		}
	},
	'diplomacy': {
		name: 'Diplomacy',
		description: 'Removes all combat events from exploration pools',
		effects: {
			removeCombatEvents: true
		}
	},
	'sprint': {
		name: 'Sprint',
		description: 'Adds +1 to the number of sectors that will be explored',
		effects: {
			additionalSectors: 1
		}
	},
	'tracker': {
		name: 'Tracker',
		description: 'Removes KILL_LOST event from LOST sector',
		effects: {
			sectorModifications: {
				'LOST': {
					removeEvents: ['KILL_LOST']
				}
			}
		}
	},
	'traitor': {
		name: 'Traitor',
		description: 'Doubles the odds of all negative events',
		effects: {
			doubleNegativeEvents: true
		}
	}
};

// Base Effects Configuration
const BaseEffects = {
	'centauri': {
		name: 'Centauri',
		effects: {
			blasterCombatBonus: 1
		}
	}
};

// Item Effects Configuration
const ItemEffects = {
	'blaster': {
		name: 'Blaster',
		effects: {
			combatPowerBonus: 1
		}
	},
	'driller': {
		name: 'Driller',
		effects: {
			doubleFuelGains: true
		}
	},
	'echo_sounder': {
		name: 'Echo Sounder',
		effects: {
			sectorDiscoveryMultiplier: {
				'HYDROCARBON': 5
			}
		}
	},
	'grenade': {
		name: 'Grenade',
		effects: {
			combatPowerBonus: 3,
			singleUse: true
		}
	},
	'heat_seeker': {
		name: 'Heat Seeker',
		effects: {
			sectorDiscoveryMultiplier: {
				'LOST': 5,
				'INTELLIGENT': 5,
				'RUMINANT': 5,
				'PREDATOR': 5,
				'INSECT': 5,
				'MANKAROG': 5
			}
		}
	},
	'knife': {
		name: 'Knife',
		effects: {
			combatPowerBonus: 1
		}
	},
	'machine_gun': {
		name: 'Machine Gun',
		effects: {
			combatPowerBonus: 2
		}
	},
	'missile_launcher': {
		name: 'Missile Launcher',
		effects: {
			combatPowerBonus: 3
		}
	},
	'natamy_riffle': {
		name: 'Natamy Riffle',
		effects: {
			combatPowerBonus: 1
		}
	},
	'plastenite_armor': {
		name: 'Plastenite Armor',
		effects: {
			fightDamageReduction: 1
		}
	},
	'postit': {
		name: 'Post-it',
		effects: {
			// TODO: Define specific effects
		}
	},
	'quad_compass': {
		name: 'Quad Compass',
		effects: {
			removeEvents: ['AGAIN'],
			immuneToEvents: ['PLAYER_LOST']
		}
	},
	'rope': {
		name: 'Rope',
		effects: {
			// Rope immunity is encoded in the event type: ACCIDENT_ROPE_3_5
			// sectors MOUNTAIN, CAVE, SEISMIC_ACTIVITY emit ACCIDENT_ROPE_3_5 instead of ACCIDENT_3_5
			// During damage distribution, players carrying a rope are immune to ACCIDENT_ROPE_3_5
			eventImmunity: ['ACCIDENT_ROPE_3_5']
		}
	},
	'sniper_riffle': {
		name: 'Sniper Riffle',
		effects: {
			combatPowerBonus: 1
		}
	},
	'space_suit': {
		name: 'Space Suit',
		effects: {
			allowExplorationWithoutOxygen: true
		}
	},
	'trad_module': {
		name: 'Trad Module',
		effects: {
			sectorEventBonus: {
				'INTELLIGENT': {
					'ARTEFACT': 2
				}
			}
		}
	},
	'white_flag': {
		name: 'White Flag',
		effects: {
			removeCombatEvents: true
		}
	}
};

// Projects Effects Configuration
const ProjectEffects = {
	'antigrav_propeller': {
		name: 'Antigrav Propeller',
		effects: {
			sectorEventModifier: {
				'LANDING': {
					'NOTHING_TO_REPORT': 2 // Doubles the weight of the "Nothing" event in the Landing sector
				}
			}
		}
	}
};

// Export for use in other modules (including tests)
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.PlanetSectorConfigData = PlanetSectorConfigData;
_global.AbilityEffects = AbilityEffects;
_global.BaseEffects = BaseEffects;
_global.ItemEffects = ItemEffects;
_global.ProjectEffects = ProjectEffects;

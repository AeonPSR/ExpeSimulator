// Planet Sector Configuration Data converted from PHP
const PlanetSectorConfigData = [
	{
		name: 'FOREST_default',
		sectorName: 'FOREST',
		weightAtPlanetGeneration: 8,
		weightAtPlanetAnalysis: 12,
		weightAtPlanetExploration: 8,
		maxPerPlanet: 4,
		negativeLevel: 30,
		nonCombatNegativeLevel: 30,
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
		negativeLevel: 60,
		nonCombatNegativeLevel: 60,
		explorationEvents: {
			'ACCIDENT_3_5': 4,
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
		negativeLevel: 60,
		nonCombatNegativeLevel: 60,
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
		negativeLevel: 40,
		nonCombatNegativeLevel: 40,
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
		negativeLevel: 10,
		nonCombatNegativeLevel: 10,
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
		negativeLevel: 30,
		nonCombatNegativeLevel: 30,
		explorationEvents: {
			'FUEL_2': 4,
			'ACCIDENT_3_5': 3,
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
		negativeLevel: 30,
		nonCombatNegativeLevel: 13,
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
		negativeLevel: 10,
		nonCombatNegativeLevel: 0,
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
		negativeLevel: 0,
		nonCombatNegativeLevel: 0,
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
		negativeLevel: 70,
		nonCombatNegativeLevel: 63,
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
		negativeLevel: 30,
		nonCombatNegativeLevel: 22,
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
		negativeLevel: 70,
		nonCombatNegativeLevel: 50,
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
		negativeLevel: 50,
		nonCombatNegativeLevel: 17,
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
		negativeLevel: 80,
		nonCombatNegativeLevel: 78,
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
		negativeLevel: 70,
		nonCombatNegativeLevel: 57,
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
		negativeLevel: 60,
		nonCombatNegativeLevel: 60,
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
		negativeLevel: 50,
		nonCombatNegativeLevel: 50,
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
		negativeLevel: 40,
		nonCombatNegativeLevel: 40,
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
		negativeLevel: 30,
		nonCombatNegativeLevel: 30,
		explorationEvents: {
			'NOTHING_TO_REPORT': 4,
			'BACK': 3,
			'ACCIDENT_3_5': 2,
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
		negativeLevel: 10,
		nonCombatNegativeLevel: 10,
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
		negativeLevel: 0,
		nonCombatNegativeLevel: 0,
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
		negativeLevel: 0,
		nonCombatNegativeLevel: 0,
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
		negativeLevel: 60,
		nonCombatNegativeLevel: 60,
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
		negativeLevel: 10,
		nonCombatNegativeLevel: 10,
		explorationEvents: {
			'FIND_LOST': 7,
			'AGAIN': 2,
			'KILL_LOST': 1
		}
	},
];

// Event descriptions for better UX
const EventDescriptions = {
	'NOTHING_TO_REPORT': 'Nothing to Report',
	'TIRED_2': 'Tired (-2 HP to all players)',
	'ACCIDENT_3_5': 'Accident (3-5 damage to one player)',
	'DISASTER_3_5': 'Disaster (3-5 damage to all players)',
	'HARVEST_1': 'Harvest +1 Alien Fruit',
	'HARVEST_2': 'Harvest +2 Alien Fruits',
	'HARVEST_3': 'Harvest +3 Alien Fruits',
	'AGAIN': 'Sector Unexplored (reroll needed)',
	'DISEASE': 'Disease',
	'PLAYER_LOST': 'Player Lost (adds Lost event)',
	'FUEL_1': 'Fuel +1',
	'FUEL_2': 'Fuel +2',
	'FUEL_3': 'Fuel +3',
	'FUEL_4': 'Fuel +4',
	'FUEL_5': 'Fuel +5',
	'FUEL_6': 'Fuel +6',
	'PROVISION_1': 'Provision +1 Steak',
	'PROVISION_2': 'Provision +2 Steaks',
	'PROVISION_3': 'Provision +3 Steaks',
	'PROVISION_4': 'Provision +4 Steaks',
	'ARTEFACT': 'Artefact Found',
	'FIGHT_8': 'Fight (8 damage split among players)',
	'FIGHT_10': 'Fight (10 damage split among players)',
	'FIGHT_12': 'Fight (12 damage split among players)',
	'FIGHT_15': 'Fight (15 damage split among players)',
	'FIGHT_18': 'Fight (18 damage split among players)',
	'FIGHT_32': 'Fight (32 damage split among players)',
	'FIGHT_8_10_12_15_18_32': 'Fight (8-32 damage split among players)',
	'ITEM_LOST': 'Item Lost',
	'KILL_RANDOM': 'Kill Random Player',
	'BACK': 'Go Back (forced retreat)',
	'KILL_ALL': 'Kill All Players',
	'FIND_LOST': 'Find Lost Player',
	'KILL_LOST': 'Kill Lost Player',
	'MUSH_TRAP': 'Mush Trap',
	'STARMAP': 'Starmap Found',
	'OXYGEN_8': 'Oxygen +8',
	'OXYGEN_16': 'Oxygen +16',
	'OXYGEN_24': 'Oxygen +24'
};

// Ability Effects Configuration
const AbilityEffects = {
	'survival': {
		name: 'Survival',
		description: 'Reduces damage taken from all sources by 1 point, increases steak gains by 1, and prevents being targeted by single-player execution events',
		effects: {
			damageReduction: 1,
			appliesTo: ['ACCIDENT_3_5', 'DISASTER_3_5', 'TIRED_2', 'FIGHT_8', 'FIGHT_10', 'FIGHT_12', 'FIGHT_15', 'FIGHT_18', 'FIGHT_32', 'FIGHT_8_10_12_15_18_32'],
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
	'traitor': {
		name: 'Traitor',
		description: 'Doubles the odds of all negative events',
		effects: {
			doubleNegativeEvents: true
		}
	}
};

// Negative Events Configuration - events that are considered harmful/negative
const NegativeEvents = [
	'TIRED_2',
	'ACCIDENT_3_5',
	'DISASTER_3_5',
	'DISEASE',
	'PLAYER_LOST',
	'FIGHT_8',
	'FIGHT_10',
	'FIGHT_12',
	'FIGHT_15',
	'FIGHT_18',
	'FIGHT_32',
	'FIGHT_8_10_12_15_18_32',
	'ITEM_LOST',
	'KILL_RANDOM',
	'KILL_ALL',
	'KILL_LOST',
	'MUSH_TRAP'
];

// Base Effects Configuration
const BaseEffects = {
	'centauri': {
		name: 'Centauri',
		description: 'Each blaster gives +1 combat power',
		effects: {
			blasterCombatBonus: 1
		}
	}
};

// Item Effects Configuration
const ItemEffects = {
	'blaster': {
		name: 'Blaster',
		description: 'Energy weapon for combat situations',
		effects: {
			combatPowerBonus: 1
		}
	},
	'driller': {
		name: 'Driller',
		description: 'Improves resource extraction in caves and mountains',
		effects: {
			doubleFuelGains: true
		}
	},
	'echo_sounder': {
		name: 'Echo Sounder',
		description: 'Helps detect hidden passages and dangers',
		effects: {
			sectorDiscoveryBonus: {
				'HYDROCARBON': 4
			}
		}
	},
	'grenade': {
		name: 'Grenade',
		description: 'Explosive device for combat or clearing obstacles',
		effects: {
			combatPowerBonus: 3,
			singleUse: true
		}
	},
	'heat_seeker': {
		name: 'Heat Seeker',
		description: 'Thermal detection device',
		effects: {
			sectorDiscoveryBonus: {
				'RUMINANT': 4,
				'MANKAROG': 4,
				'INSECT': 4,
				'PREDATOR': 4,
				'INTELLIGENT': 4
			}
		}
	},
	'knife': {
		name: 'Knife',
		description: 'Close combat weapon and utility tool',
		effects: {
			combatPowerBonus: 1
		}
	},
	'machine_gun': {
		name: 'Machine Gun',
		description: 'Heavy automatic weapon for combat',
		effects: {
			combatPowerBonus: 2
		}
	},
	'missile_launcher': {
		name: 'Missile Launcher',
		description: 'Heavy ranged weapon system',
		effects: {
			combatPowerBonus: 3
		}
	},
	'natamy_riffle': {
		name: 'Natamy Riffle',
		description: 'Specialized rifle weapon',
		effects: {
			combatPowerBonus: 1
		}
	},
	'plastenite_armor': {
		name: 'Plastenite Armor',
		description: 'Reduces damage taken from various sources',
		effects: {
			fightDamageReduction: 1
		}
	},
	'postit': {
		name: 'Post-it',
		description: 'Simple note-taking tool',
		effects: {
			// TODO: Define specific effects
		}
	},
	'quad_compass': {
		name: 'Quad Compass',
		description: 'Advanced navigation device, reduces chance of getting lost',
		effects: {
			removeEvents: ['AGAIN'],
			immuneToEvents: ['PLAYER_LOST']
		}
	},
	'rope': {
		name: 'Rope',
		description: 'Prevents falling accidents in difficult terrain',
		effects: {
			sectorSpecificImmunity: {
				'SEISMIC_ACTIVITY': ['ACCIDENT_3_5'],
				'CAVE': ['ACCIDENT_3_5'],
				'MOUNTAIN': ['ACCIDENT_3_5']
			}
		}
	},
	'sniper_riffle': {
		name: 'Sniper Riffle',
		description: 'Long-range precision weapon',
		effects: {
			combatPowerBonus: 1
		}
	},
	'space_suit': {
		name: 'Space Suit',
		description: 'Protects against environmental hazards',
		effects: {
			allowExplorationWithoutOxygen: true
		}
	},
	'trad_module': {
		name: 'Trad Module',
		description: 'Translation/communication device',
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
		description: 'Diplomatic tool for peaceful interactions',
		effects: {
			removeCombatEvents: true
		}
	}
};

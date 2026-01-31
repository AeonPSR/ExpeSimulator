/**
 * EventWeightCalculator
 * 
 * Pure function service for calculating normalized event probabilities.
 * Given a sector configuration, calculates the probability of each event occurring.
 * All probabilities sum to 1.0.
 * 
 * @module probability/EventWeightCalculator
 */
const EventWeightCalculator = {

	/**
	 * Calculates normalized probabilities for all events in a sector.
	 * 
	 * @param {Object} sectorConfig - Sector configuration from PlanetSectorConfigData
	 * @param {string} sectorConfig.sectorName - Name of the sector
	 * @param {Object} sectorConfig.explorationEvents - Map of event names to weights
	 * @returns {Map<string, number>} Map of event names to probabilities (sum = 1.0)
	 * 
	 * @example
	 * const probs = EventWeightCalculator.calculateProbabilities(forestSector);
	 * // Returns Map { 'HARVEST_2' => 0.4, 'AGAIN' => 0.3, 'DISEASE' => 0.2, 'PLAYER_LOST' => 0.1 }
	 */
	calculateProbabilities(sectorConfig) {
		if (!sectorConfig || !sectorConfig.explorationEvents) {
			console.warn('EventWeightCalculator: Invalid sector config', sectorConfig);
			return new Map();
		}

		const events = sectorConfig.explorationEvents;
		const totalWeight = this.getTotalWeight(events);
		
		if (totalWeight === 0) {
			console.warn('EventWeightCalculator: Total weight is 0 for sector', sectorConfig.sectorName);
			return new Map();
		}

		const probabilities = new Map();
		
		for (const [eventName, weight] of Object.entries(events)) {
			probabilities.set(eventName, weight / totalWeight);
		}

		return probabilities;
	},

	/**
	 * Calculates the total weight of all events in a sector.
	 * 
	 * @param {Object} events - Map of event names to weights
	 * @returns {number} Sum of all weights
	 */
	getTotalWeight(events) {
		return Object.values(events).reduce((sum, weight) => sum + weight, 0);
	},

	/**
	 * Gets the sector configuration from PlanetSectorConfigData by name.
	 * 
	 * @param {string} sectorName - Name of the sector (e.g., 'FOREST', 'CAVE')
	 * @returns {Object|null} Sector configuration or null if not found
	 */
	getSectorConfig(sectorName) {
		if (typeof PlanetSectorConfigData === 'undefined') {
			console.error('EventWeightCalculator: PlanetSectorConfigData not loaded');
			return null;
		}

		return PlanetSectorConfigData.find(s => s.sectorName === sectorName) || null;
	},

	/**
	 * Convenience method: Get probabilities by sector name.
	 * 
	 * @param {string} sectorName - Name of the sector
	 * @returns {Map<string, number>} Map of event names to probabilities
	 */
	getProbabilitiesForSector(sectorName) {
		const config = this.getSectorConfig(sectorName);
		if (!config) {
			console.warn(`EventWeightCalculator: Sector '${sectorName}' not found`);
			return new Map();
		}
		return this.calculateProbabilities(config);
	},

	/**
	 * Formats probabilities as a readable string (for console/debug output).
	 * 
	 * @param {string} sectorName - Name of the sector
	 * @param {Map<string, number>} probabilities - Map of event probabilities
	 * @returns {string} Formatted string
	 */
	formatProbabilities(sectorName, probabilities) {
		const lines = [`${sectorName} sector probabilities:`];
		let total = 0;

		for (const [event, prob] of probabilities) {
			const percentage = (prob * 100).toFixed(1);
			lines.push(`  ${event}: ${prob.toFixed(4)} (${percentage}%)`);
			total += prob;
		}

		lines.push(`  ─────────────────────`);
		lines.push(`  Total: ${total.toFixed(4)} ${Math.abs(total - 1) < 0.0001 ? '✓' : '✗ ERROR'}`);

		return lines.join('\n');
	},

	/**
	 * Generates HTML output for displaying probabilities in the UI.
	 * 
	 * @param {string} sectorName - Name of the sector
	 * @param {Map<string, number>} probabilities - Map of event probabilities
	 * @returns {string} HTML string
	 */
	generateHTML(sectorName, probabilities) {
		if (probabilities.size === 0) {
			return `<div class="outcome-category"><h5>${sectorName}</h5><p>No events configured</p></div>`;
		}

		let html = `<div class="outcome-category">`;
		html += `<h5>${sectorName}</h5>`;
		
		for (const [event, prob] of probabilities) {
			const percentage = (prob * 100).toFixed(1);
			const colorClass = this._getEventColorClass(event);
			html += `<div class="outcome-item">`;
			html += `<span class="outcome-label">${event}</span>`;
			html += `<span class="outcome-value ${colorClass}">${percentage}%</span>`;
			html += `</div>`;
		}

		html += `</div>`;
		return html;
	},

	/**
	 * Gets CSS class for event coloring based on event type.
	 * @private
	 */
	_getEventColorClass(eventName) {
		// Positive events (resources)
		if (eventName.startsWith('HARVEST_') || 
			eventName.startsWith('PROVISION_') ||
			eventName.startsWith('FUEL_') ||
			eventName.startsWith('OXYGEN_') ||
			eventName === 'ARTEFACT') {
			return 'positive';
		}
		
		// Neutral events
		if (eventName === 'NOTHING_TO_REPORT' || eventName === 'AGAIN') {
			return 'neutral';
		}
		
		// Warning events (damage/risk)
		if (eventName.startsWith('TIRED_') || 
			eventName.startsWith('ACCIDENT_') ||
			eventName === 'DISEASE') {
			return 'warning';
		}
		
		// Danger events (fights, death)
		if (eventName.startsWith('FIGHT_') || 
			eventName.startsWith('KILL_') ||
			eventName === 'PLAYER_LOST' ||
			eventName.startsWith('DISASTER_')) {
			return 'danger';
		}

		return 'neutral';
	},

	// ========================================
	// TEST METHODS
	// ========================================

	/**
	 * Runs tests and outputs to console.
	 * Call this to verify the calculator is working correctly.
	 */
	runTests() {
		console.log('═══════════════════════════════════════════════════════');
		console.log('EventWeightCalculator - Tests');
		console.log('═══════════════════════════════════════════════════════');

		// Test a few different sector types
		const testSectors = ['FOREST', 'CAVE', 'RUINS', 'WRECK', 'DESERT'];
		
		for (const sectorName of testSectors) {
			const probs = this.getProbabilitiesForSector(sectorName);
			console.log('\n' + this.formatProbabilities(sectorName, probs));
		}

		console.log('\n═══════════════════════════════════════════════════════');
		console.log('Tests complete. Check that all totals show ✓');
		console.log('═══════════════════════════════════════════════════════');
	},

	/**
	 * Runs modifier tests and outputs to console.
	 * Call this to verify ModifierApplicator is working correctly.
	 */
	runModifierTests() {
		console.log('═══════════════════════════════════════════════════════');
		console.log('Event Modifier Tests');
		console.log('═══════════════════════════════════════════════════════');

		// Test 1: Pilot removes LANDING damage events
		this._testPilot();

		// Test 2: Diplomacy removes all FIGHT_* events
		this._testDiplomacy();

		// Test 3: Tracker removes KILL_LOST from LOST
		this._testTracker();

		// Test 4: White Flag only affects INTELLIGENT
		this._testWhiteFlag();

		// Test 5: Antigrav Propeller doubles NOTHING_TO_REPORT in LANDING
		this._testAntigrav();

		console.log('\n═══════════════════════════════════════════════════════');
		console.log('Modifier tests complete');
		console.log('═══════════════════════════════════════════════════════');
	},

	/**
	 * @private Test Pilot ability
	 */
	_testPilot() {
		console.log('\n▶ PILOT (LANDING sector):');
		const config = this.getSectorConfig('LANDING');
		const original = this.calculateProbabilities(config);
		
		const modified = ModifierApplicator.apply(config, 'LANDING', { abilities: ['PILOT'] });
		const modifiedProbs = this.calculateProbabilities(modified);

		console.log('  Removed: TIRED_2, ACCIDENT_3_5, DISASTER_3_5');
		console.log('  Original events:', original.size, '→ Modified:', modifiedProbs.size);
	},

	/**
	 * @private Test Diplomacy ability
	 */
	_testDiplomacy() {
		console.log('\n▶ DIPLOMACY (INTELLIGENT sector):');
		const config = this.getSectorConfig('INTELLIGENT');
		const original = this.calculateProbabilities(config);
		
		const fightEvents = [...original.keys()].filter(k => k.startsWith('FIGHT_'));
		console.log('  Original FIGHT_* events:', fightEvents.join(', ') || 'none');

		const modified = ModifierApplicator.apply(config, 'INTELLIGENT', { abilities: ['DIPLOMACY'] });
		const modifiedProbs = this.calculateProbabilities(modified);
		
		const remainingFights = [...modifiedProbs.keys()].filter(k => k.startsWith('FIGHT_'));
		console.log('  After Diplomacy:', remainingFights.join(', ') || 'none');
	},

	/**
	 * @private Test Tracker ability
	 */
	_testTracker() {
		console.log('\n▶ TRACKER (LOST sector):');
		const config = this.getSectorConfig('LOST');
		const original = this.calculateProbabilities(config);
		
		console.log('  Original KILL_LOST:', original.has('KILL_LOST') ? ((original.get('KILL_LOST') * 100).toFixed(1) + '%') : 'not present');

		const modified = ModifierApplicator.apply(config, 'LOST', { abilities: ['TRACKER'] });
		const modifiedProbs = this.calculateProbabilities(modified);
		
		console.log('  After Tracker:', modifiedProbs.has('KILL_LOST') ? ((modifiedProbs.get('KILL_LOST') * 100).toFixed(1) + '%') : 'REMOVED');
	},

	/**
	 * @private Test White Flag item
	 */
	_testWhiteFlag() {
		console.log('\n▶ WHITE FLAG (INTELLIGENT vs FOREST):');
		
		// INTELLIGENT - should remove fights
		const intConfig = this.getSectorConfig('INTELLIGENT');
		const intModified = ModifierApplicator.apply(intConfig, 'INTELLIGENT', { items: ['WHITE_FLAG'] });
		const intProbs = this.calculateProbabilities(intModified);
		const intFights = [...intProbs.keys()].filter(k => k.startsWith('FIGHT_'));
		console.log('  INTELLIGENT after White Flag:', intFights.length === 0 ? 'No fights ✓' : intFights.join(', '));

		// FOREST - should NOT affect fights (White Flag only works on INTELLIGENT)
		const forestConfig = this.getSectorConfig('FOREST');
		const forestOriginal = this.calculateProbabilities(forestConfig);
		const forestModified = ModifierApplicator.apply(forestConfig, 'FOREST', { items: ['WHITE_FLAG'] });
		const forestProbs = this.calculateProbabilities(forestModified);
		const forestFightsOrig = [...forestOriginal.keys()].filter(k => k.startsWith('FIGHT_'));
		const forestFightsMod = [...forestProbs.keys()].filter(k => k.startsWith('FIGHT_'));
		console.log('  FOREST fights unchanged:', forestFightsOrig.length === forestFightsMod.length ? '✓' : '✗');
	},

	/**
	 * @private Test Antigrav Propeller project
	 */
	_testAntigrav() {
		console.log('\n▶ ANTIGRAV PROPELLER (LANDING sector):');
		const config = this.getSectorConfig('LANDING');
		const original = this.calculateProbabilities(config);
		
		console.log('  Original NOTHING_TO_REPORT:', ((original.get('NOTHING_TO_REPORT') || 0) * 100).toFixed(1) + '%');

		const modified = ModifierApplicator.apply(config, 'LANDING', { projects: ['ANTIGRAV_PROPELLER'] });
		const modifiedProbs = this.calculateProbabilities(modified);
		
		console.log('  After Antigrav:', ((modifiedProbs.get('NOTHING_TO_REPORT') || 0) * 100).toFixed(1) + '%');
	},

	/**
	 * Generates test output HTML for all selected sectors.
	 * 
	 * @param {Array<string>} selectedSectors - Array of sector names
	 * @returns {string} HTML string showing probabilities for each sector
	 */
	generateTestOutput(selectedSectors) {
		if (!selectedSectors || selectedSectors.length === 0) {
			return '<p class="neutral">Select sectors to see expected outcomes</p>';
		}

		// Count sector occurrences and collect all event probabilities
		const sectorCounts = {};
		for (const sector of selectedSectors) {
			sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
		}

		// Aggregate all events across all sectors
		const aggregatedEvents = this._aggregateEvents(selectedSectors);

		let html = '';

		// --- Resources Section (placeholder until ResourceHandler is built) ---
		html += this._generateResourcesPlaceholder(aggregatedEvents);

		// --- Combat Risks Section (placeholder) ---
		html += this._generateCombatRisksPlaceholder(aggregatedEvents);

		// --- Combat Damage Section (placeholder) ---
		html += this._generateCombatDamagePlaceholder();

		// --- Event Risks Section (placeholder) ---
		html += this._generateEventRisksPlaceholder(aggregatedEvents);

		// --- Event Damage Section (placeholder) ---
		html += this._generateEventDamagePlaceholder();

		// --- Negative Events Section (placeholder) ---
		html += this._generateNegativeEventsPlaceholder(aggregatedEvents);

		// --- Debug: Raw sector probabilities ---
		html += this._generateSectorBreakdown(sectorCounts);

		return html;
	},

	/**
	 * Aggregates event probabilities across all selected sectors.
	 * @private
	 */
	_aggregateEvents(selectedSectors) {
		const events = {
			// Resources
			fruits: 0,
			steaks: 0,
			fuel: 0,
			oxygen: 0,
			artefacts: 0,
			// Combat
			fights: {},
			// Damage events
			tired: 0,
			accident: 0,
			disaster: 0,
			// Negative events
			disease: 0,
			playerLost: 0,
			again: 0,
			itemLost: 0,
			killAll: 0,
			killOne: 0,
			mushTrap: 0,
			nothing: 0
		};

		for (const sectorName of selectedSectors) {
			const probs = this.getProbabilitiesForSector(sectorName);
			
			for (const [eventName, prob] of probs) {
				// Resource events
				if (eventName.startsWith('HARVEST_')) {
					const amount = parseInt(eventName.split('_')[1]) || 1;
					events.fruits += prob * amount;
				} else if (eventName.startsWith('PROVISION_')) {
					const amount = parseInt(eventName.split('_')[1]) || 1;
					events.steaks += prob * amount;
				} else if (eventName.startsWith('FUEL_')) {
					const amount = parseInt(eventName.split('_')[1]) || 1;
					events.fuel += prob * amount;
				} else if (eventName.startsWith('OXYGEN_')) {
					const amount = parseInt(eventName.split('_')[1]) || 1;
					events.oxygen += prob * amount;
				} else if (eventName === 'ARTEFACT') {
					events.artefacts += prob;
				}
				// Combat events
				else if (eventName.startsWith('FIGHT_')) {
					const fightType = eventName.replace('FIGHT_', '');
					events.fights[fightType] = (events.fights[fightType] || 0) + prob;
				}
				// Damage events
				else if (eventName.startsWith('TIRED_')) {
					events.tired += prob;
				} else if (eventName.startsWith('ACCIDENT_')) {
					events.accident += prob;
				} else if (eventName.startsWith('DISASTER_')) {
					events.disaster += prob;
				}
				// Negative events
				else if (eventName === 'DISEASE') {
					events.disease += prob;
				} else if (eventName === 'PLAYER_LOST') {
					events.playerLost += prob;
				} else if (eventName === 'AGAIN') {
					events.again += prob;
				} else if (eventName === 'ITEM_LOST') {
					events.itemLost += prob;
				} else if (eventName === 'KILL_ALL') {
					events.killAll += prob;
				} else if (eventName === 'KILL_RANDOM') {
					events.killOne += prob;
				} else if (eventName === 'MUSH_TRAP') {
					events.mushTrap += prob;
				} else if (eventName === 'NOTHING_TO_REPORT') {
					events.nothing += prob;
				}
			}
		}

		return events;
	},

	/**
	 * @private
	 */
	_generateResourcesPlaceholder(events) {
		const formatNum = (n) => n === 0 ? 'none' : n.toFixed(1);
		const getIcon = (file) => {
			if (typeof getResourceURL !== 'undefined') {
				return `<img src="${getResourceURL('items/' + file)}" alt="" class="resource-icon" />`;
			}
			return '';
		};

		const resources = [
			{ name: 'Fruits', icon: 'fruit10.jpg', value: events.fruits },
			{ name: 'Steaks', icon: 'alien_steak.jpg', value: events.steaks },
			{ name: 'Fuel', icon: 'fuel_capsule.jpg', value: events.fuel },
			{ name: 'Oxygen', icon: 'oxy_capsule.jpg', value: events.oxygen },
			{ name: 'Artefacts', icon: 'artefact.png', value: events.artefacts }
		];

		// Sort: resources with values first
		resources.sort((a, b) => (b.value > 0 ? 1 : 0) - (a.value > 0 ? 1 : 0));

		let rows = resources.map(r => {
			if (r.value === 0) {
				return `<tr><td class="icon-cell">${getIcon(r.icon)}</td><td colspan="3" class="neutral none-row">none</td></tr>`;
			}
			// For now show expected value in "Average" column, placeholders for others
			return `<tr>
				<td class="icon-cell">${getIcon(r.icon)}</td>
				<td class="warning">-</td>
				<td class="neutral">${r.value.toFixed(1)}</td>
				<td class="positive">-</td>
			</tr>`;
		}).join('');

		return `
			<div class="outcome-category">
				<h5>Resources</h5>
				<table class="resource-table">
					<thead>
						<tr>
							<th>Resource</th>
							<th class="pessimist-col">Pessimist</th>
							<th class="average-col">Average</th>
							<th class="optimist-col">Optimist</th>
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		`;
	},

	/**
	 * @private
	 */
	_generateCombatRisksPlaceholder(events) {
		const fightTypes = Object.keys(events.fights);
		
		if (fightTypes.length === 0) {
			return `
				<div class="outcome-category">
					<h5>Combat Risks</h5>
					<div class="outcome-item"><span>No combat encounters</span></div>
				</div>
			`;
		}

		const entries = fightTypes.map(type => {
			const expectedFights = events.fights[type];
			return `<div class="outcome-item">
				<span>FIGHT_${type}:</span>
				<div class="fight-stats">
					<div class="expected-fights">Expected: ${expectedFights.toFixed(2)} fights</div>
				</div>
			</div>`;
		}).join('');

		return `
			<div class="outcome-category">
				<h5>Combat Risks</h5>
				${entries}
			</div>
		`;
	},

	/**
	 * @private
	 */
	_generateCombatDamagePlaceholder() {
		const hpIcon = typeof getResourceURL !== 'undefined' 
			? `<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`
			: '';

		return `
			<div class="outcome-category">
				<h5>Combat Damage</h5>
				<div class="outcome-item">
					<span>Optimist Scenario:</span>
					<span class="positive">${hpIcon}<strong>-</strong></span>
				</div>
				<div class="outcome-item">
					<span>Average HP Lost:</span>
					<span class="warning">${hpIcon}<strong>-</strong></span>
				</div>
				<div class="outcome-item">
					<span>Pessimist Scenario:</span>
					<span class="danger">${hpIcon}<strong>-</strong></span>
				</div>
				<div class="outcome-item">
					<span>Worst Case:</span>
					<span class="critical">${hpIcon}<strong>-</strong></span>
				</div>
			</div>
		`;
	},

	/**
	 * @private
	 */
	_generateEventRisksPlaceholder(events) {
		const hasEvents = events.tired > 0 || events.accident > 0 || events.disaster > 0;

		if (!hasEvents) {
			return `
				<div class="outcome-category">
					<h5>Event Risks</h5>
					<div class="outcome-item"><span>No event damage risks</span></div>
				</div>
			`;
		}

		let entries = '';
		if (events.tired > 0) {
			entries += `<div class="outcome-item"><span>Fatigue (2 dmg):</span><span class="neutral">Expected: ${events.tired.toFixed(2)}</span></div>`;
		}
		if (events.accident > 0) {
			entries += `<div class="outcome-item"><span>Accident (3-5 dmg):</span><span class="warning">Expected: ${events.accident.toFixed(2)}</span></div>`;
		}
		if (events.disaster > 0) {
			entries += `<div class="outcome-item"><span>Disaster (3-5 dmg):</span><span class="danger">Expected: ${events.disaster.toFixed(2)}</span></div>`;
		}

		return `
			<div class="outcome-category">
				<h5>Event Risks</h5>
				${entries}
			</div>
		`;
	},

	/**
	 * @private
	 */
	_generateEventDamagePlaceholder() {
		const hpIcon = typeof getResourceURL !== 'undefined' 
			? `<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`
			: '';

		return `
			<div class="outcome-category">
				<h5>Event Damage</h5>
				<div class="outcome-item">
					<span>Optimist Scenario:</span>
					<span class="positive">${hpIcon}<strong>-</strong></span>
				</div>
				<div class="outcome-item">
					<span>Average HP Lost:</span>
					<span class="warning">${hpIcon}<strong>-</strong></span>
				</div>
				<div class="outcome-item">
					<span>Pessimist Scenario:</span>
					<span class="danger">${hpIcon}<strong>-</strong></span>
				</div>
				<div class="outcome-item">
					<span>Worst Case:</span>
					<span class="critical">${hpIcon}<strong>-</strong></span>
				</div>
			</div>
		`;
	},

	/**
	 * @private
	 */
	_generateNegativeEventsPlaceholder(events) {
		const eventList = [
			{ name: 'Player Lost', value: events.playerLost },
			{ name: 'Sector Unexplored', value: events.again },
			{ name: 'Disease', value: events.disease },
			{ name: 'Item Loss', value: events.itemLost },
			{ name: 'Kill All', value: events.killAll },
			{ name: 'Kill One', value: events.killOne },
			{ name: 'Mush Trap', value: events.mushTrap }
		];

		// Sort: events with values first
		eventList.sort((a, b) => (b.value > 0 ? 1 : 0) - (a.value > 0 ? 1 : 0));

		const rows = eventList.map(e => {
			if (e.value === 0) {
				return `<tr><td>${e.name}</td><td colspan="3" class="neutral none-row">none</td></tr>`;
			}
			return `<tr>
				<td>${e.name}</td>
				<td class="warning">-</td>
				<td class="neutral">${e.value.toFixed(2)}</td>
				<td class="positive">-</td>
			</tr>`;
		}).join('');

		return `
			<div class="outcome-category">
				<h5>Negative Events</h5>
				<table class="events-table">
					<thead>
						<tr>
							<th>Event Type</th>
							<th class="pessimist-col">Pessimist</th>
							<th class="average-col">Average</th>
							<th class="optimist-col">Optimist</th>
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		`;
	},

	/**
	 * @private - Debug: shows raw sector breakdown
	 */
	_generateSectorBreakdown(sectorCounts) {
		let html = '<div class="outcome-category" style="opacity: 0.7; font-size: 11px;">';
		html += '<h5 style="font-size: 12px;">Debug: Sector Breakdown</h5>';

		for (const [sectorName, count] of Object.entries(sectorCounts)) {
			const probs = this.getProbabilitiesForSector(sectorName);
			html += `<div style="margin-bottom: 8px;"><strong>${sectorName}${count > 1 ? ` (×${count})` : ''}</strong>`;
			
			for (const [event, prob] of probs) {
				const colorClass = this._getEventColorClass(event);
				html += `<div class="outcome-item" style="padding: 2px 0;">`;
				html += `<span class="outcome-label" style="font-size: 11px;">${event}</span>`;
				html += `<span class="outcome-value ${colorClass}" style="font-size: 11px;">${(prob * 100).toFixed(1)}%</span>`;
				html += `</div>`;
			}
			html += '</div>';
		}

		html += '</div>';
		return html;
	}
};

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.EventWeightCalculator = EventWeightCalculator;
}

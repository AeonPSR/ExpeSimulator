/**
 * ProbabilityDisplay Component
 * 
 * FRONTEND: Receives data from backend, generates all HTML rendering.
 * Displays event probabilities, resources, fights, and sector breakdowns.
 */
class ProbabilityDisplay extends Component {
	constructor(options = {}) {
		super(options);
		this._contentElement = null;
		this._getResourceURL = options.getResourceURL || window.getResourceURL;
	}

	/**
	 * Creates the probability display section
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'probability-display' });

		const header = this.createElement('h4', {}, 'Event Probabilities');
		this.element.appendChild(header);

		this._contentElement = this.createElement('div', {
			className: 'prob-content',
			id: 'prob-content'
		}, 'Select sectors to see probabilities');

		this.element.appendChild(this._contentElement);
		return this.element;
	}

	/**
	 * Updates display with data from backend
	 * @param {Object} data - Results from EventWeightCalculator.calculate()
	 */
	update(data) {
		if (!data || !this._contentElement) {
			this.clear();
			return;
		}

		let html = '';
		html += this._renderResources(data.resources);
		html += this._renderCombatRisks(data.combat);
		html += this._renderCombatDamage(data.combat);
		html += this._renderEventRisks(data.eventDamage);
		html += this._renderEventDamage(data.eventDamage);
		html += this._renderNegativeEvents(data.negativeEvents);

		this._contentElement.innerHTML = html;
	}

	/**
	 * Clears the display
	 */
	clear() {
		if (this._contentElement) {
			this._contentElement.textContent = 'Select sectors to see probabilities';
		}
	}

	// ========================================
	// Render Methods
	// ========================================

	_renderResources(resources) {
		const items = [
			{ name: 'Fruits', icon: 'pictures/items/fruit10.jpg', data: resources.fruits },
			{ name: 'Steaks', icon: 'pictures/items/alien_steak.jpg', data: resources.steaks },
			{ name: 'Fuel', icon: 'pictures/items/fuel_capsule.jpg', data: resources.fuel },
			{ name: 'Oxygen', icon: 'pictures/items/oxy_capsule.jpg', data: resources.oxygen },
			{ name: 'Artefacts', icon: 'pictures/items/artefact.png', data: resources.artefacts },
			{ name: 'Map Fragments', icon: 'pictures/items/super_map.jpg', data: resources.mapFragments }
		];

		// Sort: items with values first (check both average and optimist)
		items.sort((a, b) => {
			const aHasValue = (a.data.average > 0 || a.data.optimist > 0) ? 1 : 0;
			const bHasValue = (b.data.average > 0 || b.data.optimist > 0) ? 1 : 0;
			return bHasValue - aHasValue;
		});

		const rows = items.map(r => {
			const icon = this._icon(r.icon);
			// Show "none" only if both average AND optimist are 0
			if (r.data.average === 0 && r.data.optimist === 0) {
				return `<tr><td class="icon-cell">${icon}</td><td colspan="3" class="neutral none-row">none</td></tr>`;
			}
			return `<tr>
				<td class="icon-cell">${icon}</td>
				<td class="warning">${this._formatResourceValue(r.data.pessimist)}</td>
				<td class="neutral">${this._formatResourceValue(r.data.average)}</td>
				<td class="positive">${this._formatResourceValue(r.data.optimist)}</td>
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
	}

	/**
	 * Formats a resource value for display
	 * @private
	 */
	_formatResourceValue(value) {
		if (value === 0) return '0';
		if (value < 0.1) return '<0.1';
		return value.toFixed(1);
	}

	/**
	 * Formats a probability as a percentage string with parentheses.
	 * Shows "<0.1%" for very small non-zero values.
	 * @private
	 * @param {number|undefined} prob - Probability (0-1)
	 * @returns {string}
	 */
	_formatProb(prob) {
		if (prob === undefined) return '';
		const pct = prob * 100;
		if (pct === 0) return '(0%)';
		if (pct < 0.1) return '(<0.1%)';
		return `(${pct.toFixed(1)}%)`;
	}

	/**
	 * Builds HTML rows for damage scenarios, collapsing rows when rounded
	 * damage values are identical.  Shared by Combat Damage and Event Damage.
	 *
	 * @private
	 * @param {Object} data - Damage object with optimist/average/pessimist/worstCase
	 *                        and their *Prob counterparts
	 * @param {string} hpIcon - Pre-rendered HP icon HTML
	 * @returns {string[]} Array of HTML row strings
	 */
	_buildDamageScenarioRows(data, hpIcon) {
		const optimistDmg = Math.round(data.optimist);
		const averageDmg = Math.round(data.average);
		const pessimistDmg = Math.round(data.pessimist);
		const worstDmg = Math.round(data.worstCase);

		const rows = [];

		const optimistEqualsAverage = optimistDmg === averageDmg;
		const averageEqualsPessimist = averageDmg === pessimistDmg;
		const allThreeEqual = optimistEqualsAverage && averageEqualsPessimist;

		// --- Optimist / Average / Pessimist ---
		if (allThreeEqual) {
			const combinedProb = (data.optimistProb || 0) + (data.averageProb || 0) + (data.pessimistProb || 0);
			rows.push(`
				<div class="damage-item">
					<span>Optimist, Average and Pessimist Scenario: ${this._formatProb(combinedProb)}</span>
					<span class="neutral">${hpIcon}<strong>${optimistDmg}</strong></span>
				</div>
			`);
		} else if (optimistEqualsAverage) {
			const combinedProb = (data.optimistProb || 0) + (data.averageProb || 0);
			rows.push(`
				<div class="damage-item">
					<span>Optimist and Average Scenario: ${this._formatProb(combinedProb)}</span>
					<span class="positive">${hpIcon}<strong>${optimistDmg}</strong></span>
				</div>
			`);
			rows.push(`
				<div class="damage-item">
					<span>Pessimist Scenario: ${this._formatProb(data.pessimistProb)}</span>
					<span class="critical">${hpIcon}<strong>${pessimistDmg}</strong></span>
				</div>
			`);
		} else if (averageEqualsPessimist) {
			rows.push(`
				<div class="damage-item">
					<span>Optimist Scenario: ${this._formatProb(data.optimistProb)}</span>
					<span class="positive">${hpIcon}<strong>${optimistDmg}</strong></span>
				</div>
			`);
			const combinedProb = (data.averageProb || 0) + (data.pessimistProb || 0);
			rows.push(`
				<div class="damage-item">
					<span>Average and Pessimist Scenario: ${this._formatProb(combinedProb)}</span>
					<span class="critical">${hpIcon}<strong>${averageDmg}</strong></span>
				</div>
			`);
		} else {
			rows.push(`
				<div class="damage-item">
					<span>Optimist Scenario: ${this._formatProb(data.optimistProb)}</span>
					<span class="positive">${hpIcon}<strong>${optimistDmg}</strong></span>
				</div>
			`);
			rows.push(`
				<div class="damage-item">
					<span>Average Scenario: ${this._formatProb(data.averageProb)}</span>
					<span class="danger">${hpIcon}<strong>${averageDmg}</strong></span>
				</div>
			`);
			rows.push(`
				<div class="damage-item">
					<span>Pessimist Scenario: ${this._formatProb(data.pessimistProb)}</span>
					<span class="critical">${hpIcon}<strong>${pessimistDmg}</strong></span>
				</div>
			`);
		}

		// --- Worst case merging ---
		const worstEqualsPessimist = worstDmg === pessimistDmg;
		if (worstEqualsPessimist) {
			if (allThreeEqual) {
				const combinedProb = (data.optimistProb || 0) + (data.averageProb || 0) + (data.pessimistProb || 0) + (data.worstCaseProb || 0);
				rows.length = 0;
				rows.push(`
				<div class="damage-item">
					<span>All Scenarios: ${this._formatProb(combinedProb)}</span>
					<span class="neutral">${hpIcon}<strong>${optimistDmg}</strong></span>
				</div>
				`);
			} else if (averageEqualsPessimist) {
				const combinedProb = (data.averageProb || 0) + (data.pessimistProb || 0) + (data.worstCaseProb || 0);
				rows[rows.length - 1] = `
				<div class="damage-item">
					<span>Average, Pessimist and Worst Case Scenario: ${this._formatProb(combinedProb)}</span>
					<span class="critical">${hpIcon}<strong>${averageDmg}</strong></span>
				</div>
				`;
			} else {
				const combinedProb = (data.pessimistProb || 0) + (data.worstCaseProb || 0);
				rows[rows.length - 1] = `
				<div class="damage-item">
					<span>Pessimist and Worst Case Scenario: ${this._formatProb(combinedProb)}</span>
					<span class="critical bold-damage">${hpIcon}<strong>${pessimistDmg}</strong></span>
				</div>
				`;
			}
		} else {
			rows.push(`
				<div class="damage-item">
					<span>Worst Case Scenario: ${this._formatProb(data.worstCaseProb)}</span>
					<span class="critical bold-damage">${hpIcon}<strong>${worstDmg}</strong></span>
				</div>
			`);
		}

		return rows;
	}

	_renderCombatRisks(combat) {
		// Handle both new format (combat.occurrence) and legacy format
		const occurrence = combat?.occurrence || {};
		const fightTypes = Object.keys(occurrence);

		if (fightTypes.length === 0) {
			return `
				<div class="outcome-category">
					<h5>Combat Risks</h5>
					<div class="outcome-item"><span>No combat encounters</span></div>
				</div>
			`;
		}

		// Sort by damage value (highest first)
		fightTypes.sort((a, b) => {
			const damageA = parseInt(a) || 17; // Variable fight defaults to ~17
			const damageB = parseInt(b) || 17;
			return damageB - damageA;
		});

		const entries = fightTypes.map(type => {
			const occ = occurrence[type];
			const displayName = type === '8_10_12_15_18_32' ? 'Variable (8-32)' : type;
			
			// Build distribution string for fights with probability > 1%
			let distStr = '';
			if (occ.distribution && occ.distribution.size > 0) {
				const distParts = [];
				const sortedEntries = Array.from(occ.distribution.entries()).sort((a, b) => a[0] - b[0]);
				for (const [count, prob] of sortedEntries) {
					if (prob >= 0.01) {
						distParts.push(`${count}: ${(prob * 100).toFixed(0)}%`);
					}
				}
				distStr = distParts.join(' | ');
			}
			
			return `<div class="outcome-item">
				<span>FIGHT_${displayName}:</span>
				<div class="fight-stats">
					<div class="expected-fights">Expected: ${occ.average.toFixed(1)} fights (${occ.pessimist}-${occ.optimist})</div>
					${distStr ? `<div class="fight-distribution">${distStr}</div>` : ''}
				</div>
			</div>`;
		}).join('');

		return `
			<div class="outcome-category">
				<h5>Combat Risks</h5>
				${entries}
			</div>
		`;
	}

	_renderCombatDamage(combat) {
		const hpIcon = this._icon('pictures/astro/hp.png', 'hp-icon');
		const damage = combat?.damage;
		
		if (!damage || (damage.pessimist === 0 && damage.average === 0 && damage.optimist === 0 && damage.worstCase === 0)) {
			return `
				<div class="outcome-category">
					<h5>Combat Damage</h5>
					<div class="outcome-item"><span>No combat damage expected</span></div>
				</div>
			`;
		}

		const rows = this._buildDamageScenarioRows(damage, hpIcon);

		return `
			<div class="outcome-category">
				<h5>Combat Damage</h5>
				${rows.join('')}
			</div>
		`;
	}

	_renderEventRisks(eventDamage) {
		// Use occurrence data for per-event-type display (like Combat Risks)
		const occurrence = eventDamage?.occurrence || {};
		
		// Event type display configuration — derived from EVENT_DAMAGES
		const eventConfig = {};
		for (const [type, info] of Object.entries(EventDamageCalculator.EVENT_DAMAGES)) {
			const dmgStr = info.min === info.max ? `${info.min} dmg` : `${info.min}-${info.max} dmg`;
			eventConfig[type] = {
				name: info.displayName || type,
				damage: info.affectsAll ? `${dmgStr} to all` : dmgStr,
				cssClass: info.cssClass || 'neutral'
			};
		}

		// Get event types that have any probability
		const activeEvents = Object.keys(occurrence).filter(type => {
			const occ = occurrence[type];
			// Check if there's any non-zero probability in distribution
			if (occ?.distribution) {
				for (const [count, prob] of occ.distribution) {
					if (count > 0 && prob > 0) return true;
				}
			}
			return false;
		});

		if (activeEvents.length === 0) {
			return `
				<div class="outcome-category">
					<h5>Event Risks</h5>
					<div class="outcome-item"><span>No event damage risks</span></div>
				</div>
			`;
		}

		// Sort by danger level (disaster > accident > tired)
		const dangerOrder = ['DISASTER_3_5', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'TIRED_2'];
		activeEvents.sort((a, b) => dangerOrder.indexOf(a) - dangerOrder.indexOf(b));

		const entries = activeEvents.map(type => {
			const occ = occurrence[type];
			const config = eventConfig[type] || { name: type, damage: '', cssClass: 'neutral' };
			
			// Build distribution string for events with probability >= 1% (include 0 count like fights)
			let distStr = '';
			if (occ.distribution && occ.distribution.size > 0) {
				const distParts = [];
				const sortedEntries = Array.from(occ.distribution.entries()).sort((a, b) => a[0] - b[0]);
				for (const [count, prob] of sortedEntries) {
					if (prob >= 0.01) {
						distParts.push(`${count}: ${(prob * 100).toFixed(0)}%`);
					}
				}
				distStr = distParts.join(' | ');
			}

			// Calculate expected value for display
			let expectedValue = 0;
			if (occ.distribution) {
				for (const [count, prob] of occ.distribution) {
					expectedValue += count * prob;
				}
			}
			
			return `<div class="outcome-item">
				<span>${config.name} (${config.damage}):</span>
				<div class="fight-stats ${config.cssClass}">
					<div class="expected-fights">Expected: ${expectedValue.toFixed(2)} (${occ.optimist || 0}-${occ.pessimist || 0})</div>
					${distStr ? `<div class="fight-distribution">${distStr}</div>` : ''}
				</div>
			</div>`;
		}).join('');

		return `
			<div class="outcome-category">
				<h5>Event Risks</h5>
				${entries}
			</div>
		`;
	}

	_renderEventDamage(eventDamage) {
		const hpIcon = this._icon('pictures/astro/hp.png', 'hp-icon');
		const scenarios = eventDamage?.damage;
		
		// Check if there's any event damage by looking at the damage scenarios
		const hasEventDamage = scenarios && (scenarios.pessimist > 0 || scenarios.worstCase > 0);
		
		if (!hasEventDamage || !scenarios) {
			return `
				<div class="outcome-category">
					<h5>Event Damage</h5>
					<div class="outcome-item"><span>No event damage expected</span></div>
				</div>
			`;
		}

		const rows = this._buildDamageScenarioRows(scenarios, hpIcon);

		return `
			<div class="outcome-category">
				<h5>Event Damage</h5>
				${rows.join('')}
			</div>
		`;
	}

	_renderNegativeEvents(events) {
		const eventList = [
			{ name: 'Player Lost', data: events.playerLost },
			{ name: 'Sector Unexplored', data: events.again },
			{ name: 'Disease', data: events.disease },
			{ name: 'Item Loss', data: events.itemLost },
			{ name: 'Kill All', data: events.killAll },
			{ name: 'Kill One', data: events.killOne },
			{ name: 'Mush Trap', data: events.mushTrap }
		];

		// Sort: items with values first (check both average and pessimist)
		eventList.sort((a, b) => {
			const aHasValue = (a.data.average > 0 || a.data.pessimist > 0) ? 1 : 0;
			const bHasValue = (b.data.average > 0 || b.data.pessimist > 0) ? 1 : 0;
			return bHasValue - aHasValue;
		});

		const rows = eventList.map(e => {
			// Show "none" only if both average AND pessimist are 0
			if (e.data.average === 0 && e.data.pessimist === 0) {
				return `<tr><td>${e.name}</td><td colspan="3" class="neutral none-row">none</td></tr>`;
			}
			return `<tr>
				<td>${e.name}</td>
				<td class="warning">${this._formatResourceValue(e.data.pessimist)}</td>
				<td class="neutral">${this._formatResourceValue(e.data.average)}</td>
				<td class="positive">${this._formatResourceValue(e.data.optimist)}</td>
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
	}

	// ========================================
	// Helper Methods
	// ========================================

	/**
	 * Creates an icon img tag with appropriate class
	 * @param {string} path - Resource path
	 * @param {string} [className='resource-icon'] - CSS class name
	 */
	_icon(path, className = 'resource-icon') {
		if (this._getResourceURL) {
			return `<img src="${this._getResourceURL(path)}" alt="" class="${className}" />`;
		}
		return '';
	}

	_getEventColorClass(eventName) {
		return EventClassifier.getCssClass(eventName);
	}
}

// Export
if (typeof window !== 'undefined') {
	window.ProbabilityDisplay = ProbabilityDisplay;
}

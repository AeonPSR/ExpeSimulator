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
		html += this._renderSectorBreakdown(data.sectorBreakdown);

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
			{ name: 'Fruits', icon: 'items/fruit10.jpg', data: resources.fruits },
			{ name: 'Steaks', icon: 'items/alien_steak.jpg', data: resources.steaks },
			{ name: 'Fuel', icon: 'items/fuel_capsule.jpg', data: resources.fuel },
			{ name: 'Oxygen', icon: 'items/oxy_capsule.jpg', data: resources.oxygen },
			{ name: 'Artefacts', icon: 'items/artefact.png', data: resources.artefacts },
			{ name: 'Map Fragments', icon: 'items/super_map.jpg', data: resources.mapFragments }
		];

		// Sort: items with values first
		items.sort((a, b) => (b.data.average > 0 ? 1 : 0) - (a.data.average > 0 ? 1 : 0));

		const rows = items.map(r => {
			const icon = this._icon(r.icon);
			if (r.data.average === 0) {
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
		const hpIcon = this._icon('astro/hp.png', 'hp-icon');
		const damage = combat?.damage;
		
		if (!damage || (damage.pessimist === 0 && damage.average === 0 && damage.optimist === 0 && damage.worstCase === 0)) {
			return `
				<div class="outcome-category">
					<h5>Combat Damage</h5>
					<div class="outcome-item"><span>No combat damage expected</span></div>
				</div>
			`;
		}

		// Format probability percentages - show "<0.1%" for very small non-zero values
		const formatProb = (prob) => {
			if (prob === undefined) return '';
			const pct = prob * 100;
			if (pct === 0) return '(0%)';
			if (pct < 0.1) return '(<0.1%)';
			return `(${pct.toFixed(1)}%)`;
		};

		return `
			<div class="outcome-category">
				<h5>Combat Damage</h5>
				<div class="damage-item">
					<span>Optimist Scenario: ${formatProb(damage.optimistProb)}</span>
					<span class="positive">${hpIcon}<strong>${Math.round(damage.optimist)}</strong></span>
				</div>
				<div class="damage-item">
					<span>Average HP Lost:</span>
					<span class="danger">${hpIcon}<strong>${Math.round(damage.average)}</strong></span>
				</div>
				<div class="damage-item">
					<span>Pessimist Scenario: ${formatProb(damage.pessimistProb)}</span>
					<span class="critical">${hpIcon}<strong>${Math.round(damage.pessimist)}</strong></span>
				</div>
				<div class="damage-item">
					<span>Worst Case Scenario: ${formatProb(damage.worstCaseProb)}</span>
					<span class="critical bold-damage">${hpIcon}<strong>${Math.round(damage.worstCase)}</strong></span>
				</div>
			</div>
		`;
	}

	_renderEventRisks(eventDamage) {
		const hasEvents = eventDamage.tired > 0 || eventDamage.accident > 0 || eventDamage.disaster > 0;

		if (!hasEvents) {
			return `
				<div class="outcome-category">
					<h5>Event Risks</h5>
					<div class="outcome-item"><span>No event damage risks</span></div>
				</div>
			`;
		}

		let entries = '';
		if (eventDamage.tired > 0) {
			entries += `<div class="outcome-item"><span>Fatigue (2 dmg):</span><span class="neutral">Expected: ${eventDamage.tired.toFixed(2)}</span></div>`;
		}
		if (eventDamage.accident > 0) {
			entries += `<div class="outcome-item"><span>Accident (3-5 dmg):</span><span class="warning">Expected: ${eventDamage.accident.toFixed(2)}</span></div>`;
		}
		if (eventDamage.disaster > 0) {
			entries += `<div class="outcome-item"><span>Disaster (3-5 dmg):</span><span class="danger">Expected: ${eventDamage.disaster.toFixed(2)}</span></div>`;
		}

		return `
			<div class="outcome-category">
				<h5>Event Risks</h5>
				${entries}
			</div>
		`;
	}

	_renderEventDamage(eventDamage) {
		const hpIcon = this._icon('astro/hp.png', 'hp-icon');
		const scenarios = eventDamage?.scenarios;
		
		// Check if there's any event damage
		const hasEventDamage = eventDamage && (eventDamage.tired > 0 || eventDamage.accident > 0 || eventDamage.disaster > 0);
		
		if (!hasEventDamage || !scenarios) {
			return `
				<div class="outcome-category">
					<h5>Event Damage</h5>
					<div class="outcome-item"><span>No event damage expected</span></div>
				</div>
			`;
		}

		// Format probability percentages
		const formatProb = (prob) => prob !== undefined ? `(${(prob * 100).toFixed(1)}%)` : '';

		return `
			<div class="outcome-category">
				<h5>Event Damage</h5>
				<div class="damage-item">
					<span>Optimist Scenario: ${formatProb(scenarios.optimistProb)}</span>
					<span class="positive">${hpIcon}<strong>${Math.round(scenarios.optimist)}</strong></span>
				</div>
				<div class="damage-item">
					<span>Average HP Lost:</span>
					<span class="danger">${hpIcon}<strong>${Math.round(scenarios.average)}</strong></span>
				</div>
				<div class="damage-item">
					<span>Pessimist Scenario: ${formatProb(scenarios.pessimistProb)}</span>
					<span class="critical">${hpIcon}<strong>${Math.round(scenarios.pessimist)}</strong></span>
				</div>
				<div class="damage-item">
					<span>Worst Case Scenario: ${formatProb(scenarios.worstCaseProb)}</span>
					<span class="critical bold-damage">${hpIcon}<strong>${Math.round(scenarios.worstCase)}</strong></span>
				</div>
			</div>
		`;
	}

	_renderNegativeEvents(events) {
		const eventList = [
			{ name: 'Player Lost', value: events.playerLost },
			{ name: 'Sector Unexplored', value: events.again },
			{ name: 'Disease', value: events.disease },
			{ name: 'Item Loss', value: events.itemLost },
			{ name: 'Kill All', value: events.killAll },
			{ name: 'Kill One', value: events.killOne },
			{ name: 'Mush Trap', value: events.mushTrap }
		];

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
	}

	_renderSectorBreakdown(sectorBreakdown) {
		let html = '<div class="outcome-category" style="opacity: 0.7; font-size: 11px;">';
		html += '<h5 style="font-size: 12px;">Debug: Sector Breakdown</h5>';

		for (const [sectorName, data] of Object.entries(sectorBreakdown)) {
			const countLabel = data.count > 1 ? ` (×${data.count})` : '';
			html += `<div style="margin-bottom: 8px;"><strong>${sectorName}${countLabel}</strong>`;

			for (const [eventName, prob] of Object.entries(data.events)) {
				const colorClass = this._getEventColorClass(eventName);
				html += `<div class="outcome-item" style="padding: 2px 0;">`;
				html += `<span class="outcome-label" style="font-size: 11px;">${eventName}</span>`;
				html += `<span class="outcome-value ${colorClass}" style="font-size: 11px;">${(prob * 100).toFixed(1)}%</span>`;
				html += `</div>`;
			}
			html += '</div>';
		}

		html += '</div>';
		return html;
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
		if (eventName.startsWith('HARVEST_') || eventName.startsWith('PROVISION_') ||
			eventName.startsWith('FUEL_') || eventName.startsWith('OXYGEN_') ||
			eventName === 'ARTEFACT') {
			return 'positive';
		}
		if (eventName === 'NOTHING_TO_REPORT' || eventName === 'AGAIN') {
			return 'neutral';
		}
		if (eventName.startsWith('TIRED_') || eventName.startsWith('ACCIDENT_') ||
			eventName === 'DISEASE') {
			return 'warning';
		}
		if (eventName.startsWith('FIGHT_') || eventName.startsWith('KILL_') ||
			eventName === 'PLAYER_LOST' || eventName.startsWith('DISASTER_')) {
			return 'danger';
		}
		return 'neutral';
	}
}

// Export
if (typeof window !== 'undefined') {
	window.ProbabilityDisplay = ProbabilityDisplay;
}

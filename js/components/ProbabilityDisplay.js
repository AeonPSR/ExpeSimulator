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
		html += this._renderCombatRisks(data.fights);
		html += this._renderCombatDamage();
		html += this._renderEventRisks(data.eventDamage);
		html += this._renderEventDamage();
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
			{ name: 'Fruits', icon: 'items/fruit10.jpg', value: resources.fruits },
			{ name: 'Steaks', icon: 'items/alien_steak.jpg', value: resources.steaks },
			{ name: 'Fuel', icon: 'items/fuel_capsule.jpg', value: resources.fuel },
			{ name: 'Oxygen', icon: 'items/oxy_capsule.jpg', value: resources.oxygen },
			{ name: 'Artefacts', icon: 'items/artefact.png', value: resources.artefacts }
		];

		items.sort((a, b) => (b.value > 0 ? 1 : 0) - (a.value > 0 ? 1 : 0));

		const rows = items.map(r => {
			const icon = this._icon(r.icon);
			if (r.value === 0) {
				return `<tr><td class="icon-cell">${icon}</td><td colspan="3" class="neutral none-row">none</td></tr>`;
			}
			return `<tr>
				<td class="icon-cell">${icon}</td>
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
	}

	_renderCombatRisks(fights) {
		const fightTypes = Object.keys(fights);

		if (fightTypes.length === 0) {
			return `
				<div class="outcome-category">
					<h5>Combat Risks</h5>
					<div class="outcome-item"><span>No combat encounters</span></div>
				</div>
			`;
		}

		const entries = fightTypes.map(type => {
			const expected = fights[type];
			return `<div class="outcome-item">
				<span>FIGHT_${type}:</span>
				<div class="fight-stats">
					<div class="expected-fights">Expected: ${expected.toFixed(2)} fights</div>
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

	_renderCombatDamage() {
		const hpIcon = this._icon('astro/hp.png');
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

	_renderEventDamage() {
		const hpIcon = this._icon('astro/hp.png');
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

	_icon(path) {
		if (this._getResourceURL) {
			return `<img src="${this._getResourceURL(path)}" alt="" class="resource-icon" />`;
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

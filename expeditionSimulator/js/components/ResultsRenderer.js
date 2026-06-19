/**
 * ResultsRenderer
 *
 * Pure HTML builder for expedition result cards. No state, no DOM mutations —
 * it receives data and returns HTML strings. Extracted from App so that
 * the orchestrator stays data-only.
 *
 * All methods accept a `getURL` function (wrapping chrome.runtime.getURL)
 * so they are fully testable in Node without a browser extension context.
 */
class ResultsRenderer {

	/**
	 * Builds the full HTML block for one expedition result card per player.
	 *
	 * @param {Array}  players             - Array of player objects ({ avatar, health, … })
	 * @param {Object} healthByScenario    - { optimist, average, pessimist, worstCase } — each an array indexed by participating player
	 * @param {Array}  participationStatus - One entry per player: { canParticipate: boolean }
	 * @param {Object} effectsByScenario   - { optimist, average, pessimist, worstCase } — arrays of effect arrays
	 * @param {Function} getURL            - chrome.runtime.getURL equivalent
	 * @returns {string}
	 */
	static render(players, healthByScenario, participationStatus, effectsByScenario = {}, getURL) {
		let participatingIndex = 0;

		return players.map((player, playerIndex) => {
			const status = participationStatus[playerIndex];
			const canParticipate = status?.canParticipate ?? true;

			if (!canParticipate) {
				const stuckIcon = `<img src="${getURL('pictures/ui/stuck_in_ship.png')}" alt="Stuck in Ship" class="stuck-icon" title="No oxygen - stuck in ship" />`;
				return `
					<div class="expedition-result-card">
						<div class="expedition-result-avatar">
							<img src="${getURL(`pictures/characters/${player.avatar}`)}" alt="Player Avatar" />
						</div>
						<div class="expedition-result-health-container">
							<div class="expedition-result-health optimist health-stuck">
								${stuckIcon}
							</div>
							<div class="expedition-result-health median health-stuck">
								${stuckIcon}
							</div>
							<div class="expedition-result-health pessimist health-stuck">
								${stuckIcon}
							</div>
							<div class="expedition-result-health worst health-stuck">
								${stuckIcon}
							</div>
						</div>
					</div>
				`;
			}

			const optimist  = healthByScenario.optimist?.[participatingIndex]  ?? player.health;
			const average   = healthByScenario.average?.[participatingIndex]   ?? player.health;
			const pessimist = healthByScenario.pessimist?.[participatingIndex] ?? player.health;
			const worst     = healthByScenario.worstCase?.[participatingIndex] ?? player.health;

			const optimistEffects  = effectsByScenario.optimist?.[participatingIndex]  || [];
			const averageEffects   = effectsByScenario.average?.[participatingIndex]   || [];
			const pessimistEffects = effectsByScenario.pessimist?.[participatingIndex] || [];
			const worstEffects     = effectsByScenario.worstCase?.[participatingIndex] || [];

			// Deduplicate effects across scenarios for the card-level strip
			const allEffects = [optimistEffects, averageEffects, pessimistEffects, worstEffects];
			const cardLevelEffects = [];
			const seenCardTypes = new Set();
			for (const scenarioEffects of allEffects) {
				for (const effect of scenarioEffects) {
					if (!seenCardTypes.has(effect.type)) {
						seenCardTypes.add(effect.type);
						cardLevelEffects.push(effect);
					}
				}
			}

			participatingIndex++;

			return `
				<div class="expedition-result-card">
					<div class="expedition-result-avatar">
						<img src="${getURL(`pictures/characters/${player.avatar}`)}" alt="Player Avatar" />
					</div>
					<div class="expedition-result-health-container">
						<div class="expedition-result-health optimist ${ResultsRenderer.getHealthClass(optimist)}">
							${ResultsRenderer.renderHealthValue(optimist, getURL)}
						</div>
						<div class="expedition-result-health median ${ResultsRenderer.getHealthClass(average)}">
							${ResultsRenderer.renderHealthValue(average, getURL)}
						</div>
						<div class="expedition-result-health pessimist ${ResultsRenderer.getHealthClass(pessimist)}">
							${ResultsRenderer.renderHealthValue(pessimist, getURL)}
						</div>
						<div class="expedition-result-health worst ${ResultsRenderer.getHealthClass(worst)}">
							${ResultsRenderer.renderHealthValue(worst, getURL)}
						</div>
					</div>
					${cardLevelEffects.length > 0 ? `<div class="expedition-result-effects">${ResultsRenderer.renderEffectIcons(cardLevelEffects, getURL)}</div>` : ''}
				</div>
			`;
		}).join('');
	}

	/**
	 * Renders the health value cell: a number + HP icon, or a dead icon.
	 *
	 * @param {number}   health
	 * @param {Function} getURL
	 * @returns {string}
	 */
	static renderHealthValue(health, getURL) {
		if (health <= 0) {
			return `<img src="${getURL('pictures/ui/dead.png')}" alt="Dead" class="dead-icon" />`;
		}
		return `${health}<img src="${getURL('pictures/ui/hp.png')}" alt="HP" class="hp-icon" />`;
	}

	/**
	 * Renders a row of effect icons (ROPE, SURVIVAL, PLASTENITE_ARMOR).
	 * Deduplicates by type.
	 *
	 * @param {Array}    effects - Array of { type, damagePrevented?, reductions? }
	 * @param {Function} getURL
	 * @returns {string}
	 */
	static renderEffectIcons(effects, getURL) {
		if (!effects || effects.length === 0) return '';

		const effectIcons = {
			'ROPE':             'pictures/gear/rope.jpg',
			'SURVIVAL':         'pictures/abilities/survival.png',
			'PLASTENITE_ARMOR': 'pictures/gear/plastenite_armor.jpg',
		};

		const seenTypes = new Set();
		const uniqueEffects = effects.filter(e => {
			if (seenTypes.has(e.type)) return false;
			seenTypes.add(e.type);
			return true;
		});

		return uniqueEffects.map(effect => {
			const iconPath = effectIcons[effect.type];
			if (!iconPath) return '';

			const title = effect.type === 'ROPE'
				? `Rope blocked ${effect.damagePrevented || '?'} damage`
				: effect.type === 'SURVIVAL'
				? `Survival reduced ${effect.reductions || '?'} damage`
				: effect.type === 'PLASTENITE_ARMOR'
				? `Armor reduced ${effect.reductions || '?'} combat damage`
				: effect.type;

			return `<img src="${getURL(iconPath)}" alt="${effect.type}" class="effect-icon" title="${title}" />`;
		}).join('');
	}

	/**
	 * Returns the CSS class name for a health value.
	 *
	 * @param {number} health
	 * @returns {string}
	 */
	static getHealthClass(health) {
		if (health <= 0)  return 'health-dead';
		if (health <= 3)  return 'health-critical';
		if (health <= 6)  return 'health-low';
		if (health <= 10) return 'health-medium';
		return 'health-high';
	}
}

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ResultsRenderer = ResultsRenderer;

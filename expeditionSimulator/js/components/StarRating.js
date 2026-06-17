/**
 * StarRating Component
 *
 * Pure display component: receives a review data object and renders
 * a 5-star rating system with an overall score and per-axis breakdown.
 *
 * Input contract (single argument to update()):
 * {
 *   overall: number,          // 0–5
 *   axes: [
 *     { key: string, label: string, stars: number },  // stars: 0–5
 *     ...
 *   ],
 *   booleans: [
 *     { key: string, label: string, present: boolean },
 *     ...
 *   ]
 * }
 *
 * This component contains ZERO scoring logic. It only renders what it receives.
 */
class StarRating extends Component {
	constructor(options = {}) {
		super(options);
		this._overallContainer = null;
		this._axesContainer = null;
		this._booleansContainer = null;
		this._lastAxes = null;
		this._lastResources = null;
	}

	// ─── Rendering ───────────────────────────────────────────────────────────

	render() {
		this.element = this.createElement('div', { className: 'star-rating' });

		// Overall score section
		this._overallContainer = this.createElement('div', { className: 'star-rating-overall' });
		this.element.appendChild(this._overallContainer);

		// Per-axis breakdown
		this._axesContainer = this.createElement('div', { className: 'star-rating-axes' });
		this.element.appendChild(this._axesContainer);

		// Boolean indicators
		this._booleansContainer = this.createElement('div', { className: 'star-rating-boolean-list' });
		this.element.appendChild(this._booleansContainer);

		// Render empty state
		this._renderEmpty();

		return this.element;
	}

	/**
	 * Updates the display with new review data.
	 * @param {Object|null} data - The review data object, or null to clear.
	 */
	update(data) {
		if (!this.element) return;

		if (!data) {
			this._renderEmpty();
			return;
		}

		this._renderOverall(data.overall);
		this._lastAxes = data.axes || [];
		this._renderAxes(this._lastAxes);
		this._renderBooleans(data.booleans || []);
	}

	/**
	 * Updates the resource quartile data shown next to axis labels.
	 * Expects ResourceCalculator output (with .fruits/.steaks/.fuel/.artefacts,
	 * each having .pessimist and .optimist). Pass null to clear.
	 * @param {Object|null} resources
	 */
	updateResources(resources) {
		this._lastResources = resources || null;
		if (this._axesContainer && this._lastAxes) {
			this._renderAxes(this._lastAxes);
		}
	}

	// ─── Private renderers ───────────────────────────────────────────────────

	_renderEmpty() {
		this._renderOverall(0);
		this._lastAxes = StarRating.EMPTY_AXES;
		this._renderAxes(this._lastAxes);
		this._renderBooleans([]);
	}

	// Default axes shown when no data is provided (all at 0 stars)
	static get EMPTY_AXES() {
		return [
			{ key: 'fruits',    label: I18n.t('stars.axis.fruits'),    stars: 0 },
			{ key: 'steaks',    label: I18n.t('stars.axis.steaks'),    stars: 0 },
			{ key: 'fuel',      label: I18n.t('stars.axis.fuel'),      stars: 0 },
			{ key: 'artifacts', label: I18n.t('stars.axis.artifacts'), stars: 0 },
			{ key: 'lethality', label: I18n.t('stars.axis.lethality'), stars: 0 },
			{ key: 'hazards',   label: I18n.t('stars.axis.hazards'),   stars: 0 },
		];
	}

	/**
	 * @param {number} score - 0 to 5
	 */
	_renderOverall(score) {
		this._overallContainer.innerHTML = '';

		const label = this.createElement('span', { className: 'star-rating-overall-label', 'data-i18n': 'stars.overall' }, I18n.t('stars.overall'));
		this._overallContainer.appendChild(label);

		const starsEl = StarRating._createStarsElement(score);
		this._overallContainer.appendChild(starsEl);

		const numericEl = this.createElement('span', { className: 'star-rating-overall-value' },
			score.toFixed(1));
		this._overallContainer.appendChild(numericEl);
	}

	/**
	 * @param {Array<{key: string, label: string, stars: number}>} axes
	 */
	_renderAxes(axes) {
		this._axesContainer.innerHTML = '';

		for (const axis of axes) {
			const row = this.createElement('div', {
				className: `star-rating-axis star-rating-axis--${axis.key}`
			});

			const labelText = axis.label + this._formatAxisQuartiles(axis.key);
			const label = this.createElement('span', { className: 'star-rating-axis-label' },
				labelText);
			row.appendChild(label);

			const starsEl = StarRating._createStarsElement(axis.stars);
			row.appendChild(starsEl);

			this._axesContainer.appendChild(row);
		}
	}

	/**
	 * Returns " (Q1~Q3)" for resource axes (fruits/steaks/fuel/artifacts),
	 * or an empty string for non-resource axes or when no data is loaded.
	 * @private
	 */
	_formatAxisQuartiles(axisKey) {
		if (!this._lastResources) return '';
		// Map axis key → one or more resources field names to sum together
		const RESOURCE_KEY_MAP = {
			fruits:    ['fruits'],
			steaks:    ['steaks'],
			fuel:      ['fuel'],
			artifacts: ['artefacts', 'mapFragments'],  // crystal map counts as an artifact
		};
		const resKeys = RESOURCE_KEY_MAP[axisKey];
		if (!resKeys) return '';
		let pessimist = 0;
		let optimist  = 0;
		for (const key of resKeys) {
			const data = this._lastResources[key];
			if (data) {
				pessimist += data.pessimist ?? 0;
				optimist  += data.optimist  ?? 0;
			}
		}
		const round = axisKey !== 'artifacts';
		if (pessimist === 0 && optimist === 0) return ' (0)';
		return ` (${StarRating._formatQuartile(pessimist, round)}~${StarRating._formatQuartile(optimist, round)})`;
	}

	static _formatQuartile(value, round = false) {
		if (value === 0 || value == null) return '0';
		if (round) return String(Math.round(value));
		if (value < 0.1) return '<0.1';
		return value.toFixed(1);
	}

	/**
	 * @param {Array<{key: string, label: string, present: boolean, color?: string, description?: string}>} booleans
	 */
	_renderBooleans(booleans) {
		this._booleansContainer.innerHTML = '';

		const visible = booleans.filter(f => f.present);
		if (visible.length === 0) return;

		for (const flag of visible) {
			const color = flag.color || '#888';
			const badge = this.createElement('div', {
				className: 'star-rating-boolean-item'
			});
			badge.style.setProperty('--badge-color', color);
			if (flag.description) {
				badge.dataset.tooltip = flag.description;
			}

			const dot = this.createElement('span', { className: 'star-rating-boolean-item-dot' });
			badge.appendChild(dot);

			const label = this.createElement('span', { className: 'star-rating-boolean-item-label' },
				flag.label);
			badge.appendChild(label);

			this._booleansContainer.appendChild(badge);
		}
	}

	// ─── Static helpers ──────────────────────────────────────────────────────

	/**
	 * Creates a star bar element for a 0–6 score.
	 * Always renders 6 stars. The 6th is hidden when score ≤ 5,
	 * so it overflows to the right (not the left) when it appears.
	 *
	 * @param {number} score - Value from 0 to 6
	 * @returns {HTMLElement}
	 */
	static _createStarsElement(score) {
		const clamped = Math.max(0, Math.min(6, score));

		const container = document.createElement('span');
		container.className = 'star-rating-stars';

		for (let i = 1; i <= 6; i++) {
			const star = document.createElement('span');
			const isSixth = (i === 6);
			const hidden = isSixth && clamped <= 5;

			let cls = 'star';
			if (isSixth) cls += ' star--sixth';
			if (hidden) cls += ' star--hidden';

			if (clamped >= i) {
				cls += ' star--full';
			} else if (clamped >= i - 0.5) {
				cls += ' star--half';
			} else {
				cls += ' star--empty';
			}

			star.className = cls;
			star.textContent = '★';
			container.appendChild(star);
		}

		return container;
	}
}

// Export
if (typeof window !== 'undefined') {
	window.StarRating = StarRating;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = StarRating;
}

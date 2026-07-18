/**
 * StarRating Component
 *
 * Displays the overall score, axis stars, and boolean review badges.
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

	// Rendering

	render() {
		this.element = this.createElement('div', { className: 'star-rating' });

		this._overallContainer = this.createElement('div', { className: 'star-rating-overall' });
		this.element.appendChild(this._overallContainer);

		this._axesContainer = this.createElement('div', { className: 'star-rating-axes' });
		this.element.appendChild(this._axesContainer);

		this._booleansContainer = this.createElement('div', { className: 'star-rating-boolean-list' });
		this.element.appendChild(this._booleansContainer);

		this._renderEmpty();

		return this.element;
	}

	/**
	 * @param {Object|null} data - PlanetReviewScorer output, or null to clear
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
	 * @param {Object|null} resources - ResourceCalculator output
	 */
	updateResources(resources) {
		this._lastResources = resources || null;
		if (this._axesContainer && this._lastAxes) {
			this._renderAxes(this._lastAxes);
		}
	}

	// Private renderers

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

	_formatAxisQuartiles(axisKey) {
		if (!this._lastResources) return '';
		// Multiple resource buckets can feed one displayed axis.
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

	// Static helpers

	static _createStarsElement(score) {
		const clamped = Math.max(0, Math.min(6, score));

		const container = document.createElement('span');
		container.className = 'star-rating-stars';

		for (let i = 1; i <= 6; i++) {
			const star = document.createElement('span');
			const isSixth = (i === 6);
			// Keep the sixth star on the right when scores exceed the normal cap.
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

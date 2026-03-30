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
		this._booleansContainer = this.createElement('div', { className: 'star-rating-booleans' });
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
		this._renderAxes(data.axes || []);
		this._renderBooleans(data.booleans || []);
	}

	// ─── Private renderers ───────────────────────────────────────────────────

	_renderEmpty() {
		this._renderOverall(0);
		this._renderAxes(StarRating.EMPTY_AXES);
		this._renderBooleans([]);
	}

	// Default axes shown when no data is provided (all at 0 stars)
	static get EMPTY_AXES() {
		return [
			{ key: 'fruits',    label: 'Fruits',    stars: 0 },
			{ key: 'steaks',    label: 'Steaks',    stars: 0 },
			{ key: 'fuel',      label: 'Fuel',      stars: 0 },
			{ key: 'artifacts', label: 'Artifacts', stars: 0 },
			{ key: 'lethality', label: 'Lethality', stars: 0 },
			{ key: 'hazards',   label: 'Hazards',   stars: 0 },
		];
	}

	/**
	 * @param {number} score - 0 to 5
	 */
	_renderOverall(score) {
		this._overallContainer.innerHTML = '';

		const label = this.createElement('span', { className: 'star-rating-overall-label' }, 'Overall');
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

			const label = this.createElement('span', { className: 'star-rating-axis-label' },
				axis.label);
			row.appendChild(label);

			const starsEl = StarRating._createStarsElement(axis.stars);
			row.appendChild(starsEl);

			this._axesContainer.appendChild(row);
		}
	}

	/**
	 * @param {Array<{key: string, label: string, present: boolean}>} booleans
	 */
	_renderBooleans(booleans) {
		this._booleansContainer.innerHTML = '';

		if (booleans.length === 0) return;

		for (const flag of booleans) {
			const indicator = this.createElement('div', {
				className: `star-rating-boolean ${flag.present ? 'star-rating-boolean--present' : 'star-rating-boolean--absent'}`
			});

			const icon = this.createElement('span', { className: 'star-rating-boolean-icon' },
				flag.present ? '✓' : '✗');
			indicator.appendChild(icon);

			const label = this.createElement('span', { className: 'star-rating-boolean-label' },
				flag.label);
			indicator.appendChild(label);

			this._booleansContainer.appendChild(indicator);
		}
	}

	// ─── Static helpers ──────────────────────────────────────────────────────

	/**
	 * Creates a star bar element for a 0–5 score.
	 * Supports full, half, and empty stars.
	 *
	 * @param {number} score - Value from 0 to 5
	 * @returns {HTMLElement}
	 */
	static _createStarsElement(score) {
		const clamped = Math.max(0, Math.min(5, score));

		const container = document.createElement('span');
		container.className = 'star-rating-stars';

		for (let i = 1; i <= 5; i++) {
			const star = document.createElement('span');
			if (clamped >= i) {
				star.className = 'star star--full';
				star.textContent = '★';
			} else if (clamped >= i - 0.5) {
				// Half star: overlay technique via CSS
				star.className = 'star star--half';
				star.textContent = '★';
			} else {
				star.className = 'star star--empty';
				star.textContent = '★';
			}
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

/**
 * PlanetaryReview Component
 *
 * Displays the planet image and name in the Planetary Review tab.
 * The planet image is determined deterministically from the planet name
 * using the same CRC32-based algorithm as the game server:
 *
 *   imageId = intval(hash('crc32', $planet->getName()->toString()), 16) % 5
 *
 * Images used: pictures/astro/planet_0_small.png … planet_4_small.png
 * Fallback:    pictures/astro/planet_unknown.png  (no name / error)
 */
class PlanetaryReview extends Component {
	/**
	 * @param {Object}   options
	 * @param {Function} options.getResourceURL - Resolves extension asset paths
	 * @param {string}   [options.planetName]   - Initial planet name (optional)
	 */
	constructor(options = {}) {
		super(options);
		this.getResourceURL = options.getResourceURL;
		this._planetName = options.planetName || null;
		this.onDiplomacyToggle = options.onDiplomacyToggle || null;
		this.onExportClick = options.onExportClick || null;
		this.onDirectionChange = options.onDirectionChange || null;
		this.onFuelChange = options.onFuelChange || null;

		this._imgElement  = null;
		this._nameElement = null;
		this._navElement  = null;
		this._starRating  = null;
		this._diplomacyToggle = null;
		this._compassBtn  = null;
		this._fuelBtn     = null;

		this._direction = 'North';
		this._fuelCost  = 0;
	}

	// ─── Static helpers ──────────────────────────────────────────────────────

	/**
	 * Returns the resolved URL for the planet image that corresponds to
	 * the given name.  Falls back to planet_unknown.png when:
	 *   - no name is provided, or
	 *   - the hash computation fails for any reason.
	 *
	 * @param {string|null} planetName
	 * @param {Function}    getResourceURL
	 * @returns {string}
	 */
	static getPlanetImage(planetName, getResourceURL) {
		if (!planetName) {
			return getResourceURL('pictures/astro/planet_unknown.png');
		}
		try {
			const imageId = Hash.crc32(planetName) % 5;
			return getResourceURL(`pictures/astro/planet_${imageId}_small.png`);
		} catch (_) {
			return getResourceURL('pictures/astro/planet_unknown.png');
		}
	}

	// ─── Component lifecycle ─────────────────────────────────────────────────

	render() {
		this.element = this.createElement('div', { className: 'planetary-review' });

		// Left controls: compass + fuel
		const DIRECTIONS = ['North', 'East', 'South', 'West'];
		this._compassBtn = this.createElement('button', {
			className: 'compass-btn',
			title: I18n.t('planet.direction_title'),
			dataset: { active: 'true' }
		});
		const compassImg = this.createElement('img', {
			src: this.getResourceURL('pictures/items_exploration/quad_compass.jpg'),
			alt: 'Direction'
		});
		this._compassBtn.appendChild(compassImg);
		this._compassBtn.addEventListener('click', () => {
			const idx = DIRECTIONS.indexOf(this._direction);
			this._direction = DIRECTIONS[(idx + 1) % DIRECTIONS.length];
			if (this._navElement) this._updateNavElement(this._direction, this._fuelCost);
			this.onDirectionChange?.(this._direction);
		});

		// Fuel cost picker: up arrow / image display / down arrow
		const fuelControl = this.createElement('div', { className: 'fuel-control' });

		const fuelUpBtn = this.createElement('button', {
			className: 'fuel-arrow fuel-arrow--up',
			title: I18n.t('planet.fuel_up')
		});
		fuelUpBtn.addEventListener('click', () => {
			this._fuelCost = Math.min(9, this._fuelCost + 1);
			if (this._navElement) this._updateNavElement(this._direction, this._fuelCost);
			this.onFuelChange?.(this._fuelCost);
		});

		const fuelDisplay = this.createElement('button', { className: 'fuel-btn' });
		const fuelImg = this.createElement('img', {
			src: this.getResourceURL('pictures/others/fuel.jpg'),
			alt: 'Fuel cost'
		});
		fuelDisplay.appendChild(fuelImg);

		const fuelDownBtn = this.createElement('button', {
			className: 'fuel-arrow fuel-arrow--down',
			title: I18n.t('planet.fuel_down')
		});
		fuelDownBtn.addEventListener('click', () => {
			this._fuelCost = Math.max(0, this._fuelCost - 1);
			if (this._navElement) this._updateNavElement(this._direction, this._fuelCost);
			this.onFuelChange?.(this._fuelCost);
		});

		fuelControl.appendChild(fuelUpBtn);
		fuelControl.appendChild(fuelDisplay);
		fuelControl.appendChild(fuelDownBtn);
		this._fuelBtn = fuelControl;

		const leftWrapper = this.createElement('div', { className: 'planetary-review__controls-left' });
		leftWrapper.appendChild(this._compassBtn);
		leftWrapper.appendChild(fuelControl);
		this.element.appendChild(leftWrapper);

		// Diplomacy toggle (top-right)
		if (!this._diplomacyToggle) {
			this._diplomacyToggle = new ToggleButton({
				id: 'review-diplomacy-toggle',
				className: 'diplomacy-toggle-btn',
				icon: this.getResourceURL('pictures/abilities/diplomacy.png'),
				alt: 'Toggle Diplomacy',
				activeColor: 'blue',
				onToggle: (isActive) => {
					this.onDiplomacyToggle?.(isActive);
				}
			});
		}
		const toggleWrapper = this.createElement('div', { className: 'planetary-review__toggle' });
		toggleWrapper.appendChild(this._diplomacyToggle.render());
		this.element.appendChild(toggleWrapper);

		// Planet image
		this._imgElement = this.createElement('img', {
			className: 'planet-image',
			src: PlanetaryReview.getPlanetImage(this._planetName, this.getResourceURL),
			alt: this._planetName || 'Unknown planet'
		});
		this.element.appendChild(this._imgElement);

		// Planet name label
		this._nameElement = this.createElement('p', { className: 'planet-name' },
			this._planetName || I18n.t('planet.unknown'));
		this.element.appendChild(this._nameElement);

		// Direction & fuel cost
		this._navElement = this.createElement('p', { className: 'planet-nav' });
		this._updateNavElement(this._direction, this._fuelCost);
		this.element.appendChild(this._navElement);

		// Star rating display
		this._starRating = new StarRating();
		this._starRating.mount(this.element);

		// Export to clipboard button
		this._exportBtn = this.createElement('button', {
			className: 'planetary-review__export-btn',
			title: I18n.t('planet.export_title')
		}, I18n.t('planet.export_btn'));
		this._exportBtn.addEventListener('click', () => {
			const result = this.onExportClick?.();
			if (result instanceof Promise) {
				result.then(
					() => this.setExportState('success'),
					() => this.setExportState('error')
				);
			}
		});
		this.element.appendChild(this._exportBtn);

		return this.element;
	}

	/**
	 * Updates the displayed planet image, name, and review scores.
	 * Safe to call before or after mounting.
	 *
	 * @param {string|null} planetName
	 * @param {Object|null} [reviewData] - Star rating data (see StarRating input contract)
	 */
	update(planetName, reviewData = null) {
		this._planetName = planetName || null;

		if (!this._imgElement || !this._nameElement) return;

		const src = PlanetaryReview.getPlanetImage(this._planetName, this.getResourceURL);
		this._imgElement.src = src;
this._imgElement.alt  = this._planetName || I18n.t('planet.unknown');
				this._nameElement.textContent = this._planetName || I18n.t('planet.unknown');

		if (this._starRating) {
			this._starRating.update(reviewData);
		}
	}

	/**
	 * Updates the direction and fuel cost display.
	 * @param {string} direction
	 * @param {number} fuelCost
	 */
	updateNav(direction, fuelCost) {
		this._direction = direction;
		this._fuelCost  = fuelCost;
		if (this._navElement) {
			this._updateNavElement(direction, fuelCost);
		}
	}

	/**
	 * Forwards resource quartile data to the StarRating so it can show
	 * "(Q1~Q3)" next to resource axis labels.
	 * @param {Object|null} resources
	 */
	updateResources(resources) {
		this._starRating?.updateResources?.(resources);
	}

	/** @private */
	_updateNavElement(direction, fuelCost) {
		if (!this._navElement) return;
		this._navElement.innerHTML = '';
		const textNode = this.createElement('span', {}, this._formatNav(direction, fuelCost) + '\u00a0');
		const icon = this.createElement('img', {
			src: this.getResourceURL('pictures/others/fuel_icon.png'),
			className: 'fuel-icon',
			alt: 'fuel'
		});
		this._navElement.appendChild(textNode);
		this._navElement.appendChild(icon);
	}

	/** @private */
	_formatNav(direction, fuelCost) {
		const translatedDir = I18n.t('planet.dir.' + direction.toLowerCase());
		return I18n.t('planet.nav', { direction: translatedDir, fuel: fuelCost });
	}

	/**
	 * Briefly shows a success or error state on the export button,
	 * then resets it after 2 seconds.
	 * @param {'success'|'error'} state
	 */
	setExportState(state) {
		if (!this._exportBtn) return;
		if (this._exportResetTimer) clearTimeout(this._exportResetTimer);

		this._exportBtn.classList.remove(
			'planetary-review__export-btn--success',
			'planetary-review__export-btn--error'
		);
		this._exportBtn.classList.add(`planetary-review__export-btn--${state}`);
		this._exportBtn.textContent = state === 'success' ? I18n.t('planet.export_success') : I18n.t('planet.export_error');

		this._exportResetTimer = setTimeout(() => {
			this._exportBtn.classList.remove(
				'planetary-review__export-btn--success',
				'planetary-review__export-btn--error'
			);
			this._exportBtn.textContent = I18n.t('planet.export_btn');
			this._exportResetTimer = null;
		}, 2000);
	}

	/**
	 * Returns whether the diplomacy toggle is currently active.
	 * @returns {boolean}
	 */
	get isDiplomacyActive() {
		return this._diplomacyToggle ? this._diplomacyToggle.isActive : false;
	}

	/**
	 * Sets the diplomacy toggle state.
	 * @param {boolean} active
	 */
	setDiplomacyActive(active) {
		this._diplomacyToggle?.setActive(active, true);
	}
}

if (typeof window !== 'undefined') {
	window.PlanetaryReview = PlanetaryReview;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = PlanetaryReview;
}

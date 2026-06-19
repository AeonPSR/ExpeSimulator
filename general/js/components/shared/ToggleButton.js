/**
 * ToggleButton Component
 * 
 * A reusable toggle button with active/inactive states.
 * Used for traitor toggle, diplomacy toggle, players toggle, antigrav propeller, etc.
 * 
 * Features:
 * - Visual X overlay when inactive
 * - Customizable active color theme
 * - Icon support
 * - Callback on toggle
 */
class ToggleButton extends Component {
	/**
	 * @param {Object} options
	 * @param {string} options.id - Unique ID for the button
	 * @param {string} [options.icon] - URL for the button icon
	 * @param {string} [options.alt='Toggle'] - Alt text for icon
	 * @param {string} [options.className] - Additional CSS class(es)
	 * @param {string} [options.activeColor='orange'] - Color theme when active: 'orange', 'pink', 'blue'
	 * @param {boolean} [options.initialState=false] - Initial active state
	 * @param {Function} [options.onToggle] - Callback when toggled: (isActive) => void
	 */
	constructor(options = {}) {
		super(options);
		this.id = options.id || generateId('toggle-btn');
		this.icon = options.icon || null;
		this.alt = options.alt || 'Toggle';
		this.className = options.className || 'toggle-btn';
		this.activeColor = options.activeColor || 'orange';
		this.isActive = options.initialState || false;
		this.onToggle = options.onToggle || null;
	}

	/**
	 * Creates the toggle button element
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('button', {
			id: this.id,
			className: this._getClassName(),
			dataset: { active: this.isActive.toString() }
		});

		if (this.icon) {
			const img = this.createElement('img', {
				src: this.icon,
				alt: this.alt
			});
			this.element.appendChild(img);
		}

		// Attach click handler
		this.addEventListener(this.element, 'click', () => this.toggle());

		return this.element;
	}

	/**
	 * Gets the full class name based on configuration
	 * @private
	 * @returns {string}
	 */
	_getClassName() {
		const classes = [this.className];
		if (this.activeColor) {
			classes.push(`toggle-btn--${this.activeColor}`);
		}
		return classes.join(' ');
	}

	/**
	 * Toggles the button state
	 */
	toggle() {
		this.setActive(!this.isActive);
	}

	/**
	 * Sets the active state
	 * @param {boolean} active - New active state
	 * @param {boolean} [silent=false] - If true, don't fire callback
	 */
	setActive(active, silent = false) {
		this.isActive = active;
		
		if (this.element) {
			this.element.dataset.active = active.toString();
		}

		if (!silent && this.onToggle) {
			this.onToggle(this.isActive);
		}
	}

	/**
	 * Gets the current active state
	 * @returns {boolean}
	 */
	getActive() {
		return this.isActive;
	}

	/**
	 * Updates the icon
	 * @param {string} iconUrl - New icon URL
	 */
	setIcon(iconUrl) {
		this.icon = iconUrl;
		const img = this.element?.querySelector('img');
		if (img) {
			img.src = iconUrl;
		}
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ToggleButton = ToggleButton;
}

/**
 * VisibilityToggle Component
 *
 * Overlay eye button that flips a visible/hidden state. Shared across modules
 * (crew cards, project cards) so the element lives in general rather than being
 * reimplemented per module.
 */
class VisibilityToggle extends Component {
	/**
	 * @param {Object} options
	 * @param {string} [options.iconPath='pictures/ui/visibility.png'] - Icon resource path
	 * @param {boolean} [options.initialVisible=true] - Initial visible state
	 * @param {string} [options.className] - Extra class(es) for module-specific styling
	 * @param {Function} [options.onToggle] - Called with (isVisible)
	 */
	constructor(options = {}) {
		super(options);
		this._iconPath = options.iconPath || 'pictures/ui/visibility.png';
		this._visible = options.initialVisible !== false;
		this._className = options.className || '';
		this._onToggle = options.onToggle || null;
	}

	isVisible() {
		return this._visible;
	}

	setVisible(visible, silent = false) {
		this._visible = visible;
		if (this.element) {
			this.element.dataset.active = visible.toString();
		}
		if (!silent) {
			this._onToggle?.(visible);
		}
	}

	render() {
		const btn = this.createElement('button', {
			className: `player-toggle-slot player-toggle-slot--overlay visibility-toggle-slot ${this._className}`.trim(),
			type:      'button',
			dataset:   { active: this._visible.toString() }
		});
		btn.appendChild(this.createElement('img', {
			src: getResourceURL(this._iconPath),
			alt: ''
		}));
		this.addEventListener(btn, 'mousedown', (event) => event.preventDefault());
		this.addEventListener(btn, 'click', () => {
			this.setVisible(!this._visible);
		});
		this.element = btn;
		return btn;
	}
}

if (typeof window !== 'undefined') {
	window.VisibilityToggle = VisibilityToggle;
}

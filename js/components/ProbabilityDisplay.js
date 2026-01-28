/**
 * ProbabilityDisplay Component
 * 
 * Displays event probabilities and fight statistics.
 * Content is set externally (from probability calculations).
 */
class ProbabilityDisplay extends Component {
	/**
	 * @param {Object} options
	 */
	constructor(options = {}) {
		super(options);
		this._contentElement = null;
	}

	/**
	 * Creates the probability display section
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'probability-display' });

		// Header
		const header = this.createElement('h4', {}, 'Event Probabilities');
		this.element.appendChild(header);

		// Content area
		this._contentElement = this.createElement('div', {
			className: 'prob-content',
			id: 'prob-content'
		}, 'Select sectors to see probabilities');

		this.element.appendChild(this._contentElement);

		return this.element;
	}

	/**
	 * Sets the content (HTML string)
	 * @param {string} htmlContent
	 */
	setContent(htmlContent) {
		if (this._contentElement) {
			this._contentElement.innerHTML = htmlContent;
		}
	}

	/**
	 * Sets the content to a placeholder message
	 * @param {string} message
	 */
	setPlaceholder(message) {
		if (this._contentElement) {
			this._contentElement.textContent = message;
		}
	}

	/**
	 * Clears the content
	 */
	clear() {
		this.setPlaceholder('Select sectors to see probabilities');
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ProbabilityDisplay = ProbabilityDisplay;
}

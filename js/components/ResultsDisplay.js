/**
 * ResultsDisplay Component
 * 
 * Displays expedition results with player health outcomes.
 * Includes legend explaining the different scenarios.
 */
class ResultsDisplay extends Component {
	/**
	 * @param {Object} options
	 */
	constructor(options = {}) {
		super(options);
		this._contentElement = null;
		this._legendContainer = null;
	}

	/**
	 * Creates the results display section
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'expedition-results' });

		// Header
		const header = this.createElement('h4', {}, 'Expedition Results');
		this.element.appendChild(header);

		// Content area
		this._contentElement = this.createElement('div', {
			className: 'results-content',
			id: 'results-content'
		}, 'Add players to see expedition results');

		this.element.appendChild(this._contentElement);

		// Legend container
		this._legendContainer = this.createElement('div', {
			id: 'expedition-legend-container'
		});
		this.element.appendChild(this._legendContainer);

		return this.element;
	}

	/**
	 * Sets the results content (HTML string)
	 * @param {string} htmlContent
	 */
	setContent(htmlContent) {
		if (this._contentElement) {
			this._contentElement.innerHTML = htmlContent;
		}
	}

	/**
	 * Sets the legend content (HTML string)
	 * @param {string} htmlContent
	 */
	setLegend(htmlContent) {
		if (this._legendContainer) {
			this._legendContainer.innerHTML = htmlContent;
		}
	}

	/**
	 * Sets placeholder message
	 * @param {string} message
	 */
	setPlaceholder(message) {
		if (this._contentElement) {
			this._contentElement.textContent = message;
		}
		if (this._legendContainer) {
			this._legendContainer.innerHTML = '';
		}
	}

	/**
	 * Clears the content
	 */
	clear() {
		this.setPlaceholder('Add players to see expedition results');
	}

	/**
	 * Creates and shows the default legend
	 */
	showDefaultLegend() {
		const legendHTML = `
			<div class="expedition-legend">
				<h5>Scenarios</h5>
				<div class="legend-items">
					<div class="legend-item">
						<div class="legend-color optimist"></div>
						<span class="legend-text">Optimist</span>
					</div>
					<div class="legend-item">
						<div class="legend-color average"></div>
						<span class="legend-text">Average</span>
					</div>
					<div class="legend-item">
						<div class="legend-color pessimist"></div>
						<span class="legend-text">Pessimist</span>
					</div>
					<div class="legend-item">
						<div class="legend-color worst"></div>
						<span class="legend-text">Worst</span>
					</div>
				</div>
			</div>
		`;
		this.setLegend(legendHTML);
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ResultsDisplay = ResultsDisplay;
}

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

	render() {
		this.element = this.createElement('div', { className: 'expedition-results' });

		const header = this.createElement('h4', { 'data-i18n': 'results.header' }, I18n.t('results.header'));
		this.element.appendChild(header);

		this._contentElement = this.createElement('div', {
			className: 'results-content',
			id: 'results-content'
		}, I18n.t('results.placeholder'));

		this.element.appendChild(this._contentElement);

		this._legendContainer = this.createElement('div', {
			id: 'expedition-legend-container'
		});
		this.element.appendChild(this._legendContainer);

		return this.element;
	}

	/**
	 * @param {string} htmlContent
	 */
	setContent(htmlContent) {
		if (this._contentElement) {
			this._contentElement.innerHTML = htmlContent;
		}
	}

	/**
	 * @param {string} htmlContent
	 */
	setLegend(htmlContent) {
		if (this._legendContainer) {
			this._legendContainer.innerHTML = htmlContent;
		}
	}

	/**
	 * @param {string} message
	 */
	setPlaceholder(message) {
		if (this._contentElement) {
			this._contentElement.textContent = I18n.t('results.placeholder');
		}
		if (this._legendContainer) {
			this._legendContainer.innerHTML = '';
		}
	}

	clear() {
		this.setPlaceholder(I18n.t('results.placeholder'));
	}

	showDefaultLegend() {
		const legendHTML = `
			<div class="expedition-legend">
				<h5>${I18n.t('legend.scenarios')}</h5>
				<div class="legend-items">
					<div class="legend-item">
						<div class="legend-color optimist"></div>
						<span class="legend-text">${I18n.t('legend.optimist')}</span>
					</div>
					<div class="legend-item">
						<div class="legend-color median"></div>
						<span class="legend-text">${I18n.t('legend.median')}</span>
					</div>
					<div class="legend-item">
						<div class="legend-color pessimist"></div>
						<span class="legend-text">${I18n.t('legend.pessimist')}</span>
					</div>
					<div class="legend-item">
						<div class="legend-color worst"></div>
						<span class="legend-text">${I18n.t('legend.worst')}</span>
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

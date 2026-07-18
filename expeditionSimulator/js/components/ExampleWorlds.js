/**
 * ExampleWorlds Component
 * 
 * Debug/demo buttons for loading predefined world configurations.
 */
class ExampleWorlds extends Component {
	/**
	 * @param {Object} options
	 * @param {Function} [options.onWorldSelect] - Called with (worldName)
	 */
	constructor(options = {}) {
		super(options);
		this.onWorldSelect = options.onWorldSelect || null;

		const allWorlds = WorldData.getAvailableWorlds();
		this.worlds = [];
		for (let i = 0; i < allWorlds.length; i += 3) {
			this.worlds.push(allWorlds.slice(i, i + 3));
		}
	}

	render() {
		this.element = this.createElement('div', { className: 'example-worlds' });

		const header = this.createElement('h4', { 'data-i18n': 'worlds.header' }, I18n.t('worlds.header'));
		this.element.appendChild(header);

		this.worlds.forEach((row, rowIndex) => {
			const rowDiv = this.createElement('div', { className: 'debug-row' });

			row.forEach(worldName => {
				const btn = this.createElement('button', {
					className: 'debug-btn',
					dataset: { world: worldName }
				}, worldName);

				this.addEventListener(btn, 'click', () => {
					this.onWorldSelect?.(worldName);
				});

				rowDiv.appendChild(btn);
			});

			this.element.appendChild(rowDiv);
		});

		return this.element;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ExampleWorlds = ExampleWorlds;
}

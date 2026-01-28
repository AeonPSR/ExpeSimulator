/**
 * ExampleWorlds Component
 * 
 * Debug/demo buttons for loading predefined world configurations.
 */
class ExampleWorlds extends Component {
	/**
	 * @param {Object} options
	 * @param {Function} [options.onWorldSelect] - Callback: (worldName) => void
	 */
	constructor(options = {}) {
		super(options);
		this.onWorldSelect = options.onWorldSelect || null;

		// Predefined worlds
		this.worlds = [
			['Rocky World', 'Fugubos', 'Vie Heureuse'],
			[',̶ ̶\'̶ ̶,̶ ̶|̶ ̶,̶\'̶_̶\'̶', 'Nurgle\'s Throne', 'Thousands Cuts'],
			['Polyphemus', 'Museum', 'America\'s Dream']
		];
	}

	/**
	 * Creates the example worlds section
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'example-worlds' });

		// Header
		const header = this.createElement('h4', {}, 'Example Worlds');
		this.element.appendChild(header);

		// World button rows
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

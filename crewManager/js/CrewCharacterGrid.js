/**
 * CrewCharacterGrid Component
 *
 * Displays the full grid of available characters (18 named, Lambda excluded)
 * using the existing character-option / character-grid CSS from the modal system.
 */
class CrewCharacterGrid extends Component {
	render() {
		const wrapper = this.createElement('div');
		wrapper.setAttribute('data-expe-sim', '');

		const grid = this.createElement('div', { className: 'character-grid' });

		const characters = CharacterData.available.filter(c => c !== Constants.DEFAULT_AVATAR);
		for (const filename of characters) {
			const name = filename.replace('.png', '').replace(/_/g, ' ');
			const option = this.createElement('div', { className: 'character-option' });
			const img = this.createElement('img', {
				src: getResourceURL(`pictures/characters/${filename}`),
				alt: name,
				title: name
			});
			option.appendChild(img);
			grid.appendChild(option);
		}

		wrapper.appendChild(grid);
		this.element = wrapper;
		return this.element;
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewCharacterGrid = CrewCharacterGrid;

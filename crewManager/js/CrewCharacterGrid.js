/**
 * CrewCharacterGrid Component
 *
 * Displays the full grid of available characters (18 named, Lambda excluded).
 * Calls onCharacterClick(filename) when a character is clicked.
 */
class CrewCharacterGrid extends Component {
	constructor(options = {}) {
		super(options);
		this.onCharacterClick = options.onCharacterClick || null;
		this._optionByFilename = {};
	}

	render() {
		const wrapper = this.createElement('div');
		wrapper.setAttribute('data-expe-sim', '');

		const grid = this.createElement('div', { className: 'character-grid' });

		const characters = CharacterData.available.filter(c => c !== Constants.DEFAULT_AVATAR);
		for (const filename of characters) {
			const name = filename.replace('.png', '').replace(/_/g, ' ');
			const option = this.createElement('div', { className: 'character-option' });
			this._optionByFilename[filename] = option;
			const img = this.createElement('img', {
				src: getResourceURL(`pictures/characters/${filename}`),
				alt: name
			});
			option.appendChild(img);
			this.addEventListener(option, 'click', () => this.onCharacterClick?.(filename));
			grid.appendChild(option);
		}

		wrapper.appendChild(grid);
		this.element = wrapper;
		return this.element;
	}

	setCharacterVisible(filename, visible) {
		this._optionByFilename[filename]?.classList.toggle('crew-character-missing', !visible);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewCharacterGrid = CrewCharacterGrid;

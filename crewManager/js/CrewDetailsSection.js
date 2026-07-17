/**
 * CrewDetailsSection Component
 *
 * Renders a PlayerCard for each of the 18 named characters in alphabetical order.
 * Remove buttons are hidden — these cards are read-only crew profiles.
 */
class CrewDetailsSection extends Component {
	constructor(options = {}) {
		super(options);
		this._cardByFilename = {};
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-details-section' });

		const characters = CharacterData.available.filter(c => c !== Constants.DEFAULT_AVATAR);

		characters.forEach((filename, index) => {
			const player = {
				id: index + 1,
				avatar: filename,
				abilities: Array(Constants.ABILITY_SLOTS).fill(null),
				items:     Array(Constants.ITEM_SLOTS).fill(null),
				health:    Constants.DEFAULT_HEALTH
			};

			const card = new PlayerCard({
				player:         player,
				getResourceURL: getResourceURL,
				showRemove:     false
			});

			const el = card.render();
			this._cardByFilename[filename] = el;
			this.element.appendChild(el);
		});

		return this.element;
	}

	/**
	 * Scrolls to and highlights the card for the given character filename.
	 * @param {string} filename - e.g. 'andie.png'
	 */
	scrollAndHighlight(filename) {
		const card = this._cardByFilename[filename];
		if (!card) return;

		card.scrollIntoView({ behavior: 'smooth', block: 'center' });
		card.classList.remove('crew-highlight');
		void card.offsetWidth; // force reflow so animation replays
		card.classList.add('crew-highlight');
		card.addEventListener('animationend', () => {
			card.classList.remove('crew-highlight');
		}, { once: true });
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewDetailsSection = CrewDetailsSection;

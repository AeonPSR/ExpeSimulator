/**
 * CrewDetailsSection Component
 *
 * Renders a PlayerCard for each of the 18 named characters in alphabetical order.
 * Remove buttons are hidden — these cards are read-only crew profiles.
 */
class CrewDetailsSection extends Component {
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

			this.element.appendChild(card.render());
		});

		return this.element;
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewDetailsSection = CrewDetailsSection;

/**
 * Static Data: Abilities
 * 
 * Available abilities for player selection.
 */
const AbilityData = {
	normal: [
		'survival.png', 'botanic.png', 'pilot.png', 
		'gunman.png', 'diplomacy.png', 'sprint.png'
	],

	pink: [
		'traitor.png'
	],

	/**
	 * Gets normal abilities as selection items
	 * @param {Function} getResourceURL - URL resolver
	 * @returns {Array<Object>}
	 */
	getNormalSelectionItems(getResourceURL) {
		return this.normal.map(ability => ({
			id: ability,
			image: getResourceURL(`abilities/${ability}`),
			label: ability.replace('.png', '')
		}));
	},

	/**
	 * Gets pink abilities as selection items
	 * @param {Function} getResourceURL - URL resolver
	 * @returns {Array<Object>}
	 */
	getPinkSelectionItems(getResourceURL) {
		return this.pink.map(ability => ({
			id: ability,
			image: getResourceURL(`abilities/${ability}`),
			label: ability.replace('.png', '')
		}));
	},

	/**
	 * Gets all abilities for a slot (normal or pink)
	 * @param {boolean} isPink - Whether this is the pink slot
	 * @param {Function} getResourceURL - URL resolver
	 * @returns {Array<Object>}
	 */
	getSelectionItemsForSlot(isPink, getResourceURL) {
		return isPink 
			? this.getPinkSelectionItems(getResourceURL)
			: this.getNormalSelectionItems(getResourceURL);
	}
};

// Export
if (typeof window !== 'undefined') {
	window.AbilityData = AbilityData;
}

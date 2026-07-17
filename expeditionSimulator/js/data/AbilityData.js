/**
 * Static Data: Abilities
 * 
 * Available abilities for player selection.
 */
const AbilityData = {
	normal: [
		'human/survival.png', 'human/botanic.png', 'human/pilot.png',
		'human/gunman.png', 'human/diplomacy.png', 'human/sprint.png', 'human/tracker.png',
		'human/skillful.png'
	],

	   /**
		* Gets all abilities as selection items
		* @param {Function} getResourceURL - URL resolver
		* @returns {Array<Object>}
		*/
	   getSelectionItems(getResourceURL) {
		   return this.normal.map(ability => ({
			   id: ability,
			   image: getResourceURL(`pictures/abilities/${ability}`),
			   label: ability.replace('.png', '').replace('human/', '')
		   }));
	   }
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.AbilityData = AbilityData;

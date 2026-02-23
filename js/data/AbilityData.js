/**
 * Static Data: Abilities
 * 
 * Available abilities for player selection.
 */
const AbilityData = {
	normal: [
		'survival.png', 'botanic.png', 'pilot.png', 
		'gunman.png', 'diplomacy.png', 'sprint.png', 'tracker.png',
		'skillful.png'
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
			   label: ability.replace('.png', '')
		   }));
	   }
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.AbilityData = AbilityData;

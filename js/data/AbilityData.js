/**
 * Static Data: Abilities
 * 
 * Available abilities for player selection.
 */
const AbilityData = {
	normal: [
		'survival.png', 'botanic.png', 'pilot.png', 
		'gunman.png', 'diplomacy.png', 'sprint.png', 'tracker.png'
	],

	   /**
		* Gets all abilities as selection items
		* @param {Function} getResourceURL - URL resolver
		* @returns {Array<Object>}
		*/
	   getSelectionItems(getResourceURL) {
		   return this.normal.map(ability => ({
			   id: ability,
			   image: getResourceURL(`abilities/${ability}`),
			   label: ability.replace('.png', '')
		   }));
	   }
};

// Export
if (typeof window !== 'undefined') {
	window.AbilityData = AbilityData;
}

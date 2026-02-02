/**
 * Static Data: Characters
 * 
 * Available character avatars for player selection.
 */
const CharacterData = {
	available: [
		'andie.png', 'chao.png', 'chun.png', 'derek.png', 'eleesha.png',
		'finola.png', 'frieda.png', 'gioele.png', 'hua.png', 'ian.png',
		'janice.png', 'jin_su.png', 'kuan_ti.png', 'paola.png',
		'raluca.png', 'roland.png', 'stephen.png', 'terrence.png',
		'lambda_f.png' // Lambda at the end as default
	],

	default: 'lambda_f.png',

	/**
	 * Gets all characters as selection items
	 * @param {Function} getResourceURL - URL resolver
	 * @returns {Array<Object>}
	 */
	getSelectionItems(getResourceURL) {
		return this.available.map(char => ({
			id: char,
			image: getResourceURL(`pictures/characters/${char}`),
			label: char.replace('.png', '').replace('_', ' ')
		}));
	}
};

// Export
if (typeof window !== 'undefined') {
	window.CharacterData = CharacterData;
}

/**
 * Static Data: Items
 * 
 * Available exploration items for player selection.
 */
const ItemData = {
	available: [
		'blaster.jpg', 'driller.jpg', 'echo_sounder.jpg', 'grenade.jpg', 
		'heat_seeker.jpg', 'knife.jpg', 'machine_gun.jpg', 'missile_launcher.jpg', 
		'natamy_riffle.jpg', 'plastenite_armor.jpg', 'postit.jpg', 'quad_compass.jpg', 
		'rope.jpg', 'sniper_riffle.jpg', 'space_suit.jpg', 'trad_module.jpg', 
		'white_flag.jpg'
	],

	/**
	 * Gets all items as selection items
	 * @param {Function} getResourceURL - URL resolver
	 * @returns {Array<Object>}
	 */
	getSelectionItems(getResourceURL) {
		return this.available.map(item => ({
			id: item,
			image: getResourceURL(`items_exploration/${item}`),
			label: item.replace('.jpg', '').replace(/_/g, ' ')
		}));
	}
};

// Export
if (typeof window !== 'undefined') {
	window.ItemData = ItemData;
}

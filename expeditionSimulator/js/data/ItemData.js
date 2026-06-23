/**
 * Static Data: Items
 * 
 * Available exploration items for player selection.
 */
const ItemData = {
	available: [
		'blaster.jpg', 'blaster_custom.jpg', 'driller.jpg', 'echo_sounder.jpg', 'grenade.jpg', 
		'heat_seeker.jpg', 'knife.jpg', 'machine_gun.jpg', 'missile_launcher.jpg', 
		'natamy_riffle.jpg', 'plastenite_armor.jpg', 'postit.jpg', 'quad_compass.jpg', 
		'rope.jpg', 'sniper_riffle.jpg', 'space_suit.jpg', 'trad_module.jpg', 
		'white_flag.jpg'
	],

	/** Debug-only items — visible only when developer tools are enabled. */
	debug: [
		'derek_face.png'
	],

	/**
	 * Gets all items as selection items.
	 * Debug items are included only when Settings.devtools is active.
	 * @param {Function} getResourceURL - URL resolver
	 * @returns {Array<Object>}
	 */
	getSelectionItems(getResourceURL) {
		const items = this.available.map(item => ({
			id: item,
			image: getResourceURL(`pictures/gear/${item}`),
			label: item.replace(/\.(jpg|png)$/, '').replace(/_/g, ' ')
		}));

		if (typeof Settings !== 'undefined' && Settings.devtools) {
			const debugItems = this.debug.map(item => ({
				id: item,
				image: getResourceURL(`pictures/gear/${item}`),
				label: item.replace(/\.(jpg|png)$/, '').replace(/_/g, ' '),
				debug: true
			}));
			items.push(...debugItems);
		}

		return items;
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ItemData = ItemData;

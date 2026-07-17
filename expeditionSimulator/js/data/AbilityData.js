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

	humanSkills: [
		'human/abnegation.png', 'human/apprentissage.png', 'human/arriviste.png',
		'human/astrophyscicien.png', 'human/beta.png', 'human/biologiste.png',
		'human/botanic.png', 'human/bourreau.png', 'human/cafe.png',
		'human/cannonier.png', 'human/concepteur.png', 'human/confident.png',
		'human/creatif.png', 'human/cuistot.png', 'human/detache.png',
		'human/devotion.png', 'human/diplomacy.png', 'human/expert.png',
		'human/fruit.png', 'human/fuyant.png', 'human/garde-du-corps.png',
		'human/genie.png', 'human/gunman.png', 'human/hygieniste.png',
		'human/infirmier.png', 'human/informaticien.png', 'human/leader.png',
		'human/lethargie.png', 'human/logistique.png', 'human/lutteur.png',
		'human/main-verte.png', 'human/medecin.png', 'human/metalo.png',
		'human/meticuleuse.png', 'human/motivateur.png', 'human/mycologiste.png',
		'human/neron.png', 'human/observateur.png', 'human/optimiste.png',
		'human/panique.png', 'human/paranoiaque.png', 'human/parfum.png',
		'human/persecuteur.png', 'human/perseverant.png', 'human/physicien.png',
		'human/pilot.png', 'human/politicien.png', 'human/polymathe.png',
		'human/pompier.png', 'human/pressentiment.png', 'human/psy.png',
		'human/radio.png', 'human/rebelle.png', 'human/retour.png',
		'human/robotique.png', 'human/robuste.png', 'human/sang-froid.png',
		'human/psy.png', 'human/skillful.png', 'human/sprint.png',
		'human/strateguerre.png', 'human/survival.png', 'human/technician.png',
		'human/tracker.png'
	],

	/**
	 * Gets selection items for a given skill list
	 * @param {Function} getResourceURL
	 * @param {string[]} [list] - defaults to normal
	 */
	getSelectionItems(getResourceURL, list) {
		return (list || this.normal).map(ability => ({
			id: ability,
			image: getResourceURL(`pictures/abilities/${ability}`),
			label: ability.replace('.png', '').replace(/^[^/]+\//, '')
		}));
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.AbilityData = AbilityData;

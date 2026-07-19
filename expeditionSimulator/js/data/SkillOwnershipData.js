/**
 * Static Data: Human Skill Ownership
 */
const SkillOwnershipData = {
	'human/abnegation.png':      ['janice.png'],
	'human/apprentissage.png':   ['stephen.png'],
	'human/arriviste.png':       ['stephen.png'],
	'human/astrophyscicien.png': ['frieda.png', 'gioele.png', 'kuan_ti.png', 'apprentron'],
	'human/beta.png':            ['chun.png', 'chao.png'],
	'human/biologiste.png':      ['finola.png', 'ian.png', 'paola.png', 'apprentron'],
	'human/botanic.png':         ['ian.png', 'hua.png', 'apprentron'],
	'human/bourreau.png':        ['chao.png'],
	'human/cafe.png':            ['gioele.png'],
	'human/cannonier.png':       ['paola.png'],
	'human/concepteur.png':      ['kuan_ti.png', 'raluca.png'],
	'human/confident.png':       ['andie.png'],
	'human/creatif.png':         ['roland.png', 'stephen.png'],
	'human/cuistot.png':         ['stephen.png', 'apprentron'],
	'human/detache.png':         ['raluca.png'],
	'human/devotion.png':        ['andie.png'],
	'human/diplomacy.png':       ['janice.png', 'finola.png', 'apprentron'],
	'human/expert.png':          ['andie.png'],
	'human/fruit.png':           ['ian.png'],
	'human/fuyant.png':          ['chun.png'],
	'human/garde-du-corps.png':  ['chao.png'],
	'human/genie.png':           ['raluca.png'],
	'human/gunman.png':          ['roland.png', 'terrence.png', 'chao.png', 'derek.png', 'paola.png', 'jin_su.png', 'stephen.png', 'apprentron'],
	'human/hygieniste.png':      ['derek.png'],
	'human/infirmier.png':       ['chun.png', 'finola.png'],
	'human/informaticien.png':   ['eleesha.png', 'frieda.png', 'janice.png', 'terrence.png', 'apprentron'],
	'human/leader.png':          ['jin_su.png', 'kuan_ti.png'],
	'human/lethargie.png':       ['chun.png'],
	'human/logistique.png':      ['paola.png', 'jin_su.png', 'apprentron'],
	'human/lutteur.png':         ['chao.png', 'derek.png'],
	'human/main-verte.png':      ['ian.png'],
	'human/medecin.png':         ['finola.png', 'apprentron'],
	'human/metalo.png':          ['terrence.png'],
	'human/meticuleuse.png':     ['finola.png'],
	'human/motivateur.png':      ['derek.png'],
	'human/mycologiste.png':     ['ian.png'],
	'human/neron.png':           ['janice.png'],
	'human/observateur.png':     ['eleesha.png'],
	'human/optimiste.png':       ['roland.png', 'kuan_ti.png'],
	'human/panique.png':         ['gioele.png'],
	'human/paranoiaque.png':     ['gioele.png'],
	'human/parfum.png':          ['frieda.png'],
	'human/persecuteur.png':     ['gioele.png'],
	'human/perseverant.png':     ['eleesha.png', 'hua.png'],
	'human/physicien.png':       ['raluca.png'],
	'human/pilot.png':           ['roland.png', 'hua.png', 'terrence.png', 'andie.png', 'jin_su.png', 'frieda.png', 'apprentron'],
	'human/politicien.png':      ['kuan_ti.png'],
	'human/polymathe.png':       ['eleesha.png'],
	'human/pompier.png':         ['derek.png', 'roland.png', 'ian.png', 'apprentron'],
	'human/pressentiment.png':   ['chun.png'],
	'human/psy.png':             ['janice.png', 'apprentron'],
	'human/radio.png':           ['paola.png', 'frieda.png', 'janice.png', 'apprentron'],
	'human/rebelle.png':         ['paola.png'],
	'human/retour.png':          ['hua.png'],
	'human/robotique.png':       ['terrence.png', 'apprentron'],
	'human/robuste.png':         ['gioele.png', 'stephen.png'],
	'human/sang-froid.png':      ['jin_su.png'],
	'human/skillful.png':        ['andie.png'],
	'human/sprint.png':          ['roland.png', 'apprentron'],
	'human/strateguerre.png':    ['jin_su.png'],
	'human/survival.png':        ['hua.png', 'chao.png', 'frieda.png'],
	'human/technician.png':      ['raluca.png', 'terrence.png', 'kuan_ti.png', 'eleesha.png', 'hua.png', 'apprentron'],
	'human/tracker.png':         ['eleesha.png'],

	/**
	 * Returns true if a character can learn the given skill (directly or via Apprentron).
	 * @param {string} skillFile - e.g. 'human/pilot.png'
	 * @param {string} characterFile - e.g. 'roland.png'
	 * @param {boolean} [includeApprentron=true] - count Apprentron skills as learnable
	 * @returns {boolean}
	 */
	canLearn(skillFile, characterFile, includeApprentron = true) {
		const owners = this[skillFile];
		if (!Array.isArray(owners)) return false;
		if (owners.includes(characterFile)) return true;
		return includeApprentron && owners.includes('apprentron');
	},

	/**
	 * Returns the list of skills a character can learn.
	 * @param {string} characterFile
	 * @param {boolean} [includeApprentron=true]
	 * @returns {string[]} array of skill filenames
	 */
	getSkillsFor(characterFile, includeApprentron = true) {
		return Object.keys(this).filter(key =>
			Array.isArray(this[key]) && this.canLearn(key, characterFile, includeApprentron)
		);
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.SkillOwnershipData = SkillOwnershipData;

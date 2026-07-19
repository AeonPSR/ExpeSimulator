/**
 * CrewSkillCardInjector
 *
 * Adds import buttons to eMush crew skill cards so their visible skills can be
 * copied into the Crew Manager character card.
 */
class CrewSkillCardInjector {
	constructor(options = {}) {
		this._onImport = options.onImport || null;
		this._observer = null;
		this._processedSkillRows = new WeakSet();
		this._buttonBySkillsRow = new WeakMap();
	}

	start() {
		this._scanExisting();
		this._observer = new MutationObserver(() => this._scanExisting());
		this._observer.observe(document.body, { childList: true, subtree: true });
	}

	stop() {
		this._observer?.disconnect();
		this._observer = null;
	}

	_scanExisting() {
		document.querySelectorAll('.mate .skills').forEach(skillsRow => this._processSkillsRow(skillsRow));
	}

	_processSkillsRow(skillsRow) {
		if (this._processedSkillRows.has(skillsRow)) {
			this._updateButtonIcon(skillsRow);
			return;
		}
		this._processedSkillRows.add(skillsRow);

		const button = document.createElement('button');
		button.className = 'expe-import-btn crew-skill-import-btn';
		button.appendChild(this._createButtonIcon());
		this._buttonBySkillsRow.set(skillsRow, button);
		this._updateButtonIcon(skillsRow);

		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			const filename = this._parseCharacterFilename(skillsRow.closest('.mate'));
			if (!filename) return;
			const abilities = this._parseAbilities(skillsRow, filename);
			if (abilities.length > 0) {
				this._onImport?.(filename, abilities);
			}
		});

		skillsRow.appendChild(button);
	}

	_createButtonIcon() {
		const icon = document.createElement('span');
		icon.className = 'crew-skill-import-icon';

		const character = document.createElement('img');
		character.className = 'crew-skill-import-character';
		character.alt = '';
		icon.appendChild(character);

		const overlay = document.createElement('img');
		overlay.className = 'crew-skill-import-overlay';
		overlay.src = getResourceURL('pictures/ui/import_empty.png');
		overlay.alt = 'Import';
		icon.appendChild(overlay);

		return icon;
	}

	_updateButtonIcon(skillsRow) {
		const button = this._buttonBySkillsRow.get(skillsRow);
		const filename = this._parseCharacterFilename(skillsRow.closest('.mate'));
		const character = button?.querySelector('.crew-skill-import-character');
		if (!character || !filename) return;

		character.src = getResourceURL(`pictures/characters/small/${filename.replace('.png', '_small.png')}`);
	}

	_parseCharacterFilename(mate) {
		const href = mate?.querySelector('.name a[href*="/biography/"]')?.getAttribute('href') || '';
		const biographyId = href.match(/\/biography\/([^/?#]+)/)?.[1];
		if (biographyId) return `${biographyId}.png`;

		const name = mate?.querySelector('.name')?.childNodes?.[0]?.textContent || '';
		const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '_');
		return CharacterData.available.includes(`${normalizedName}.png`) ? `${normalizedName}.png` : null;
	}

	_parseAbilities(skillsRow, filename) {
		return [...skillsRow.querySelectorAll('.skill-image')]
			.map(img => this._mapSkillImage(img, filename))
			.filter(Boolean)
			.filter((ability, index, abilities) => abilities.indexOf(ability) === index);
	}

	_mapSkillImage(img, filename) {
		const assetAbility = this._getSkillByKey(this._extractAssetName(img.getAttribute('src') || ''));
		const altAbility = this._getSkillByKey(img.alt);
		if (!assetAbility) return altAbility;
		if (!altAbility || altAbility === assetAbility) return assetAbility;

		const candidates = [assetAbility, altAbility];
		return candidates.find(ability => this._isOwnedSkill(filename, ability)) || assetAbility;
	}

	_getSkillByKey(value) {
		return CrewSkillCardInjector.SKILL_MAP[this._normalize(value)] || null;
	}

	_isOwnedSkill(filename, ability) {
		return typeof SkillOwnershipData !== 'undefined'
			&& SkillOwnershipData.canLearn?.(ability, filename, false);
	}

	_extractAssetName(src) {
		const file = src.split('/').pop() || '';
		return file.split('-')[0] || file.replace(/\.[^.]+$/, '');
	}

	_normalize(value) {
		return (value || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '');
	}
}

CrewSkillCardInjector.SKILL_MAP = {
	abnegation: 'human/abnegation.png',
	apprentissage: 'human/apprentissage.png', learner: 'human/apprentissage.png',
	arriviste: 'human/arriviste.png', ambitious: 'human/arriviste.png',
	astrophysicien: 'human/astrophyscicien.png', astrophysicist: 'human/astrophyscicien.png',
	beta: 'human/beta.png',
	biologiste: 'human/biologiste.png', biologist: 'human/biologiste.png',
	botaniste: 'human/botanic.png', botanic: 'human/botanic.png', botanist: 'human/botanic.png',
	bourreau: 'human/bourreau.png', executioner: 'human/bourreau.png',
	cafeinomane: 'human/cafe.png', caffeine_junkie: 'human/cafe.png', cafe: 'human/cafe.png',
	canonnier: 'human/cannonier.png', gunner: 'human/cannonier.png', cannonier: 'human/cannonier.png',
	concepteur: 'human/concepteur.png', conceptor: 'human/concepteur.png', designer: 'human/concepteur.png',
	confident: 'human/confident.png', confidant: 'human/confident.png',
	creatif: 'human/creatif.png', creative: 'human/creatif.png',
	cuistot: 'human/cuistot.png', chef: 'human/cuistot.png', cook: 'human/cuistot.png',
	detache: 'human/detache.png', detached: 'human/detache.png',
	devotion: 'human/devotion.png', devoted: 'human/devotion.png',
	diplomatie: 'human/diplomacy.png', diplomacy: 'human/diplomacy.png', diplomat: 'human/diplomacy.png',
	expert: 'human/expert.png',
	fruit: 'human/fruit.png', fruitpicker: 'human/fruit.png',
	fuyant: 'human/fuyant.png', evasive: 'human/fuyant.png',
	garde_du_corps: 'human/garde-du-corps.png', bodyguard: 'human/garde-du-corps.png',
	genie: 'human/genie.png', genius: 'human/genie.png',
	tireur: 'human/gunman.png', gunman: 'human/gunman.png', shooter: 'human/gunman.png',
	hygieniste: 'human/hygieniste.png', hygienist: 'human/hygieniste.png',
	infirmier: 'human/infirmier.png', nurse: 'human/infirmier.png',
	informaticien: 'human/informaticien.png', it_expert: 'human/informaticien.png', computer_scientist: 'human/informaticien.png',
	leader: 'human/leader.png',
	lethargie: 'human/lethargie.png', lethargy: 'human/lethargie.png',
	logistique: 'human/logistique.png', logistics: 'human/logistique.png',
	lutteur: 'human/lutteur.png', wrestler: 'human/lutteur.png',
	main_verte: 'human/main-verte.png', green_thumb: 'human/main-verte.png',
	medecin: 'human/medecin.png', medic: 'human/medecin.png', doctor: 'human/medecin.png',
	metalo: 'human/metalo.png', metalworker: 'human/metalo.png',
	meticuleux: 'human/meticuleuse.png', meticulous: 'human/meticuleuse.png',
	motivateur: 'human/motivateur.png', motivator: 'human/motivateur.png',
	mycologiste: 'human/mycologiste.png', mycologist: 'human/mycologiste.png',
	neron: 'human/neron.png',
	observateur: 'human/observateur.png', observer: 'human/observateur.png',
	optimiste: 'human/optimiste.png', optimist: 'human/optimiste.png',
	panique: 'human/panique.png', panic: 'human/panique.png',
	paranoiaque: 'human/paranoiaque.png', paranoid: 'human/paranoiaque.png',
	parfum: 'human/parfum.png', fragrance: 'human/parfum.png',
	persecuteur: 'human/persecuteur.png', persecutor: 'human/persecuteur.png',
	perseverant: 'human/perseverant.png', persevering: 'human/perseverant.png',
	physicien: 'human/physicien.png', physicist: 'human/physicien.png',
	pilote: 'human/pilot.png', pilot: 'human/pilot.png',
	politicien: 'human/politicien.png', politician: 'human/politicien.png',
	polymathe: 'human/polymathe.png', polymath: 'human/polymathe.png',
	pompier: 'human/pompier.png', firefighter: 'human/pompier.png',
	pressentiment: 'human/pressentiment.png', presentiment: 'human/pressentiment.png',
	psy: 'human/psy.png', shrink: 'human/psy.png',
	radio: 'human/radio.png',
	rebelle: 'human/rebelle.png', rebel: 'human/rebelle.png',
	recycleur: 'human/metalo.png', recycler: 'human/metalo.png', retour: 'human/retour.png', return: 'human/retour.png',
	robotique: 'human/robotique.png', robotics: 'human/robotique.png',
	robuste: 'human/robuste.png', sturdy: 'human/robuste.png',
	sang_froid: 'human/sang-froid.png', cold_blooded: 'human/sang-froid.png',
	debrouillard: 'human/skillful.png', skillful: 'human/skillful.png', resourceful: 'human/skillful.png',
	sprint: 'human/sprint.png', sprinter: 'human/sprint.png',
	strateguerre: 'human/strateguerre.png', strategist: 'human/strateguerre.png',
	survie: 'human/survival.png', survival: 'human/survival.png', survivalist: 'human/survival.png',
	technicien: 'human/technician.png', technician: 'human/technician.png', engineer: 'human/technician.png',
	traqueur: 'human/tracker.png', tracker: 'human/tracker.png'
};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.CrewSkillCardInjector = CrewSkillCardInjector;

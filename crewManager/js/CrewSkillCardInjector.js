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

// Keys = exact raw filenames the eMush game serves (from App/src/assets/images/skills/human/).
// Values = our internal skill IDs. One key per internal skill, no aliases, no duplicates.
// Game files intentionally not mapped: crazy_eye, daunting, mankind_only_hope (removed
// from the game); disabled_sprinter (handled elsewhere as a re-skin of sprinter for Terrence).
CrewSkillCardInjector.SKILL_MAP = {
	abnegation:        'human/abnegation.png',
	adaptable:         'human/apprentissage.png',
	antic_perfume:     'human/parfum.png',
	astrophysicist:    'human/astrophyscicien.png',
	beta_human:        'human/beta.png',
	biologist:         'human/biologiste.png',
	bodyguard:         'human/garde-du-corps.png',
	botanic:           'human/botanic.png',
	caffeinomaniac:    'human/cafe.png',
	cold_blood:        'human/sang-froid.png',
	communication:     'human/radio.png',
	conceptor:         'human/concepteur.png',
	confident:         'human/confident.png',
	cook:              'human/cuistot.png',
	creative:          'human/creatif.png',
	devotion:          'human/devotion.png',
	diplomacy:         'human/diplomacy.png',
	engineer:          'human/technician.png',
	escape:            'human/fuyant.png',
	expert:            'human/expert.png',
	fast_backward:     'human/retour.png',
	fireman:           'human/pompier.png',
	first_aid:         'human/infirmier.png',
	frugivore:         'human/fruit.png',
	genius:            'human/genie.png',
	green_thumb:       'human/main-verte.png',
	gunman:            'human/gunman.png',
	gunner:            'human/cannonier.png',
	hunt:              'human/tracker.png',
	it_expert:         'human/informaticien.png',
	juge:              'human/persecuteur.png',
	leadership:        'human/leader.png',
	lethargy:          'human/lethargie.png',
	logistics:         'human/logistique.png',
	medic:             'human/medecin.png',
	metaliciste:       'human/metalo.png',
	motivator:         'human/motivateur.png',
	mycologist:        'human/mycologiste.png',
	neron_only_friend: 'human/neron.png',
	observant:         'human/observateur.png',
	opportunist:       'human/arriviste.png',
	optimistic:        'human/optimiste.png',
	panic:             'human/panique.png',
	paranoid:          'human/paranoiaque.png',
	persistent:        'human/perseverant.png',
	physicist:         'human/physicien.png',
	pilot:             'human/pilot.png',
	politician:        'human/politicien.png',
	polymath:          'human/polymathe.png',
	polyvalent:        'human/skillful.png',
	premonition:       'human/pressentiment.png',
	rebel:             'human/rebelle.png',
	robotics:          'human/robotique.png',
	shrink:            'human/psy.png',
	space_tactics:     'human/strateguerre.png',
	sprinter:          'human/sprint.png',
	stickler:          'human/meticuleuse.png',
	strong_skin:       'human/hygieniste.png',
	sturdy:            'human/robuste.png',
	survival:          'human/survival.png',
	torturer:          'human/bourreau.png',
	unconcerned:       'human/detache.png',
	wrestler:          'human/lutteur.png'
};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.CrewSkillCardInjector = CrewSkillCardInjector;

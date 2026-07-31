/**
 * ProjectCard Component
 *
 * Vertical card displaying a project's icon, bonus skills, efficiency range, and AP estimate.
 * Designed to be composed into a grid or list in the Project Manager panel.
 *
 * @example
 *   const card = new ProjectCard({ project: ProjectData.find(p => p.name === 'EXTRA_DRONE') });
 *   container.appendChild(card.render());
 */
class ProjectCard extends Component {
	constructor(options = {}) {
		super(options);
		this._project = options.project;
		this._visible = options.visible !== false;
		this._nof = false;
		this._priority = false;
		this._onToggleVisibility = options.onToggleVisibility || null;
	}

	get project() {
		return this._project;
	}

	isVisible() {
		return this._visible;
	}

	render() {
		const card = this.createElement('div', { className: 'project-card-aeon' });
		card.classList.toggle('project-card-aeon-hidden', !this._visible);
		this.element = card;
		card.appendChild(this._renderVisibilityToggle());
		card.appendChild(this._renderImage());
		card.appendChild(this._renderSkills());
		card.appendChild(this._renderEfficiency());
		card.appendChild(this._renderAP());
		return card;
	}

	// ── Sections ─────────────────────────────────────────────

	_renderVisibilityToggle() {
		this._visibilityToggle = new VisibilityToggle({
			className:       'project-card-aeon-visibility',
			initialVisible:  this._visible,
			onToggle: (visible) => {
				this._visible = visible;
				this.element.classList.toggle('project-card-aeon-hidden', !visible);
				this._onToggleVisibility?.(this);
			}
		});
		return this._visibilityToggle.render();
	}

	_renderImage() {
		const wrapper = this.createElement('div', { className: 'project-card-aeon-image' });
		if (this._project.icon) {
			wrapper.appendChild(this.createElement('img', {
				src:   getResourceURL(this._project.icon),
				alt:   this._project.name,
				title: this._project.name
			}));
		}
		return wrapper;
	}

	_renderSkills() {
		const row = this.createElement('div', { className: 'project-card-aeon-row project-card-aeon-skills' });
		for (const skillKey of this._project.bonusSkills) {
			const cell = this.createElement('div', { className: 'project-card-aeon-cell' });
			const imgPath = ProjectCard.SKILL_MAP[skillKey];
			if (imgPath) {
				cell.appendChild(this.createElement('img', {
					src:       getResourceURL(`pictures/abilities/${imgPath}`),
					alt:       skillKey,
					title:     skillKey,
					className: 'project-card-aeon-skill-icon'
				}));
			} else {
				cell.appendChild(this.createElement('span', { className: 'project-card-aeon-skill-fallback' }, skillKey));
			}
			row.appendChild(cell);
		}
		return row;
	}

	_renderEfficiency() {
		const row = this.createElement('div', { className: 'project-card-aeon-row project-card-aeon-efficiency' });
		const min = this._project.efficiency;
		const max = Math.floor(min * 1.5);

		for (const [value, labelKey] of [[min, 'Min'], [max, 'Max']]) {
			const cell = this.createElement('div', { className: 'project-card-aeon-cell project-card-aeon-efficiency-cell' });
			cell.appendChild(this.createElement('span', { className: 'project-card-aeon-pct'   }, `${value}%`));
			cell.appendChild(this.createElement('span', { className: 'project-card-aeon-label' }, labelKey));
			row.appendChild(cell);
		}
		return row;
	}

	setNofMode(nof) {
		this._nof = nof;
		if (this._apList) {
			this._fillAPRows();
		}
	}

	setPriorityMode(priority) {
		this._priority = priority;
		if (this._apList) {
			this._fillAPRows();
		}
	}

	_renderAP() {
		this._apList = this.createElement('div', { className: 'project-card-aeon-ap-list' });
		this._fillAPRows();
		return this._apList;
	}

	_fillAPRows() {
		const prefix = this._apFieldPrefix();
		this._apList.replaceChildren();
		for (let n = 0; n <= 4; n++) {
			this._apList.appendChild(this._renderAPRow(this._project[`${prefix}${n}skill`]));
		}
	}

	_apFieldPrefix() {
		if (this._nof && this._priority) return 'nof_priorityAP_';
		if (this._nof) return 'nofAP_';
		if (this._priority) return 'priorityAP_';
		return 'averageAP_';
	}

	_renderAPRow(value) {
		const row = this.createElement('div', { className: 'project-card-aeon-ap' });
		row.appendChild(this.createElement('span', {}, `~\u00a0${value}`));
		row.appendChild(this.createElement('img', {
			src:       getResourceURL('pictures/ui/pa.png'),
			alt:       'AP',
			className: 'project-card-aeon-ap-icon'
		}));
		return row;
	}
}

// Internal skill key → pictures/abilities/ relative path.
// Covers all skills present in ProjectData.
ProjectCard.SKILL_MAP = {
	astrophysicist:    'human/astrophyscicien.png',
	biologist:         'human/biologiste.png',
	botanic:           'human/botanic.png',
	caffeinomaniac:    'human/cafe.png',
	communication:     'human/radio.png',
	conceptor:         'human/concepteur.png',
	cook:              'human/cuistot.png',
	creative:          'human/creatif.png',
	engineer:          'human/technician.png',
	fireman:           'human/pompier.png',
	first_aid:         'human/infirmier.png',
	gunman:            'human/gunman.png',
	it_expert:         'human/informaticien.png',
	medic:             'human/medecin.png',
	paranoid:          'human/paranoiaque.png',
	physicist:         'human/physicien.png',
	pilot:             'human/pilot.png',
	robotics:          'human/robotique.png',
	shrink:            'human/psy.png',
};

var _global = typeof window !== 'undefined' ? window : self;
_global.ProjectCard = ProjectCard;

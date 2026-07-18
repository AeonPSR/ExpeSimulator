/**
 * CrewManagerPage Component
 *
 * Assembles the Crew Manager panel content from section components.
 * Sections: Crew (character grid), Title (command chain), Details.
 */
class CrewManagerPage extends Component {
	constructor(options = {}) {
		super(options);
		this._titleRows = null;
		this._detailsSection = null;
		this._expertToggle = null;
		this._cycleToggle = null;
		this._crewGrid = null;
		this._roleCharacters = {};
		this._hiddenCharacters = new Set();
		this._titleBlockedCharacters = new Set();
		this._roleOrder = ['commandant', 'comm', 'admin'];
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-manager-page' });

		const onCharacterClick = (filename) => this._detailsSection?.scrollAndHighlight(filename);

		// Crew section
		const crewSection = this._renderSection('crewmanager.section.crew');
		this._crewGrid = new CrewCharacterGrid({ onCharacterClick });
		crewSection.appendChild(this._crewGrid.render());
		this.element.appendChild(crewSection);

		// Title section
		const titleSection = this._renderSection('crewmanager.section.title');
		this._titleRows = new CrewTitleRows({ onCharacterClick });
		titleSection.appendChild(this._titleRows.render());
		this.element.appendChild(titleSection);

		// Details section
		const detailsSection = this._renderSection('crewmanager.section.details', [this._renderExpertToggle(), this._renderCycleToggle()]);
		this._detailsSection = new CrewDetailsSection({
			onVisibilityChange: (filename, visible) => this._setCharacterVisible(filename, visible),
			onDeadChange: (filename, dead) => this._crewGrid?.setCharacterDead(filename, dead),
			onStatusChange: (filename, status) => this._crewGrid?.setCharacterStatus(filename, status),
			onActivityChange: (filename, activity) => this._crewGrid?.setCharacterActivity(filename, activity),
			onTitleEligibilityChange: (filename, eligible) => this._setCharacterTitleEligible(filename, eligible)
		});
		detailsSection.appendChild(this._detailsSection.render());
		this.element.appendChild(detailsSection);

		this.element.appendChild(this._renderResetButton());

		return this.element;
	}

	_renderSection(titleKey, headerButtons = null) {
		const section = this.createElement('div', { className: 'crew-section' });
		const header = this.createElement('div', { className: 'sectors-header' });
		const title = this.createElement('h4', { 'data-i18n': titleKey }, I18n.t(titleKey));
		header.appendChild(title);
		if (headerButtons) {
			const buttonsContainer = this.createElement('div', { className: 'sectors-buttons' });
			(Array.isArray(headerButtons) ? headerButtons : [headerButtons]).forEach(button => {
				buttonsContainer.appendChild(button);
			});
			header.appendChild(buttonsContainer);
		}
		section.appendChild(header);
		return section;
	}

	_renderExpertToggle() {
		if (!this._expertToggle) {
			this._expertToggle = new ToggleButton({
				id: 'crew-expert-toggle-btn',
				className: 'diplomacy-toggle-btn',
				icon: getResourceURL('pictures/abilities/human/expert.png'),
				alt: '',
				activeColor: 'blue',
				onToggle: (isActive) => {
					this.element?.classList.toggle('crew-expert-active', isActive);
				}
			});
		}
		return this._expertToggle.render();
	}

	_renderCycleToggle() {
		if (!this._cycleToggle) {
			this._cycleToggle = new ToggleButton({
				id: 'crew-cycle-toggle-btn',
				className: 'diplomacy-toggle-btn',
				icon: getResourceURL('pictures/ui/clock.png'),
				alt: '',
				activeColor: 'orange',
				onToggle: (isActive) => {
					this.element?.classList.toggle('crew-cycle-active', isActive);
				}
			});
		}
		return this._cycleToggle.render();
	}

	_renderResetButton() {
		const wrapper = this.createElement('div', { className: 'crew-reset-row' });
		const btn = this.createElement('button', {
			className: 'crew-reset-btn',
			'data-i18n': 'crewmanager.reset'
		}, I18n.t('crewmanager.reset'));
		this.addEventListener(btn, 'click', () => {
			new ConfirmationModal({
				title: I18n.t('crewmanager.reset.confirm'),
				confirmLabel: I18n.t('crewmanager.reset.yes'),
				cancelLabel: I18n.t('crewmanager.reset.no'),
				panelElement: this.element?.closest('.app-panel'),
				onConfirm: () => this._openTimelineResetModal()
			}).open();
		});
		wrapper.appendChild(btn);
		return wrapper;
	}

	_openTimelineResetModal() {
		new CrewTimelineModal({
			title: I18n.t('crewmanager.timeline.title'),
			panelElement: this.element?.closest('.app-panel'),
			onSelect: (timeline) => this._resetForTimeline(timeline)
		}).open();
	}

	_resetForTimeline(timeline) {
		const hiddenByTimeline = {
			chaola:  ['andie.png', 'derek.png'],
			anderek: ['chao.png', 'finola.png'],
			neither: []
		};
		this._detailsSection?.reset({ hiddenCharacters: hiddenByTimeline[timeline] || [] });
	}

	setRoleCharacters(roleId, characterFiles) {
		this._roleCharacters[roleId] = characterFiles;
		this._renderRoleCharacters(roleId);
		this._updateCrewGridTitles();
	}

	_setCharacterVisible(filename, visible) {
		if (visible) {
			this._hiddenCharacters.delete(filename);
		} else {
			this._hiddenCharacters.add(filename);
		}
		this._crewGrid?.setCharacterVisible(filename, visible);
		Object.keys(this._roleCharacters).forEach(roleId => this._renderRoleCharacters(roleId));
		this._updateCrewGridTitles();
	}

	_setCharacterTitleEligible(filename, eligible) {
		if (eligible) {
			this._titleBlockedCharacters.delete(filename);
		} else {
			this._titleBlockedCharacters.add(filename);
		}
		Object.keys(this._roleCharacters).forEach(roleId => this._renderRoleCharacters(roleId));
		this._updateCrewGridTitles();
	}

	_canReceiveTitle(filename) {
		return !this._hiddenCharacters.has(filename) && !this._titleBlockedCharacters.has(filename);
	}

	_renderRoleCharacters(roleId) {
		const visibleCharacters = (this._roleCharacters[roleId] || [])
			.filter(filename => this._canReceiveTitle(filename));
		this._titleRows?.setRoleCharacters(roleId, visibleCharacters);
	}

	_updateCrewGridTitles() {
		const rolesByCharacter = {};
		this._roleOrder.forEach(roleId => {
			const currentHolder = (this._roleCharacters[roleId] || [])
				.find(filename => this._canReceiveTitle(filename));
			if (!currentHolder) return;

			if (!rolesByCharacter[currentHolder]) {
				rolesByCharacter[currentHolder] = [];
			}
			rolesByCharacter[currentHolder].push(roleId);
		});

		CharacterData.available
			.filter(filename => filename !== Constants.DEFAULT_AVATAR)
			.forEach(filename => this._crewGrid?.setCharacterTitles(filename, rolesByCharacter[filename] || []));
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewManagerPage = CrewManagerPage;

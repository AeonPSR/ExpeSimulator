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
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-manager-page' });

		const onCharacterClick = (filename) => this._detailsSection?.scrollAndHighlight(filename);

		// Crew section
		const crewSection = this._renderSection('crewmanager.section.crew');
		const grid = new CrewCharacterGrid({ onCharacterClick });
		crewSection.appendChild(grid.render());
		this.element.appendChild(crewSection);

		// Title section
		const titleSection = this._renderSection('crewmanager.section.title');
		this._titleRows = new CrewTitleRows({ onCharacterClick });
		titleSection.appendChild(this._titleRows.render());
		this.element.appendChild(titleSection);

		// Details section
		const detailsSection = this._renderSection('crewmanager.section.details');
		this._detailsSection = new CrewDetailsSection();
		detailsSection.appendChild(this._detailsSection.render());
		this.element.appendChild(detailsSection);

		this.element.appendChild(this._renderResetButton());

		return this.element;
	}

	_renderSection(titleKey) {
		const section = this.createElement('div', { className: 'crew-section' });
		const title = this.createElement('h4', { 'data-i18n': titleKey }, I18n.t(titleKey));
		section.appendChild(title);
		return section;
	}

	_renderResetButton() {
		const wrapper = this.createElement('div', { className: 'crew-reset-row' });
		const btn = this.createElement('button', {
			className: 'crew-reset-btn',
			'data-i18n': 'crewmanager.reset'
		}, I18n.t('crewmanager.reset'));
		wrapper.appendChild(btn);
		return wrapper;
	}

	setRoleCharacters(roleId, characterFiles) {
		this._titleRows?.setRoleCharacters(roleId, characterFiles);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewManagerPage = CrewManagerPage;

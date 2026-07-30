/**
 * Project Manager Page
 *
 * Main content area for the Project Manager panel.
 */
class ProjectManagerPage extends Component {
	constructor(options = {}) {
		super(options);
		this._infoSection = null;
		this._infoVisibilityToggle = null;
	}

	render() {
		this.element = this.createElement('div', { className: 'project-manager-page' });

		// Active Projects section
		const activeSection = this._renderSection('projectmanager.section.active');
		this.element.appendChild(activeSection);

		// Informations section (collapsible)
		this._infoSection = this._renderSection('projectmanager.section.info', this._renderInfoVisibilityToggle());
		this.element.appendChild(this._infoSection);

		// Details section
		const detailsSection = this._renderSection('projectmanager.section.details');
		this._grid = this.createElement('div', { className: 'project-card-aeon-grid' });
		this._cards = ProjectData
			.filter(p => p.type === 'neron')
			.map(project => new ProjectCard({
				project,
				onToggleVisibility: () => this._reorderCards()
			}));
		this._sortCards();
		this._cards.forEach(card => this._grid.appendChild(card.render()));
		detailsSection.appendChild(this._grid);
		this.element.appendChild(detailsSection);

		this.element.appendChild(this._renderResetButton());

		return this.element;
	}

	// Visible cards first, then hidden; each sub-list sorted most costly → least.
	_sortCards() {
		this._cards.sort((a, b) => {
			const va = a.isVisible() ? 0 : 1;
			const vb = b.isVisible() ? 0 : 1;
			if (va !== vb) return va - vb;
			return b.project.averageAP_0skill - a.project.averageAP_0skill;
		});
	}

	_reorderCards() {
		const previous = this._cards.map(card => [card.element, card.element.getBoundingClientRect()]);
		this._sortCards();
		this._cards.forEach(card => this._grid.appendChild(card.element));
		this._animateReorder(previous);
	}

	// FLIP: play each card from its previous position to the new one.
	_animateReorder(previous) {
		previous.forEach(([element, prevRect]) => {
			const nextRect = element.getBoundingClientRect();
			const deltaX = prevRect.left - nextRect.left;
			const deltaY = prevRect.top - nextRect.top;
			if (deltaX === 0 && deltaY === 0) return;
			element.style.transition = 'none';
			element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
		});

		requestAnimationFrame(() => {
			previous.forEach(([element]) => {
				if (!element.style.transform) return;
				element.classList.add('project-card-aeon-moving');
				element.style.transition = '';
				element.style.transform = '';
				element.addEventListener('transitionend', () => {
					element.classList.remove('project-card-aeon-moving');
				}, { once: true });
			});
		});
	}

	_renderSection(titleKey, headerButton = null) {
		const section = this.createElement('div', { className: 'panel-section' });
		const header = this.createElement('div', { className: 'sectors-header' });
		const title = this.createElement('h4', { 'data-i18n': titleKey }, I18n.t(titleKey));
		header.appendChild(title);
		if (headerButton) {
			const buttonsContainer = this.createElement('div', { className: 'sectors-buttons' });
			buttonsContainer.appendChild(headerButton);
			header.appendChild(buttonsContainer);
		}
		section.appendChild(header);
		return section;
	}

	_renderInfoVisibilityToggle() {
		if (!this._infoVisibilityToggle) {
			this._infoVisibilityToggle = new ToggleButton({
				id: 'project-info-visibility-btn',
				className: 'section-visibility-btn',
				icon: getResourceURL('pictures/ui/visibility.png'),
				alt: '',
				activeColor: 'blue',
				initialState: true,
				onToggle: (isVisible) => {
					this._infoSection?.classList.toggle('panel-section--collapsed', !isVisible);
				}
			});
		}
		return this._infoVisibilityToggle.render();
	}

	_renderResetButton() {
		const wrapper = this.createElement('div', { className: 'panel-reset-row' });
		const btn = this.createElement('button', {
			className: 'panel-reset-btn',
			'data-i18n': 'projectmanager.reset'
		}, I18n.t('projectmanager.reset'));
		wrapper.appendChild(btn);
		return wrapper;
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.ProjectManagerPage = ProjectManagerPage;

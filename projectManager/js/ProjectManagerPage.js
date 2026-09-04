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
		this._expertToggle = null;
		this._nofToggle = null;
		this._priorityToggle = null;
		this._sentinels = [];
		this._stuckObserver = null;
	}

	render() {
		this.element = this.createElement('div', { className: 'project-manager-page' });

		// Active Projects section
		const activeSection = this._renderSection('projectmanager.section.active');
		this._activeGrid = this.createElement('div', {
			className: 'project-card-aeon-grid project-card-aeon-grid--active'
		});
		this._activeSlots = Array.from({ length: 3 }, () => {
			const slot = this.createElement('div', { className: 'project-card-aeon-active-slot' });
			slot.appendChild(this._renderEmptyActiveSlot());
			const finishButton = this.createElement('button', {
				className: 'project-card-aeon-finish-btn',
				type: 'button',
				disabled: true
			}, 'Finish this project');
			this.addEventListener(finishButton, 'click', () => {
				if (slot._activeCard) {
					this._finishActiveProject(slot._activeCard);
				}
			});
			slot.appendChild(finishButton);
			slot._finishButton = finishButton;
			this._activeGrid.appendChild(slot);
			return slot;
		});
		activeSection.appendChild(this._activeGrid);
		this.element.appendChild(activeSection);

		// Informations section (collapsible)
		this._infoSection = this._renderSection('projectmanager.section.info', this._renderInfoVisibilityToggle());
		this.element.appendChild(this._infoSection);

		// Details section
		const detailsSection = this._renderSection('projectmanager.section.details', [
			this._renderNofToggle(),
			this._renderPriorityToggle(),
			this._renderExpertToggle()
		]);
		this._detailsGrid = this.createElement('div', {
			className: 'project-card-aeon-grid project-card-aeon-grid--details'
		});
		this._cards = ProjectData
			.filter(p => p.type === 'neron')
			.map(project => new ProjectCard({
				project,
				canActivateCore: () => this._cards.filter(card => card.isCore()).length < 3,
				onCoreSelectionChange: () => this._updateCoreAvailability(),
				onStatusChange: () => this._reorderCards()
			}));
		this._sortCards();
		this._cards.forEach(card => this._detailsGrid.appendChild(card.render()));
		this._assignCardZIndexes();
		detailsSection.appendChild(this._detailsGrid);
		this.element.appendChild(detailsSection);

		this.element.appendChild(this._renderResetButton());

		return this.element;
	}

	_updateCoreAvailability() {
		const limitReached = this._cards.filter(card => card.isCore()).length >= 3;
		this._cards.forEach(card => card.setCoreLimitReached(limitReached));
	}

	replaceActiveProjects(projectNames) {
		const selectedNames = new Set(projectNames);
		this._cards.filter(card => card.isCore()).forEach(card => card.setStatus(null));
		this._cards
			.filter(card => selectedNames.has(card.project.name))
			.forEach(card => card.setStatus('core'));
	}

	focusActiveProjects() {
		this._activeGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		this._activeGrid.classList.remove('import-highlight');
		void this._activeGrid.offsetWidth;
		this._activeGrid.classList.add('import-highlight');
		this._activeGrid.addEventListener('animationend', () => {
			this._activeGrid.classList.remove('import-highlight');
		}, { once: true });
	}

	// Unmarked/core first, then done, then bin; each group sorted most costly → least.
	_sortCards() {
		this._cards.sort((a, b) => {
			const bucketDifference = a.getSortBucket() - b.getSortBucket();
			if (bucketDifference !== 0) return bucketDifference;
			return b.project.averageAP_0skill - a.project.averageAP_0skill;
		});
	}

	_reorderCards() {
		const previous = this._cards.map(card => [card.element, card.element.getBoundingClientRect()]);
		this._sortCards();
		this._assignCardZIndexes();
		let activeSlotIndex = 0;
		this._activeSlots.forEach(slot => {
			slot._activeCard = null;
		});
		this._cards.forEach(card => {
			if (card.isCore()) {
				const slot = this._activeSlots[activeSlotIndex++];
				slot._activeCard = card;
				slot.insertBefore(card.element, slot._finishButton);
			} else {
				this._detailsGrid.appendChild(card.element);
			}
		});
		this._activeSlots.forEach(slot => {
			slot.classList.toggle('project-card-aeon-active-slot--filled', Boolean(slot._activeCard));
			slot._finishButton.disabled = !slot._activeCard;
		});
		this._animateReorder(previous);
	}

	_finishActiveProject(completedCard) {
		const activeCards = this._cards.filter(card => card.isCore());
		activeCards.forEach(card => {
			card.setStatus(card === completedCard ? 'done' : 'bin');
		});
	}

	_renderEmptyActiveSlot() {
		const card = this.createElement('div', {
			className: 'project-card-aeon project-card-aeon--empty',
			'aria-hidden': 'true'
		});
		card.appendChild(this.createElement('div', {
			className: 'project-card-aeon-image project-card-aeon-image--empty'
		}));

		const skills = this.createElement('div', {
			className: 'project-card-aeon-row project-card-aeon-skills'
		});
		skills.appendChild(this.createElement('div', { className: 'project-card-aeon-cell' }));
		skills.appendChild(this.createElement('div', { className: 'project-card-aeon-cell' }));
		card.appendChild(skills);

		const efficiency = this.createElement('div', {
			className: 'project-card-aeon-row project-card-aeon-efficiency'
		});
		['Min', 'Max'].forEach(label => {
			const cell = this.createElement('div', {
				className: 'project-card-aeon-cell project-card-aeon-efficiency-cell'
			});
			cell.appendChild(this.createElement('span', { className: 'project-card-aeon-pct' }, 'X%'));
			cell.appendChild(this.createElement('span', { className: 'project-card-aeon-label' }, label));
			efficiency.appendChild(cell);
		});
		card.appendChild(efficiency);
		return card;
	}

	_assignCardZIndexes() {
		this._cards.forEach((card, index) => {
			card.element.style.zIndex = 50 - index;
		});
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

	_renderSection(titleKey, headerButtons = null) {
		const section = this.createElement('div', { className: 'panel-section' });
		const sentinel = this.createElement('div', { className: 'project-section-sentinel' });
		const header = this.createElement('div', { className: 'project-section-header' });
		const title = this.createElement('h4', { 'data-i18n': titleKey }, I18n.t(titleKey));
		header.appendChild(title);
		if (headerButtons) {
			const buttonsContainer = this.createElement('div', { className: 'project-section-buttons' });
			(Array.isArray(headerButtons) ? headerButtons : [headerButtons]).forEach(button => {
				buttonsContainer.appendChild(button);
			});
			header.appendChild(buttonsContainer);
		}
		section.appendChild(sentinel);
		section.appendChild(header);
		sentinel._stickyHeader = header;
		this._sentinels.push(sentinel);
		return section;
	}

	_renderExpertToggle() {
		if (!this._expertToggle) {
			this._expertToggle = new ToggleButton({
				id: 'project-expert-toggle-btn',
				className: 'diplomacy-toggle-btn',
				icon: getResourceURL('pictures/abilities/human/expert.png'),
				alt: '',
				activeColor: 'blue',
				initialState: false,
				onToggle: (isActive) => {
					this.element?.classList.toggle('project-expert-active', isActive);
				}
			});
		}
		return this._expertToggle.render();
	}

	_renderNofToggle() {
		if (!this._nofToggle) {
			this._nofToggle = new ToggleButton({
				id: 'project-nof-toggle-btn',
				className: 'diplomacy-toggle-btn project-expert-extra',
				icon: getResourceURL('pictures/abilities/human/neron.png'),
				alt: '',
				activeColor: 'blue',
				initialState: false,
				onToggle: (isActive) => {
					this._cards.forEach(card => card.setNofMode(isActive));
				}
			});
		}
		return this._nofToggle.render();
	}

	_renderPriorityToggle() {
		if (!this._priorityToggle) {
			this._priorityToggle = new ToggleButton({
				id: 'project-priority-toggle-btn',
				className: 'diplomacy-toggle-btn project-expert-extra',
				icon: getResourceURL('pictures/abilities/human/panique.png'),
				alt: '',
				activeColor: 'blue',
				initialState: false,
				onToggle: (isActive) => {
					this._cards.forEach(card => card.setPriorityMode(isActive));
				}
			});
		}
		return this._priorityToggle.render();
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

	onMount() {
		const scrollRoot = this.element.closest('.panel-content');
		if (!scrollRoot || typeof IntersectionObserver === 'undefined') {
			return;
		}
		const padTop = parseFloat(getComputedStyle(scrollRoot).paddingTop) || 0;
		this._stuckObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				const header = entry.target._stickyHeader;
				const stuck = !entry.isIntersecting && entry.boundingClientRect.top <= entry.rootBounds.top;
				header.classList.toggle('project-section-stuck', stuck);
			});
		}, { root: scrollRoot, rootMargin: `-${padTop}px 0px 0px 0px`, threshold: [0, 1] });
		this._sentinels.forEach((sentinel) => this._stuckObserver.observe(sentinel));
	}

	onDestroy() {
		this._stuckObserver?.disconnect();
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

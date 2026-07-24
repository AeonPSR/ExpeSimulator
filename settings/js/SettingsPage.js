/**
 * SettingsPage Component
 *
 * Renders the three settings sections inside the Settings panel:
 * - Language: three flag buttons (EN / FR / ES), radio-button behaviour
 * - Theme: drop-down list (Default / Retro)
 * - Visibility: icon buttons for optional panels
 * - Developer tools: checkbox toggle
 */
class SettingsPage extends Component {
	constructor(options = {}) {
		super(options);
		this._langBtns = {};
	}

	render() {
		this.element = this.createElement('div', { className: 'settings-page' });

		this.element.appendChild(this._renderSection('settings.section.language', this._renderLanguageControls()));
		this.element.appendChild(this._renderSection('settings.section.theme', this._renderThemeControls()));
		this.element.appendChild(this._renderSection('settings.section.visibility', this._renderVisibilityControls()));
		this.element.appendChild(this._renderNavmodeSection());
		this.element.appendChild(this._renderSection('settings.section.devtools', this._renderDevtoolsControls(), 'settings-section--devtools'));

		this.element.appendChild(this._renderInfoTabs());

		// Keep language buttons in sync when locale changes from any source
		this.addEventListener(document, 'i18n:change', (e) => {
			this._syncLangButtons(e.detail.locale);
		});

		return this.element;
	}

	// Sections

	_renderSection(titleKey, controls, extraClass = '') {
		const section = this.createElement('div', { className: ('settings-section ' + extraClass).trim() });
		const title = this.createElement('h4', { 'data-i18n': titleKey }, I18n.t(titleKey));
		section.appendChild(title);
		section.appendChild(controls);
		return section;
	}

	// Language

	_renderLanguageControls() {
		const row = this.createElement('div', { className: 'settings-lang-row' });

		I18n.supported.forEach(locale => {
			const btn = this.createElement('button', {
				className: 'panel-lang-btn' +
					(I18n.locale === locale ? ' panel-lang-btn--active' : '')
			});
			const img = this.createElement('img', {
				src: getResourceURL(`pictures/ui/${locale}.png`),
				alt: ''
			});
			btn.appendChild(img);
			this.addEventListener(btn, 'click', () => I18n.setLocale(locale));
			this._langBtns[locale] = btn;
			row.appendChild(btn);
		});

		return row;
	}

	_syncLangButtons(locale) {
		Object.entries(this._langBtns).forEach(([l, btn]) => {
			btn.classList.toggle('panel-lang-btn--active', l === locale);
		});
	}

	// Theme

	_renderThemeControls() {
		const select = this.createElement('select', { className: 'settings-theme-select' });
		const optionMap = {};

		const _buildLabel = (theme) => {
			const name = I18n.t(`settings.theme.${theme}`);
			if (theme === 'retro' && Settings.isFirefox) {
				return name + ' — ' + I18n.t('settings.theme.unavailable_firefox');
			}
			return name;
		};

		Settings.themes.forEach(theme => {
			const isUnavailable = theme === 'retro' && Settings.isFirefox;
			const attrs = { value: theme };
			if (isUnavailable) attrs.disabled = true;
			const opt = this.createElement('option', attrs, _buildLabel(theme));
			if (Settings.theme === theme) opt.selected = true;
			optionMap[theme] = opt;
			select.appendChild(opt);
		});

		this.addEventListener(select, 'change', () => Settings.setTheme(select.value));

		// Keep in sync if theme changed via the panel header button
		this.addEventListener(document, 'settings:theme-change', (e) => {
			select.value = e.detail.theme;
		});

		// Re-translate labels (including the Firefox suffix) on locale change
		this.addEventListener(document, 'i18n:change', () => {
			Object.keys(optionMap).forEach(theme => {
				optionMap[theme].textContent = _buildLabel(theme);
			});
		});

		return select;
	}

	// Developer tools

	_renderDevtoolsControls() {
		const row = this.createElement('div', { className: 'settings-devtools-row' });

		const btn = this.createElement('button', {
			className: 'panel-lang-btn' + (Settings.devtools ? ' panel-lang-btn--active' : ''),
		});
		const img = this.createElement('img', {
				src: getResourceURL('pictures/abilities/human/technician.png'),
			alt: ''
		});
		btn.appendChild(img);
		this.addEventListener(btn, 'click', () => {
			Settings.setDevtools(!Settings.devtools);
			btn.classList.toggle('panel-lang-btn--active', Settings.devtools);
		});

		row.appendChild(btn);
		return row;
	}

	// Navmode

	_renderNavmodeSection() {
		this._navmode = (typeof Settings !== 'undefined' ? Settings.navmode : null) || 'hover';

		const section = this.createElement('div', { className: 'settings-section' });

		const title = this.createElement('h4', {
			'data-i18n': `settings.section.navmode.${this._navmode}`
		}, I18n.t(`settings.section.navmode.${this._navmode}`));
		section.appendChild(title);

		const row = this.createElement('div', { className: 'settings-navmode-row' });
		const btn = this.createElement('button', {
			className: 'settings-navmode-btn',
			dataset: { mode: this._navmode }
		});
		const img = this.createElement('img', {
			src: getResourceURL(this._navmode === 'hover'
				? 'pictures/abilities/human/observateur.png'
				: 'pictures/abilities/human/meticuleuse.png'),
			alt: ''
		});
		btn.appendChild(img);

		this.addEventListener(btn, 'click', () => {
			this._navmode = this._navmode === 'hover' ? 'click' : 'hover';
			const titleKey = `settings.section.navmode.${this._navmode}`;
			title.dataset.i18n  = titleKey;
			title.textContent   = I18n.t(titleKey);
			btn.dataset.mode    = this._navmode;
			img.src = getResourceURL(
				this._navmode === 'hover'
					? 'pictures/abilities/human/observateur.png'
					: 'pictures/abilities/human/meticuleuse.png'
			);
			Settings.setNavmode(this._navmode);
		});

		this.addEventListener(document, 'i18n:change', () => {
			const titleKey = `settings.section.navmode.${this._navmode}`;
			title.dataset.i18n = titleKey;
			title.textContent  = I18n.t(titleKey);
		});

		row.appendChild(btn);
		section.appendChild(row);
		return section;
	}

	// Visibility
	_renderVisibilityControls() {
		const wrapper = this.createElement('div', { className: 'settings-visibility' });

		this._visibilityIcons = {
			'expedition-simulator': 'pictures/ui/astrophysicist.png',
			'crew-manager-panel': 'pictures/abilities/human/psy.png',
			'settings-panel': 'pictures/abilities/human/creatif.png'
		};
		this._visibilityRow = this.createElement('div', { className: 'settings-visibility-row' });
		this._renderVisibilityButtons();
		wrapper.appendChild(this._visibilityRow);

		const hint = this.createElement('p', {
			className: 'settings-visibility-hint',
			'data-i18n': 'settings.visibility.hint'
		}, I18n.t('settings.visibility.hint'));
		wrapper.appendChild(hint);

		return wrapper;
	}

	_renderVisibilityButtons() {
		this._visibilityRow.innerHTML = '';
		this._visibilityButtons = {};
		Settings.panelOrder.forEach(panelId => {
			const iconPath = this._visibilityIcons[panelId];
			if (!iconPath) return;
			const btn = this._renderPanelVisibilityButton({
				panelId,
				iconPath,
				forceActive: panelId === 'settings-panel'
			});
			this._visibilityButtons[panelId] = btn;
			this._visibilityRow.appendChild(btn);
		});
	}

	_renderPanelVisibilityButton({ panelId, iconPath, forceActive = false }) {
		const panel = document.getElementById(panelId);
		const isVisible = forceActive || (Settings.isPanelVisible(panelId) && !panel?.classList.contains('panel--hidden'));
		const btn = this.createElement('button', {
			className: 'panel-lang-btn' +
				(isVisible ? ' panel-lang-btn--active' : '') +
				(forceActive ? ' panel-lang-btn--settings' : ''),
			dataset: { panelId }
		});
		const img = this.createElement('img', { src: getResourceURL(iconPath), alt: '' });
		btn.appendChild(img);
		this._addPointerHandlers(btn, forceActive);
		return btn;
	}

	// Pointer-based drag reordering
	//
	// On pointerdown we record where the finger/cursor grabbed the button.
	// On pointermove the button is lifted out of flow (position:fixed) and
	// follows the cursor 1-to-1 — no ghost, no binding, no snapping while
	// moving. On pointerup we find which sibling the button is closest to,
	// commit that order, and animate the settle with a FLIP.
	// A move smaller than 4px is treated as a plain click (visibility toggle).

	_addPointerHandlers(btn, forceActive) {
		const DRAG_THRESHOLD = 4;

		this.addEventListener(btn, 'pointerdown', (e) => {
			if (e.button !== 0) return;
			e.preventDefault();

			// Pin the panel open immediately, before any hover state can change.
			// This is the same mechanism the pin button uses and is the only
			// reliable way to keep the panel open while the cursor may leave it.
			const panelEl = btn.closest('.app-panel') || document.getElementById('settings-panel');
			const wasAlreadyPinned = panelEl?.classList.contains('pinned');
			if (panelEl && !wasAlreadyPinned) panelEl.classList.add('pinned');

			const startX = e.clientX;
			const startY = e.clientY;
			const rect   = btn.getBoundingClientRect();
			const offsetX = e.clientX - rect.left;
			const offsetY = e.clientY - rect.top;
			let dragging = false;

			// Keep a placeholder in the original position to hold layout space
			const placeholder = this.createElement('div', { className: 'panel-lang-btn panel-lang-btn--drag-placeholder' });
			placeholder.style.width  = rect.width  + 'px';
			placeholder.style.height = rect.height + 'px';

			const onMove = (me) => {
				const dx = me.clientX - startX;
				const dy = me.clientY - startY;

				if (!dragging && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

				if (!dragging) {
					dragging = true;
					// Insert placeholder where the button currently sits
					btn.parentNode.insertBefore(placeholder, btn);
					// Lift the button out of flow, disable transition so it
					// tracks the cursor immediately with zero delay.
					btn.style.transition  = 'none';
					btn.style.position    = 'fixed';
					btn.style.zIndex      = '99999';
					btn.style.width       = rect.width  + 'px';
					btn.style.height      = rect.height + 'px';
					btn.style.margin      = '0';
					btn.style.pointerEvents = 'none';
					btn.classList.add('panel-lang-btn--dragging');
				}

				btn.style.left = (me.clientX - offsetX) + 'px';
				btn.style.top  = (me.clientY - offsetY) + 'px';

				// Move placeholder to the slot the button is hovering over
				const row = this._visibilityRow;
				const siblings = Array.from(row.children).filter(c => c !== btn);
				let target = null;
				let minDist = Infinity;
				siblings.forEach(sib => {
					const sr = sib.getBoundingClientRect();
					const dist = Math.abs(me.clientX - (sr.left + sr.width / 2));
					if (dist < minDist) { minDist = dist; target = sib; }
				});
				if (target) {
					const targetRect = target.getBoundingClientRect();
					if (me.clientX < targetRect.left + targetRect.width / 2) {
						row.insertBefore(placeholder, target);
					} else {
						row.insertBefore(placeholder, target.nextSibling);
					}
				}
			};

			const onUp = (ue) => {
				document.removeEventListener('pointermove', onMove);
				document.removeEventListener('pointerup', onUp);

				// Release the pin we took on pointerdown. For a click this is
				// immediate. For a drag we keep the panel open until the cursor
				// actually leaves it, so it doesn't snap shut the moment the
				// button is dropped outside the panel's hover area.
				const releasePin = () => {
					if (!wasAlreadyPinned) panelEl?.classList.remove('pinned');
				};

				if (!dragging) {
					// It was a click, not a drag
					if (!forceActive) {
						const visible = btn.classList.toggle('panel-lang-btn--active');
						Settings.setPanelVisible(btn.dataset.panelId, visible);
						const panel = document.getElementById(btn.dataset.panelId);
						panel?.classList.toggle('panel--hidden', !visible);
						Panel.repositionTongues();
					}
					releasePin();
					return;
				}

				// Restore button into the slot the placeholder is holding
				btn.style.transition = '';
				btn.style.position = '';
				btn.style.zIndex   = '';
				btn.style.width    = '';
				btn.style.height   = '';
				btn.style.left     = '';
				btn.style.top      = '';
				btn.style.margin   = '';
				btn.style.pointerEvents = '';
				btn.classList.remove('panel-lang-btn--dragging');

				// Swap button in for the placeholder
				const row = this._visibilityRow;
				row.insertBefore(btn, placeholder);
				placeholder.remove();

				// Read the new order from the DOM
				const newOrder = Array.from(row.children).map(c => c.dataset?.panelId).filter(Boolean);

				if (newOrder.join(',') !== Settings.panelOrder.join(',')) {
					// Commit and reorder the actual panels
					Settings.setPanelOrder(newOrder);
					if (typeof Panel !== 'undefined') Panel.applyOrder(newOrder);
					// Update our internal button map to match the new order
					newOrder.forEach(id => {
						if (this._visibilityButtons[id]) {
							this._visibilityButtons[id] = row.querySelector(`[data-panel-id="${id}"]`);
						}
					});
				}

				// Unpin after the drag. If the cursor is still inside the panel
				// we keep it open via :hover; if it ended outside, mouseleave
				// removes the pin once the cursor comes back and then leaves, or
				// the rAF fallback removes it immediately.
				if (!wasAlreadyPinned && panelEl) {
					const unpin = () => {
						panelEl.classList.remove('pinned');
						panelEl.removeEventListener('mouseleave', unpin);
					};
					panelEl.addEventListener('mouseleave', unpin, { once: true });
					requestAnimationFrame(() => {
						if (!panelEl.matches(':hover')) unpin();
					});
				}
			};

			document.addEventListener('pointermove', onMove);
			document.addEventListener('pointerup', onUp);
		});
	}

	/**
	 * Moves the visibility buttons to match `order`, animating each one from
	 * its previous screen position to its new one (FLIP technique).
	 * @param {string[]} order
	 */
	_animateVisibilityReorder(order) {
		const oldRects = {};
		Object.entries(this._visibilityButtons).forEach(([panelId, btn]) => {
			oldRects[panelId] = btn.getBoundingClientRect();
		});

		let prev = null;
		order.forEach(panelId => {
			const btn = this._visibilityButtons[panelId];
			if (!btn) return;
			const inPlace = prev ? btn.previousElementSibling === prev : this._visibilityRow.firstElementChild === btn;
			if (!inPlace) {
				this._visibilityRow.insertBefore(btn, prev ? prev.nextSibling : this._visibilityRow.firstChild);
			}
			prev = btn;
		});

		Object.entries(this._visibilityButtons).forEach(([panelId, btn]) => {
			const oldRect = oldRects[panelId];
			const newRect = btn.getBoundingClientRect();
			const dx = oldRect.left - newRect.left;
			if (!dx) return;
			btn.style.transition = 'none';
			btn.style.transform = `translateX(${dx}px)`;
			requestAnimationFrame(() => {
				btn.style.transition = 'transform 0.2s ease';
				btn.style.transform = '';
				btn.addEventListener('transitionend', () => {
					btn.style.transition = '';
				}, { once: true });
			});
		});
	}

	// Info Tabs

	_renderInfoTabs() {
		const tabs = new TabContainer({
			tabs: [
				{ id: 'informations', label: I18n.t('settings.tab.informations'), i18nKey: 'settings.tab.informations' },
				{ id: 'patch_notes',  label: I18n.t('settings.tab.patch_notes'),  i18nKey: 'settings.tab.patch_notes'  }
			]
		});
		tabs.render();

		const infoPanel = tabs.getTabPanel('informations');
		this._appendCredits(infoPanel);

		const patchPanel = tabs.getTabPanel('patch_notes');
		this._appendPatchNotes(patchPanel);

		return tabs.element;
	}

	_appendCredits(container) {
		const rebuild = () => {
			const url   = I18n.t('credits.wiki.url');
			const label = I18n.t('credits.wiki.label');
			const credits = new InfoPanel({
				title:    'Aeon\'s Lab - Version 1.2',
				subtitle: I18n.t('credits.subtitle'),
				sections: [
					{
						content: `<p>${I18n.t('credits.warning')} <a href="${url}" target="_blank">${label}</a></p>`
					},
					{
						title:   I18n.t('credits.author.title'),
						content: `<p>${I18n.t('credits.contact')}</p>`
					}
				]
			});
			container.innerHTML = '';
			container.appendChild(credits.render());
		};
		rebuild();
		this.addEventListener(document, 'i18n:change', rebuild);
	}

	_appendPatchNotes(container) {
		const rebuild = () => {
			const notes = new InfoPanel({
				sections: [
					{
						title:   'Version 1.2',
						content: `<p>- ${I18n.t('patch_notes.v1_2.line1')}</p><p>- ${I18n.t('patch_notes.v1_2.line2')}</p><p>- ${I18n.t('patch_notes.v1_2.line3')}</p>`
					},
					{
						title:   'Version 1.1',
						content: `<p>- ${I18n.t('patch_notes.v1_1.line1')}</p><p>- ${I18n.t('patch_notes.v1_1.line2')}</p><p>- ${I18n.t('patch_notes.v1_1.line3')}</p>`
					},
					{
						title:   'Version 1.0',
						content: `<p>${I18n.t('patch_notes.v1_0.content')}</p>`
					}
				]
			});
			container.innerHTML = '';
			container.appendChild(notes.render());
		};
		rebuild();
		this.addEventListener(document, 'i18n:change', rebuild);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.SettingsPage = SettingsPage;

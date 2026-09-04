/**
 * Adds an import button to NERON project-list messages.
 * Project parsing is intentionally deferred until the import workflow is defined.
 */
class ProjectMessageInjector {
	constructor(options = {}) {
		this._onImport = options.onImport || null;
		this._projectNamesPromise = null;
	}

	processMessage(message) {
		const existing = message.querySelector('.project-message-import-btn');
		const matches = this._isNeronProjectMessage(message);
		if (!matches) {
			existing?.remove();
			return;
		}
		if (existing) return;

		this._addImportButton(message);
	}

	_addImportButton(message) {

		const currentPosition = window.getComputedStyle(message).position;
		if (currentPosition === 'static') {
			message.style.position = 'relative';
		}

		const button = document.createElement('button');
		button.className = 'expe-import-btn expe-import-btn--overlay project-message-import-btn';
		button.appendChild(this._createButtonIcon());

		button.addEventListener('click', async (e) => {
			e.stopPropagation();
			const projectNames = this._extractProjectNames(message);
			const nameMap = await this._loadProjectNames();
			const internalNames = projectNames.map(name => nameMap.get(name));
			if (internalNames.length === 3 && internalNames.every(Boolean)) {
				this._onImport?.(internalNames);
			}
		});

		message.appendChild(button);
	}

	_isNeronProjectMessage(message) {
		const hasNeronIcon = [...message.querySelectorAll('img')].some(image => {
			const alt = image.getAttribute('alt') || '';
			const src = image.getAttribute('src') || '';
			return alt === ':neron:' || /pa_core/i.test(src);
		});
		return hasNeronIcon && /\bV\d+\.\d{2}(?!\d)/i.test(message.textContent || '');
	}

	_extractProjectNames(message) {
		return [...message.querySelectorAll('.text strong')]
			.map(element => element.textContent.trim())
			.filter(text => !/\bV\d+\.\d{2}(?!\d)/i.test(text));
	}

	_loadProjectNames() {
		if (!this._projectNamesPromise) {
			this._projectNamesPromise = fetch(getResourceURL('projectManager/project_names.csv'))
				.then(response => {
					if (!response.ok) throw new Error(`Unable to load project names: ${response.status}`);
					return response.text();
				})
				.then(csv => {
					const nameMap = new Map();
					csv.split(/\r?\n/).slice(1).forEach(line => {
						const columns = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
						if (columns.length !== 4) return;
						const internalName = columns[0].toUpperCase();
						columns.slice(1).forEach(name => nameMap.set(name.trim(), internalName));
					});
					return nameMap;
				});
		}
		return this._projectNamesPromise;
	}

	_createButtonIcon() {
		const icon = document.createElement('span');
		icon.className = 'project-message-import-icon';

		const core = document.createElement('img');
		core.className = 'project-message-import-core';
		core.src = getResourceURL('pictures/ui/pa_core.png');
		core.alt = '';
		icon.appendChild(core);

		const overlay = document.createElement('img');
		overlay.className = 'project-message-import-overlay';
		overlay.src = getResourceURL('pictures/ui/import_empty.png');
		overlay.alt = 'Import';
		icon.appendChild(overlay);

		return icon;
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.ProjectMessageInjector = ProjectMessageInjector;
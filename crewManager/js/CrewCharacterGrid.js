/**
 * CrewCharacterGrid Component
 *
 * Displays the full grid of available characters (18 named, Lambda excluded).
 * Calls onCharacterClick(filename) when a character is clicked.
 */
class CrewCharacterGrid extends Component {
	constructor(options = {}) {
		super(options);
		this.onCharacterClick = options.onCharacterClick || null;
		this._optionByFilename = {};
		this._titleIconsByFilename = {};
		this._activityIconsByFilename = {};
		this._roleIcons = {
			commandant: 'pictures/ui/commandant.png',
			comm:       'pictures/ui/comm.png',
			admin:      'pictures/ui/admin.png'
		};
		this._activityIcons = {
			inactive:      'pictures/ui/inactive.png',
			grandInactive: 'pictures/ui/grand inactive.png'
		};
	}

	render() {
		const wrapper = this.createElement('div');
		wrapper.setAttribute('data-expe-sim', '');

		const grid = this.createElement('div', { className: 'character-grid' });

		const characters = CharacterData.available.filter(c => c !== Constants.DEFAULT_AVATAR);
		for (const filename of characters) {
			const name = filename.replace('.png', '').replace(/_/g, ' ');
			const option = this.createElement('div', { className: 'character-option' });
			option.dataset.filename = filename;
			this._optionByFilename[filename] = option;

			const titleIcons = this.createElement('div', { className: 'crew-character-side-icons crew-character-title-icons' });
			this._titleIconsByFilename[filename] = titleIcons;
			option.appendChild(titleIcons);

			const spriteAnchor = this.createElement('div', { className: 'crew-sprite-anchor' });
			const img = this.createElement('img', {
				className: 'crew-character-sprite',
				src: getResourceURL(`pictures/characters/${filename}`),
				alt: name
			});
			spriteAnchor.appendChild(img);
			const deadIcon = this.createElement('img', {
				className: 'crew-dead-icon crew-dead-icon--summary',
				src: getResourceURL('pictures/ui/dead.png'),
				alt: ''
			});
			spriteAnchor.appendChild(deadIcon);
			option.appendChild(spriteAnchor);

			const activityIcons = this.createElement('div', { className: 'crew-character-side-icons crew-character-activity-icons' });
			this._activityIconsByFilename[filename] = activityIcons;
			option.appendChild(activityIcons);

			this.addEventListener(option, 'click', () => this.onCharacterClick?.(filename));
			grid.appendChild(option);
		}

		wrapper.appendChild(grid);
		this.element = wrapper;
		return this.element;
	}

	setCharacterVisible(filename, visible) {
		this._optionByFilename[filename]?.classList.toggle('crew-character-missing', !visible);
	}

	setCharacterDead(filename, dead) {
		this._optionByFilename[filename]?.classList.toggle('crew-character-dead', dead);
	}

	setCharacterStatus(filename, status) {
		const option = this._optionByFilename[filename];
		if (!option) return;

		option.classList.toggle('crew-character-mush', status === 'mush');
		option.classList.toggle('crew-character-human', status === 'human');
	}

	setCharacterTitles(filename, roleIds) {
		const container = this._titleIconsByFilename[filename];
		if (!container) return;

		container.innerHTML = '';
		roleIds.forEach(roleId => {
			const iconPath = this._roleIcons[roleId];
			if (!iconPath) return;

			const icon = this.createElement('img', {
				src: getResourceURL(iconPath),
				alt: ''
			});
			container.appendChild(icon);
		});
	}

	setCharacterActivity(filename, activity) {
		const container = this._activityIconsByFilename[filename];
		if (!container) return;

		container.innerHTML = '';
		const iconPath = this._activityIcons[activity];
		if (!iconPath) return;

		const icon = this.createElement('img', {
			src: getResourceURL(iconPath),
			alt: ''
		});
		container.appendChild(icon);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewCharacterGrid = CrewCharacterGrid;

/**
 * CrewTitleRows Component
 *
 * Displays the three command-chain rows (Commandant, Comm, Admin).
 * Each row has a role icon on the left and 5 portrait slots.
 */
class CrewTitleRows extends Component {
	constructor(options = {}) {
		super(options);
		this._slots = {};
		this.onCharacterClick = options.onCharacterClick || null;
	}

	render() {
		const container = this.createElement('div', { className: 'crew-title-rows' });
		container.setAttribute('data-expe-sim', '');

		const roles = [
			{ id: 'commandant', icon: 'pictures/ui/commandant.png' },
			{ id: 'comm',       icon: 'pictures/ui/comm.png'       },
			{ id: 'admin',      icon: 'pictures/ui/admin.png'      },
		];

		for (const role of roles) {
			const row = this.createElement('div', { className: `crew-title-row crew-title-row--${role.id}` });

			const roleIcon = this.createElement('img', {
				className: 'crew-title-role-icon',
				src: getResourceURL(role.icon),
				alt: role.id
			});
			row.appendChild(roleIcon);

			const slots = [];
			for (let i = 0; i < 6; i++) {
				const slot = this.createElement('div', { className: 'character-option crew-title-slot' });
				row.appendChild(slot);
				slots.push(slot);
			}
			this._slots[role.id] = slots;

			container.appendChild(row);
		}

		this.element = container;
		return this.element;
	}

	setRoleCharacters(roleId, characterFiles) {
		const slots = this._slots[roleId];
		if (!slots) return;

		slots.forEach((slot, i) => {
			slot.innerHTML = '';
			const filename = characterFiles[i];
			if (filename) {
				const name = filename.replace('.png', '').replace(/_/g, ' ');
				const img = document.createElement('img');
				img.src = getResourceURL(`pictures/characters/${filename}`);
				img.alt = name;
				slot.appendChild(img);
				slot.onclick = () => this.onCharacterClick?.(filename);
			} else {
				slot.onclick = null;
			}
		});
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewTitleRows = CrewTitleRows;

/**
 * CrewTimelineModal Component
 *
 * Lets the user choose which Crew Manager timeline baseline to reset into.
 */
class CrewTimelineModal extends Modal {
	constructor(options = {}) {
		super({
			...options,
			className: ['crew-timeline-modal', options.className || ''].filter(Boolean).join(' ')
		});
		this.onSelect = options.onSelect || null;
	}

	render() {
		super.render();

		const row = this.createElement('div', { className: 'crew-timeline-options' });
		[
			{
				id: 'chaola',
				label: I18n.t('crewmanager.timeline.chaola'),
				className: 'crew-timeline-option--chaola',
				characters: ['chao.png', 'finola.png']
			},
			{
				id: 'neither',
				label: I18n.t('crewmanager.timeline.neither'),
				className: 'crew-timeline-option--neither',
				characters: []
			},
			{
				id: 'anderek',
				label: I18n.t('crewmanager.timeline.anderek'),
				className: 'crew-timeline-option--anderek',
				characters: ['andie.png', 'derek.png']
			}
		].forEach(option => row.appendChild(this._createTimelineOption(option)));

		this._bodyContainer.appendChild(row);
		return this.element;
	}

	_createTimelineOption(option) {
		const button = this.createElement('button', {
			className: `crew-timeline-option ${option.className}`,
			dataset: { timeline: option.id }
		});

		const label = this.createElement('span', { className: 'crew-timeline-label' }, option.label);
		button.appendChild(label);

		const sprites = this.createElement('div', { className: 'crew-timeline-sprites' });
		option.characters.forEach(filename => {
			const img = this.createElement('img', {
				src: getResourceURL(`pictures/characters/${filename}`),
				alt: ''
			});
			sprites.appendChild(img);
		});
		button.appendChild(sprites);

		this.addEventListener(button, 'click', () => {
			this.onSelect?.(option.id);
			this.close(option.id);
		});

		return button;
	}
}

if (typeof window !== 'undefined') {
	window.CrewTimelineModal = CrewTimelineModal;
}
/**
 * CrewTimelineStepper Component
 *
 * Compact D/C cycle stepper used by Crew detail cards.
 */
class CrewTimelineStepper extends Component {
	constructor(options = {}) {
		super(options);
		this.player = options.player;
		this.onChange = options.onChange || null;
		this.cycleFirst = Boolean(options.cycleFirst);
		this._display = null;
		this._localeUnsubscribe = null;
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-timeline-stepper' });
		const decrement = this.createElement('button', { className: 'crew-timeline-stepper-btn' }, '-');
		this._display = this.createElement('button', { className: 'crew-timeline-stepper-display' });
		const increment = this.createElement('button', { className: 'crew-timeline-stepper-btn' }, '+');

		this.addEventListener(decrement, 'click', () => this._step(-1));
		this.addEventListener(this._display, 'click', () => this._prompt());
		this.addEventListener(increment, 'click', () => this._step(1));
		this.addEventListener(document, 'i18n:change', () => this._updateDisplay());

		this.element.appendChild(decrement);
		this.element.appendChild(this._display);
		this.element.appendChild(increment);
		this._updateDisplay();
		return this.element;
	}

	reset() {
		this._setTimeline(1, 1);
	}

	clear() {
		this._setTimeline(null, null, true);
	}

	setTimeline(day, cycle, silent = false) {
		this._setTimeline(day, cycle, silent);
	}

	_format() {
		const day = this.player.day ?? '-';
		const cycle = this.player.cycle ?? '-';
		if (this.player.cycle === null && this.player.day === null) {
			const first = this.cycleFirst ? 'cycle' : 'day';
			const second = this.cycleFirst ? 'day' : 'cycle';
			return `${I18n.t(`crewmanager.timeline.${first}_short`)}-${I18n.t(`crewmanager.timeline.${second}_short`)}-`;
		}
		if (this.cycleFirst) {
			return `${I18n.t('crewmanager.timeline.cycle_short')}${cycle}-${I18n.t('crewmanager.timeline.day_short')}${day}`;
		}
		return `${I18n.t('crewmanager.timeline.day_short')}${day}-${I18n.t('crewmanager.timeline.cycle_short')}${cycle}`;
	}

	_updateDisplay() {
		if (!this._display) return;

		this.element.dataset.daySet = String(this.player.day !== null);
		this.element.dataset.cycleSet = String(this.player.cycle !== null);
		this._display.innerHTML = '';
		const order = this.cycleFirst ? ['cycle', 'day'] : ['day', 'cycle'];
		order.forEach((parameter, index) => {
			if (index === 1 && (this.player.day !== null || this.player.cycle !== null)) {
				this._display.appendChild(document.createTextNode('-'));
			}
			const prefix = I18n.t(`crewmanager.timeline.${parameter}_short`);
			const value = this.player[parameter] ?? '-';
			this._display.appendChild(this.createElement('span', {
				className: `crew-timeline-parameter crew-timeline-parameter--${parameter}`
			}, `${prefix}${value}`));
		});
	}

	_setTimeline(day, cycle, silent = false) {
		this.player.day = day === null ? null : Math.min(500, Math.max(1, day));
		this.player.cycle = cycle === null ? null : Math.min(8, Math.max(1, cycle));
		this._updateDisplay();
		if (!silent) this.onChange?.();
	}

	_step(direction) {
		if (this.player.day === null && this.player.cycle === null) {
			if (direction > 0) this._setTimeline(1, 1);
			return;
		}
		if (direction < 0 && this.player.day === 1 && this.player.cycle === 1) {
			this._setTimeline(null, null);
			return;
		}

		let nextDay = this.player.day ?? 1;
		let nextCycle = this.player.cycle === null ? 1 : this.player.cycle + direction;
		if (nextCycle > 8) {
			nextDay += 1;
			nextCycle = 1;
		} else if (nextCycle < 1) {
			if (nextDay === 1) {
				nextCycle = 1;
			} else {
				nextDay -= 1;
				nextCycle = 8;
			}
		}

		this._setTimeline(nextDay, nextCycle);
	}

	_prompt() {
		const input = prompt('', this._format());
		if (input === null) return;

		const match = input.trim().match(/^\D*?(\d+|-)\s*-?\s*\D*?(\d+|-)$/i);
		if (!match) return;
		const first = match[1] === '-' ? null : parseInt(match[1], 10);
		const second = match[2] === '-' ? null : parseInt(match[2], 10);
		this._setTimeline(this.cycleFirst ? second : first, this.cycleFirst ? first : second);
	}
}

if (typeof window !== 'undefined') {
	window.CrewTimelineStepper = CrewTimelineStepper;
}
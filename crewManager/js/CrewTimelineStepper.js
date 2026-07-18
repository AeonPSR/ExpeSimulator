/**
 * CrewTimelineStepper Component
 *
 * Compact D/C cycle stepper used by Crew detail cards.
 */
class CrewTimelineStepper extends Component {
	constructor(options = {}) {
		super(options);
		this.player = options.player;
		this._display = null;
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-timeline-stepper' });
		const decrement = this.createElement('button', { className: 'crew-timeline-stepper-btn' }, '-');
		this._display = this.createElement('button', { className: 'crew-timeline-stepper-display' }, this._format());
		const increment = this.createElement('button', { className: 'crew-timeline-stepper-btn' }, '+');

		this.addEventListener(decrement, 'click', () => this._step(-1));
		this.addEventListener(this._display, 'click', () => this._prompt());
		this.addEventListener(increment, 'click', () => this._step(1));

		this.element.appendChild(decrement);
		this.element.appendChild(this._display);
		this.element.appendChild(increment);
		return this.element;
	}

	reset() {
		this._setTimeline(1, 1);
	}

	_format() {
		return `D${this.player.day}-C${this.player.cycle}`;
	}

	_updateDisplay() {
		if (this._display) {
			this._display.textContent = this._format();
		}
	}

	_setTimeline(day, cycle) {
		this.player.day = Math.max(1, day);
		this.player.cycle = Math.min(8, Math.max(1, cycle));
		this._updateDisplay();
	}

	_step(direction) {
		let nextDay = this.player.day;
		let nextCycle = this.player.cycle + direction;
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

		const match = input.trim().match(/^D?(\d+)\s*[- ]\s*C?(\d+)$/i);
		if (!match) return;
		this._setTimeline(parseInt(match[1], 10), parseInt(match[2], 10));
	}
}

if (typeof window !== 'undefined') {
	window.CrewTimelineStepper = CrewTimelineStepper;
}
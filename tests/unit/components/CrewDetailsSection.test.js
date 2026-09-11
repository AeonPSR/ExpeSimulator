const path = require('path');

require(path.resolve(__dirname, '../../../crewManager/js/CrewTimelineStepper.js'));
require(path.resolve(__dirname, '../../../crewManager/js/CrewDetailCardOrganizer.js'));
require(path.resolve(__dirname, '../../../crewManager/js/CrewDetailsSection.js'));

describe('CrewDetailsSection controls card', () => {
	beforeEach(() => {
		I18n.setLocale('en');
		CrewDetailsSection.prototype._observeNotesAvailability = jest.fn();
		window.CrewDetailCardActions = class {
			createHandlers() { return {}; }
		};
		window.CrewDetailCardFactory = {
			create: ({ filename }) => {
				const element = document.createElement('div');
				element.className = 'player-profile';
				element.dataset.filename = filename;
				return { card: {}, element };
			}
		};
		window.CrewDetailSkillAvailability = { update: jest.fn() };
	});

	test('keeps the controls card first and toggles its visibility', () => {
		const section = new CrewDetailsSection({
			notesService: { disconnect: jest.fn() },
			skillSelectionService: {}
		});
		const element = section.render();
		const activeCards = element.querySelector('.crew-details-subsection--active');
		const controlsCard = activeCards.querySelector('.crew-controls-card');

		expect(activeCards.firstElementChild).toBe(controlsCard);
		expect(controlsCard.hidden).toBe(true);
		expect(controlsCard.querySelector('.crew-apply-all-btn').disabled).toBe(true);

		section.setControlsVisible(true);
		expect(controlsCard.hidden).toBe(false);

		section.setControlsVisible(false);
		expect(controlsCard.hidden).toBe(true);
	});

	test('applies non-null timeline values to all and clears after confirmation', () => {
		const onPlayerChange = jest.fn();
		const section = new CrewDetailsSection({
			notesService: { disconnect: jest.fn() },
			skillSelectionService: {},
			onPlayerChange
		});
		const element = section.render();
		const controlsDisplay = element.querySelector('.crew-controls-card .crew-timeline-stepper-display');
		const applyButton = element.querySelector('.crew-apply-all-btn');
		const firstPlayer = Object.values(section._playerByFilename)[0];
		const firstDisplay = document.createElement('span');
		section._timelineStepperByFilename[firstPlayer.avatar] = {
			setTimeline: (day, cycle) => { firstDisplay.textContent = `D${day}-C${cycle}`; }
		};

		firstPlayer.day = 4;
		firstPlayer.cycle = 2;
		expect(controlsDisplay.textContent).toBe('C-D-');
		section._controlsTimelineStepper.setTimeline(null, 5);
		applyButton.click();

		expect(document.querySelector('.confirmation-modal')).not.toBeNull();
		document.querySelector('.confirmation-btn--confirm').click();

		expect(firstPlayer.day).toBe(4);
		expect(firstPlayer.cycle).toBe(5);
		expect(firstDisplay.textContent).toBe('D4-C5');
		expect(controlsDisplay.textContent).toBe('C-D-');
		expect(applyButton.disabled).toBe(true);
		expect(onPlayerChange).toHaveBeenCalledTimes(1);
	});

	test('accepts a partial timeline while preserving the other null value', () => {
		const section = new CrewDetailsSection({
			notesService: { disconnect: jest.fn() },
			skillSelectionService: {}
		});
		const element = section.render();
		const controlsDisplay = element.querySelector('.crew-controls-card .crew-timeline-stepper-display');
		window.prompt = jest.fn(() => 'C5-D-');

		controlsDisplay.click();

		expect(section._controlsTimeline).toEqual({ day: null, cycle: 5 });
		expect(controlsDisplay.textContent).toBe('C5-D-');
		expect(element.querySelector('.crew-timeline-stepper').dataset.cycleSet).toBe('true');
		expect(element.querySelector('.crew-timeline-stepper').dataset.daySet).toBe('false');
		expect(element.querySelector('.crew-apply-all-btn').disabled).toBe(false);
	});

	test('clears any timeline controller when decrementing day 1 cycle 1', () => {
		const player = { day: 1, cycle: 1 };
		const onChange = jest.fn();
		const stepper = new CrewTimelineStepper({ player, onChange });
		const element = stepper.render();

		element.querySelector('.crew-timeline-stepper-btn').click();

		expect(player).toEqual({ day: null, cycle: null });
		expect(element.querySelector('.crew-timeline-stepper-display').textContent).toBe('D-C-');
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});
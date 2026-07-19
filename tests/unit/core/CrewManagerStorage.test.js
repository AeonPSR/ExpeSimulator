/**
 * CrewManagerStorage Tests
 *
 * Covers persisted Crew Manager options and card state.
 */

describe('CrewManagerStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	test('loads default state when nothing is saved', () => {
		expect(CrewManagerStorage.load()).toEqual({
			version: 1,
			options: {
				expert: false,
				cycle: false
			},
			players: {}
		});
	});

	test('persists detail options and players independently', () => {
		CrewManagerStorage.saveOptions({ expert: true, cycle: true });
		CrewManagerStorage.savePlayers({
			'frieda.png': {
				avatar: 'frieda.png',
				abilities: ['human/pilot.png', 'human/survival.png', null, null],
				mushAbilities: [null, null, null, null, null],
				health: 7,
				morale: 9,
				visible: true,
				dead: false
			}
		});

		const state = CrewManagerStorage.load();

		expect(state.options).toEqual({ expert: true, cycle: true });
		expect(state.players['frieda.png'].health).toBe(7);
		expect(state.players['frieda.png'].abilities).toEqual(['human/pilot.png', 'human/survival.png', null, null]);
	});

	test('clearPlayers keeps detail options', () => {
		CrewManagerStorage.saveOptions({ expert: true });
		CrewManagerStorage.savePlayers({ 'frieda.png': { health: 7 } });

		CrewManagerStorage.clearPlayers();

		const state = CrewManagerStorage.load();
		expect(state.options.expert).toBe(true);
		expect(state.players).toEqual({});
	});
});

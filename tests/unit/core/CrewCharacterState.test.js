describe('CrewCharacterState', () => {
	test('starts and resets characters with 6 PMO', () => {
		const player = CrewCharacterState.create('chun.png', 0);
		expect(player.morale).toBe(6);

		player.morale = 1;
		CrewCharacterState.reset(player, 'chun.png');
		expect(player.morale).toBe(6);
	});
});
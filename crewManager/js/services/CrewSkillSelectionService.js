/**
 * CrewSkillSelectionService
 *
 * Ownership Crew Manager human and Mush skill selection modals.
 */
class CrewSkillSelectionService {
	openHumanSkillSelection(options = {}) {
		const { filename, player, slotIndex, cardInstance, onSelect } = options;
		const owned = [];
		const apprentron = [];
		const other = [];

		for (const skill of AbilityData.humanSkills) {
			const owners = SkillOwnershipData[skill];
			if (Array.isArray(owners) && owners.includes(filename)) {
				owned.push(skill);
			} else if (Array.isArray(owners) && owners.includes('apprentron')) {
				apprentron.push(skill);
			} else {
				other.push(skill);
			}
		}

		const toItems = (list) => AbilityData.getSelectionItems(getResourceURL, list);
		const ownedItems = toItems(owned);
		ownedItems.unshift({ id: null, image: '' });

		new SelectionModal({
			sections: [
				{ items: ownedItems, backgroundImage: getResourceURL(`pictures/characters/${filename}`) },
				{ items: toItems(apprentron), backgroundImage: getResourceURL('pictures/ui/apprentron.jpg') },
				{ items: toItems(other) }
			],
			selectedId: player.abilities[slotIndex],
			columns:    8,
			itemSize:   'large',
			className:  'ability-selection crew-skill-modal',
			panelElement: cardInstance?.element?.closest('.app-panel'),
			onSelect
		}).open();
	}

	openMushSkillSelection(options = {}) {
		const { player, slotIndex, cardInstance, onSelect } = options;
		const items = AbilityData.getSelectionItems(getResourceURL, AbilityData.mushSkills);
		items.unshift({ id: null, image: '' });

		new SelectionModal({
			items: items,
			selectedId: player.mushAbilities[slotIndex],
			columns: 5,
			itemSize: 'large',
			className: 'ability-selection item-selection crew-mush-skill-modal',
			panelElement: cardInstance?.element?.closest('.app-panel'),
			onSelect
		}).open();
	}
}

if (typeof window !== 'undefined') {
	window.CrewSkillSelectionService = CrewSkillSelectionService;
}
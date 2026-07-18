/**
 * CrewDetailSkillAvailability
 *
 * Applies skill-lock state to Crew detail card expert slots.
 */
class CrewDetailSkillAvailability {
	static update(cardElement, player) {
		if (!cardElement || !player) return;
		Object.entries(this._getRequirements()).forEach(([playerKey, skills]) => {
			const hasRequiredSkill = skills.some(skill => player.abilities.includes(skill));
			const slot = cardElement.querySelector(`[data-player-key="${playerKey}"]`);
			slot?.classList.toggle('skill-locked', !hasRequiredSkill);
		});
	}

	static _getRequirements() {
		return {
			paCore:    ['human/concepteur.png'],
			paComp:    ['human/informaticien.png', 'human/polymathe.png'],
			paFood:    ['human/cuistot.png', 'human/beta.png'],
			paGarden:  ['human/botanic.png', 'human/beta.png'],
			paHeal:    ['human/infirmier.png'],
			paPilgred: ['human/physicien.png'],
			paShoot:   ['human/gunman.png', 'human/beta.png'],
			paTech:    ['human/technician.png', 'human/beta.png'],
			paTorture: ['human/bourreau.png']
		};
	}
}

if (typeof window !== 'undefined') {
	window.CrewDetailSkillAvailability = CrewDetailSkillAvailability;
}
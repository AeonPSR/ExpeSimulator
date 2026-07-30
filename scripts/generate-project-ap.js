/**
 * generate-project-ap.js
 *
 * Injects (or refreshes) the AP-cost fields on every entry in
 * projectManager/js/data/ProjectData.js, computed from each project's
 * `efficiency`. Idempotent: strips any existing averageAP_* / nofAP_* /
 * priorityAP_* / nof_priorityAP_* / legacy `averageAP` lines first, then
 * re-inserts freshly computed values right before the `icon:` field.
 *
 * Relay model (kept in sync with the comment block at the top of ProjectData.js):
 * A project is worked by a relay of TWO players who alternate 50/50. Each
 * player rolls at their own efficiency, and completion accrues per roll:
 *   playerMin  = efficiency + priority + SKILL_BONUS * playerSkills
 *   playerMax  = floor(playerMin * MAX_MULTIPLIER)   (the game rounds DOWN)
 *   playerGain = (playerMin + playerMax) / 2  (average)  |  playerMax  (nof)
 *   relayGain  = (playerGainA + playerGainB) / 2
 *   AP         = ceil(100 / relayGain) * 2
 *
 * `playerSkills` is how many of the project's TWO bonus skills that player has
 * (0-2). Across the pair the total runs 0-4; it is split as evenly as possible
 * (see SPLIT). The 2-total bucket is treated as 1+1 (see project notes: the
 * 2+0 split is deliberately ignored — it only differs from 1+1 if SKILL_BONUS
 * stops being even, and we consider them identical).
 *
 * Usage:  node scripts/generate-project-ap.js
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'projectManager', 'js', 'data', 'ProjectData.js');

const SKILL_BONUS = 4;      // efficiency a relayer gains per matching skill
const MAX_MULTIPLIER = 1.5; // project max roll = floor(min * this)

// total matching skills across the pair → [playerA skills, playerB skills]
const SPLIT = {
	0: [0, 0],
	1: [1, 0],
	2: [1, 1],
	3: [2, 1],
	4: [2, 2],
};

// Expected AP for one relay pair to complete a project.
//   kind        : 'average' (mean roll) | 'nof' (max roll)
//   totalSkills : 0-4 matching skills across both players
//   priority    : 0 (normal) | 1 (prioritised project — applies to both players)
const simulate = (kind, totalSkills, efficiency, priority = 0) => {
	const playerGain = (skills) => {
		const min = efficiency + priority + SKILL_BONUS * skills;
		const max = Math.floor(min * MAX_MULTIPLIER);
		return kind === 'average' ? (min + max) / 2 : max;
	};
	const [skillsA, skillsB] = SPLIT[totalSkills];
	const relayGain = (playerGain(skillsA) + playerGain(skillsB)) / 2;
	return Math.ceil(100 / relayGain) * 2;
};

// field prefix → [gain kind, priority]
const VARIANTS = [
	['averageAP',      'average', 0],
	['nofAP',          'nof',     0],
	['priorityAP',     'average', 1],
	['nof_priorityAP', 'nof',     1],
];

// Which field families each project type carries:
//   neron    → everything
//   research → no "nof" variants, but keeps priority
//   pilgred  → averageAP only (no nof, no priority)
const FIELDS_BY_TYPE = {
	neron:    ['averageAP', 'nofAP', 'priorityAP', 'nof_priorityAP'],
	research: ['averageAP', 'priorityAP'],
	pilgred:  ['averageAP'],
};

const computeFields = (efficiency, type) => {
	const allowed = FIELDS_BY_TYPE[type] || FIELDS_BY_TYPE.neron;
	const fields = [];
	for (const [prefix, kind, priority] of VARIANTS) {
		if (!allowed.includes(prefix)) continue;
		for (let n = 0; n <= 4; n++) {
			fields.push([`${prefix}_${n}skill`, simulate(kind, n, efficiency, priority)]);
		}
	}
	return fields;
};

const AP_FIELD = /^\s*(?:average|nof|priority|nof_priority)AP(?:_\dskill)?\s*:/;

function main() {
	const lines = fs.readFileSync(DATA_FILE, 'utf8').split(/\r?\n/);
	const out = [];
	let currentEfficiency = null;
	let currentType = null;
	let injectedCount = 0;

	for (const line of lines) {
		// Drop any previously generated / legacy AP field lines.
		if (AP_FIELD.test(line)) continue;

		const typeMatch = line.match(/^\s*type\s*:\s*'([^']+)'/);
		if (typeMatch) currentType = typeMatch[1];

		const effMatch = line.match(/^\s*efficiency\s*:\s*(\d+)/);
		if (effMatch) currentEfficiency = Number(effMatch[1]);

		const iconMatch = line.match(/^(\s*)icon\s*:/);
		if (iconMatch && currentEfficiency !== null) {
			const indent = iconMatch[1];
			for (const [key, value] of computeFields(currentEfficiency, currentType)) {
				out.push(`${indent}${key}: ${value},`);
			}
			injectedCount++;
			currentEfficiency = null;
			currentType = null;
		}

		out.push(line);
	}

	fs.writeFileSync(DATA_FILE, out.join('\n'), 'utf8');
	console.log(`Injected AP fields into ${injectedCount} project entries.`);
}

main();

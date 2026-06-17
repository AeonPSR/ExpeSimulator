/**
 * ModifierApplicator
 *
 * Data-driven modifier engine. The MODIFIER_REGISTRY table describes every
 * modifier (ability, item, project) as a plain data entry. A single apply()
 * method walks the table, so adding a modifier is a one-line data change —
 * no new functions or files needed.
 *
 * Each registry entry:
 *   key    — identifier matched against loadout.abilities / .items / .projects
 *   kind   — 'ability' | 'item' | 'project'
 *   sector — optional; modifier only activates for this sector when set
 *   action — 'removeEvents' | 'removeByPrefix' | 'multiplyEvent'
 *   params — event key array (removeEvents) or prefix string (removeByPrefix)
 *   event  — event key (multiplyEvent only)
 *   factor — multiplier  (multiplyEvent only)
 */

const MODIFIER_REGISTRY = [
// ── Abilities ──────────────────────────────────────────────────────────
{ key: 'PILOT',              kind: 'ability', sector: 'LANDING',     action: 'removeEvents',   params: ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'] },
{ key: 'DIPLOMACY',          kind: 'ability',                        action: 'removeByPrefix', params: 'FIGHT_' },
{ key: 'TRACKER',            kind: 'ability', sector: 'LOST',        action: 'removeEvents',   params: ['KILL_LOST'] },
// ── Items ─────────────────────────────────────────────────────────────
{ key: 'WHITE_FLAG',         kind: 'item',    sector: 'INTELLIGENT', action: 'removeByPrefix', params: 'FIGHT_' },
{ key: 'QUAD_COMPASS',       kind: 'item',                           action: 'removeByPrefix', params: 'AGAIN' },
{ key: 'TRAD_MODULE',        kind: 'item',    sector: 'INTELLIGENT', action: 'multiplyEvent',  event: 'ARTEFACT', factor: 2 },
// ── Projects ──────────────────────────────────────────────────────────
{ key: 'ANTIGRAV_PROPELLER', kind: 'project', sector: 'LANDING',     action: 'removeEvents',   params: ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'] },
];

const ModifierApplicator = {

/**
 * Applies all active modifiers for the given loadout to a cloned sector config.
 *
 * @param {Object} sectorConfig - Original sector config from SectorData
 * @param {string} sectorName   - Current sector name (e.g. 'LANDING', 'INTELLIGENT')
 * @param {Object} loadout      - { abilities: [], items: [], projects: [] }
 * @returns {Object} Modified sector config (original unchanged)
 */
apply(sectorConfig, sectorName, loadout) {
const config = EventModifier.cloneSectorConfig(sectorConfig);
const events = config.explorationEvents;

const active = new Set([
...(loadout.abilities || []).map(k => `ability:${k}`),
...(loadout.items     || []).map(k => `item:${k}`),
...(loadout.projects  || []).map(k => `project:${k}`),
]);

for (const entry of MODIFIER_REGISTRY) {
if (!active.has(`${entry.kind}:${entry.key}`)) continue;
if (entry.sector && entry.sector !== sectorName) continue;

switch (entry.action) {
case 'removeEvents':
EventModifier.removeEvents(events, entry.params);
break;
case 'removeByPrefix':
EventModifier.removeEventsByPrefix(events, entry.params);
break;
case 'multiplyEvent':
if (events[entry.event] !== undefined) {
events[entry.event] *= entry.factor;
}
break;
}
}

return config;
},
};

// Export for use in other modules
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ModifierApplicator = ModifierApplicator;
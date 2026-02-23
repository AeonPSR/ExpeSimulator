# Web Worker Implementation Plan

## Problem

When loading large planets (e.g., "Vie Heureuse" with 18 sectors), `_calculateExpeditionResults()` runs on the main thread and blocks the UI for several seconds. Even after batching and pruning optimizations, a single recalculation still processes hundreds of compositions × ~15 convolution rounds each — enough to cause a visible freeze.

## Solution

Move the entire calculation pipeline to a **Web Worker** (a background thread). The UI thread stays responsive at all times and shows a loading indicator while results are computed in the background.

## Architecture Overview

```
Main Thread (UI)                          Worker Thread (calculation)
──────────────────────                    ──────────────────────────────
User clicks sector / loads world
  → _scheduleUpdate()
  → show loading spinner
  → worker.postMessage({                  onmessage(event):
      type: 'calculate',        ──→         extract sectors, players, loadout...
      requestId: 42,                        run runCalculation()
      sectors, players, loadout,            postMessage({
      exploredCount, ...                      type: 'result',
    })                                        requestId: 42,
                                              results: { ... }
                                  ←─        })
  ← onmessage(event):
     if requestId matches latest:
       hide spinner
       _updateProbabilityDisplay(results)
       _updateResultsDisplay(results)
     else:
       discard (stale result)
```

## Files Involved

### New Files

| File | Purpose |
|---|---|
| `js/workers/calculation-worker.js` | The Web Worker entry point. Loads all calculation modules via `importScripts()`, listens for messages, runs the calculation, posts results back. |

### Modified Files

| File | Change |
|---|---|
| `js/app.js` | Replace synchronous `_calculateExpeditionResults()` with async worker communication. Add loading spinner logic. Add request cancellation (stale request ID). |
| `manifest.json` | Add `js/workers/calculation-worker.js` to `web_accessible_resources` so the content script can spawn it. |
| `config.js` | Add `self` fallback alongside `window` in the export block. |
| `js/utils/constants.js` | Add `self` fallback alongside `window` in the export block. |
| `js/utils/helpers.js` | Add `self` fallback (only for `filenameToId` — the only helper used by calculation code). |
| `js/utils/EventClassifier.js` | Add `self` fallback alongside `window` in the export block. |
| `js/data/SectorData.js` | Add `self` fallback alongside `window` in the export block. |
| `js/data/AbilityData.js` | Add `self` fallback alongside `window` in the export block. |
| `js/data/ItemData.js` | Add `self` fallback alongside `window` in the export block. |
| `js/probability/*.js` (16 files) | Add `self` fallback alongside `window` in the export block. |
| `js/services/OxygenService.js` | Add `self` fallback alongside `window` in the export block. |
| `js/services/LoadoutBuilder.js` | Add `self` fallback alongside `window` in the export block. |
| `js/services/DamageSpreader.js` | Add `self` fallback alongside `window` in the export block. |

### Unchanged Files

UI components (`Panel.js`, `SectorGrid.js`, `ProbabilityDisplay.js`, etc.) — these stay on the main thread and are not loaded in the worker.

## Implementation Steps

### Step 1 — Update module exports for Worker compatibility

Every module used by the calculation pipeline currently exports like:

```js
if (typeof window !== 'undefined') {
    window.ModuleName = ModuleName;
}
```

Change each to:

```js
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ModuleName = ModuleName;
```

This lets the same file work in both the browser main thread (`window`) and a Web Worker (`self`).

**Files to update (26 total):**
- `config.js` — exports `PlanetSectorConfigData`, `AbilityEffects`, `BaseEffects`, `ItemEffects`, `ProjectEffects`
- `js/utils/constants.js` — exports `Constants`
- `js/utils/helpers.js` — exports `filenameToId` (and others)
- `js/utils/EventClassifier.js` — exports `EventClassifier`
- `js/data/SectorData.js` — exports `SectorData`
- `js/data/AbilityData.js` — exports `AbilityData`
- `js/data/ItemData.js` — exports `ItemData`
- `js/services/OxygenService.js` — exports `OxygenService`
- `js/services/LoadoutBuilder.js` — exports `LoadoutBuilder`
- `js/services/DamageSpreader.js` — exports `DamageSpreader`
- `js/probability/DistributionCalculator.js`
- `js/probability/EventModifier.js`
- `js/probability/AbilityModifiers.js`
- `js/probability/ItemModifiers.js`
- `js/probability/ProjectModifiers.js`
- `js/probability/ModifierApplicator.js`
- `js/probability/SectorSampler.js`
- `js/probability/EventWeightCalculator.js`
- `js/probability/DamageComparator.js`
- `js/probability/ResourceCalculator.js`
- `js/probability/NegativeEventCalculator.js`
- `js/probability/OccurrenceCalculator.js`
- `js/probability/DamagePathSampler.js`
- `js/probability/DamageDistributionEngine.js`
- `js/probability/FightCalculator.js`
- `js/probability/EventDamageCalculator.js`

### Step 2 — Create the Worker file

Create `js/workers/calculation-worker.js`:

```js
// Dependencies are loaded on first 'calculate' message.
// The main thread passes the extension base URL so we can build absolute paths.
let _initialized = false;

function _loadDependencies(baseURL) {
    if (_initialized) return;
    try {
        importScripts(
            baseURL + 'config.js',
            baseURL + 'js/utils/constants.js',
            baseURL + 'js/utils/helpers.js',
            baseURL + 'js/utils/EventClassifier.js',
            baseURL + 'js/data/SectorData.js',
            baseURL + 'js/data/AbilityData.js',
            baseURL + 'js/data/ItemData.js',
            baseURL + 'js/services/OxygenService.js',
            baseURL + 'js/services/LoadoutBuilder.js',
            baseURL + 'js/services/DamageSpreader.js',
            baseURL + 'js/probability/DistributionCalculator.js',
            baseURL + 'js/probability/EventModifier.js',
            baseURL + 'js/probability/AbilityModifiers.js',
            baseURL + 'js/probability/ItemModifiers.js',
            baseURL + 'js/probability/ProjectModifiers.js',
            baseURL + 'js/probability/ModifierApplicator.js',
            baseURL + 'js/probability/SectorSampler.js',
            baseURL + 'js/probability/EventWeightCalculator.js',
            baseURL + 'js/probability/DamageComparator.js',
            baseURL + 'js/probability/ResourceCalculator.js',
            baseURL + 'js/probability/NegativeEventCalculator.js',
            baseURL + 'js/probability/OccurrenceCalculator.js',
            baseURL + 'js/probability/DamagePathSampler.js',
            baseURL + 'js/probability/DamageDistributionEngine.js',
            baseURL + 'js/probability/FightCalculator.js',
            baseURL + 'js/probability/EventDamageCalculator.js'
        );
        _initialized = true;
    } catch (error) {
        self.postMessage({ type: 'error', requestId: -1, error: 'Failed to load dependencies: ' + error.message });
        throw error;
    }
}

// Listen for calculation requests
self.onmessage = function(event) {
    const { type, requestId, baseURL, ...params } = event.data;

    if (type === 'calculate') {
        try {
            _loadDependencies(baseURL);
            const results = runCalculation(params);
            self.postMessage({ type: 'result', requestId, results });
        } catch (error) {
            self.postMessage({ type: 'error', requestId, error: error.message });
        }
    }
};

/**
 * Pure calculation logic extracted from app.js _calculateExpeditionResults().
 * No DOM access needed — all dependencies are loaded via importScripts.
 *
 * Steps performed:
 * 1. Filter players to those who can participate (OxygenService.getParticipatingPlayers)
 * 2. Build loadout from participating players (LoadoutBuilder.build)
 * 3. Build sector counts map, separating special sectors (LANDING, LOST) into alwaysInclude
 * 4. Branch: if exploredCount < totalExplorableSectors, use sampling
 *    (EventWeightCalculator.calculateWithSampling), else use full calculation
 *    (EventWeightCalculator.calculate)
 * 5. Distribute damage to players via DamageSpreader.distributeAllScenarios
 * 6. For each scenario (pessimist, average, optimist, worstCase):
 *    a. Apply Survival reduction (DamageSpreader.applySurvivalReduction)
 *    b. Apply Armor reduction (DamageSpreader.applyArmorReduction)
 *    c. Track reduction effects per player (compare before/after damage)
 *    d. Calculate final health (DamageSpreader.calculateFinalHealth)
 * 7. Attach participationStatus (OxygenService.getParticipationStatus)
 * 8. Return the complete results object
 */
function runCalculation({ sectors, allPlayers, antigravActive, exploredCount }) {
    if (sectors.length === 0) return null;

    const participatingPlayers = OxygenService.getParticipatingPlayers(allPlayers, sectors);

    const loadout = LoadoutBuilder.build(participatingPlayers, { antigravActive });

    // Build sector counts map (excluding special sectors like LANDING)
    const sectorCounts = {};
    const alwaysInclude = [];
    for (const sector of sectors) {
        if (SectorData.isSpecialSector(sector)) {
            alwaysInclude.push(sector);
        } else {
            sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        }
    }

    const totalExplorableSectors = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

    let results;
    if (exploredCount < totalExplorableSectors) {
        results = EventWeightCalculator.calculateWithSampling(
            sectorCounts, exploredCount, loadout, participatingPlayers, { alwaysInclude }
        );
    } else {
        results = EventWeightCalculator.calculate(sectors, loadout, participatingPlayers);
    }

    // Damage distribution & health calculation
    if (participatingPlayers.length > 0 && results) {
        const fightInstances = results.combat?.damageInstances || {};
        const eventInstances = results.eventDamage?.damageInstances || {};

        const damageByScenario = DamageSpreader.distributeAllScenarios(
            fightInstances, eventInstances, participatingPlayers
        );

        const scenarios = Constants.SCENARIO_KEYS;
        const finalHealth = {};
        const effectsByScenario = {};

        for (const scenario of scenarios) {
            const scenarioResult = damageByScenario[scenario];
            const playerEffects = scenarioResult.appliedEffects.map(arr => [...arr]);

            const reductionSteps = [
                {
                    apply: (players, breakdown) => DamageSpreader.applySurvivalReduction(players, breakdown),
                    hasEffect: player => player.abilities?.some(a => a && filenameToId(a) === 'SURVIVAL'),
                    effectType: 'SURVIVAL'
                },
                {
                    apply: (players, breakdown) => DamageSpreader.applyArmorReduction(players, breakdown),
                    hasEffect: player => player.items?.some(item => item && filenameToId(item) === 'PLASTENITE_ARMOR'),
                    effectType: 'PLASTENITE_ARMOR'
                }
            ];

            let modifiedBreakdown = scenarioResult.breakdown;
            for (const step of reductionSteps) {
                const beforeBreakdown = modifiedBreakdown;
                modifiedBreakdown = step.apply(participatingPlayers, beforeBreakdown);
                for (let i = 0; i < participatingPlayers.length; i++) {
                    if (step.hasEffect(participatingPlayers[i])) {
                        const beforeDamage = beforeBreakdown[i]?.reduce((sum, inst) => sum + inst.damage, 0) || 0;
                        const afterDamage = modifiedBreakdown[i]?.reduce((sum, inst) => sum + inst.damage, 0) || 0;
                        const damageReduced = beforeDamage - afterDamage;
                        if (damageReduced > 0) {
                            playerEffects[i].push({ type: step.effectType, reductions: damageReduced });
                        }
                    }
                }
            }

            const damagePerPlayer = modifiedBreakdown.map(breakdown =>
                breakdown.reduce((sum, inst) => sum + inst.damage, 0)
            );

            finalHealth[scenario] = DamageSpreader.calculateFinalHealth(participatingPlayers, damagePerPlayer);
            effectsByScenario[scenario] = playerEffects;
        }

        results.healthByScenario = finalHealth;
        results.effectsByScenario = effectsByScenario;
    }

    results.participationStatus = OxygenService.getParticipationStatus(allPlayers, sectors);
    return results;
}
```

### Step 3 — Register the Worker in manifest.json

Add to `web_accessible_resources`:

```json
{
    "resources": [
        "js/workers/calculation-worker.js",
        "config.js",
        "js/utils/*.js",
        "js/data/*.js",
        "js/services/*.js",
        "js/probability/*.js"
    ],
    "matches": ["<all_urls>"]
}
```

The worker and all scripts it `importScripts()` must be web-accessible.

### Step 4 — Modify app.js to use the Worker

Key changes to `ExpeditionSimulatorApp`:

```js
constructor() {
    // ... existing setup ...
    this._worker = null;
    this._requestId = 0;
    this._baseURL = '';  // extension base URL for worker importScripts
}

_init() {
    // ... existing _init() setup (Panel, sections, chatDetector) ...

    // Initialize worker AFTER helpers.js is loaded (getResourceURL available)
    this._initWorker();
}

_initWorker() {
    if (typeof Worker === 'undefined') {
        // Fallback: no Worker support, keep synchronous calculation
        console.warn('[Worker] Web Workers not available, using synchronous fallback');
        this._worker = null;
        return;
    }

    const workerURL = getResourceURL('js/workers/calculation-worker.js');
    this._baseURL = getResourceURL('');  // e.g. "chrome-extension://<id>/"
    this._worker = new Worker(workerURL);
    this._worker.onmessage = (event) => this._onWorkerMessage(event);
    this._worker.onerror = (error) => this._onWorkerError(error);
}

_updateDisplays() {
    this._sectorGrid?.updateSectorAvailability?.();
    this._updateExploredSectors();
    this._updateFightingPower();
    this._requestCalculation();  // async — replaces synchronous call
}

_requestCalculation() {
    const sectors = this._state.getSectors();
    if (sectors.length === 0) {
        this._updateProbabilityDisplay(null);
        this._updateResultsDisplay(null);
        return;
    }

    // Cancel any in-flight request by incrementing ID
    this._requestId++;
    const requestId = this._requestId;

    // Show loading state
    this._probabilityDisplay.showLoading();

    // If no worker available, fall back to synchronous calculation
    if (!this._worker) {
        const results = this._calculateExpeditionResults();
        this._updateProbabilityDisplay(results);
        this._updateResultsDisplay(results);
        return;
    }

    // Send calculation to worker (include baseURL for importScripts resolution)
    this._worker.postMessage({
        type: 'calculate',
        requestId,
        baseURL: this._baseURL,
        sectors,
        allPlayers: this._state.getPlayers(),
        antigravActive: this._state.isAntigravActive(),
        exploredCount: this._playerSection?.getExploredSectors?.() || 9
    });
}

_onWorkerMessage(event) {
    const { type, requestId, results, error } = event.data;

    // Ignore stale results
    if (requestId !== this._requestId) return;

    if (type === 'result') {
        this._updateProbabilityDisplay(results);
        this._updateResultsDisplay(results);
    } else if (type === 'error') {
        console.error('[Worker]', error);
        this._probabilityDisplay.showError();
    }
}

_onWorkerError(error) {
    console.error('[Worker] Unhandled error:', error.message);
    // Fall back to synchronous calculation if the worker crashes
    this._worker = null;
    this._requestCalculation();
}
```

### Step 5 — Add loading indicator to ProbabilityDisplay

Add two methods to `ProbabilityDisplay`:

```js
showLoading() {
    if (this._contentElement) {
        this._contentElement.innerHTML = '<div class="loading-spinner">Calculating...</div>';
    }
}

showError() {
    if (this._contentElement) {
        this._contentElement.innerHTML = '<div class="error">Calculation error</div>';
    }
}
```

## Data Flow

All data passed to the worker must be **serializable** (plain objects, arrays, strings, numbers). This is already the case:

| Input | Type | Serializable? |
|---|---|---|
| `sectors` | `string[]` | Yes |
| `allPlayers` | `Array<{id, avatar, abilities, items, health}>` | Yes |
| `antigravActive` | `boolean` | Yes |
| `exploredCount` | `number` | Yes |

| Output | Type | Serializable? |
|---|---|---|
| `results` | `{resources, combat, eventDamage, negativeEvents, healthByScenario, ...}` | Yes — all plain objects/arrays/numbers |

No DOM elements, functions, or circular references cross the boundary.

## Request Cancellation

When the user clicks rapidly (add sector, remove sector, change loadout), each action sends a new message with an incremented `requestId`. When a result arrives:
- If `requestId` matches the latest → apply results
- If `requestId` is stale → discard silently

The worker will still finish computing the stale request (workers don't support mid-computation cancellation), but the result is simply ignored. This is acceptable because:
- The worker only ever processes one request at a time (single-threaded)
- The next request queues in the worker's message queue and starts after the current one finishes
- The UI remains responsive throughout

## Testing Considerations

- Unit tests run in Node.js (via Jest with jsdom) where `Worker` doesn't exist. The calculation logic extracted into the worker should remain testable independently.
- Tests work because jsdom provides a `window` global: each file is `require()`d by `tests/setup.js`, runs its code, and attaches exports to `window`. The `_global` pattern still resolves to `window` in jsdom, so no test infrastructure changes are needed.
- The synchronous fallback in `app.js` (when `Worker` is unavailable) ensures the same calculation path runs in environments without Worker support.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `importScripts` path resolution fails | Medium | Main thread passes extension `baseURL` (from `getResourceURL('')`) to the worker; all `importScripts` paths are absolute (`baseURL + 'config.js'`, etc.) |
| Serialization overhead for large results | Low | Results are modest-sized JSON (~10KB). Serialization is <1ms |
| Worker crashes on exception | Low | Wrap calculation in try/catch, send error message back |
| Browser doesn't support Workers | Very Low | All modern browsers support Workers. Add sync fallback just in case |

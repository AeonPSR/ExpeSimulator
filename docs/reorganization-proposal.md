# ExpeSimulator — Reorganization Proposal

> Audit of separation-of-concerns violations and redundancy, with a concrete proposal for a cleaner structure.
>
> Reference: [architecture.md](../architecture.md) — the codebase already declares a strict frontend/backend split. This document lists where reality drifts from that contract, and how to bring it back in line.

---

## 1. TL;DR — What's wrong today

| Symptom | Severity | Where |
|---|---|---|
| HTML strings built inside the orchestrator (`app.js`) | **High** | [js/app.js](../js/app.js) `_renderExpeditionResults`, `_renderHealthValue`, `_renderEffectIcons`, `_getHealthClass` |
| Pure math (CRC32) embedded in a UI component | Medium | [js/components/PlanetaryReview.js](../js/components/PlanetaryReview.js) |
| Display-formatting logic mixed into render code | Medium | [js/components/ProbabilityDisplay.js](../js/components/ProbabilityDisplay.js) `_buildDamageScenarioRows`, `_formatResourceValue`, `_formatProb` |
| `js/services/` mixes pure calculation, data transformation, and DOM/IO | **High** | [js/services/](../js/services/) (see §3.2) |
| Three near-identical modifier files dispatched by a hard-coded map | Medium | [AbilityModifiers.js](../js/probability/AbilityModifiers.js), [ItemModifiers.js](../js/probability/ItemModifiers.js), [ProjectModifiers.js](../js/probability/ProjectModifiers.js), [ModifierApplicator.js](../js/probability/ModifierApplicator.js) |
| `FightCalculator` and `EventDamageCalculator` repeat the same wrapper around `DamageDistributionEngine` | Low–Medium | [FightCalculator.js](../js/probability/FightCalculator.js), [EventDamageCalculator.js](../js/probability/EventDamageCalculator.js), [DamageDistributionEngine.js](../js/probability/DamageDistributionEngine.js) |
| Misleading name: `EventWeightCalculator` is actually the expedition pipeline | Medium | [js/probability/EventWeightCalculator.js](../js/probability/EventWeightCalculator.js) |
| 50+ scripts in a hand-ordered `content_scripts` list | **High** | [manifest.json](../manifest.json) |
| Mixed module patterns (class / static object / `window.X = …`) | Low | Across the repo |

---

## 2. Separation-of-concerns violations (in detail)

### 2.1 `app.js` builds HTML
[js/app.js](../js/app.js) is the orchestrator. According to [architecture.md](../architecture.md) it should only pass plain JS data between frontend components and the backend. Today it directly builds:

- `_renderExpeditionResults()` — full `<div>` blocks for results
- `_renderHealthValue()` — `<img>` markup
- `_renderEffectIcons()` — icon HTML
- `_getHealthClass()` — CSS-class logic keyed on health bands

**Why it matters:** any UI change forces edits to the controller; the controller is impossible to unit-test without jsdom; the rule "components own HTML" is silently broken.

**Fix:** move all of this into a dedicated `ResultsRenderer` (or extend [ResultsDisplay.js](../js/components/ResultsDisplay.js)). `app.js` should hand it a `{ results, players }` object and receive an element/HTML in return.

### 2.2 Math inside UI components
- [PlanetaryReview.js](../js/components/PlanetaryReview.js) defines a static `_crc32()` used to pick a planet image. CRC32 is a generic hash — it belongs in `js/utils/`.
- [ProbabilityDisplay.js](../js/components/ProbabilityDisplay.js): `_buildDamageScenarioRows` collapses identical damage rows, `_formatResourceValue` / `_formatProb` are numeric formatters. None of this is rendering — it's data shaping.

**Fix:** extract `js/utils/Hash.js` and `js/utils/Format.js` (or extend [helpers.js](../js/utils/helpers.js)). Components stay dumb.

### 2.3 Components doing state management
Inconsistent contract across [js/components/](../js/components/):
- Pure UI: `PlayerCard`, `SectorGrid`, `ToggleButton`
- UI + local state: `Panel`, `TabContainer`, `PlayerSection` (tracks explored sectors, fighting power)
- UI + transformation: `ProbabilityDisplay`
- UI + cached internals: `StarRating` (`_lastAxes`)

**Fix:** all per-expedition state belongs in [ExpeditionState.js](../js/core/ExpeditionState.js). Components subscribe to it and render. Local state should be limited to ephemeral UI state (modal open, hover, etc.).

### 2.4 Backend leaking out / Services doing too much
[js/services/](../js/services/) currently mixes three different responsibilities:

| File | Real responsibility | Belongs in |
|---|---|---|
| [FightingPowerService.js](../js/services/FightingPowerService.js) | Pure math from a player loadout | `js/probability/` (or new `js/domain/`) |
| [LoadoutBuilder.js](../js/services/LoadoutBuilder.js) | Pure data assembly | `js/domain/` |
| [OxygenService.js](../js/services/OxygenService.js) | Pure math | `js/domain/` |
| [DamageSpreader.js](../js/services/DamageSpreader.js) | Pure math (damage allocation across players) | `js/probability/` |
| [PlanetExporter.js](../js/services/PlanetExporter.js) | Formatting **+** clipboard I/O (mixed) | Split: formatting → domain; clipboard → `js/io/` |
| [ChatMessageDetector.js](../js/services/ChatMessageDetector.js) | MutationObserver **+** regex parsing **+** button injection (3 jobs) | Split: parser → `js/domain/`; observer & injector → `js/io/` |
| [PlanetCardInjector.js](../js/services/PlanetCardInjector.js) | DOM injection into the host page | `js/io/` |

**Why it matters:** today "service" means nothing — it could be a pure function or a DOM mutator. Tests can't load `js/services/*` without a `document`.

### 2.5 Hidden cross-layer coupling
- Backend modules read globals injected by `manifest.json` order (e.g., `EventWeightCalculator`, `OccurrenceCalculator`) instead of receiving dependencies. This is the "implicit global container" anti-pattern.
- Every module ends with `window.X = X` (or `self.X`). This means the layer separation is a comment, not a guarantee — anything can reach anything.

---

## 3. Redundancy & duplication

### 3.1 Three modifier files + a dispatch map
[AbilityModifiers.js](../js/probability/AbilityModifiers.js), [ItemModifiers.js](../js/probability/ItemModifiers.js), and [ProjectModifiers.js](../js/probability/ProjectModifiers.js) each export the same shape — an object of `applyXxx(events, sectorName)` methods, each of which is typically one or two calls into [EventModifier.js](../js/probability/EventModifier.js). [ModifierApplicator.js](../js/probability/ModifierApplicator.js) hard-codes the routing.

Example (same intent, two files):
```js
// AbilityModifiers.js
applyDiplomacy(events) { return EventModifier.removeEventsByPrefix(events, 'FIGHT_'); }

// ItemModifiers.js
applyWhiteFlag(events, sectorName) {
  if (sectorName !== 'INTELLIGENT') return events;
  return EventModifier.removeEventsByPrefix(events, 'FIGHT_');
}
```

**Fix:** replace the three files + dispatcher with a single declarative table:
```js
// js/probability/modifiers/registry.js
const MODIFIERS = {
  PILOT:        { kind: 'ability', remove: ['FIGHT_'] },
  DIPLOMACY:    { kind: 'ability', remove: ['FIGHT_'] },
  WHITE_FLAG:   { kind: 'item',    sector: 'INTELLIGENT', remove: ['FIGHT_'] },
  // …
};
```
A single `ModifierApplicator.apply(events, sectorName, loadout)` walks the registry. Adding a modifier becomes a one-line data change.

### 3.2 Duplicated wrapper around `DamageDistributionEngine`

> **Scope note:** the damage subsystem legitimately spans six files ([FightCalculator](../js/probability/FightCalculator.js), [EventDamageCalculator](../js/probability/EventDamageCalculator.js), [DamageDistributionEngine](../js/probability/DamageDistributionEngine.js), [DamagePathSampler](../js/probability/DamagePathSampler.js), [DamageComparator](../js/probability/DamageComparator.js), [DamageSpreader](../js/services/DamageSpreader.js)) — they are six distinct concerns (fight rules, non-fight event rules, convolution aggregator, Monte-Carlo alternative, diagnostics, per-player allocation) and the split is correct. The redundancy is narrower than "six files for damage".

The actual duplication is between **two** files: `FightCalculator.calculate()` and `EventDamageCalculator.calculate()` follow an identical 4-step pattern:

1. `OccurrenceCalculator.calculateForType(...)`
2. Build a `getSectorDamageDist` callback
3. `DamageDistributionEngine.calculate(...)`
4. Shape into a result object

Only step 2 differs between them.

**Fix:** extract one `DamagePipeline.run({ type, getSectorDamageDist, … })` helper. `FightCalculator` and `EventDamageCalculator` become thin adapters that only supply the type-specific callback. The other four files stay as they are.

Optional follow-up (nice-to-have, not a violation): give `DamageDistributionEngine` and `DamagePathSampler` a shared `computeDistribution(sectors)` interface so the pipeline can swap strategies cleanly.

### 3.3 Same convolution pattern in three files
[ResourceCalculator](../js/probability/ResourceCalculator.js), `FightCalculator`, and `EventDamageCalculator` all do: per-sector distribution → convolve → extract percentiles → emit result struct. Promote to a single helper in [DistributionCalculator.js](../js/probability/DistributionCalculator.js) (e.g., `runConvolution(sectorDists, scenarioSpec)`).

### 3.4 Repeated `EventWeightCalculator.getSectorProbabilities` calls
Called independently from `FightCalculator`, `EventDamageCalculator`, `ResourceCalculator`, `DamageDistributionEngine`. Should be computed **once** by the pipeline (see §4) and passed as a parameter.

### 3.5 Duplicated `window`/`self` glue
Every backend file ends with a near-identical block:
```js
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.X = X;
```
Either pick ES modules (preferred, see §5) or extract one `js/core/registerGlobal.js` and call it once per file.

---

## 4. Naming & boundary cleanup

| Current | Problem | Proposed |
|---|---|---|
| `EventWeightCalculator` | Orchestrates the whole expedition pipeline | `ExpeditionPipeline` |
| `OccurrenceCalculator` | Vague; produces typed event occurrences | `EventOccurrenceCalculator` |
| `damage/` files live next to unrelated calculators | Organisation only | group under `js/probability/damage/` (no merging — each file keeps its concern) |
| `js/services/` | Means "anything not a component" | Split into `js/domain/` (pure) and `js/io/` (DOM/clipboard) |
| `Modifier{Ability,Item,Project}` | Three files of identical shape | Single `modifiers/registry.js` + `ModifierApplicator` |

---

## 5. Proposed target structure

```
js/
├── content.js                  # Chrome entry — wires everything, no logic
├── app.js                      # Orchestrator — receives input, calls pipeline, hands results to renderer
│
├── core/                       # Framework primitives only
│   ├── Component.js
│   ├── ExpeditionState.js
│   └── EventBus.js             # (new) replace ad-hoc cross-component calls
│
├── data/                       # Static game data (unchanged)
│
├── domain/                     # NEW — pure, side-effect-free game rules
│   ├── LoadoutBuilder.js       # moved from services/
│   ├── FightingPower.js        # moved from services/
│   ├── Oxygen.js               # moved from services/
│   ├── PlanetSummary.js        # formatting half of PlanetExporter
│   └── ChatMessageParser.js    # parsing half of ChatMessageDetector
│
├── probability/                # Pure math, no DOM, no globals
│   ├── ExpeditionPipeline.js   # renamed from EventWeightCalculator
│   ├── DistributionCalculator.js
│   ├── SectorSampler.js
│   ├── EventOccurrenceCalculator.js
│   ├── PlanetReviewScorer.js
│   ├── damage/                 # consolidated damage subsystem
│   │   ├── DamagePipeline.js   # new shared driver
│   │   ├── DamageDistribution.js
│   │   ├── DamagePathSampler.js
│   │   ├── DamageComparator.js
│   │   └── DamageSpreader.js   # moved from services/
│   ├── calculators/            # thin adapters over DamagePipeline
│   │   ├── FightCalculator.js
│   │   ├── EventDamageCalculator.js
│   │   ├── NegativeEventCalculator.js
│   │   └── ResourceCalculator.js
│   └── modifiers/
│       ├── registry.js         # data-driven config (replaces 3 files)
│       ├── EventModifier.js
│       └── ModifierApplicator.js
│
├── io/                         # NEW — anything that touches DOM/clipboard/host page
│   ├── PlanetCardInjector.js   # moved from services/
│   ├── ChatObserver.js         # observer half of ChatMessageDetector
│   ├── ChatButtonInjector.js   # injection half of ChatMessageDetector
│   └── Clipboard.js            # I/O half of PlanetExporter
│
├── components/                 # FRONTEND — render-only, no math, no DOM outside their root
│   ├── ResultsRenderer.js      # NEW — owns markup currently in app.js
│   ├── shared/
│   └── …existing…
│
├── utils/                      # Pure helpers, no domain knowledge
│   ├── helpers.js
│   ├── Format.js               # NEW — formatters extracted from ProbabilityDisplay
│   ├── Hash.js                 # NEW — CRC32 extracted from PlanetaryReview
│   ├── EventClassifier.js
│   ├── ValidationUtils.js
│   └── I18n.js
│
└── workers/
    └── calculation-worker.js   # loads only `probability/` + `domain/` + `data/`
```

### Dependency rules (enforceable)

```
utils  ──► (nothing)
data   ──► utils
domain ──► data, utils
probability ──► domain, data, utils
components  ──► core, utils, (data for labels only)
io          ──► utils
app.js / content.js ──► everything
```

No arrow goes **upward**. In particular: `probability/` and `domain/` must never reference `components/`, `io/`, `app.js`, `window`, or `document`. This is the single rule that makes the worker reusable and the backend testable.

---

## 6. Build & load order — fix the manifest

[manifest.json](../manifest.json) currently lists ~50 scripts in a fragile manual order. This is the single biggest source of future breakage.

**Two reasonable paths:**

### Option A — ES modules (preferred)
Convert each file to `export`/`import`. The manifest then loads a single entry point as a module:
```json
"content_scripts": [{
  "matches": ["https://emush.eternaltwin.org/game*"],
  "js": ["dist/content.js"],
  "type": "module"
}]
```
Use esbuild/rollup (zero-config bundle) → predictable load order, tree-shaking, real unit tests with `import` instead of `<script>` tags in jsdom.

### Option B — keep concatenation, formalize the order
If a bundler is off the table, introduce `build-manifest.js` that walks the dependency graph (from explicit `// @requires X` headers) and rewrites `manifest.json`. Tests load the same generated list.

Either way: stop hand-editing the 50-line array.

---

## 7. Testing implications

Once the rules above hold:
- `js/probability/` and `js/domain/` become **node-testable** (no jsdom needed) — current tests in [tests/unit/calculators/](../tests/unit/calculators/) get faster and simpler.
- `js/io/` is the only layer that requires jsdom.
- `js/components/` tests render against jsdom but never instantiate calculators directly — they receive fixture data.
- The existing [tests/integration/expedition-pipeline.test.js](../tests/integration/expedition-pipeline.test.js) becomes the contract test for `ExpeditionPipeline`.

---

## 8. Prerequisite: prepare the safety net first

**No refactor step in §9 starts until the safety net below is in place.** A file-level test inventory looks complete (all 17 [js/probability/](../js/probability/) files have a `.test.js` next to them), but that measures structure, not behaviour. Real-world example: the fight-damage → disease coupling wired between [FightCalculator.js](../js/probability/FightCalculator.js) (`_computeDiseaseFromFights`) and [EventWeightCalculator.js](../js/probability/EventWeightCalculator.js) (where `combat.diseaseFromFights` is folded into `negativeEvents.disease`) is exercised by **zero** tests, even though both files individually have full test files. Cross-module rules slip through the per-module test pattern.

Before any rename or restructure:

### 8.1 Rule-coverage checklist
Produce [docs/rule-coverage.md](rule-coverage.md) — a flat list of every cross-module game rule the engine implements (modifier effects, mutual-exclusivity rules, loadout interactions, derived contributions like fight→disease, sampling fallbacks, worker/main-thread parity), each marked with the test that asserts it or `MISSING`. This is the only way to surface gaps that branch-coverage tools can't see. Built by reading [js/probability/](../js/probability/), not by guessing.

### 8.2 Fill the `MISSING` rows
For each gap, add either:
- a unit test in the appropriate `tests/unit/` file (when the rule lives in one module), or
- a scenario fixture under `tests/integration/fixtures/` consumed by [expedition-pipeline.test.js](../tests/integration/expedition-pipeline.test.js) (when the rule spans modules).

### 8.3 Snapshot harness for `app.js` rendering
Capture the current HTML output of `_renderExpeditionResults`, `_renderHealthValue`, `_renderEffectIcons` against a fixed input. Required before step 9.4 (extracting `ResultsRenderer`).

### 8.4 Parser tests for the mixed services
Unit-test the parsing half of [ChatMessageDetector.js](../js/services/ChatMessageDetector.js) (chat string → parsed event) and the formatting half of [PlanetExporter.js](../js/services/PlanetExporter.js) (data → exported text). Required before step 9.3 (splitting these services).

### 8.5 Structural guard
Add a one-test CI check that greps for `document.`, `window.`, `chrome.` inside `js/probability/**` and (once it exists) `js/domain/**`. Locks in the dependency rules of §5 going forward.

Steps 8.1 and 8.2 are the gating items. 8.3–8.5 unblock specific later steps.

---

## 9. Suggested migration order (low risk → high value)

1. **Extract pure helpers** — move CRC32 to `utils/Hash.js`, formatters to `utils/Format.js`. Mechanical, no behaviour change.
2. **Move pure "services" to `domain/`** — `LoadoutBuilder`, `FightingPower`, `Oxygen`, `DamageSpreader`. Update `manifest.json` paths.
3. **Split mixed services** — break `PlanetExporter` and `ChatMessageDetector` into a pure parser/formatter (`domain/`) and an I/O shell (`io/`).
4. **Extract `ResultsRenderer`** — pull the HTML-building methods out of `app.js`.
5. **Collapse modifiers into a registry** — delete `AbilityModifiers.js` / `ItemModifiers.js` / `ProjectModifiers.js`, drive everything from data.
6. **Rename `EventWeightCalculator` → `ExpeditionPipeline`** and have it compute `sectorProbabilities` once for all calculators.
7. **Introduce `DamagePipeline`** and make `FightCalculator` / `EventDamageCalculator` thin adapters.
8. **Adopt ES modules + a bundler** — retire the hand-maintained manifest list.

Steps 1–4 are pure refactors with no behaviour change and can land independently. Steps 5–7 reduce LOC and centralise risk. Step 8 is the structural change that prevents future regressions.

---

## 10. Quick wins (1–2 hour PRs)

- Delete the repeated `var _global = …; _global.X = X;` blocks → one `core/registerGlobal.js`.
- Move CRC32 out of `PlanetaryReview`.
- Extract `formatProb` / `formatResourceValue` from `ProbabilityDisplay` into `utils/Format.js`.
- Rename `EventWeightCalculator` → `ExpeditionPipeline` (single rename, references are local).
- Add an ESLint rule (or a simple grep CI step) forbidding `document.` / `window.` in `js/probability/**` and `js/domain/**`.

---

*This document is a proposal, not a change. Nothing in the code has been modified.*

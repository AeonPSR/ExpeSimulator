# ExpeSimulator 2 - Architecture

## Overview

This is a Chrome extension that simulates expedition outcomes for the eMush game. Despite running entirely in the browser, the codebase follows a **strict frontend/backend separation** to maintain clean separation of concerns.

---

## Core Principle: Frontend/Backend Separation

Even though everything runs in JavaScript in the browser, we treat the code as having two distinct layers:

- **Frontend**: Handles user input, display, and HTML generation
- **Backend**: Handles calculations, data processing, and probability logic

**These layers communicate via plain JavaScript data structures (objects/arrays), NOT HTML strings.**

---

## Data Flow

```
1. User interacts with UI (selects sectors, adds players, assigns abilities/items)
                              |
                              v
2. Frontend (app.js) gathers all input into a clean data structure:
   {
     sectors: ['LANDING', 'FOREST', 'CAVE'],
     loadout: {
       abilities: ['PILOT', 'DIPLOMACY'],
       items: ['WHITE_FLAG'],
       projects: ['ANTIGRAV_PROPELLER']
     },
     players: [...]
   }
                              |
                              v
3. Frontend sends this data structure to Backend
                              |
                              v
4. Backend (probability system) processes the data:
   - Applies modifiers (abilities, items, projects)
   - Calculates probabilities
   - Computes expected values, ranges, etc.
   - Returns a RESULTS data structure (NOT HTML)
                              |
                              v
5. Backend returns results as a clean data structure:
   {
     resources: { fruits: { min: 0, avg: 2.5, max: 6 }, ... },
     fights: { expected: 0.3, types: {...} },
     eventDamage: { min: 0, avg: 1.2, max: 8 },
     negativeEvents: { disease: 0.05, playerLost: 0.02, ... },
     sectorBreakdown: { LANDING: {...}, FOREST: {...} }
   }
                              |
                              v
6. Frontend (display components) receives the data structure
   and generates HTML for display
```

---

## Folder Structure

```
js/
├── app.js                    # Main application controller
├── content.js                # Chrome extension entry point
│
├── components/               # FRONTEND - UI components
│   ├── Panel.js
│   ├── SectorGrid.js
│   ├── SelectedSectors.js
│   ├── PlayerSection.js
│   ├── PlayerCard.js
│   ├── ExampleWorlds.js
│   ├── TabContainer.js
│   ├── PlanetaryReview.js
│   ├── ProbabilityDisplay.js    # Receives data, generates HTML
│   ├── ResultsDisplay.js
│   ├── ResultsRenderer.js
│   ├── StarRating.js
│   └── shared/
│       ├── Modal.js
│       ├── SelectionModal.js
│       └── ToggleButton.js
│
├── core/                     # Application infrastructure
│   ├── Component.js          # Base class for all UI components
│   └── ExpeditionState.js    # Single source of truth for sectors/players/settings
│
├── probability/              # BACKEND - Calculation logic
│   ├── ExpeditionPipeline.js     # Core orchestrator; entry point for calculations
│   ├── DamagePipeline.js         # Shared damage calculation driver
│   ├── FightCalculator.js        # Fight outcome calculations
│   ├── EventDamageCalculator.js  # Event damage calculations
│   ├── ResourceCalculator.js     # Resource outcome calculations
│   ├── NegativeEventCalculator.js
│   ├── OccurrenceCalculator.js
│   ├── SectorSampler.js          # Monte Carlo sector sampling
│   ├── DamagePathSampler.js
│   ├── DamageDistributionEngine.js
│   ├── DamageComparator.js
│   ├── DistributionCalculator.js # Statistical utilities
│   ├── EventModifier.js
│   ├── ModifierApplicator.js     # Orchestrates all modifiers via MODIFIER_REGISTRY
│   └── PlanetReviewScorer.js
│
├── domain/                   # BACKEND - Pure business logic (no DOM, testable)
│   ├── FightingPowerService.js
│   ├── OxygenService.js
│   ├── LoadoutBuilder.js
│   ├── DamageSpreader.js
│   ├── ChatParser.js
│   └── PlanetSummary.js
│
├── io/                       # Side effects and DOM integration
│   ├── ChatObserver.js       # MutationObserver watching chat for planet messages
│   ├── PlanetCardInjector.js # Injects import buttons into game planet cards
│   └── Clipboard.js
│
├── services/                 # Orchestration
│   └── ExpeditionRunner.js   # Runs the full pipeline; called by the web worker
│
├── data/                     # Static data definitions
│   ├── SectorData.js
│   ├── CharacterData.js
│   ├── AbilityData.js
│   ├── ItemData.js
│   ├── WorldData.js
│   └── Translations.js
│
├── utils/                    # Shared utilities
│   ├── constants.js
│   ├── helpers.js
│   ├── EventClassifier.js
│   ├── Format.js
│   ├── Hash.js
│   ├── I18n.js
│   └── ValidationUtils.js
│
└── workers/
    └── calculation-worker.js # Web Worker entry point; delegates to ExpeditionRunner
```

---

## Rules

### Backend files (probability/, domain/) must:
- Return **data structures** (objects, arrays, Maps)
- **NEVER** generate HTML or manipulate DOM
- **NEVER** use `getResourceURL()` or any display-related functions
- Be testable in isolation (no UI dependencies)

### domain/ vs probability/:
- `probability/` — stateless math: event weights, damage distributions, sampling
- `domain/` — stateless business logic: oxygen rules, loadout building, damage spreading, chat parsing

### io/ files must:
- Only contain side-effecting code (DOM mutation, MutationObserver, clipboard)
- **NEVER** contain calculation logic
- Be the only place that touches `document` outside of components

### Frontend files (components/) must:
- Handle **all** HTML generation
- Handle **all** DOM manipulation
- Use data structures received from backend
- **NEVER** contain calculation logic beyond simple formatting

### services/ExpeditionRunner.js:
- Orchestrates one full pipeline run (oxygen filter → loadout → calculate → damage spread)
- No DOM access; can be called from the web worker via `importScripts`
- Is the single source of truth for result shape

### app.js:
- Acts as the **controller/orchestrator**
- Gathers input from UI components
- Calls backend services with data structures
- Passes backend results to display components
- Does NOT contain business logic or HTML generation

---

## Example: Correct Implementation

### Backend (ExpeditionPipeline.js)
```javascript
// Returns DATA, not HTML
calculate(sectors, loadout, players) {
    return {
        resources: { fruits: { min: 0, avg: 2.5, max: 6 }, ... },
        combat: { expected: 0.3, damageInstances: {...} },
        eventDamage: { min: 0, avg: 1.2, damageInstances: {...} },
        negativeEvents: { disease: 0.05, playerLost: 0.02 },
        sectorBreakdown: { FOREST: {...}, DESERT: {...} }
    };
}
```

### Frontend (ProbabilityDisplay.js)
```javascript
// Receives DATA, generates HTML
render(data) {
    let html = '<div class="resources">';
    html += `<span>Fruits: ${data.resources.fruits.avg.toFixed(1)}</span>`;
    // ... etc
    this._element.innerHTML = html;
}
```

### Controller (app.js)
```javascript
_updateDisplays() {
    // Gather input from state
    const sectors = this._state.getSectors();
    const players = this._state.getPlayers();
    const loadout = LoadoutBuilder.build(players, { antigravActive: ... });

    // Call backend (or delegate to web worker)
    const results = ExpeditionPipeline.calculate(sectors, loadout, players);

    // Pass to frontend
    this._probabilityDisplay.render(results);
}
```

---

## Code Style Guidelines

- **~5 functions per file** (keep files focused)
- **~25 lines per function** (keep functions small and readable)
- **Ask questions** when requirements are unclear
- **Test each step** before moving to the next
- Each file should have a clear, single responsibility

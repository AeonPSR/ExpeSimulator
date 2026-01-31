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
├── app.js                    # Main application, orchestrates everything
├── content.js                # Chrome extension entry point
│
├── components/               # FRONTEND - UI components
│   ├── Panel.js
│   ├── SectorGrid.js
│   ├── PlayerCard.js
│   ├── ProbabilityDisplay.js    # Receives data, generates HTML
│   ├── ResultsDisplay.js
│   └── shared/
│       ├── Modal.js
│       └── ToggleButton.js
│
├── probability/              # BACKEND - Calculation logic
│   ├── EventWeightCalculator.js  # Core probability calculations
│   ├── BinomialCalculator.js     # Statistical utilities
│   ├── EventModifier.js          # Modifier utilities
│   ├── AbilityModifiers.js       # Ability-specific modifiers
│   ├── ItemModifiers.js          # Item-specific modifiers
│   ├── ProjectModifiers.js       # Project-specific modifiers
│   └── ModifierApplicator.js     # Orchestrates all modifiers
│
├── services/                 # BACKEND - Business logic services
│   ├── FightingPowerService.js
│   └── PlayerAnalysisService.js
│
├── data/                     # Static data definitions
│   ├── SectorData.js
│   ├── CharacterData.js
│   ├── AbilityData.js
│   └── ItemData.js
│
└── utils/                    # Shared utilities
    ├── constants.js
    └── helpers.js
```

---

## Rules

### Backend files (probability/, services/) must:
- Return **data structures** (objects, arrays, Maps)
- **NEVER** generate HTML or manipulate DOM
- **NEVER** use `getResourceURL()` or any display-related functions
- Be testable in isolation (no UI dependencies)

### Frontend files (components/) must:
- Handle **all** HTML generation
- Handle **all** DOM manipulation
- Use data structures received from backend
- **NEVER** contain calculation logic beyond simple formatting

### app.js:
- Acts as the **controller/orchestrator**
- Gathers input from UI components
- Calls backend services with data structures
- Passes backend results to display components
- Does NOT contain business logic or HTML generation

---

## Example: Correct Implementation

### Backend (EventWeightCalculator.js)
```javascript
// Returns DATA, not HTML
calculate(sectors, loadout) {
    return {
        resources: { fruits: 2.5, steaks: 1.0, fuel: 0, oxygen: 0 },
        fights: { PREDATOR: 0.15, INSECT: 0.08 },
        eventDamage: { tired: 0.1, accident: 0.05 },
        negativeEvents: { disease: 0.03, playerLost: 0.02 }
    };
}
```

### Frontend (ProbabilityDisplay.js)
```javascript
// Receives DATA, generates HTML
render(data) {
    let html = '<div class="resources">';
    html += `<span>Fruits: ${data.resources.fruits.toFixed(1)}</span>`;
    // ... etc
    this._element.innerHTML = html;
}
```

### Controller (app.js)
```javascript
_updateDisplays() {
    // Gather input
    const input = {
        sectors: this._selectedSectors,
        loadout: this._buildCombinedLoadout()
    };
    
    // Call backend
    const results = EventWeightCalculator.calculate(input.sectors, input.loadout);
    
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

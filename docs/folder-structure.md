# Folder Structure Strategy

Each panel is a self-contained sub-project. Only genuinely shared infrastructure lives in `general/`.

## Layout

```
general/                    ← shared by all panels
  js/
    core/Component.js
    utils/                  constants, helpers, I18n, ValidationUtils
    components/shared/      Panel, TabContainer, Modal, ToggleButton

expeditionSimulator/        ← everything expedition-specific
  js/
    app.js
    core/ExpeditionState.js
    data/                   SectorData, CharacterData, AbilityData, ItemData, WorldData, Translations
    utils/                  Hash, Format, EventClassifier
    domain/                 FightingPowerService, LoadoutBuilder, OxygenService, DamageSpreader, PlanetSummary, ChatParser
    probability/            ExpeditionPipeline, DamagePipeline, calculators, modifiers…
    services/ExpeditionRunner.js
    io/                     ChatObserver, PlanetCardInjector, Clipboard
    workers/calculation-worker.js
    components/             SectorGrid, PlayerSection, ProbabilityDisplay, ResultsRenderer…

settings/                   ← placeholder
  js/app.js

content.js                  ← root entry; wires shell + all panels
```

## Rules

- `general/` never imports from a panel folder.
- Within a panel: no upward imports — `probability/` and `domain/` never touch the DOM.
- `content.js` is the only file that spans panels.

## Adding a new panel

1. Create `myPanel/js/app.js`.
2. Register it in `content.js` and add a nav entry to the Panel shell.
3. Add its scripts to `manifest.json`.

# Aeon's Lab

A Chrome extension for the game [Mush](https://emush.eternaltwin.org), providing two tools accessible via side panels on the game page:

- **Planetary Review** — analyses a planet's sector composition and rates it across resources, danger, and special properties.
- **Expedition Simulator** — simulates expedition outcomes, calculating damage distributions, survival odds, and loot probabilities across pessimist / average / optimist scenarios.

## Development

```bash
npm install   # install test dependencies
npm test      # run the Jest test suite
```

Supports `https://emush.eternaltwin.org/game*` and `http://localhost/*`.

Todo:
- Add the "Projects" page

Done since last update:

-> Crew manager
- Made the group appartenance (mush/human) colorblind accessible.
- Added a button to reduce the section for the titles.
- Fixed the skills not being imported correctly.
- Added upper bounds to the values of health, moral, spores, AP and days.

-> Planetary analyzer:
- The planetary analyzer pannel now saves its content.
- Fixed the planetary review that was incorectly calculating the effect of Diplomacy to calculate the stars.
- Fixed the expe simulator that wasn't pulling data from the manager when manually changing character.
- The expedition simulation now import health values from the crew manager.

-> Settings
- Added click mode to navigate the app by clicking on pannels instead of hovering them.
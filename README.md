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
- Easter egg when generating a random char


Done since last update:
- Improved the expert mode of the crew manager to have global modificators.
- Added a new day button
- Added a new death button
- Added the Project module.
- Crew manager: Changed the starting PMO count to 6 instead of 14.
- Fixed the extension not loading proprely in some cases
- Fixed the crew manager import that wasn't importing mush skills.
- Fixing the import button on message going to the wrong place.
- Allow to reorder pannels.
- Hiding a module also hide the related import buttons.
- Fixed the tab not closing proprely 
- Improve the modal to select musk skills, grouping them like the wiki does
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
- Add the "Crew management" Page
- Add the "Projects" page
- Rename the events so it's the proper "Errance" stuff

Done since last update:
- Fix the bug where the ressources gained from fights aren't taken into account in the star rating
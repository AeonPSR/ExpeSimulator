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

TODO:
- Modify the clickable pop up in the browser
- Add the main style to the import button and creditsS
- Ajouter la version d'eMush a laquelle le script est à jour
- Ajouter une translation pour le bouton d'export
- Fix the horizontal scroll in the probabilities in spanish


Done:
- The app can now be closed on mobile through a new button in the header.

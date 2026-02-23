/**
 * Jest Test Setup
 * 
 * Loads all source files in manifest order to populate window globals.
 * This mimics how Chrome loads content scripts.
 */

const path = require('path');

// Mock chrome.runtime API (not available in jsdom)
global.chrome = {
  runtime: {
    getURL: (resourcePath) => resourcePath,
    id: 'test-extension-id'
  }
};

/**
 * Source files to load, in dependency order (from manifest.json).
 * 
 * Excludes:
 * - app.js (initializes UI, needs DOM ready)
 * - content.js (entry point, starts the app)
 * 
 * These can be loaded manually in integration tests if needed.
 */
const sourceFiles = [
  'config.js',
  'js/utils/constants.js',
  'js/utils/helpers.js',
  'js/utils/EventClassifier.js',
  'js/utils/ValidationUtils.js',
  'js/data/SectorData.js',
  'js/data/CharacterData.js',
  'js/data/AbilityData.js',
  'js/data/ItemData.js',
  'js/data/WorldData.js',
  'js/core/Component.js',
  'js/core/ExpeditionState.js',
  'js/components/shared/ToggleButton.js',
  'js/components/shared/Modal.js',
  'js/components/shared/SelectionModal.js',
  'js/components/Panel.js',
  'js/components/TabContainer.js',
  'js/components/SectorGrid.js',
  'js/components/SelectedSectors.js',
  'js/components/PlayerCard.js',
  'js/components/PlayerSection.js',
  'js/components/ProbabilityDisplay.js',
  'js/components/ResultsDisplay.js',
  'js/components/ExampleWorlds.js',
  'js/components/PlanetaryReview.js',
  'js/services/FightingPowerService.js',
  'js/services/LoadoutBuilder.js',
  'js/services/DamageSpreader.js',
  'js/services/OxygenService.js',
  'js/probability/DistributionCalculator.js',
  'js/probability/EventModifier.js',
  'js/probability/AbilityModifiers.js',
  'js/probability/ItemModifiers.js',
  'js/probability/ProjectModifiers.js',
  'js/probability/ModifierApplicator.js',
  'js/probability/SectorSampler.js',
  'js/probability/EventWeightCalculator.js',
  'js/probability/DamageComparator.js',
  'js/probability/ResourceCalculator.js',
  'js/probability/NegativeEventCalculator.js',
  'js/probability/OccurrenceCalculator.js',
  'js/probability/DamagePathSampler.js',
  'js/probability/DamageDistributionEngine.js',
  'js/probability/FightCalculator.js',
  'js/probability/EventDamageCalculator.js',
  'js/services/ChatMessageDetector.js'
  // 'js/app.js' - excluded: initializes UI
  // 'js/content.js' - excluded: entry point
];

// Load each source file
// This runs the code, which attaches modules to window
const rootDir = path.resolve(__dirname, '..');
for (const file of sourceFiles) {
  const filePath = path.join(rootDir, file);
  require(filePath);
}

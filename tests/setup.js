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
  'general/js/utils/constants.js',
  'general/js/utils/helpers.js',
  'general/js/utils/ValidationUtils.js',
  'expeditionSimulator/js/data/Translations.js',
  'general/js/utils/I18n.js',
  'expeditionSimulator/js/utils/EventClassifier.js',
  'expeditionSimulator/js/utils/Hash.js',
  'expeditionSimulator/js/utils/Format.js',
  'expeditionSimulator/js/data/SectorData.js',
  'expeditionSimulator/js/data/CharacterData.js',
  'expeditionSimulator/js/data/AbilityData.js',
  'expeditionSimulator/js/data/SkillOwnershipData.js',
  'expeditionSimulator/js/data/ItemData.js',
  'expeditionSimulator/js/data/WorldData.js',
  'general/js/core/Component.js',
  'expeditionSimulator/js/core/ExpeditionState.js',
  'general/js/components/shared/ToggleButton.js',
  'general/js/components/shared/Modal.js',
  'general/js/components/shared/ConfirmationModal.js',
  'general/js/components/shared/SelectionModal.js',
  'general/js/components/shared/Panel.js',
  'general/js/components/shared/TabContainer.js',
  'general/js/components/shared/InfoPanel.js',
  'general/js/components/shared/PlayerCard.js',
  'expeditionSimulator/js/components/SectorGrid.js',
  'expeditionSimulator/js/components/SelectedSectors.js',
  'expeditionSimulator/js/components/PlayerSection.js',
  'expeditionSimulator/js/components/ProbabilityDisplay.js',
  'expeditionSimulator/js/components/ResultsDisplay.js',
  'expeditionSimulator/js/components/ExampleWorlds.js',
  'expeditionSimulator/js/components/StarRating.js',
  'expeditionSimulator/js/components/PlanetaryReview.js',
  'expeditionSimulator/js/components/ResultsRenderer.js',
  'expeditionSimulator/js/domain/FightingPowerService.js',
  'expeditionSimulator/js/data/CombatRewardData.js',
  'expeditionSimulator/js/domain/CombatRewardService.js',
  'expeditionSimulator/js/domain/LoadoutBuilder.js',
  'expeditionSimulator/js/domain/DamageSpreader.js',
  'expeditionSimulator/js/domain/OxygenService.js',
  'expeditionSimulator/js/domain/PlanetSummary.js',
  'expeditionSimulator/js/domain/ChatParser.js',
  'expeditionSimulator/js/services/ExpeditionRunner.js',
  'expeditionSimulator/js/probability/DistributionCalculator.js',
  'expeditionSimulator/js/probability/EventModifier.js',
  'expeditionSimulator/js/probability/ModifierApplicator.js',
  'expeditionSimulator/js/probability/SectorSampler.js',
  'expeditionSimulator/js/probability/PlanetReviewScorer.js',
  'expeditionSimulator/js/probability/ExpeditionPipeline.js',
  'expeditionSimulator/js/probability/DamageComparator.js',
  'expeditionSimulator/js/probability/ResourceCalculator.js',
  'expeditionSimulator/js/probability/NegativeEventCalculator.js',
  'expeditionSimulator/js/probability/OccurrenceCalculator.js',
  'expeditionSimulator/js/probability/DamagePathSampler.js',
  'expeditionSimulator/js/probability/DamageDistributionEngine.js',
  'expeditionSimulator/js/probability/DamagePipeline.js',
  'expeditionSimulator/js/probability/FightCalculator.js',
  'expeditionSimulator/js/probability/CombatRewardCalculator.js',
  'expeditionSimulator/js/probability/EventDamageCalculator.js',
  'expeditionSimulator/js/io/Clipboard.js',
  'expeditionSimulator/js/io/ChatObserver.js',
  'crewManager/js/CrewCharacterState.js',
  'crewManager/js/CrewSkillCardInjector.js',
  'crewManager/js/services/CrewManagerStorage.js'
  // 'expeditionSimulator/js/app.js' - excluded: initializes UI
  // 'content.js' - excluded: entry point
];

// Load each source file
// This runs the code, which attaches modules to window
const rootDir = path.resolve(__dirname, '..');
for (const file of sourceFiles) {
  const filePath = path.join(rootDir, file);
  require(filePath);
}

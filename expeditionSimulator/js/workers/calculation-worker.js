/**
 * Calculation Web Worker
 * 
 * Runs the expedition calculation pipeline off the main thread.
 * Dependencies are loaded on first 'calculate' message via importScripts().
 * The main thread passes the extension base URL so we can build absolute paths.
 */
let _initialized = false;

function _loadDependencies(baseURL) {
	if (_initialized) return;
	try {
		importScripts(
			baseURL + 'config.js',
			baseURL + 'general/js/utils/constants.js',
			baseURL + 'general/js/utils/helpers.js',
			baseURL + 'expeditionSimulator/js/utils/EventClassifier.js',
			baseURL + 'expeditionSimulator/js/data/SectorData.js',
			baseURL + 'expeditionSimulator/js/data/AbilityData.js',
			baseURL + 'expeditionSimulator/js/data/ItemData.js',
			baseURL + 'expeditionSimulator/js/data/CombatRewardData.js',
			baseURL + 'expeditionSimulator/js/domain/FightingPowerService.js',
			baseURL + 'expeditionSimulator/js/domain/CombatRewardService.js',
			baseURL + 'expeditionSimulator/js/domain/OxygenService.js',
			baseURL + 'expeditionSimulator/js/domain/LoadoutBuilder.js',
			baseURL + 'expeditionSimulator/js/domain/DamageSpreader.js',
			baseURL + 'expeditionSimulator/js/probability/DistributionCalculator.js',
			baseURL + 'expeditionSimulator/js/probability/EventModifier.js',
			baseURL + 'expeditionSimulator/js/probability/ModifierApplicator.js',
			baseURL + 'expeditionSimulator/js/probability/SectorSampler.js',
			baseURL + 'expeditionSimulator/js/probability/ExpeditionPipeline.js',
			baseURL + 'expeditionSimulator/js/probability/DamageComparator.js',
			baseURL + 'expeditionSimulator/js/probability/ResourceCalculator.js',
			baseURL + 'expeditionSimulator/js/probability/NegativeEventCalculator.js',
			baseURL + 'expeditionSimulator/js/probability/OccurrenceCalculator.js',
			baseURL + 'expeditionSimulator/js/probability/DamagePathSampler.js',
			baseURL + 'expeditionSimulator/js/probability/DamageDistributionEngine.js',
			baseURL + 'expeditionSimulator/js/probability/DamagePipeline.js',
			baseURL + 'expeditionSimulator/js/probability/FightCalculator.js',
			baseURL + 'expeditionSimulator/js/probability/CombatRewardCalculator.js',
			baseURL + 'expeditionSimulator/js/probability/EventDamageCalculator.js',
			baseURL + 'expeditionSimulator/js/services/ExpeditionRunner.js'
		);
		_initialized = true;
	} catch (error) {
		self.postMessage({ type: 'error', requestId: -1, error: 'Failed to load dependencies: ' + error.message });
		throw error;
	}
}

// Listen for calculation requests
self.onmessage = function(event) {
	const { type, requestId, baseURL, ...params } = event.data;

	if (type === 'calculate') {
		try {
			_loadDependencies(baseURL);
			const results = ExpeditionRunner.run(params);
			self.postMessage({ type: 'result', requestId, results });
		} catch (error) {
			self.postMessage({ type: 'error', requestId, error: error.message });
		}
	}
};

// Legacy shim kept so any caller that used runCalculation() directly still works.
// New code should call ExpeditionRunner.run() instead.
function runCalculation(params) {
	return ExpeditionRunner.run(params);
}

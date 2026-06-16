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
			baseURL + 'js/utils/constants.js',
			baseURL + 'js/utils/helpers.js',
			baseURL + 'js/utils/EventClassifier.js',
			baseURL + 'js/data/SectorData.js',
			baseURL + 'js/data/AbilityData.js',
			baseURL + 'js/data/ItemData.js',
			baseURL + 'js/services/OxygenService.js',
			baseURL + 'js/services/LoadoutBuilder.js',
			baseURL + 'js/services/DamageSpreader.js',
			baseURL + 'js/probability/DistributionCalculator.js',
			baseURL + 'js/probability/EventModifier.js',
			baseURL + 'js/probability/AbilityModifiers.js',
			baseURL + 'js/probability/ItemModifiers.js',
			baseURL + 'js/probability/ProjectModifiers.js',
			baseURL + 'js/probability/ModifierApplicator.js',
			baseURL + 'js/probability/SectorSampler.js',
			baseURL + 'js/probability/ExpeditionPipeline.js',
			baseURL + 'js/probability/DamageComparator.js',
			baseURL + 'js/probability/ResourceCalculator.js',
			baseURL + 'js/probability/NegativeEventCalculator.js',
			baseURL + 'js/probability/OccurrenceCalculator.js',
			baseURL + 'js/probability/DamagePathSampler.js',
			baseURL + 'js/probability/DamageDistributionEngine.js',
			baseURL + 'js/probability/FightCalculator.js',
			baseURL + 'js/probability/EventDamageCalculator.js',
			baseURL + 'js/services/ExpeditionRunner.js'
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

// Legacy shim — kept so any caller that used runCalculation() directly still works.
// New code should call ExpeditionRunner.run() instead.
function runCalculation(params) {
	return ExpeditionRunner.run(params);
}

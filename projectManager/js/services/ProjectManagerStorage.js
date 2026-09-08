/**
 * Persists Project Manager statuses and display options across page reloads.
 */
const ProjectManagerStorage = (() => {
	const STORAGE_KEY = 'expe-sim-project-manager';
	const VALID_STATUSES = new Set(['core', 'done', 'bin']);

	function _normalizeState(value) {
		const statuses = {};
		if (value?.statuses && typeof value.statuses === 'object') {
			Object.entries(value.statuses).forEach(([projectName, status]) => {
				if (VALID_STATUSES.has(status)) statuses[projectName] = status;
			});
		}
		return {
			version: 1,
			options: {
				expert: Boolean(value?.options?.expert),
				nof: Boolean(value?.options?.nof),
				priority: Boolean(value?.options?.priority),
				infoVisible: value?.options?.infoVisible !== false
			},
			statuses
		};
	}

	function load() {
		try {
			return _normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
		} catch (_) {
			return _normalizeState(null);
		}
	}

	function save(state) {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_normalizeState(state))); } catch (_) {}
	}

	return { load, save };
})();

if (typeof window !== 'undefined') {
	window.ProjectManagerStorage = ProjectManagerStorage;
}
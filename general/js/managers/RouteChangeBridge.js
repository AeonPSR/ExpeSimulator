/**
 * Emits an event when eMush performs same-document navigation.
 * This script runs in the page's main world so History API calls are observable.
 */
(() => {
	const notify = () => window.dispatchEvent(new Event('aeons-lab:route-change'));

	['pushState', 'replaceState'].forEach(method => {
		const original = history[method];
		history[method] = function (...args) {
			const result = original.apply(this, args);
			notify();
			return result;
		};

	});

	window.addEventListener('popstate', notify);
	window.addEventListener('hashchange', notify);
	window.addEventListener('pageshow', notify);
})();
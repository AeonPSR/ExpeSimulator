/**
 * Content Script Entry Point
 * 
 * This is loaded by the Chrome extension into eMush pages.
 * Initializes the application on /game and pauses DOM observers elsewhere.
 */

let appInitialized = false;
let appActive = false;

// Global error handler for extension context invalidation
window.addEventListener('error', (event) => {
	if (event.message && event.message.includes('Extension context invalidated')) {
		console.warn('Extension context invalidated, preventing further errors');
		event.preventDefault();
		return false;
	}
});

/**
 * Initialize the application
 */
function initializeApp() {
	if (appInitialized) return;

	try {
		// Check if extension context is valid
		if (!isExtensionContextValid()) {
			console.error('Extension context is not valid');
			return;
		}

		window.chatMessageScanner = new ChatMessageScanner();

		// Create the applications. Crew Manager is first so expedition player
		// randomization can read crew availability during initial state setup.
		window.crewManagerApp = new CrewManagerApp();
		window.expeditionSimulator = new ExpeditionSimulatorApp();
		window.projectManagerApp = new ProjectManagerApp();
		window.settingsApp = new SettingsApp();
		window.chatMessageScanner.start();
		appInitialized = true;
		appActive = true;

		// Apply the user's persisted panel order (DOM order breaks z-index
		// ties between tongues, so this also fixes the visual stacking).
		if (typeof Panel !== 'undefined' && typeof Settings !== 'undefined') {
			Panel.applyOrder(Settings.panelOrder);
		}
		// console.log('Expedition Simulator initialized');

	} catch (error) {
		console.error('Failed to initialize Expedition Simulator:', error);
	}
}

function isGameRoute() {
	return window.location.pathname === '/game' || window.location.pathname.startsWith('/game/');
}

function applyRouteState() {
	const shouldBeActive = isGameRoute();
	if (shouldBeActive && !appInitialized) {
		if (document.readyState === 'loading') return;
		initializeApp();
		return;
	}
	if (!appInitialized || shouldBeActive === appActive) return;

	appActive = shouldBeActive;
	const panelsContainer = document.getElementById('panels-container');
	if (panelsContainer) panelsContainer.hidden = !shouldBeActive;
	window.crewManagerApp?.setActive(shouldBeActive);
	window.expeditionSimulator?.setActive(shouldBeActive);
	if (shouldBeActive) {
		window.chatMessageScanner?.start();
	} else {
		window.chatMessageScanner?.stop();
	}
}

window.addEventListener('aeons-lab:route-change', applyRouteState);
document.addEventListener('DOMContentLoaded', applyRouteState, { once: true });
applyRouteState();

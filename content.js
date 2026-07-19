/**
 * Content Script Entry Point
 * 
 * This is loaded by the Chrome extension into the target page.
 * Initializes the Expedition Simulator when the page loads.
 */

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
	try {
		// Check if extension context is valid
		if (!isExtensionContextValid()) {
			console.error('Extension context is not valid');
			return;
		}

		// Create the applications. Crew Manager is first so expedition player
		// randomization can read crew availability during initial state setup.
		window.crewManagerApp = new CrewManagerApp();
		window.expeditionSimulator = new ExpeditionSimulatorApp();
		// Settings must be created last: Panel.mount() appends to
		// #panels-container in creation order, and DOM order breaks
		// z-index ties between tongues. Settings should always be last.
		window.settingsApp = new SettingsApp();
		// console.log('Expedition Simulator initialized');

	} catch (error) {
		console.error('Failed to initialize Expedition Simulator:', error);
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	initializeApp();
}

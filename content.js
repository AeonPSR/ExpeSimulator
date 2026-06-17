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

		// Create the application
		window.expeditionSimulator = new ExpeditionSimulatorApp();
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

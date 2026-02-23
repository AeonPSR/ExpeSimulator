/**
 * Utility Helpers
 * 
 * Common utility functions used across the application.
 */

/**
 * Gets the full URL for a resource (image, etc.) within the extension
 * In Chrome extension context, uses chrome.runtime.getURL
 * Falls back to relative path for non-extension contexts
 * 
 * @param {string} path - Relative path to the resource
 * @returns {string} Full URL to the resource
 */
function getResourceURL(path) {
	// Chrome extension context
	if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
		return chrome.runtime.getURL(path);
	}
	// Fallback for non-extension context (testing, etc.)
	return path;
}

/**
 * Formats a sector name for display
 * Converts UPPER_SNAKE_CASE to Title Case
 * 
 * @param {string} sectorName - Raw sector name (e.g., 'CRISTAL_FIELD')
 * @returns {string} Formatted name (e.g., 'Cristal Field')
 */
function formatSectorName(sectorName) {
	if (!sectorName) return '';
	return sectorName
		.toLowerCase()
		.split('_')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Checks if the Chrome extension context is still valid
 * Extension context can become invalid after updates or reloads
 * 
 * @returns {boolean} True if context is valid
 */
function isExtensionContextValid() {
	try {
		// Attempt to access chrome.runtime.id - throws if context invalid
		if (typeof chrome !== 'undefined' && chrome.runtime) {
			return !!chrome.runtime.id;
		}
		return true; // Non-extension context is always "valid"
	} catch (e) {
		return false;
	}
}

/**
 * Debounce function - limits how often a function can fire
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Clamps a number between min and max values
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

/**
 * Generates a unique ID
 * 
 * @param {string} [prefix='id'] - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'id') {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Converts an image filename to a backend identifier.
 * Strips the file extension (.png, .jpg, .gif) and uppercases.
 * e.g. 'pilot.png' → 'PILOT', 'white_flag.jpg' → 'WHITE_FLAG'
 * 
 * @param {string} filename - The image filename
 * @returns {string} The uppercase identifier
 */
function filenameToId(filename) {
	return filename.replace(/\.(png|jpg|gif)$/i, '').toUpperCase();
}

// Export for use in other modules
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.getResourceURL = getResourceURL;
_global.formatSectorName = formatSectorName;
_global.isExtensionContextValid = isExtensionContextValid;
_global.debounce = debounce;
_global.clamp = clamp;
_global.generateId = generateId;
_global.filenameToId = filenameToId;

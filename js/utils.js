// Utility functions for the Expedition Simulator

/**
 * Calculates factorial of a number
 * @param {number} n - The number to calculate factorial for
 * @returns {number} - The factorial result
 */
function factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

/**
 * Formats sector names for display (replaces underscores with spaces)
 * @param {string} sectorName - The sector name to format
 * @returns {string} - Formatted sector name
 */
function formatSectorName(sectorName) {
    return sectorName.replace(/_/g, ' ');
}

/**
 * Checks if a sector is a special sector (LANDING or LOST)
 * @param {string} sectorName - The sector name to check
 * @returns {boolean} - True if special sector
 */
function isSpecialSector(sectorName) {
    return sectorName === 'LANDING' || sectorName === 'LOST';
}

/**
 * Formats probability percentages with minimum display threshold
 * @param {number} prob - Probability value (0-1)
 * @returns {string} - Formatted percentage string
 */
function formatProbability(prob) {
    const percentage = prob * 100;
    return percentage < 0.05 ? '0.1' : percentage.toFixed(1);
}

/**
 * Gets the Chrome extension resource URL
 * @param {string} path - Path to the resource
 * @returns {string} - Full URL to the resource
 */
function getResourceURL(path) {
    try {
        return chrome.runtime.getURL(path);
    } catch (error) {
        console.warn('Extension context invalidated, using fallback for resource:', path);
        // Return a fallback URL or empty string to prevent crashes
        return '';
    }
}

/**
 * Checks if the extension context is still valid
 * @returns {boolean} - True if extension context is valid
 */
function isExtensionContextValid() {
    try {
        return !!chrome.runtime.getURL;
    } catch (error) {
        return false;
    }
}

/**
 * Clamps a value between 0 and 100 for percentage display
 * @param {number} value - The value to clamp
 * @returns {number} - Clamped value
 */
function clampPercentage(value) {
    return Math.min(value * 100, 100);
}

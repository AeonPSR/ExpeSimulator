/**
 * Format
 *
 * Pure display-formatting helpers with no dependencies.
 */
const Format = {

	/**
	 * Formats a decimal resource quantity for display.
	 * Shows '<0.1' for very small non-zero values.
	 *
	 * @param {number} value
	 * @returns {string}
	 */
	resourceValue(value) {
		if (value === 0) return '0';
		if (value < 0.1) return '<0.1';
		return value.toFixed(1);
	},

	/**
	 * Formats a probability (0–1) as a percentage string with parentheses.
	 * Shows '(<0.1%)' for very small non-zero values.
	 *
	 * @param {number|undefined} prob
	 * @returns {string}
	 */
	prob(prob) {
		if (prob === undefined) return '';
		const pct = prob * 100;
		if (pct === 0) return '(0%)';
		if (pct < 0.1) return '(<0.1%)';
		return `(${pct.toFixed(1)}%)`;
	}

};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.Format = Format;

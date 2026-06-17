/**
 * Validation Utilities
 * 
 * Handles all validation logic for the expedition simulator.
 * Separated from UI components for better testability and reusability.
 */
const ValidationUtils = {
	/**
	 * Validates if adding a sector would exceed its maximum limit
	 * @param {string} sectorName - The sector to add
	 * @param {Array<string>} currentSelectedSectors - Currently selected sectors array of sector names
	 * @returns {Object} validation result with isValid and message
	 */
	validateSectorLimit(sectorName, currentSelectedSectors) {
		// Get the maximum allowed count for this sector type
		const maxAllowed = SectorData.getMaxPerPlanet(sectorName);
		
		// Count how many of this sector type are already selected
		const currentCount = currentSelectedSectors.filter(sector => 
			sector === sectorName
		).length;
		
		const isValid = currentCount < maxAllowed;
		
		return {
			isValid,
			currentCount,
			maxAllowed,
			message: isValid ? null : `Maximum ${maxAllowed} ${sectorName} sectors allowed per planet (currently have ${currentCount})`
		};
	},

	/**
	 * Validates the total number of sectors
	 * @param {Array<string>} currentSelectedSectors - Currently selected sectors array of sector names
	 * @returns {Object} validation result
	 */
	validateTotalSectorLimit(currentSelectedSectors) {
		// Count only non-special sectors towards the limit
		const countableSectors = currentSelectedSectors.filter(sectorName => 
			!SectorData.isSpecialSector(sectorName)
		);
		const currentTotal = countableSectors.length;
		const maxTotal = Constants.MAX_SECTORS;
		const isValid = currentTotal < maxTotal;
		
		return {
			isValid,
			currentTotal,
			maxTotal,
			message: isValid ? null : `Maximum ${maxTotal} sectors allowed (currently have ${currentTotal}, excluding LANDING/LOST)`
		};
	},

	/**
	 * Validates if adding a sector is allowed (combines all validation checks)
	 * @param {string} sectorName - The sector to add
	 * @param {Array<string>} currentSelectedSectors - Currently selected sectors array of sector names
	 * @returns {Object} combined validation result
	 */
	validateAddSector(sectorName, currentSelectedSectors) {
		// Check total sector limit first
		const totalCheck = this.validateTotalSectorLimit(currentSelectedSectors);
		if (!totalCheck.isValid) {
			return totalCheck;
		}

		// Check per-sector limit
		const sectorCheck = this.validateSectorLimit(sectorName, currentSelectedSectors);
		if (!sectorCheck.isValid) {
			return sectorCheck;
		}

		return {
			isValid: true,
			message: null
		};
	},

	/**
	 * Gets sector usage statistics for UI display
	 * @param {Array<string>} currentSelectedSectors - Currently selected sectors array of sector names
	 * @returns {Object} sector usage stats
	 */
	getSectorUsageStats(currentSelectedSectors) {
		const stats = {};
		const sectorCounts = {};
		
		// Count current usage
		currentSelectedSectors.forEach(sectorName => {
			sectorCounts[sectorName] = (sectorCounts[sectorName] || 0) + 1;
		});
		
		// Build stats for all available sectors
		SectorData.getUniqueSectorNames().forEach(sectorName => {
			const current = sectorCounts[sectorName] || 0;
			const max = SectorData.getMaxPerPlanet(sectorName);
			
			stats[sectorName] = {
				current,
				max,
				remaining: max - current,
				isAtLimit: current >= max,
				percentage: Math.round((current / max) * 100)
			};
		});
		
		return stats;
	}
};

// Export
if (typeof window !== 'undefined') {
	window.ValidationUtils = ValidationUtils;
}
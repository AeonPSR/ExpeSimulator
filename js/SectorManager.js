// Sector Management - Handles sector selection, validation, and state

class SectorManager {
    constructor() {
        this.selectedSectors = ['LANDING']; // Preselect LANDING sector
        this.maxRegularSectors = 20;
    }

    /**
     * Gets the current selected sectors
     * @returns {Array<string>} - Array of selected sector names
     */
    getSelectedSectors() {
        return [...this.selectedSectors];
    }

    /**
     * Gets count of regular sectors (excluding LANDING and LOST)
     * @returns {number} - Count of regular sectors
     */
    getRegularSectorCount() {
        return this.selectedSectors.filter(s => !isSpecialSector(s)).length;
    }

    /**
     * Gets total count of all sectors
     * @returns {number} - Total sector count
     */
    getTotalSectorCount() {
        return this.selectedSectors.length;
    }

    /**
     * Checks if regular sectors are at maximum capacity
     * @returns {boolean} - True if at maximum
     */
    isAtMaxRegularSectors() {
        return this.getRegularSectorCount() >= this.maxRegularSectors;
    }

    /**
     * Checks if a sector can be added
     * @param {string} sectorName - Name of the sector to check
     * @returns {boolean} - True if sector can be added
     */
    canAddSector(sectorName) {
        // Check expedition limit for regular sectors
        if (this.isAtMaxRegularSectors() && !isSpecialSector(sectorName)) {
            return false;
        }

        // Check sector-specific limits
        const sectorConfig = PlanetSectorConfigData.find(s => s.sectorName === sectorName);
        if (sectorConfig && sectorConfig.maxPerPlanet > 0) {
            const currentCount = this.selectedSectors.filter(s => s === sectorName).length;
            if (currentCount >= sectorConfig.maxPerPlanet) {
                return false;
            }
        }

        return true;
    }

    /**
     * Adds a sector to the selection
     * @param {string} sectorName - Name of the sector to add
     * @returns {boolean} - True if sector was added successfully
     */
    addSector(sectorName) {
        if (!this.canAddSector(sectorName)) {
            return false;
        }

        this.selectedSectors.push(sectorName);
        return true;
    }

    /**
     * Removes a sector by index
     * @param {number} index - Index of the sector to remove
     * @returns {boolean} - True if sector was removed successfully
     */
    removeSector(index) {
        if (index < 0 || index >= this.selectedSectors.length) {
            return false;
        }

        this.selectedSectors.splice(index, 1);
        return true;
    }

    /**
     * Clears all sectors but keeps LANDING preselected
     */
    clearAll() {
        this.selectedSectors = ['LANDING'];
    }

    /**
     * Gets sector availability info for UI updates
     * @param {string} sectorName - Name of the sector to check
     * @returns {Object} - Object with shouldDisable and tooltipText properties
     */
    getSectorAvailability(sectorName) {
        const sectorConfig = PlanetSectorConfigData.find(s => s.sectorName === sectorName);
        const isSpecial = isSpecialSector(sectorName);
        
        let shouldDisable = this.isAtMaxRegularSectors() && !isSpecial;
        let tooltipText = formatSectorName(sectorName);

        // Check sector-specific limits
        if (sectorConfig && sectorConfig.maxPerPlanet > 0) {
            const currentCount = this.selectedSectors.filter(s => s === sectorName).length;
            const sectorAtLimit = currentCount >= sectorConfig.maxPerPlanet;
            
            shouldDisable = shouldDisable || sectorAtLimit;
            tooltipText += ` (${currentCount}/${sectorConfig.maxPerPlanet})`;
        }

        // Add expedition limit info to tooltip if at max (but only for regular sectors)
        if (this.isAtMaxRegularSectors() && !isSpecial) {
            tooltipText += ' - Regular Sectors Full (20/20)';
        }

        return { shouldDisable, tooltipText };
    }

    /**
     * Gets formatted header text for selected expedition display
     * @returns {string} - Formatted header text
     */
    getHeaderText() {
        const regularCount = this.getRegularSectorCount();
        const totalCount = this.getTotalSectorCount();
        
        return `Selected Expedition (${regularCount}/20${totalCount > regularCount ? ` + ${totalCount - regularCount} special` : ''})`;
    }
}

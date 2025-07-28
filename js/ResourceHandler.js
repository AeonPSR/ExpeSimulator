// Resource Handler - Handles all resource-related calculations and scenarios

class ResourceHandler {
    constructor() {
        // Initialize any needed state
    }

    /**
     * Calculates resource scenarios for selected sectors
     * @param {Array<string>} selectedSectors - Array of selected sector names
     * @returns {Object} - Complete resource calculation results
     */
    calculateResourceScenariosFromSectors(selectedSectors) {
        const results = {
            fruits: { pessimist: 0, average: 0, optimist: 0 },
            steaks: { pessimist: 0, average: 0, optimist: 0 },
            fuel: { pessimist: 0, average: 0, optimist: 0 },
            oxygen: { pessimist: 0, average: 0, optimist: 0 },
            artefacts: { pessimist: 0, average: 0, optimist: 0 },
            starmaps: { pessimist: 0, average: 0, optimist: 0 }
        };

        // Group sectors by type to calculate resource scenarios correctly
        const sectorsByType = {};
        selectedSectors.forEach(sectorName => {
            const sectorData = PlanetSectorConfigData.find(s => s.sectorName === sectorName);
            if (!sectorData) return;

            if (!sectorsByType[sectorName]) {
                sectorsByType[sectorName] = [];
            }
            sectorsByType[sectorName].push(sectorData);
        });

        // Calculate resource scenarios for each resource type
        Object.values(sectorsByType).forEach(sectors => {
            if (sectors.length === 0) return;
            
            const sectorData = sectors[0]; // All sectors of same type have same events
            const sectorCount = sectors.length;
            
            // Calculate resource scenarios for this sector type
            this.processSectorTypeForResources(sectorData, sectorCount, results);
        });

        return results;
    }
    
    /**
     * Processes a sector type for resource calculations
     * @param {Object} sectorData - Sector configuration data
     * @param {number} sectorCount - Number of sectors of this type
     * @param {Object} results - Results object to update
     */
    processSectorTypeForResources(sectorData, sectorCount, results) {
        const totalWeight = Object.values(sectorData.explorationEvents).reduce((a, b) => a + b, 0);
        
        // Collect all resource events for this sector type
        const resourceEvents = {
            fruits: [],
            steaks: [],
            fuel: [],
            oxygen: [],
            artefacts: [],
            starmaps: []
        };
        
        // Analyze each event type for resources
        Object.entries(sectorData.explorationEvents).forEach(([event, weight]) => {
            const probability = weight / totalWeight;
            
            if (event.startsWith('HARVEST_')) {
                const amount = parseInt(event.split('_')[1]);
                resourceEvents.fruits.push({ amount, probability });
            } else if (event.startsWith('PROVISION_')) {
                const amount = parseInt(event.split('_')[1]);
                resourceEvents.steaks.push({ amount, probability });
            } else if (event.startsWith('FUEL_')) {
                const amount = parseInt(event.split('_')[1]);
                resourceEvents.fuel.push({ amount, probability });
            } else if (event.startsWith('OXYGEN_')) {
                const amount = parseInt(event.split('_')[1]);
                resourceEvents.oxygen.push({ amount, probability });
            } else if (event === 'ARTEFACT') {
                // Artefacts include starmaps (1/9 chance)
                resourceEvents.artefacts.push({ amount: 8/9, probability });
                resourceEvents.starmaps.push({ amount: 1/9, probability });
            } else if (event === 'STARMAP') {
                // Direct starmap events (like from crystal fields)
                resourceEvents.starmaps.push({ amount: 1, probability });
            }
        });
        
        // Calculate scenarios for each resource type
        Object.entries(resourceEvents).forEach(([resourceType, events]) => {
            if (events.length > 0) {
                const scenarios = this.calculateSectorResourceScenarios(events, sectorCount, resourceType);
                results[resourceType].pessimist += scenarios.pessimist;
                results[resourceType].average += scenarios.average;
                results[resourceType].optimist += scenarios.optimist;
            }
        });
    }
    
    /**
     * Calculates resource scenarios using binomial distribution for multiple sectors
     * @param {Array} events - Array of {amount, probability} for this resource type
     * @param {number} sectorCount - Number of sectors of this type
     * @param {string} resourceType - Type of resource (for custom rules)
     * @returns {Object} - Scenario results
     */
    calculateSectorResourceScenarios(events, sectorCount, resourceType) {
        // Calculate expected value per sector
        const expectedPerSector = events.reduce((sum, event) => sum + (event.amount * event.probability), 0);
        const average = expectedPerSector * sectorCount;
        
        // For percentile calculations, we need to simulate the distribution
        // of total resources from all sectors of this type
        const scenarios = this.calculatePercentiles(events, sectorCount);
        
        // Custom rule: Oxygen pessimist scenario is always 0
        const pessimist = resourceType === 'oxygen' ? 0 : scenarios.p25;
        
        return {
            pessimist: pessimist,
            average: average,
            optimist: scenarios.p75
        };
    }
    
    /**
     * Calculates 25th and 75th percentiles for resource distribution
     * @param {Array} events - Array of {amount, probability} for this resource type
     * @param {number} sectorCount - Number of sectors
     * @returns {Object} - Percentile results
     */
    calculatePercentiles(events, sectorCount) {
        // Create probability distribution for all possible outcomes
        const outcomes = new Map();
        
        // Generate all possible combinations for sectorCount sectors
        this.generateOutcomes(events, sectorCount, 0, 1, outcomes);
        
        // Convert to sorted array of [totalResources, probability]
        const sortedOutcomes = Array.from(outcomes.entries()).sort((a, b) => a[0] - b[0]);
        
        // Calculate cumulative probabilities to find percentiles
        let cumulative = 0;
        let p25 = 0;
        let p75 = 0;
        let foundP25 = false;
        let foundP75 = false;
        
        for (const [resources, probability] of sortedOutcomes) {
            cumulative += probability;
            
            if (!foundP25 && cumulative >= 0.25) {
                p25 = resources;
                foundP25 = true;
            }
            
            if (!foundP75 && cumulative >= 0.75) {
                p75 = resources;
                foundP75 = true;
                break;
            }
        }
        
        return { p25, p75 };
    }
    
    /**
     * Recursively generates all possible outcomes for multiple sectors
     * @param {Array} events - Available events
     * @param {number} sectorsLeft - Sectors remaining to process
     * @param {number} currentTotal - Current resource total
     * @param {number} currentProb - Current probability
     * @param {Map} outcomes - Map to store outcomes
     */
    generateOutcomes(events, sectorsLeft, currentTotal, currentProb, outcomes) {
        if (sectorsLeft === 0) {
            const existing = outcomes.get(currentTotal) || 0;
            outcomes.set(currentTotal, existing + currentProb);
            return;
        }
        
        // For each possible event in this sector
        events.forEach(event => {
            this.generateOutcomes(
                events,
                sectorsLeft - 1,
                currentTotal + event.amount,
                currentProb * event.probability,
                outcomes
            );
        });
        
        // Also consider "no resource event" (NOTHING_TO_REPORT, etc.)
        const totalProb = events.reduce((sum, event) => sum + event.probability, 0);
        const noResourceProb = Math.max(0, 1 - totalProb);
        
        if (noResourceProb > 0) {
            this.generateOutcomes(
                events,
                sectorsLeft - 1,
                currentTotal + 0,
                currentProb * noResourceProb,
                outcomes
            );
        }
    }
    
    /**
     * Calculates resource scenarios for all resource types (legacy method for backward compatibility)
     * @param {Object} resourceBreakdown - Resource breakdown data (not used in new approach)
     * @returns {Object} - Complete resource calculation results
     */
    calculateResourceScenarios(resourceBreakdown) {
        // This is a fallback method - in the new approach, we should call calculateResourceScenariosFromSectors directly
        // For now, return empty results to avoid errors
        return {
            fruits: { pessimist: 0, average: 0, optimist: 0 },
            steaks: { pessimist: 0, average: 0, optimist: 0 },
            fuel: { pessimist: 0, average: 0, optimist: 0 },
            oxygen: { pessimist: 0, average: 0, optimist: 0 },
            artefacts: { pessimist: 0, average: 0, optimist: 0 },
            starmaps: { pessimist: 0, average: 0, optimist: 0 }
        };
    }
}

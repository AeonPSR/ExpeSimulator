// Event Scenario Handler - Handles event scenario calculations similar to ResourceHandler

class EventScenarioHandler {
    constructor() {
        // Initialize any needed state
    }

    /**
     * Calculates event scenarios for selected sectors or modified sector data
     * @param {Array<string>|Map<string, Object>} selectedSectorsOrModifiedData - Array of selected sector names OR Map of modified sector data
     * @returns {Object} - Complete event calculation results
     */
    calculateEventScenariosFromSectors(selectedSectorsOrModifiedData) {
        const results = {
            playerLoss: { pessimist: 0, average: 0, optimist: 0 },
            rerolls: { pessimist: 0, average: 0, optimist: 0 },
            retreat: { pessimist: 0, average: 0, optimist: 0 },
            itemLoss: { pessimist: 0, average: 0, optimist: 0 },
            disease: { pessimist: 0, average: 0, optimist: 0 },
            mushTrap: { pessimist: 0, average: 0, optimist: 0 },
            killLost: { pessimist: 0, average: 0, optimist: 0 },
            killAll: { pessimist: 0, average: 0, optimist: 0 },
            killOne: { pessimist: 0, average: 0, optimist: 0 }
        };

        // Handle both old (array of sector names) and new (Map of modified data) input formats
        let sectorsByType = {};
        
        if (selectedSectorsOrModifiedData instanceof Map) {
            // New format: use modified sector data directly
            selectedSectorsOrModifiedData.forEach((sectorData, key) => {
                // Extract the original sector name from indexed keys like "INTELLIGENT_0", "INTELLIGENT_1", etc.
                const sectorName = key.includes('_') ? key.substring(0, key.lastIndexOf('_')) : key;
                
                if (!sectorsByType[sectorName]) {
                    sectorsByType[sectorName] = [];
                }
                sectorsByType[sectorName].push(sectorData);
            });
        } else {
            // Legacy format: look up sector data from PlanetSectorConfigData
            selectedSectorsOrModifiedData.forEach(sectorName => {
                const sectorData = PlanetSectorConfigData.find(s => s.sectorName === sectorName);
                if (!sectorData) return;

                if (!sectorsByType[sectorName]) {
                    sectorsByType[sectorName] = [];
                }
                sectorsByType[sectorName].push(sectorData);
            });
        }

        // Calculate event scenarios for each sector type
        Object.values(sectorsByType).forEach(sectors => {
            if (sectors.length === 0) return;
            
            const sectorData = sectors[0]; // All sectors of same type have same events
            const sectorCount = sectors.length;
            
            // Calculate event scenarios for this sector type
            this.processSectorTypeForEvents(sectorData, sectorCount, results);
        });

        return results;
    }
    
    /**
     * Processes a sector type for event calculations
     * @param {Object} sectorData - Sector configuration data
     * @param {number} sectorCount - Number of sectors of this type
     * @param {Object} results - Results object to update
     */
    processSectorTypeForEvents(sectorData, sectorCount, results) {
        const totalWeight = Object.values(sectorData.explorationEvents).reduce((a, b) => a + b, 0);
        
        // Collect all event events for this sector type
        const eventEvents = {
            playerLoss: [],
            rerolls: [],
            retreat: [],
            itemLoss: [],
            disease: [],
            mushTrap: [],
            killLost: [],
            killAll: [],
            killOne: []
        };
        
        // Analyze each event type for events
        Object.entries(sectorData.explorationEvents).forEach(([event, weight]) => {
            const probability = weight / totalWeight;
            
            if (event === 'PLAYER_LOST') {
                eventEvents.playerLoss.push({ amount: 1, probability });
            } else if (event === 'AGAIN') {
                eventEvents.rerolls.push({ amount: 1, probability });
            } else if (event === 'BACK') {
                eventEvents.retreat.push({ amount: 1, probability });
            } else if (event === 'ITEM_LOST') {
                eventEvents.itemLoss.push({ amount: 1, probability });
            } else if (event === 'DISEASE') {
                eventEvents.disease.push({ amount: 1, probability });
            } else if (event === 'MUSH_TRAP') {
                eventEvents.mushTrap.push({ amount: 1, probability });
            } else if (event === 'KILL_LOST') {
                eventEvents.killLost.push({ amount: 1, probability });
            } else if (event === 'KILL_ALL') {
                eventEvents.killAll.push({ amount: 1, probability });
            } else if (event === 'KILL_RANDOM') {
                eventEvents.killOne.push({ amount: 1, probability });
            }
        });
        
        // Calculate scenarios for each event type
        Object.entries(eventEvents).forEach(([eventType, events]) => {
            if (events.length > 0) {
                const scenarios = this.calculateSectorEventScenarios(events, sectorCount);
                results[eventType].pessimist += scenarios.pessimist;
                results[eventType].average += scenarios.average;
                results[eventType].optimist += scenarios.optimist;
            }
        });
    }
    
    /**
     * Calculates event scenarios using binomial distribution for multiple sectors
     * @param {Array} events - Array of {amount, probability} for this event type
     * @param {number} sectorCount - Number of sectors of this type
     * @returns {Object} - Scenario results
     */
    calculateSectorEventScenarios(events, sectorCount) {
        // Calculate expected value per sector
        const expectedPerSector = events.reduce((sum, event) => sum + (event.amount * event.probability), 0);
        const average = expectedPerSector * sectorCount;
        
        // For percentile calculations, we need to simulate the distribution
        // of total events from all sectors of this type
        const scenarios = this.calculatePercentiles(events, sectorCount);
        
        return {
            pessimist: scenarios.p25,
            average: average,
            optimist: scenarios.p75
        };
    }
    
    /**
     * Calculates 25th and 75th percentiles for event distribution
     * @param {Array} events - Array of {amount, probability} for this event type
     * @param {number} sectorCount - Number of sectors
     * @returns {Object} - Percentile results
     */
    calculatePercentiles(events, sectorCount) {
        // Create probability distribution for all possible outcomes
        const outcomes = new Map();
        
        // Generate all possible combinations for sectorCount sectors
        this.generateOutcomes(events, sectorCount, 0, 1, outcomes);
        
        // Convert to sorted array of [totalEvents, probability]
        const sortedOutcomes = Array.from(outcomes.entries()).sort((a, b) => a[0] - b[0]);
        
        // Calculate cumulative probabilities to find percentiles
        let cumulative = 0;
        let p25 = 0;
        let p75 = 0;
        let foundP25 = false;
        let foundP75 = false;
        
        for (const [events, probability] of sortedOutcomes) {
            cumulative += probability;
            
            if (!foundP25 && cumulative >= 0.25) {
                p25 = events;
                foundP25 = true;
            }
            
            if (!foundP75 && cumulative >= 0.75) {
                p75 = events;
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
     * @param {number} currentTotal - Current event total
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
        
        // Also consider "no event" (NOTHING_TO_REPORT, etc.)
        const totalProb = events.reduce((sum, event) => sum + event.probability, 0);
        const noEventProb = Math.max(0, 1 - totalProb);
        
        if (noEventProb > 0) {
            this.generateOutcomes(
                events,
                sectorsLeft - 1,
                currentTotal, // No change to total
                currentProb * noEventProb,
                outcomes
            );
        }
    }
}

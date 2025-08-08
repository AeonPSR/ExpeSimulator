// Event Damage Handler - Handles all random event damage calculations and logic

class EventDamageHandler {
    constructor() {
        // Initialize any needed state
    }
    


    /**
     * Processes event damage and groups them by damage type
     * @param {Object} eventBreakdown - Event breakdown from outcomes
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @returns {Object} - Processed event data
     */
    processEventBreakdown(eventBreakdown, playerManager = null) {
        const processedEvents = {};
        
        Object.entries(eventBreakdown).forEach(([damageKey, probabilities]) => {
            processedEvents[damageKey] = {
                sectorCount: probabilities.length,
                probability: probabilities[0], // Assuming all probabilities are the same
                damageValues: this.getDamageValues(damageKey, playerManager)
            };
        });
        
        return processedEvents;
    }

    /**
     * Calculates damage scenarios using binomial distribution
     * @param {number} n - Number of trials
     * @param {number} p - Probability per trial
     * @returns {Object} - Scenario results
     */
    calculateDamageScenarios(n, p) {
        // Calculate optimist scenario (25th percentile)
        let cumulativeProb = 0;
        let optimist = 0;
        let optimistProb = 0;
        for (let k = 0; k <= n; k++) {
            const binomialCoeff = factorial(n) / (factorial(k) * factorial(n - k));
            const prob = binomialCoeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
            cumulativeProb += prob;
            if (cumulativeProb >= 0.25) {
                optimist = k;
                optimistProb = prob;
                break;
            }
        }
        
        // Calculate pessimist scenario (75th percentile)
        let cumulativeProbFromTop = 0;
        let pessimist = n;
        let pessimistProb = 0;
        for (let k = n; k >= 0; k--) {
            const binomialCoeff = factorial(n) / (factorial(k) * factorial(n - k));
            const prob = binomialCoeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
            cumulativeProbFromTop += prob;
            if (cumulativeProbFromTop >= 0.25) {
                pessimist = k;
                pessimistProb = prob;
                break;
            }
        }
        
        // Calculate worst case scenario - event in every sector that can have an event
        // This is the true "worst case": maximum possible events
        const worstCase = n; // Event in all n sectors with events
        
        // Calculate the probability of getting exactly n events
        const worstCaseProb = Math.pow(p, n); // p^n for all successes
        
        return {
            optimist,
            pessimist,
            worstCase,
            optimistProb,
            pessimistProb,
            worstCaseProb
        };
    }

    /**
     * Gets appropriate damage values for different scenarios
     * @param {string} damageKey - The damage key (e.g., "TIRED_2", "ACCIDENT_3_5", "DISASTER_3_5", or multi-event sectors)
     * @param {Object} playerManager - The player manager instance to check for grenades
     * @returns {Object} - Damage values for different scenarios
     */
    getDamageValues(damageKey, playerManager = null) {
        let baseDamage;
        
        // Handle multi-event sectors with scenario-based event selection
        if (this.isMultiEventSector(damageKey)) {
            baseDamage = this.getDamageFromKey(damageKey);
        } else if (damageKey === 'TIRED_2') {
            // TIRED_2: Fixed 2 damage to all players in all scenarios
            baseDamage = {
                optimist: 2,
                average: 2,
                pessimist: 2,
                worstCase: 2
            };
        } else if (damageKey === 'ACCIDENT_3_5') {
            // ACCIDENT_3_5: Variable damage to single player
            baseDamage = {
                optimist: 3,    // Best case: minimum damage
                average: 4,     // Average case
                pessimist: 5,   // Pessimist case: maximum damage
                worstCase: 5    // Worst case: maximum damage
            };
        } else if (damageKey === 'DISASTER_3_5') {
            // DISASTER_3_5: Variable damage to all players
            baseDamage = {
                optimist: 3,    // Best case: minimum damage
                average: 4,     // Average case
                pessimist: 5,   // Pessimist case: maximum damage
                worstCase: 5    // Worst case: maximum damage
            };
        } else {
            // Fallback for other events (shouldn't happen with current events)
            const fixedDamage = parseInt(damageKey) || 0;
            baseDamage = {
                optimist: fixedDamage,
                average: fixedDamage,
                pessimist: fixedDamage,
                worstCase: fixedDamage
            };
        }
        
        const scenarios = ['optimist', 'average', 'pessimist', 'worstCase'];
        const damages = {};
        
        // For each scenario, use base damage values
        for (const scenario of scenarios) {
            damages[scenario] = baseDamage[scenario];
            
            // Check if we can use a grenade for this scenario
            if (playerManager && playerManager.getGrenadeCount() > 0 && damages[scenario] > 0) {
                // Calculate potential damage with grenade (reduces damage by 3)
                const damageWithGrenade = Math.max(0, baseDamage[scenario] - 3);
                
                // If using a grenade would help, simulate using it in this scenario
                if (damageWithGrenade < damages[scenario]) {
                    // Deep clone the player manager state for this scenario
                    const scenarioPlayerManager = {
                        players: playerManager.players.map(player => ({
                            ...player,
                            items: [...player.items]
                        }))
                    };
                    
                    // Look for a grenade in this scenario's inventory
                    const grenadeFound = scenarioPlayerManager.players.some(player => {
                        return player.items.some((item, index) => {
                            if (item && item.replace(/\.(jpg|png)$/, '') === 'grenade') {
                                // For simulation only - don't modify actual inventory
                                player.items[index] = null;
                                damages[scenario] = damageWithGrenade;
                                return true;
                            }
                            return false;
                        });
                    });
                }
            }
        }
        
        return damages;
    }

    /**
     * Builds source information for a damage instance by actually assigning specific sectors
     * @param {string} eventType - The event type (e.g., "ACCIDENT_3_5", "TIRED_2")
     * @param {number} instanceCount - Number of damage instances to assign sources for
     * @param {Map<string, Object>} modifiedSectorData - Modified sector data with sector IDs
     * @param {Set<string>} usedSectors - Set of already used sector keys in this scenario
     * @returns {Array<Object>} - Array of assigned sources with {sectorId, sectorName} for each instance
     */
    buildDamageSourceAssignments(eventType, instanceCount, modifiedSectorData, usedSectors = new Set()) {
        if (!modifiedSectorData || instanceCount <= 0) {
            return [];
        }

        console.log(`SOURCE ASSIGNMENT DEBUG: Building sources for ${eventType}, need ${instanceCount} instances`);
        console.log(`SOURCE ASSIGNMENT DEBUG: Used sectors:`, Array.from(usedSectors));
        console.log(`SOURCE ASSIGNMENT DEBUG: Total sectors in modifiedSectorData:`, modifiedSectorData.size);

        const availableSources = [];

        // Find all sectors that can generate this event type and haven't been used yet
        modifiedSectorData.forEach((sectorData, sectorKey) => {
            const sectorName = sectorKey.includes('_') ? sectorKey.substring(0, sectorKey.lastIndexOf('_')) : sectorKey;
            const sectorId = sectorKey.includes('_') ? sectorKey.substring(sectorKey.lastIndexOf('_') + 1) : '0';
            
            console.log(`SOURCE ASSIGNMENT DEBUG: Checking sector ${sectorKey} (name: ${sectorName}, id: ${sectorId})`);
            console.log(`SOURCE ASSIGNMENT DEBUG: Sector events:`, Object.keys(sectorData.explorationEvents || {}));
            
            // Skip if this sector has already been used in this scenario
            if (usedSectors.has(sectorKey)) {
                console.log(`SOURCE ASSIGNMENT DEBUG: Skipping ${sectorKey} - already used`);
                return;
            }
            
            // Check if this sector can generate the event
            let canGenerateEvent = false;
            
            // For multi-event sectors, check if they can generate this specific event type
            if (this.isMultiEventSector(sectorName)) {
                const possibleEvents = this.getPossibleEventsForSector(sectorName);
                canGenerateEvent = possibleEvents.includes(eventType);
                console.log(`SOURCE ASSIGNMENT DEBUG: ${sectorKey} is multi-event, possible events:`, possibleEvents, `can generate ${eventType}:`, canGenerateEvent);
            } else {
                // For single-event sectors, check if this sector directly generates this event
                canGenerateEvent = sectorData.explorationEvents && sectorData.explorationEvents[eventType];
                console.log(`SOURCE ASSIGNMENT DEBUG: ${sectorKey} is single-event, has ${eventType}:`, !!canGenerateEvent, `(weight: ${sectorData.explorationEvents ? sectorData.explorationEvents[eventType] : 'N/A'})`);
            }

            if (canGenerateEvent) {
                availableSources.push({
                    sectorId,
                    sectorName,
                    sectorKey
                });
                console.log(`SOURCE ASSIGNMENT DEBUG: Added ${sectorKey} as available source`);
            } else {
                console.log(`SOURCE ASSIGNMENT DEBUG: ${sectorKey} cannot generate ${eventType}`);
            }
        });

        console.log(`SOURCE ASSIGNMENT DEBUG: Found ${availableSources.length} available sources for ${eventType}:`, availableSources.map(s => s.sectorKey));

        // If no unused sources available, we have a problem - log warning and return empty
        if (availableSources.length === 0) {
            console.warn(`No available unused sources for ${eventType} (${instanceCount} instances needed). Used sectors:`, Array.from(usedSectors));
            return [];
        }

        // Assign specific sources for each damage instance
        const assignedSources = [];

        for (let i = 0; i < instanceCount; i++) {
            // If we need more instances than originally available sectors, we have a problem
            if (availableSources.length === 0) {
                console.warn(`Not enough unused sources for ${eventType}. Need ${instanceCount}, only have ${assignedSources.length} available.`);
                break;
            }
            
            // Randomly select a source from remaining available sources
            const availableIndex = Math.floor(Math.random() * availableSources.length);
            const selectedSource = availableSources[availableIndex];
            
            assignedSources.push({
                sectorId: selectedSource.sectorId,
                sectorName: selectedSource.sectorName
            });
            
            // Mark this source as used
            usedSectors.add(selectedSource.sectorKey);
            
            // Remove this source from available sources to prevent reuse within this event type
            availableSources.splice(availableIndex, 1);
        }

        return assignedSources;
    }

    /**
     * Calculates event damage scenarios for all event types using sequential grenade consumption.
     * This is the refactored version that relies on modifiedSectorData as the source of truth.
     * @param {Object} eventBreakdown - Event breakdown data from ProbabilityCalculator
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @param {Map<string, Object>} modifiedSectorData - Modified sector data with sector IDs
     * @returns {Object} - Complete damage calculation results
     */
    calculateEventDamageScenarios(eventBreakdown, playerManager = null, modifiedSectorData = null) {
        // In the new architecture, eventBreakdown is already correct.
        // No need to apply ability effects or filter for worst case here.
        const correctedEventBreakdown = this.correctEventBreakdownForMultiEventSectors(eventBreakdown, modifiedSectorData);
        
        let totalAverageDamage = 0;
        let totalOptimistDamage = 0;
        let totalPessimistDamage = 0;
        
        // Track used sectors for each scenario to prevent reuse
        const usedSectors = {
            optimist: new Set(),
            average: new Set(),
            pessimist: new Set(),
            worstCase: new Set()
        };
        
        // Calculate worst case damage directly from the corrected breakdown
        const worstCaseResult = this.calculateWorstCaseDamage(correctedEventBreakdown, playerManager, modifiedSectorData, usedSectors.worstCase);
        let totalWorstCaseDamage = worstCaseResult.totalDamage;

        // Initialize damage instances tracking
        const damageInstances = {
            optimist: [],
            average: [],
            pessimist: [],
            worstCase: worstCaseResult.instances
        };

        const damageCalculations = Object.entries(correctedEventBreakdown)
            .map(([damageKey, probabilities]) => {
                const n = probabilities.length;
                const p = probabilities[0];
                
                // Calculate how many events occur in each scenario
                const eventScenarios = this.calculateDamageScenarios(n, p);
                let expectedEvents = Math.round(n * p);
                
                // For multi-event sectors, override the event counts since only one event type can occur per sector
                if (this.isMultiEventSector(damageKey)) {
                    const eventTypes = this.getEventTypeByScenario(damageKey);
                    // Each scenario has at most 1 event (or 0 for optimist)
                    eventScenarios.optimist = eventTypes.optimist === 'NONE' ? 0 : 1;
                    eventScenarios.pessimist = eventTypes.pessimist === 'NONE' ? 0 : 1;
                    eventScenarios.worstCase = eventTypes.worstCase === 'NONE' ? 0 : 1;
                    // Average can use the expected number but cap it at the number of sectors
                    expectedEvents = eventTypes.average === 'NONE' ? 0 : Math.min(expectedEvents, n);
                }
                
                // Get base damage for this event type
                const baseDamage = this.getDamageFromKey(damageKey);
                
                // Calculate damage for each scenario with sequential grenade consumption
                const optimistDamage = this.calculateSequentialDamage(eventScenarios.optimist, baseDamage, playerManager, damageKey, 'optimist');
                const averageDamage = this.calculateSequentialDamage(expectedEvents, baseDamage, playerManager, damageKey, 'average');
                const pessimistDamage = this.calculateSequentialDamage(eventScenarios.pessimist, baseDamage, playerManager, damageKey, 'pessimist');
                
                // Collect damage instances for each scenario (skip if no events occur)
                if (eventScenarios.optimist > 0) {
                    const actualEventType = this.isMultiEventSector(damageKey) ? this.getEventTypeByScenario(damageKey).optimist : damageKey;
                    const sources = (actualEventType !== 'NONE') ? this.buildDamageSourceAssignments(actualEventType, eventScenarios.optimist, modifiedSectorData, usedSectors.optimist) : [];
                    damageInstances.optimist.push({
                        type: actualEventType !== 'NONE' ? actualEventType : damageKey,
                        count: eventScenarios.optimist,
                        damagePerInstance: optimistDamage / eventScenarios.optimist,
                        sources: sources
                    });
                }
                if (expectedEvents > 0) {
                    const actualEventType = this.isMultiEventSector(damageKey) ? this.getEventTypeByScenario(damageKey).average : damageKey;
                    const sources = (actualEventType !== 'NONE') ? this.buildDamageSourceAssignments(actualEventType, expectedEvents, modifiedSectorData, usedSectors.average) : [];
                    damageInstances.average.push({
                        type: actualEventType !== 'NONE' ? actualEventType : damageKey,
                        count: expectedEvents,
                        damagePerInstance: averageDamage / expectedEvents,
                        sources: sources
                    });
                }
                if (eventScenarios.pessimist > 0) {
                    const actualEventType = this.isMultiEventSector(damageKey) ? this.getEventTypeByScenario(damageKey).pessimist : damageKey;
                    const sources = (actualEventType !== 'NONE') ? this.buildDamageSourceAssignments(actualEventType, eventScenarios.pessimist, modifiedSectorData, usedSectors.pessimist) : [];
                    damageInstances.pessimist.push({
                        type: actualEventType !== 'NONE' ? actualEventType : damageKey,
                        count: eventScenarios.pessimist,
                        damagePerInstance: pessimistDamage / eventScenarios.pessimist,
                        sources: sources
                    });
                }
                
                const hasMultiEventSector = Object.keys(correctedEventBreakdown).some(key => this.isMultiEventSector(key));
                const isIndividualEventType = ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'].includes(damageKey);
                
                if (!hasMultiEventSector || !isIndividualEventType) {
                    totalOptimistDamage += optimistDamage;
                    totalAverageDamage += averageDamage;
                    totalPessimistDamage += pessimistDamage;
                }
                
                return eventScenarios;
            });

        // Calculate combined probabilities
        let combinedOptimistProb = 1;
        let combinedPessimistProb = 1;
        let combinedWorstCaseProb = 1;
        
        const hasMultiEventSector = Object.keys(correctedEventBreakdown).some(key => this.isMultiEventSector(key));
        
        damageCalculations.forEach((calc, index) => {
            const damageKey = Object.keys(correctedEventBreakdown)[index];
            const isIndividualEventType = ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'].includes(damageKey);
            
            if (!hasMultiEventSector || !isIndividualEventType) {
                combinedOptimistProb *= calc.optimistProb;
                combinedPessimistProb *= calc.pessimistProb;
                combinedWorstCaseProb *= calc.worstCaseProb;
            }
        });

        // Log damage instances for each scenario
        console.log('=== EVENT DAMAGE INSTANCES BREAKDOWN ===');
        ['optimist', 'average', 'pessimist', 'worstCase'].forEach(scenario => {
            console.log(`\n${scenario.toUpperCase()} Scenario:`);
            if (damageInstances[scenario].length === 0) {
                console.log('  No damage events');
            } else {
                damageInstances[scenario].forEach(instance => {
                    console.log(`  ${instance.count}x ${instance.type} (${instance.damagePerInstance} damage each) = ${instance.count * instance.damagePerInstance} total`);
                    if (instance.sources && instance.sources.length > 0) {
                        console.log(`    Sources: ${instance.sources.map(s => `${s.sectorName}#${s.sectorId}`).join(', ')}`);
                    }
                });
                const scenarioTotal = damageInstances[scenario].reduce((sum, instance) => sum + (instance.count * instance.damagePerInstance), 0);
                console.log(`  TOTAL: ${scenarioTotal} damage`);
            }
        });
        console.log('==========================================\n');

        return {
            totalAverageDamage,
            totalOptimistDamage,
            totalPessimistDamage,
            totalWorstCaseDamage,
            combinedOptimistProb,
            combinedPessimistProb,
            combinedWorstCaseProb,
            damageInstances
        };
    }

    /**
     * Converts individual event types to multi-event sectors when appropriate
     * @param {Object} eventBreakdown - Original event breakdown
     * @param {Map<string, Object>} modifiedSectorData - Modified sector data to get selected sectors
     * @returns {Object} - Corrected event breakdown with multi-event sectors
     */
    correctEventBreakdownForMultiEventSectors(eventBreakdown, modifiedSectorData) {
        if (!modifiedSectorData) {
            return eventBreakdown;
        }
        
        const selectedSectors = Array.from(modifiedSectorData.keys()).map(key => key.substring(0, key.lastIndexOf('_')));
        const correctedBreakdown = { ...eventBreakdown };
        
        // Check if we have any multi-event sectors selected
        selectedSectors.forEach(sectorName => {
            if (this.isMultiEventSector(sectorName)) {
                const possibleEvents = this.getPossibleEventsForSector(sectorName);
                
                // Check if ANY of the individual events from this multi-event sector exist in the breakdown
                // (not all, since abilities like Pilot can remove some events)
                const someEventsPresent = possibleEvents.some(eventType => correctedBreakdown[eventType]);
                
                if (someEventsPresent) {
                    // Calculate the combined probability of all damage events for this multi-event sector
                    // by summing the probabilities of all damage events that can occur in this sector
                    let combinedProbability = [];
                    let sectorLength = 0;
                    
                    // Get the length from any of the events (they should all be the same for the same sector)
                    const firstEvent = possibleEvents.find(eventType => correctedBreakdown[eventType]);
                    if (firstEvent) {
                        sectorLength = correctedBreakdown[firstEvent].length;
                        
                        // Initialize combined probability array with the same length
                        for (let i = 0; i < sectorLength; i++) {
                            combinedProbability.push(0);
                        }
                        
                        // Sum up probabilities from all damage events for this sector
                        possibleEvents.forEach(eventType => {
                            if (correctedBreakdown[eventType]) {
                                for (let i = 0; i < sectorLength; i++) {
                                    combinedProbability[i] += correctedBreakdown[eventType][i];
                                }
                            }
                        });
                    }
                    
                    // Add the multi-event sector entry with combined probabilities
                    correctedBreakdown[sectorName] = combinedProbability;
                    
                    // Remove the individual event entries
                    possibleEvents.forEach(eventType => {
                        delete correctedBreakdown[eventType];
                    });
                }
            }
        });
        
        return correctedBreakdown;
    }

    /**
     * Calculate worst case damage using the new approach:
     * 1. Handle multi-event sectors first, applying worst case event
     * 2. Handle remaining single events normally
     * @param {Object} eventBreakdown - Event breakdown data
     * @param {Object} playerManager - Player manager for grenade count
     * @param {Map<string, Object>} modifiedSectorData - Modified sector data with sector IDs
     * @param {Set<string>} usedSectors - Set of already used sector keys in this scenario
     * @returns {Object} - Object with totalDamage and instances array
     */
    calculateWorstCaseDamage(eventBreakdown, playerManager, modifiedSectorData = null, usedSectors = new Set()) {
        let totalDamage = 0;
        const instances = []; // Track damage instances for worst case
        
        let sectorsToProcess = [];
        if (modifiedSectorData) {
            // Get unique sector names from the modifiedSectorData map keys
            const sectorNamesWithIds = Array.from(modifiedSectorData.keys());
            sectorsToProcess = sectorNamesWithIds.map(key => key.substring(0, key.lastIndexOf('_')));
        } else {
            // Fallback: try to reconstruct from eventBreakdown (old approach)
            sectorsToProcess = Object.keys(eventBreakdown).filter(key => eventBreakdown[key].length > 0);
        }
        
        // Create a working copy of event counts for remaining events
        const remainingEvents = {};
        Object.entries(eventBreakdown).forEach(([eventType, probabilities]) => {
            if (!this.isMultiEventSector(eventType)) {
                remainingEvents[eventType] = probabilities.length; // Number of sectors with this event
            }
        });
        
        // First pass: Handle multi-event sectors using original sector list
        sectorsToProcess.forEach(sectorName => {
            if (this.isMultiEventSector(sectorName)) {
                const eventTypes = this.getEventTypeByScenario(sectorName);
                const worstCaseEventType = eventTypes.worstCase;
                
                if (worstCaseEventType !== 'NONE') {
                    // Calculate and add damage from this sector's worst case event
                    const baseDamage = this.getDamageFromKey(worstCaseEventType);
                    const sectorDamage = this.calculateSequentialDamage(1, baseDamage, playerManager, worstCaseEventType, 'worstCase');
                    
                    // Track this damage instance
                    const sources = this.buildDamageSourceAssignments(worstCaseEventType, 1, modifiedSectorData, usedSectors);
                    instances.push({
                        type: worstCaseEventType,
                        count: 1,
                        damagePerInstance: sectorDamage,
                        sources: sources
                    });
                    
                    totalDamage += sectorDamage;
                }
                
                // Remove one instance of each event type that can occur in this sector
                const possibleEvents = this.getPossibleEventsForSector(sectorName);
                possibleEvents.forEach(eventType => {
                    if (remainingEvents[eventType] && remainingEvents[eventType] > 0) {
                        remainingEvents[eventType]--;
                    }
                });
            }
        });
        
        // Second pass: Handle remaining single events normally
        Object.entries(remainingEvents).forEach(([eventType, remainingCount]) => {
            if (remainingCount > 0) {
                console.log(`WORST CASE DEBUG: Processing ${eventType} with ${remainingCount} remaining instances`);
                const baseDamage = this.getDamageFromKey(eventType);
                const eventDamage = this.calculateSequentialDamage(remainingCount, baseDamage, playerManager, eventType, 'worstCase');
                
                // Track this damage instance
                if (remainingCount > 0 && eventDamage > 0) {
                    const sources = this.buildDamageSourceAssignments(eventType, remainingCount, modifiedSectorData, usedSectors);
                    instances.push({
                        type: eventType,
                        count: remainingCount,
                        damagePerInstance: eventDamage / remainingCount,
                        sources: sources
                    });
                }
                
                totalDamage += eventDamage;
            }
        });
        
        return {
            totalDamage,
            instances
        };
    }
    
    /**
     * Get the possible event types that can occur in a specific multi-event sector
     * @param {string} sectorType - The sector type (LANDING, MOUNTAIN, COLD, HOT)
     * @returns {Array<string>} - Array of possible event types for this sector
     */
    getPossibleEventsForSector(sectorType) {
        if (sectorType === 'LANDING') {
            // LANDING can have TIRED_2, ACCIDENT_3_5, or DISASTER_3_5
            return ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'];
        } else if (sectorType === 'COLD' || sectorType === 'HOT' || sectorType === 'MOUNTAIN') {
            // These sectors can have TIRED_2 or ACCIDENT_3_5
            return ['TIRED_2', 'ACCIDENT_3_5'];
        }
        
        // For non-multi-event sectors, return empty array
        return [];
    }
    
    /**
     * Calculates event damage risks - compatible structure for UI display
     * @param {Object} eventBreakdown - Event breakdown data with structure: { TIRED_2: [...], ACCIDENT_3_5: [...], DISASTER_3_5: [...] }
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @returns {Object} - Risk data formatted for UI display
     */
    calculateEventDamageRisks(eventBreakdown, playerManager = null) {
        const risks = {};
        
        // Process each event type separately
        Object.entries(eventBreakdown).forEach(([eventType, probabilities]) => {
            if (probabilities && probabilities.length > 0) {
                const n = probabilities.length;
                const p = probabilities[0];
                const expectedEvents = n * p;
                
                // Calculate probability distribution
                let distributions = [];
                for (let k = 0; k <= n; k++) {
                    const binomialCoeff = factorial(n) / (factorial(k) * factorial(n - k));
                    const prob = binomialCoeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
                    
                    if (prob >= 0.01) {
                        distributions.push(`${k}: ${(prob * 100).toFixed(1)}%`);
                    }
                }
                
                // Map event types to display names
                let displayName;
                switch(eventType) {
                    case 'TIRED_2':
                        displayName = 'Fatigue (2 HP to all)';
                        break;
                    case 'ACCIDENT_3_5':
                        displayName = 'Accident (3-5 HP to one)';
                        break;
                    case 'DISASTER_3_5':
                        displayName = 'Disaster (3-5 HP to all)';
                        break;
                    default:
                        displayName = eventType;
                }
                
                risks[eventType] = {
                    expectedEvents,
                    distributions,
                    displayName
                };
            }
        });
        
        return risks;
    }
    
    /**
     * Calculate damage for a specific number of events using sequential grenade consumption
     * @param {number} numEvents - Number of events to process
     * @param {Object} baseDamage - Base damage values (use average for sequential processing)
     * @param {Object} playerManager - Player manager for grenade count
     * @param {string} damageKey - The damage key to determine how damage is applied
     * @param {string} scenario - The scenario for multi-event handling
     * @returns {number} - Total damage after sequential processing
     */
    calculateSequentialDamage(numEvents, baseDamage, playerManager, damageKey = '', scenario = 'average') {
        let remainingGrenades = playerManager ? playerManager.getGrenadeCount() : 0;
        let totalDamage = 0;
        
        // For multi-event sectors, get the actual event type for this scenario
        let actualEventType = damageKey;
        if (this.isMultiEventSector(damageKey)) {
            const eventTypes = this.getEventTypeByScenario(damageKey);
            actualEventType = eventTypes[scenario];
            
            // If no event occurs in this scenario, return 0 damage
            if (actualEventType === 'NONE') {
                return 0;
            }
        }
        
        // Use the damage value for this specific scenario
        const damagePerEvent = baseDamage[scenario];
        
        for (let i = 0; i < numEvents; i++) {
            let damage = damagePerEvent;
            
            // Apply grenade reduction if available and beneficial
            if (remainingGrenades > 0 && damage > 0) {
                const damageWithGrenade = Math.max(0, damagePerEvent - 3);
                if (damageWithGrenade < damage) {
                    damage = damageWithGrenade;
                    remainingGrenades--;
                }
            }
            
            // For all event types, damage value represents the actual damage amount
            // No need to multiply by player count - that's handled in distribution
            totalDamage += damage;
            // If actualEventType is 'NONE', damage stays 0 and nothing is added
        }
        
        return totalDamage;
    }

    /**
     * Extract damage value from damage key, handling multi-event sectors
     * @param {string} damageKey - The damage key (e.g., "TIRED_2", "ACCIDENT_3_5", "DISASTER_3_5", or sector names like "LANDING")
     * @returns {Object} - Damage values for different scenarios
     */
    getDamageFromKey(damageKey) {
        // Handle special multi-event sectors by delegating to the actual event that occurs
        if (this.isMultiEventSector(damageKey)) {
            const eventsByScenario = this.getEventTypeByScenario(damageKey);
            return {
                optimist: eventsByScenario.optimist === 'NONE' ? 0 : this.getDamageFromKey(eventsByScenario.optimist).optimist,
                average: eventsByScenario.average === 'NONE' ? 0 : this.getDamageFromKey(eventsByScenario.average).average,
                pessimist: eventsByScenario.pessimist === 'NONE' ? 0 : this.getDamageFromKey(eventsByScenario.pessimist).pessimist,
                worstCase: eventsByScenario.worstCase === 'NONE' ? 0 : this.getDamageFromKey(eventsByScenario.worstCase).worstCase
            };
        } else if (damageKey === 'TIRED_2') {
            // TIRED_2: Fixed 2 damage to all players in all scenarios
            return {
                optimist: 2,
                average: 2,
                pessimist: 2,
                worstCase: 2
            };
        } else if (damageKey === 'ACCIDENT_3_5') {
            // ACCIDENT_3_5: Variable damage to single player
            return {
                optimist: 3,
                average: 4,
                pessimist: 5,
                worstCase: 5
            };
        } else if (damageKey === 'DISASTER_3_5') {
            // DISASTER_3_5: Variable damage to all players
            return {
                optimist: 3,
                average: 4,
                pessimist: 5,
                worstCase: 5
            };
        } else {
            // Fallback for other events
            const fixedDamage = parseInt(damageKey) || 0;
            return {
                optimist: fixedDamage,
                average: fixedDamage,
                pessimist: fixedDamage,
                worstCase: fixedDamage
            };
        }
    }

    /**
     * Get the event type that occurs in each scenario for multi-event sectors
     * @param {string} damageKey - The damage key for multi-event sectors
     * @returns {Object} - Event types for each scenario
     */
    getEventTypeByScenario(damageKey) {
        if (damageKey === 'LANDING') {
            return {
                optimist: 'NONE',           // No damage event
                average: 'TIRED_2',         // TIRED_2 occurs
                pessimist: 'ACCIDENT_3_5',  // ACCIDENT_3_5 occurs
                worstCase: 'DISASTER_3_5'   // DISASTER_3_5 occurs
            };
        } else if (damageKey === 'COLD' || damageKey === 'HOT' || damageKey === 'MOUNTAIN') {
            return {
                optimist: 'NONE',           // No damage event
                average: 'TIRED_2',         // TIRED_2 occurs  
                pessimist: 'ACCIDENT_3_5',  // ACCIDENT_3_5 occurs
                worstCase: 'ACCIDENT_3_5'   // ACCIDENT_3_5 occurs
            };
        }
        
        // For regular single-event sectors, return the same event for all scenarios
        return {
            optimist: damageKey,
            average: damageKey,
            pessimist: damageKey,
            worstCase: damageKey
        };
    }

    /**
     * Check if a damage key represents a multi-event sector
     * @param {string} damageKey - The damage key to check
     * @returns {boolean} - True if it's a multi-event sector
     */
    isMultiEventSector(damageKey) {
        return ['LANDING', 'MOUNTAIN', 'COLD', 'HOT'].includes(damageKey);
    }
}

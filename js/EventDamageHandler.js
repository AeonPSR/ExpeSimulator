// Event Damage Handler - Handles all random event damage calculations and logic

class EventDamageHandler {
    constructor() {
        // Initialize any needed state
    }
    
    /**
     * Apply fighting power reduction to damage
     * @param {number} damage - Raw damage amount
     * @param {number} fightingPower - Fighting power to reduce damage
     * @returns {number} - Damage after reduction (minimum 0)
     */
    applyFightingPowerReduction(damage, fightingPower) {
        return Math.max(0, damage - fightingPower);
    }

    /**
     * Processes event damage and groups them by damage type
     * @param {Object} eventBreakdown - Event breakdown from outcomes
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @returns {Object} - Processed event data
     */
    processEventBreakdown(eventBreakdown, fightingPower = 0, playerManager = null) {
        const processedEvents = {};
        
        Object.entries(eventBreakdown).forEach(([damageKey, probabilities]) => {
            processedEvents[damageKey] = {
                sectorCount: probabilities.length,
                probability: probabilities[0], // Assuming all probabilities are the same
                damageValues: this.getDamageValues(damageKey, fightingPower, playerManager)
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
            if (cumulativeProbFromTop >= 0.25 && pessimist === n) {
                pessimist = k;
                pessimistProb = prob;
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
     * Gets appropriate damage values for different scenarios, applying fighting power reduction
     * @param {string} damageKey - The damage key (e.g., "TIRED_2", "ACCIDENT_3_5", "DISASTER_3_5", or multi-event sectors)
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance to check for grenades
     * @returns {Object} - Damage values for different scenarios
     */
    getDamageValues(damageKey, fightingPower = 0, playerManager = null) {
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
        
        // For each scenario, create a separate calculation with its own inventory
        for (const scenario of scenarios) {
            // Start with base damage without grenade
            damages[scenario] = this.applyFightingPowerReduction(baseDamage[scenario], fightingPower);
            
            // Check if we can use a grenade for this scenario
            if (playerManager && playerManager.getGrenadeCount() > 0 && damages[scenario] > 0) {
                // Calculate potential damage with grenade
                const damageWithGrenade = this.applyFightingPowerReduction(baseDamage[scenario], fightingPower + 3);
                
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
     * Calculates event damage scenarios for all event types using sequential grenade consumption
     * @param {Object} eventBreakdown - Event breakdown data
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @param {Object} sectorManager - The sector manager instance to get original sector list
     * @returns {Object} - Complete damage calculation results
     */
    calculateEventDamageScenarios(eventBreakdown, fightingPower = 0, playerManager = null, sectorManager = null) {
        let totalAverageDamage = 0;
        let totalOptimistDamage = 0;
        let totalPessimistDamage = 0;
        let totalWorstCaseDamage = 0;
        
        // Per-player damage information
        const playerCount = playerManager ? playerManager.players.filter(p => p !== null).length : 1;
        let perPlayerDamage = {
            optimist: Array(playerCount).fill(0),
            average: Array(playerCount).fill(0),
            pessimist: Array(playerCount).fill(0),
            worstCase: Array(playerCount).fill(0)
        };

        // Calculate worst case damage using the new approach
        totalWorstCaseDamage = this.calculateWorstCaseDamage(eventBreakdown, fightingPower, playerManager, perPlayerDamage.worstCase, sectorManager);

        const damageCalculations = Object.entries(eventBreakdown)
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
                const optimistDamage = this.calculateSequentialDamage(eventScenarios.optimist, baseDamage, fightingPower, playerManager, damageKey, 'optimist');
                const averageDamage = this.calculateSequentialDamage(expectedEvents, baseDamage, fightingPower, playerManager, damageKey, 'average');
                const pessimistDamage = this.calculateSequentialDamage(eventScenarios.pessimist, baseDamage, fightingPower, playerManager, damageKey, 'pessimist');
                
                // Distribute damage among players for each scenario (worst case handled separately)
                this.distributePlayerDamage(optimistDamage, perPlayerDamage.optimist, damageKey, 'optimist');
                this.distributePlayerDamage(averageDamage, perPlayerDamage.average, damageKey, 'average');
                this.distributePlayerDamage(pessimistDamage, perPlayerDamage.pessimist, damageKey, 'pessimist');
                
                // Only add damage if this is not an individual event type that's part of a multi-event sector
                // (Skip TIRED_2, ACCIDENT_3_5, DISASTER_3_5 if we have LANDING, MOUNTAIN, COLD, or HOT)
                const hasMultiEventSector = Object.keys(eventBreakdown).some(key => this.isMultiEventSector(key));
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
        
        damageCalculations.forEach(calc => {
            combinedOptimistProb *= calc.optimistProb;
            combinedPessimistProb *= calc.pessimistProb;
            combinedWorstCaseProb *= calc.worstCaseProb;
        });

        return {
            totalAverageDamage,
            totalOptimistDamage,
            totalPessimistDamage,
            totalWorstCaseDamage,
            combinedOptimistProb,
            combinedPessimistProb,
            combinedWorstCaseProb,
            perPlayerDamage
        };
    }

    /**
     * Calculate worst case damage using the new approach:
     * 1. Handle multi-event sectors first, applying worst case event
     * 2. Handle remaining single events normally
     * @param {Object} eventBreakdown - Event breakdown data
     * @param {number} fightingPower - Fighting power to reduce damage
     * @param {Object} playerManager - Player manager for grenade count
     * @param {Array<number>} worstCasePlayerDamage - Array to fill with per-player damage
     * @param {Object} sectorManager - Sector manager to get original sector list
     * @returns {number} - Total worst case damage
     */
    calculateWorstCaseDamage(eventBreakdown, fightingPower, playerManager, worstCasePlayerDamage, sectorManager = null) {
        let totalDamage = 0;
        
        console.log('EventBreakdown in calculateWorstCaseDamage:', eventBreakdown);
        
        // Get the original sector list instead of using the processed eventBreakdown
        let sectorsToProcess = [];
        if (sectorManager && typeof sectorManager.getSelectedSectors === 'function') {
            sectorsToProcess = sectorManager.getSelectedSectors();
            console.log('Using sector list from sectorManager:', sectorsToProcess);
        } else {
            // Fallback: try to reconstruct from eventBreakdown (old approach)
            console.log('No sectorManager available, using fallback approach');
            sectorsToProcess = Object.keys(eventBreakdown).filter(key => eventBreakdown[key].length > 0);
        }
        
        // Create a working copy of event counts for remaining events
        const remainingEvents = {};
        Object.entries(eventBreakdown).forEach(([eventType, probabilities]) => {
            if (!this.isMultiEventSector(eventType)) {
                remainingEvents[eventType] = probabilities.length; // Number of sectors with this event
            }
        });
        
        console.log('Initial remaining events:', remainingEvents);
        
        // First pass: Handle multi-event sectors using original sector list
        sectorsToProcess.forEach(sectorName => {
            if (this.isMultiEventSector(sectorName)) {
                console.log(`Processing multi-event sector: ${sectorName}`);
                
                const eventTypes = this.getEventTypeByScenario(sectorName);
                const worstCaseEventType = eventTypes.worstCase;
                
                if (worstCaseEventType !== 'NONE') {
                    // Calculate and add damage from this sector's worst case event
                    const baseDamage = this.getDamageFromKey(worstCaseEventType);
                    const sectorDamage = this.calculateSequentialDamage(1, baseDamage, fightingPower, playerManager, worstCaseEventType, 'worstCase');
                    
                    console.log(`${sectorName}: ${worstCaseEventType} deals ${sectorDamage} damage`);
                    
                    // Distribute this sector's damage
                    this.distributePlayerDamage(sectorDamage, worstCasePlayerDamage, worstCaseEventType, 'worstCase');
                    totalDamage += sectorDamage;
                }
                
                // Remove one instance of each event type that can occur in this sector
                const possibleEvents = this.getPossibleEventsForSector(sectorName);
                possibleEvents.forEach(eventType => {
                    if (remainingEvents[eventType] && remainingEvents[eventType] > 0) {
                        remainingEvents[eventType]--;
                        console.log(`Removed one ${eventType} event for ${sectorName}. Remaining: ${remainingEvents[eventType]}`);
                    } else if (remainingEvents[eventType] !== undefined) {
                        console.error(`Attempted to remove ${eventType} event for ${sectorName} sector, but no instances remain. Remaining: ${remainingEvents[eventType]}`);
                    }
                });
            }
        });
        
        console.log('Remaining events after multi-event processing:', remainingEvents);
        
        // Second pass: Handle remaining single events normally
        Object.entries(remainingEvents).forEach(([eventType, remainingCount]) => {
            if (remainingCount > 0) {
                console.log(`Processing remaining single event: ${eventType} with ${remainingCount} sectors`);
                const baseDamage = this.getDamageFromKey(eventType);
                const eventDamage = this.calculateSequentialDamage(remainingCount, baseDamage, fightingPower, playerManager, eventType, 'worstCase');
                
                console.log(`Remaining ${eventType} deals ${eventDamage} total damage`);
                
                // Distribute total damage from remaining events of this type
                this.distributePlayerDamage(eventDamage, worstCasePlayerDamage, eventType, 'worstCase');
                totalDamage += eventDamage;
            }
        });
        
        console.log(`Total worst case damage: ${totalDamage}`);
        return totalDamage;
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
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @returns {Object} - Risk data formatted for UI display
     */
    calculateEventDamageRisks(eventBreakdown, fightingPower = 0, playerManager = null) {
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
     * Distributes total damage among players based on event type
     * @param {number} totalDamage - Total damage to distribute
     * @param {Array<number>} playerDamageArray - Array to update with per-player damage
     * @param {string} damageKey - The damage key to determine distribution type
     * @param {string} scenario - The scenario (optimist, average, pessimist, worstCase) for multi-event handling
     */
    distributePlayerDamage(totalDamage, playerDamageArray, damageKey = '', scenario = 'average') {
        const playerCount = playerDamageArray.length;
        if (playerCount === 0) return;
        
        // For multi-event sectors, get the actual event type for this scenario
        let actualEventType = damageKey;
        if (this.isMultiEventSector(damageKey)) {
            const eventTypes = this.getEventTypeByScenario(damageKey);
            actualEventType = eventTypes[scenario];
            
            // If no event occurs in this scenario, don't distribute damage
            if (actualEventType === 'NONE') {
                return;
            }
        }
        
        // ACCIDENT_3_5 targets a single player, others target all players
        if (actualEventType === 'ACCIDENT_3_5') {
            // Single target damage - give all damage to one player (randomly distributed)
            const targetPlayerIndex = Math.floor(Math.random() * playerCount);
            playerDamageArray[targetPlayerIndex] += totalDamage;
        } else {
            // Multi-target damage (TIRED_2, DISASTER_3_5) - distribute among all players
            // Calculate base damage per player (integer division)
            const baseDamagePerPlayer = Math.floor(totalDamage / playerCount);
            
            // Calculate remainder damage to distribute
            const remainderDamage = totalDamage - (baseDamagePerPlayer * playerCount);
            
            // Distribute base damage to all players
            for (let i = 0; i < playerCount; i++) {
                playerDamageArray[i] += baseDamagePerPlayer;
            }
            
            // Distribute remainder damage (1 point each to the first remainderDamage players)
            for (let i = 0; i < remainderDamage; i++) {
                playerDamageArray[i % playerCount]++;
            }
        }
    }

    /**
     * Calculate damage for a specific number of events using sequential grenade consumption
     * @param {number} numEvents - Number of events to process
     * @param {Object} baseDamage - Base damage values (use average for sequential processing)
     * @param {number} fightingPower - Fighting power to reduce damage
     * @param {Object} playerManager - Player manager for grenade count
     * @param {string} damageKey - The damage key to determine how damage is applied
     * @param {string} scenario - The scenario for multi-event handling
     * @returns {number} - Total damage after sequential processing
     */
    calculateSequentialDamage(numEvents, baseDamage, fightingPower, playerManager, damageKey = '', scenario = 'average') {
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
            
            // Apply fighting power reduction
            damage = this.applyFightingPowerReduction(damage, fightingPower);
            
            // Apply grenade reduction if available and beneficial
            if (remainingGrenades > 0 && damage > 0) {
                const damageWithGrenade = this.applyFightingPowerReduction(damagePerEvent, fightingPower + 3);
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

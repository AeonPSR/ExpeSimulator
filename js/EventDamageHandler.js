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
     * Calculates event damage scenarios for all event types using sequential grenade consumption
     * @param {Object} eventBreakdown - Event breakdown data
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @param {Object} sectorManager - The sector manager instance to get original sector list
     * @returns {Object} - Complete damage calculation results
     */
    calculateEventDamageScenarios(eventBreakdown, playerManager = null, sectorManager = null) {
        // Apply ability effects to the event breakdown before calculating damage
        const modifiedEventBreakdown = this.applyAbilityEffects(eventBreakdown, playerManager, sectorManager);
        
        let totalAverageDamage = 0;
        let totalOptimistDamage = 0;
        let totalPessimistDamage = 0;
        let totalWorstCaseDamage = 0;
        
        // Calculate worst case damage using the new approach
        const worstCaseResult = this.calculateWorstCaseDamage(modifiedEventBreakdown, playerManager, sectorManager);
        totalWorstCaseDamage = worstCaseResult.totalDamage;

        // Initialize damage instances tracking
        const damageInstances = {
            optimist: [],
            average: [],
            pessimist: [],
            worstCase: worstCaseResult.instances
        };

        const damageCalculations = Object.entries(modifiedEventBreakdown)
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
                    damageInstances.optimist.push({
                        type: damageKey,
                        count: eventScenarios.optimist,
                        damagePerInstance: optimistDamage / eventScenarios.optimist
                    });
                }
                if (expectedEvents > 0) {
                    damageInstances.average.push({
                        type: damageKey,
                        count: expectedEvents,
                        damagePerInstance: averageDamage / expectedEvents
                    });
                }
                if (eventScenarios.pessimist > 0) {
                    damageInstances.pessimist.push({
                        type: damageKey,
                        count: eventScenarios.pessimist,
                        damagePerInstance: pessimistDamage / eventScenarios.pessimist
                    });
                }
                
                // Only add damage if this is not an individual event type that's part of a multi-event sector
                // (Skip TIRED_2, ACCIDENT_3_5, DISASTER_3_5 if we have LANDING, MOUNTAIN, COLD, or HOT)
                const hasMultiEventSector = Object.keys(modifiedEventBreakdown).some(key => this.isMultiEventSector(key));
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

        // Log damage instances for each scenario
        console.log('=== EVENT DAMAGE INSTANCES BREAKDOWN ===');
        ['optimist', 'average', 'pessimist', 'worstCase'].forEach(scenario => {
            console.log(`\n${scenario.toUpperCase()} Scenario:`);
            if (damageInstances[scenario].length === 0) {
                console.log('  No damage events');
            } else {
                damageInstances[scenario].forEach(instance => {
                    console.log(`  ${instance.count}x ${instance.type} (${instance.damagePerInstance} damage each) = ${instance.count * instance.damagePerInstance} total`);
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
     * Apply ability effects to the event breakdown
     * @param {Object} eventBreakdown - Original event breakdown
     * @param {Object} playerManager - Player manager to get abilities
     * @param {Object} sectorManager - Sector manager to get sector list
     * @returns {Object} - Modified event breakdown with ability effects applied
     */
    applyAbilityEffects(eventBreakdown, playerManager, sectorManager) {
        if (!playerManager || !playerManager.players) {
            return eventBreakdown;
        }

        // Get all active abilities from all players
        const activeAbilities = new Set();
        playerManager.players.forEach(player => {
            if (player.abilities) {
                player.abilities.forEach(ability => {
                    if (ability) {
                        const abilityKey = ability.replace(/\.(png|jpg)$/, '');
                        activeAbilities.add(abilityKey);
                    }
                });
            }
        });

        // If no abilities, return original breakdown
        if (activeAbilities.size === 0) {
            return eventBreakdown;
        }

        // Create a copy of the event breakdown
        const modifiedBreakdown = JSON.parse(JSON.stringify(eventBreakdown));

        // Get sector list for sector-specific modifications
        let sectors = [];
        if (sectorManager && typeof sectorManager.getSelectedSectors === 'function') {
            sectors = sectorManager.getSelectedSectors();
        }

        // Apply ability effects
        activeAbilities.forEach(abilityKey => {
            const abilityConfig = AbilityEffects[abilityKey];
            if (!abilityConfig || !abilityConfig.effects) return;

            const effects = abilityConfig.effects;

            // Handle sector-specific modifications (like Pilot ability)
            if (effects.sectorModifications) {
                sectors.forEach(sectorName => {
                    if (effects.sectorModifications[sectorName]) {
                        const modifications = effects.sectorModifications[sectorName];
                        
                        // Remove events as specified by the ability
                        if (modifications.removeEvents) {
                            modifications.removeEvents.forEach(eventType => {
                                // Remove the event type completely from the breakdown
                                if (modifiedBreakdown[eventType]) {
                                    delete modifiedBreakdown[eventType];
                                }
                            });
                        }
                    }
                });
            }
        });

        return modifiedBreakdown;
    }

    /**
     * Calculate worst case damage using the new approach:
     * 1. Handle multi-event sectors first, applying worst case event
     * 2. Handle remaining single events normally
     * @param {Object} eventBreakdown - Event breakdown data
     * @param {Object} playerManager - Player manager for grenade count
     * @param {Object} sectorManager - Sector manager to get original sector list
     * @returns {Object} - Object with totalDamage and instances array
     */
    calculateWorstCaseDamage(eventBreakdown, playerManager, sectorManager = null) {
        let totalDamage = 0;
        const instances = []; // Track damage instances for worst case
        
        // Get the original sector list instead of using the processed eventBreakdown
        let sectorsToProcess = [];
        if (sectorManager && typeof sectorManager.getSelectedSectors === 'function') {
            sectorsToProcess = sectorManager.getSelectedSectors();
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
                    instances.push({
                        type: worstCaseEventType,
                        count: 1,
                        damagePerInstance: sectorDamage
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
                const baseDamage = this.getDamageFromKey(eventType);
                const eventDamage = this.calculateSequentialDamage(remainingCount, baseDamage, playerManager, eventType, 'worstCase');
                
                // Track this damage instance
                if (remainingCount > 0 && eventDamage > 0) {
                    instances.push({
                        type: eventType,
                        count: remainingCount,
                        damagePerInstance: eventDamage / remainingCount
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

// Fight Handler - Handles all fight-related calculations and logic

class FightHandler {
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
        
        // Calculate worst case scenario - fight in every sector that can have a fight
        // This is the true "worst case": maximum possible fights
        const worstCase = n; // Fight in all n sectors with fight events
        
        // Calculate the probability of getting exactly n fights
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
     * @param {string} damageKey - The damage key (e.g., "12" or "Variable (8/10/12/15/18/32)")
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance to check for grenades
     * @returns {Object} - Damage values for different scenarios
     */
    getDamageValues(damageKey, fightingPower = 0, playerManager = null) {
        let baseDamage;
        
        if (damageKey === 'Variable (8/10/12/15/18/32)') {
            // Variable damage fight: use different values for different scenarios
            baseDamage = {
                optimist: 8,    // Best case: minimum damage
                average: 17.5,  // Average case: mathematical expectation
                pessimist: 25,  // Pessimist case: higher than average (roughly 75th percentile)
                worstCase: 32   // Worst case: maximum damage
            };
        } else {
            // Fixed damage fight: same value for all scenarios
            const fixedDamage = parseInt(damageKey);
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
     * Builds source information for a combat damage instance by assigning specific sectors
     * @param {string} fightType - The fight type (e.g., "12", "Variable (8/10/12/15/18/32)")
     * @param {number} instanceCount - Number of combat instances to assign sources for
     * @param {Map<string, Object>} modifiedSectorData - Modified sector data with sector IDs
     * @param {Set<string>} usedSectors - Set of already used sector keys in this scenario
     * @returns {Array<Object>} - Array of assigned sources with {sectorId, sectorName} for each instance
     */
    buildCombatSourceAssignments(fightType, instanceCount, modifiedSectorData, usedSectors = new Set()) {
        if (!modifiedSectorData || instanceCount <= 0) {
            return [];
        }

        console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: Building sources for ${fightType}, need ${instanceCount} instances`);
        console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: Used sectors:`, Array.from(usedSectors));

        const availableSources = [];

        // Find all sectors that can generate this fight type and haven't been used yet
        modifiedSectorData.forEach((sectorData, sectorKey) => {
            const sectorName = sectorKey.includes('_') ? sectorKey.substring(0, sectorKey.lastIndexOf('_')) : sectorKey;
            const sectorId = sectorKey.includes('_') ? sectorKey.substring(sectorKey.lastIndexOf('_') + 1) : '0';
            
            console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: Checking sector ${sectorKey} (name: ${sectorName}, id: ${sectorId})`);
            
            // Skip if this sector has already been used in this scenario
            if (usedSectors.has(sectorKey)) {
                console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: Skipping ${sectorKey} - already used`);
                return;
            }
            
            // Check if this sector can generate the combat type
            let canGenerateEvent = false;
            
            // Check for fight events in this sector
            if (sectorData.explorationEvents) {
                Object.keys(sectorData.explorationEvents).forEach(eventKey => {
                    if (eventKey.startsWith('FIGHT_')) {
                        let fightDamageKey;
                        if (eventKey === 'FIGHT_8_10_12_15_18_32') {
                            fightDamageKey = 'Variable (8/10/12/15/18/32)';
                        } else {
                            fightDamageKey = eventKey.split('_')[1].toString();
                        }
                        
                        if (fightDamageKey === fightType) {
                            canGenerateEvent = true;
                            console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: ${sectorKey} can generate ${fightType} (event: ${eventKey})`);
                        }
                    }
                });
            }

            if (canGenerateEvent) {
                availableSources.push({
                    sectorId,
                    sectorName,
                    sectorKey
                });
                console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: Added ${sectorKey} as available source`);
            } else {
                console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: ${sectorKey} cannot generate ${fightType}`);
            }
        });

        console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: Found ${availableSources.length} available sources for ${fightType}:`, availableSources.map(s => s.sectorKey));

        // If no unused sources available, log warning and return empty
        if (availableSources.length === 0) {
            console.warn(`No available unused sources for ${fightType} (${instanceCount} instances needed). Used sectors:`, Array.from(usedSectors));
            return [];
        }

        // Assign specific sources for each combat instance
        const assignedSources = [];

        for (let i = 0; i < instanceCount; i++) {
            // If we need more instances than available sectors, we have a problem
            if (availableSources.length === 0) {
                console.warn(`Not enough unused sources for ${fightType}. Need ${instanceCount}, only have ${assignedSources.length} available.`);
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
            
            // Remove this source from available sources to prevent reuse within this fight type
            availableSources.splice(availableIndex, 1);
        }

        console.log(`COMBAT SOURCE ASSIGNMENT DEBUG: Assigned ${assignedSources.length} sources for ${fightType}:`, assignedSources.map(s => `${s.sectorName}#${s.sectorId}`));

        return assignedSources;
    }

    /**
     * Calculates combat damage scenarios for all fight types using sequential grenade consumption
     * @param {Object} fightBreakdown - Fight breakdown data
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @param {Map<string, Object>} modifiedSectorData - The modified sector data for filtering.
     * @returns {Object} - Complete damage calculation results
     */
    calculateCombatDamageScenarios(fightBreakdown, fightingPower = 0, playerManager = null, modifiedSectorData = null) {
        let totalAverageDamage = 0;
        let totalOptimistDamage = 0;
        let totalPessimistDamage = 0;
        let totalWorstCaseDamage = 0;
        
        // Track used sectors for each scenario to prevent reuse
        const usedSectors = {
            optimist: new Set(),
            average: new Set(),
            pessimist: new Set(),
            worstCase: new Set()
        };
        
        // Initialize damage instances tracking
        const damageInstances = {
            optimist: [],
            average: [],
            pessimist: [],
            worstCase: []
        };

        // Filter fight breakdown for worst case scenario based on player count and fightVsDamageThreshold
        // NOTE: This filtering is now handled by ProbabilityCalculator, so we use the original breakdown

        const damageCalculations = Object.entries(fightBreakdown)
            .map(([damageKey, probabilities]) => {
                const n = probabilities.length;
                const p = probabilities[0];
                
                // Calculate how many fights occur in each scenario
                const fightScenarios = this.calculateDamageScenarios(n, p);
                const expectedFights = Math.round(n * p);
                
                // Use original breakdown for all scenarios (ProbabilityCalculator will handle filtering)
                const worstCaseCount = fightScenarios.worstCase;
                
                // Generate source assignments for each scenario
                const optimistSources = this.buildCombatSourceAssignments(damageKey, fightScenarios.optimist, modifiedSectorData, usedSectors.optimist);
                const averageSources = this.buildCombatSourceAssignments(damageKey, expectedFights, modifiedSectorData, usedSectors.average);
                const pessimistSources = this.buildCombatSourceAssignments(damageKey, fightScenarios.pessimist, modifiedSectorData, usedSectors.pessimist);
                const worstCaseSources = this.buildCombatSourceAssignments(damageKey, worstCaseCount, modifiedSectorData, usedSectors.worstCase);
                
                // Get base damage for this fight type
                const baseDamage = this.getDamageFromKey(damageKey);
                
                // Calculate damage for each scenario with sequential grenade consumption
                const optimistDamage = this.calculateSequentialDamage(fightScenarios.optimist, baseDamage, fightingPower, playerManager);
                const averageDamage = this.calculateSequentialDamage(expectedFights, baseDamage, fightingPower, playerManager);
                const pessimistDamage = this.calculateSequentialDamage(fightScenarios.pessimist, baseDamage, fightingPower, playerManager);
                const worstCaseDamage = this.calculateSequentialDamage(worstCaseCount, baseDamage, fightingPower, playerManager);
                
                // Collect damage instances for each scenario with source tracking (skip if no fights occur)
                if (fightScenarios.optimist > 0) {
                    damageInstances.optimist.push({
                        type: damageKey,
                        count: fightScenarios.optimist,
                        damagePerInstance: optimistDamage / fightScenarios.optimist,
                        sources: optimistSources
                    });
                }
                if (expectedFights > 0) {
                    damageInstances.average.push({
                        type: damageKey,
                        count: expectedFights,
                        damagePerInstance: averageDamage / expectedFights,
                        sources: averageSources
                    });
                }
                if (fightScenarios.pessimist > 0) {
                    damageInstances.pessimist.push({
                        type: damageKey,
                        count: fightScenarios.pessimist,
                        damagePerInstance: pessimistDamage / fightScenarios.pessimist,
                        sources: pessimistSources
                    });
                }
                if (worstCaseCount > 0) {
                    damageInstances.worstCase.push({
                        type: damageKey,
                        count: worstCaseCount,
                        damagePerInstance: worstCaseDamage / worstCaseCount,
                        sources: worstCaseSources
                    });
                }
                
                totalOptimistDamage += optimistDamage;
                totalAverageDamage += averageDamage;
                totalPessimistDamage += pessimistDamage;
                totalWorstCaseDamage += worstCaseDamage;
                
                return {
                    ...fightScenarios,
                    worstCase: worstCaseCount // Use original worst case count
                };
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
            damageInstances
        };
    }
    
    /**
     * Calculate damage for a specific number of fights using sequential grenade consumption
     * @param {number} numFights - Number of fights to process
     * @param {Object} baseDamage - Base damage values (use average for sequential processing)
     * @param {number} fightingPower - Fighting power to reduce damage
     * @param {Object} playerManager - Player manager for grenade count
     * @returns {number} - Total damage after sequential processing
     */
    calculateSequentialDamage(numFights, baseDamage, fightingPower, playerManager) {
        let remainingGrenades = playerManager ? playerManager.getGrenadeCount() : 0;
        let totalDamage = 0;
        
        // Use average damage for sequential processing (consistent damage per fight)
        const damagePerFight = baseDamage.average;
        
        for (let i = 0; i < numFights; i++) {
            let damage = damagePerFight;
            
            // Apply fighting power reduction
            damage = this.applyFightingPowerReduction(damage, fightingPower);
            
            // Apply grenade reduction if available and beneficial
            if (remainingGrenades > 0 && damage > 0) {
                const damageWithGrenade = this.applyFightingPowerReduction(damagePerFight, fightingPower + 3);
                if (damageWithGrenade < damage) {
                    damage = damageWithGrenade;
                    remainingGrenades--;
                }
            }
            
            // Add the distributed damage to the total
            totalDamage += damage;
        }
        
        return totalDamage;
    }

    /**
     * Extract damage value from damage key
     * @param {string} damageKey - The damage key (e.g., "12" or "Variable (8/10/12/15/18/32)")
     * @returns {Object} - Damage values for different scenarios
     */
    getDamageFromKey(damageKey) {
        if (damageKey === 'Variable (8/10/12/15/18/32)') {
            return {
                optimist: 8,
                average: 17.5,
                pessimist: 25,
                worstCase: 32
            };
        } else {
            const fixedDamage = parseInt(damageKey);
            return {
                optimist: fixedDamage,
                average: fixedDamage,
                pessimist: fixedDamage,
                worstCase: fixedDamage
            };
        }
    }
}
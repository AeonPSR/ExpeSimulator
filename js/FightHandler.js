// Fight Handler - Handles all fight-related calculations and logic

class FightHandler {
    constructor() {
        // Initialize any needed state
    }

    /**
     * Processes fight events and groups them by damage type
     * @param {Object} fightBreakdown - Fight breakdown from outcomes
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @returns {Object} - Processed fight data
     */
    processFightBreakdown(fightBreakdown, fightingPower = 0, playerManager = null) {
        const processedFights = {};
        
        Object.entries(fightBreakdown).forEach(([damageKey, probabilities]) => {
            processedFights[damageKey] = {
                sectorCount: probabilities.length,
                probability: probabilities[0], // Assuming all probabilities are the same
                damageValues: this.getDamageValues(damageKey, fightingPower, playerManager)
            };
        });
        
        return processedFights;
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
            damages[scenario] = Math.max(0, baseDamage[scenario] - fightingPower);
            
            // Check if we can use a grenade for this scenario
            if (playerManager && playerManager.getGrenadeCount() > 0 && damages[scenario] > 0) {
                // Calculate potential damage with grenade
                const damageWithGrenade = Math.max(0, baseDamage[scenario] - (fightingPower + 3));
                
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
     * Calculates combat damage scenarios for all fight types using sequential grenade consumption
     * @param {Object} fightBreakdown - Fight breakdown data
     * @param {number} fightingPower - Team's fighting power to reduce damage
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @returns {Object} - Complete damage calculation results
     */
    calculateCombatDamageScenarios(fightBreakdown, fightingPower = 0, playerManager = null) {
        let totalAverageDamage = 0;
        let totalOptimistDamage = 0;
        let totalPessimistDamage = 0;
        let totalWorstCaseDamage = 0;

        const damageCalculations = Object.entries(fightBreakdown)
            .map(([damageKey, probabilities]) => {
                const n = probabilities.length;
                const p = probabilities[0];
                
                // Calculate how many fights occur in each scenario
                const fightScenarios = this.calculateDamageScenarios(n, p);
                const expectedFights = Math.round(n * p);
                
                // Get base damage for this fight type
                const baseDamage = this.getDamageFromKey(damageKey);
                
                // Calculate damage for each scenario with sequential grenade consumption
                const optimistDamage = this.calculateSequentialDamage(fightScenarios.optimist, baseDamage, fightingPower, playerManager);
                const averageDamage = this.calculateSequentialDamage(expectedFights, baseDamage, fightingPower, playerManager);
                const pessimistDamage = this.calculateSequentialDamage(fightScenarios.pessimist, baseDamage, fightingPower, playerManager);
                const worstCaseDamage = this.calculateSequentialDamage(fightScenarios.worstCase, baseDamage, fightingPower, playerManager);
                
                totalOptimistDamage += optimistDamage;
                totalAverageDamage += averageDamage;
                totalPessimistDamage += pessimistDamage;
                totalWorstCaseDamage += worstCaseDamage;
                
                return fightScenarios;
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
            combinedWorstCaseProb
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
            damage = Math.max(0, damage - fightingPower);
            
            // Apply grenade reduction if available and beneficial
            if (remainingGrenades > 0 && damage > 0) {
                damage = Math.max(0, damage - 3);
                remainingGrenades--;
            }
            
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
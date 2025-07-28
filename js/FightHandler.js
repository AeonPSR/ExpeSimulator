// Fight Handler - Handles all fight-related calculations and logic

class FightHandler {
    constructor() {
        // Initialize any needed state
    }

    /**
     * Processes fight events and groups them by damage type
     * @param {Object} fightBreakdown - Fight breakdown from outcomes
     * @returns {Object} - Processed fight data
     */
    processFightBreakdown(fightBreakdown) {
        const processedFights = {};
        
        Object.entries(fightBreakdown).forEach(([damageKey, probabilities]) => {
            processedFights[damageKey] = {
                sectorCount: probabilities.length,
                probability: probabilities[0], // Assuming all probabilities are the same
                damageValues: this.getDamageValues(damageKey)
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
     * Gets appropriate damage values for different scenarios
     * @param {string} damageKey - The damage key (e.g., "12" or "Variable (8/10/12/15/18/32)")
     * @returns {Object} - Damage values for different scenarios
     */
    getDamageValues(damageKey) {
        if (damageKey === 'Variable (8/10/12/15/18/32)') {
            // Variable damage fight: use different values for different scenarios
            return {
                optimist: 8,    // Best case: minimum damage
                average: 17.5,  // Average case: mathematical expectation
                pessimist: 25,  // Pessimist case: higher than average (roughly 75th percentile)
                worstCase: 32   // Worst case: maximum damage
            };
        } else {
            // Fixed damage fight: same value for all scenarios
            const fixedDamage = parseInt(damageKey);
            return {
                optimist: fixedDamage,
                average: fixedDamage,
                pessimist: fixedDamage,
                worstCase: fixedDamage
            };
        }
    }

    /**
     * Calculates combat damage scenarios for all fight types
     * @param {Object} fightBreakdown - Fight breakdown data
     * @returns {Object} - Complete damage calculation results
     */
    calculateCombatDamageScenarios(fightBreakdown) {
        let totalAverageDamage = 0;
        let totalOptimistDamage = 0;
        let totalPessimistDamage = 0;
        let totalWorstCaseDamage = 0;
        
        const damageCalculations = Object.entries(fightBreakdown)
            .map(([damage, probabilities]) => {
                const n = probabilities.length;
                const p = probabilities[0];
                const expectedFights = n * p;
                const roundedFights = Math.round(expectedFights);
                
                // Get damage values for different scenarios
                const damageValues = this.getDamageValues(damage);
                
                // Calculate different scenarios using binomial distribution
                const scenarios = this.calculateDamageScenarios(n, p);
                
                const averageDamage = roundedFights * damageValues.average;
                const optimistDamage = scenarios.optimist * damageValues.optimist;
                const pessimistDamage = scenarios.pessimist * damageValues.pessimist;
                const worstCaseDamage = scenarios.worstCase * damageValues.worstCase;
                
                totalAverageDamage += averageDamage;
                totalOptimistDamage += optimistDamage;
                totalPessimistDamage += pessimistDamage;
                totalWorstCaseDamage += worstCaseDamage;
                
                return scenarios;
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
}
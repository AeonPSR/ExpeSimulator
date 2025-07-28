// Event Damage Handler - Calculates event damage risks and scenarios (copied from FightHandler)

class EventDamageHandler {
    constructor() {
        // Event damage definitions
        this.eventDamages = {
            'singleDamage': { optimist: 3, average: 4, pessimist: 4, worstCase: 5 }, // ACCIDENT_3_5
            'groupDamageOther': { optimist: 2, average: 2, pessimist: 2, worstCase: 2 } // TIRED_2/DISASTER_3_5
        };
    }

    /**
     * Calculates event damage risks (how many instances of each event) - copied from FightHandler
     * @param {Object} damageBreakdown - Breakdown of damage events with probabilities
     * @returns {Object} - Risk calculations for each event type
     */
    calculateEventDamageRisks(damageBreakdown) {
        const risks = {};
        
        Object.entries(damageBreakdown).forEach(([eventType, probabilities]) => {
            if (probabilities.length === 0) return;
            
            const n = probabilities.length; // Number of sectors that can trigger this event
            const p = probabilities[0]; // Probability per sector (should be same for all)
            const expectedEvents = n * p;
            
            // Calculate binomial distribution for 0 to n events
            const distributions = [];
            for (let k = 0; k <= n; k++) {
                const binomialCoeff = factorial(n) / (factorial(k) * factorial(n - k));
                const prob = binomialCoeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
                
                if (prob >= 0.01) { // Only show probabilities >= 1%
                    distributions.push(`${k}: ${(prob * 100).toFixed(1)}%`);
                }
            }
            
            risks[eventType] = {
                expectedEvents: expectedEvents,
                distributions: distributions,
                sectors: n,
                probability: p
            };
        });
        
        return risks;
    }

    /**
     * Calculates damage scenarios using binomial distribution - copied from FightHandler
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
        
        // Calculate worst case scenario - event in every sector that can have the event
        const worstCase = n; // Event in all n sectors with damage events
        
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
     * @param {string} eventType - The event type (e.g., "singleDamage" or "groupDamageOther")
     * @returns {Object} - Damage values for different scenarios
     */
    getDamageValues(eventType) {
        return this.eventDamages[eventType] || {
            optimist: 0, average: 0, pessimist: 0, worstCase: 0
        };
    }

    /**
     * Calculates event damage scenarios for all event types - copied from FightHandler
     * @param {Object} damageBreakdown - Damage breakdown data
     * @returns {Object} - Complete damage calculation results
     */
    calculateEventDamageScenarios(damageBreakdown) {
        let totalAverageDamage = 0;
        let totalOptimistDamage = 0;
        let totalPessimistDamage = 0;
        let totalWorstCaseDamage = 0;
        
        const damageCalculations = Object.entries(damageBreakdown)
            .map(([eventType, probabilities]) => {
                const n = probabilities.length;
                const p = probabilities[0];
                const expectedEvents = n * p;
                const roundedEvents = Math.round(expectedEvents);
                
                // Get damage values for different scenarios
                const damageValues = this.getDamageValues(eventType);
                
                // Calculate different scenarios using binomial distribution
                const scenarios = this.calculateDamageScenarios(n, p);
                
                const averageDamage = roundedEvents * damageValues.average;
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

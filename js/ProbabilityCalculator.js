// Probability Calculator - Handles all expedition outcome calculations

class ProbabilityCalculator {
    constructor() {
        // Initialize handlers
        this.fightHandler = new FightHandler();
        this.resourceHandler = new ResourceHandler();
        this.eventScenarioHandler = new EventScenarioHandler();
        this.eventDamageHandler = new EventDamageHandler();
    }

    /**
     * Calculates probabilities for the selected sectors
     * @param {Array<string>} selectedSectors - Array of selected sector names
     * @returns {string} - HTML string with probability results
     */
    calculateProbabilities(selectedSectors) {
        if (selectedSectors.length === 0) {
            return 'Select sectors to see expected outcomes';
        }

        const outcomes = this.initializeOutcomes();
        this.calculateSectorOutcomes(selectedSectors, outcomes);
        
        // Store selectedSectors for resource calculations
        outcomes.selectedSectors = selectedSectors;
        
        return this.generateProbabilityHTML(outcomes);
    }

    /**
     * Initializes the outcomes object structure
     * @returns {Object} - Empty outcomes object
     */
    initializeOutcomes() {
        return {
            resources: { 
                fruits: 0, steaks: 0, fuel: 0, oxygen: 0, artefacts: 0, starmaps: 0,
                // Track resource events for scenario calculations
                resourceBreakdown: {
                    fruits: [],
                    steaks: [],
                    fuel: [],
                    oxygen: [],
                    artefacts: [],
                    starmaps: []
                }
            },
            combat: { fightBreakdown: {} },
            damages: { 
                groupDamageOther: 0, 
                singleDamage: 0,
                // Track damage events for detailed calculations
                damageBreakdown: {
                    singleDamage: [],
                    groupDamageOther: []
                }
            },
            risks: { playerLoss: 0, killLost: 0, killAll: 0, killOne: 0 },
            setbacks: { rerolls: 0, retreat: 0, itemLoss: 0 },
            special: { disease: 0, mushTrap: 0 }
        };
    }

    /**
     * Calculates outcomes for each sector
     * @param {Array<string>} selectedSectors - Selected sectors
     * @param {Object} outcomes - Outcomes object to populate
     */
    calculateSectorOutcomes(selectedSectors, outcomes) {
        selectedSectors.forEach(sectorName => {
            const sectorData = PlanetSectorConfigData.find(s => s.sectorName === sectorName);
            if (!sectorData) return;

            const totalWeight = Object.values(sectorData.explorationEvents).reduce((a, b) => a + b, 0);

            Object.entries(sectorData.explorationEvents).forEach(([event, weight]) => {
                const probability = weight / totalWeight;
                this.processEvent(event, probability, outcomes);
            });
        });
    }

    /**
     * Processes a single exploration event
     * @param {string} event - Event name
     * @param {number} probability - Event probability
     * @param {Object} outcomes - Outcomes object to update
     */
    processEvent(event, probability, outcomes) {
        // Resources
        if (event.startsWith('HARVEST_')) {
            const amount = parseInt(event.split('_')[1]);
            outcomes.resources.fruits += probability * amount;
            outcomes.resources.resourceBreakdown.fruits.push({ amount, probability });
        } else if (event.startsWith('PROVISION_')) {
            const amount = parseInt(event.split('_')[1]);
            outcomes.resources.steaks += probability * amount;
            outcomes.resources.resourceBreakdown.steaks.push({ amount, probability });
        } else if (event.startsWith('FUEL_')) {
            const amount = parseInt(event.split('_')[1]);
            outcomes.resources.fuel += probability * amount;
            outcomes.resources.resourceBreakdown.fuel.push({ amount, probability });
        } else if (event.startsWith('OXYGEN_')) {
            const amount = parseInt(event.split('_')[1]);
            outcomes.resources.oxygen += probability * amount;
            outcomes.resources.resourceBreakdown.oxygen.push({ amount, probability });
        } else if (event === 'ARTEFACT') {
            // Artefacts include starmaps (1/9 chance)
            const starmapProbability = probability / 9;
            const regularArtefactProbability = probability * (8/9);
            
            outcomes.resources.artefacts += regularArtefactProbability;
            outcomes.resources.starmaps += starmapProbability;
            
            outcomes.resources.resourceBreakdown.artefacts.push({ amount: 8/9, probability });
            outcomes.resources.resourceBreakdown.starmaps.push({ amount: 1/9, probability });
        } else if (event === 'STARMAP') {
            // Direct starmap events (like from crystal fields)
            outcomes.resources.starmaps += probability;
            outcomes.resources.resourceBreakdown.starmaps.push({ amount: 1, probability });
        }
        
        // Combat
        else if (event.startsWith('FIGHT_')) {
            let damageKey;
            if (event === 'FIGHT_8_10_12_15_18_32') {
                damageKey = 'Variable (8/10/12/15/18/32)'; // Specific values, not range
            } else {
                const damage = parseInt(event.split('_')[1]);
                damageKey = damage.toString();
            }
            
            if (!outcomes.combat.fightBreakdown[damageKey]) {
                outcomes.combat.fightBreakdown[damageKey] = [];
            }
            outcomes.combat.fightBreakdown[damageKey].push(probability);
        }
        
        // Other damages
        else if (event === 'ACCIDENT_3_5') {
            outcomes.damages.singleDamage += probability;
            outcomes.damages.damageBreakdown.singleDamage.push(probability);
        } else if (event === 'TIRED_2' || event === 'DISASTER_3_5') {
            outcomes.damages.groupDamageOther += probability;
            outcomes.damages.damageBreakdown.groupDamageOther.push(probability);
        }
        
        // Risks
        else if (event === 'PLAYER_LOST') {
            outcomes.risks.playerLoss += probability;
        } else if (event === 'KILL_RANDOM') {
            outcomes.risks.killOne += probability;
        } else if (event === 'KILL_ALL') {
            outcomes.risks.killAll += probability;
        } else if (event === 'KILL_LOST') {
            outcomes.risks.killLost += probability;
        }
        
        // Setbacks
        else if (event === 'AGAIN') {
            outcomes.setbacks.rerolls += probability;
        } else if (event === 'BACK') {
            outcomes.setbacks.retreat += probability;
        } else if (event === 'ITEM_LOST') {
            outcomes.setbacks.itemLoss += probability;
        }
        
        // Special
        else if (event === 'DISEASE') {
            outcomes.special.disease += probability;
        } else if (event === 'MUSH_TRAP') {
            outcomes.special.mushTrap += probability;
        }
        // Note: STARMAP is now handled as a resource, not a special event
    }

    /**
     * Generates the HTML content for probability display
     * @param {Object} outcomes - Calculated outcomes
     * @returns {string} - HTML string
     */
    generateProbabilityHTML(outcomes) {
        // Pass selectedSectors to resources for proper calculation
        outcomes.resources.selectedSectors = outcomes.selectedSectors;
        
        // Pass selectedSectors to events for scenario calculations
        outcomes.risks.selectedSectors = outcomes.selectedSectors;
        outcomes.setbacks.selectedSectors = outcomes.selectedSectors;
        outcomes.special.selectedSectors = outcomes.selectedSectors;
        
        return `
            ${this.generateResourcesHTML(outcomes.resources)}
            ${this.generateCombatRisksHTML(outcomes.combat)}
            ${this.generateCombatDamageHTML(outcomes.combat)}
            ${this.generateEventRisksHTML(outcomes.damages)}
            ${this.generateEventDamagesHTML(outcomes.damages, outcomes.risks)}
            ${this.generateEventsHTML(outcomes.risks, outcomes.setbacks, outcomes.special)}
        `;
    }

    /**
     * Generates resources section HTML
     * @param {Object} resources - Resources outcomes
     * @returns {string} - HTML string
     */
    generateResourcesHTML(resources) {
        // Use the new resource handler method that correctly handles sector-based calculations
        const scenarios = this.resourceHandler.calculateResourceScenariosFromSectors(resources.selectedSectors || []);
        
        // Helper function to format numbers (remove .0 for whole numbers)
        const formatNumber = (num) => {
            // Round to 1 decimal place first to handle floating point precision issues
            const rounded = Math.round(num * 10) / 10;
            // Check if it's effectively a whole number
            return rounded % 1 === 0 ? Math.round(rounded).toString() : rounded.toFixed(1);
        };
        
        // Helper function to generate resource icon
        const getResourceIcon = (iconFile, altText) => {
            return `<img src="${getResourceURL('items/' + iconFile)}" alt="${altText}" class="resource-icon" />`;
        };
        
        // Helper function to generate row HTML
        const generateRow = (resourceIcon, pessimist, average, optimist) => {
            // Check if all values are 0
            if (pessimist === 0 && average === 0 && optimist === 0) {
                return `
                    <tr>
                        <td class="icon-cell">${resourceIcon}</td>
                        <td colspan="3" class="neutral none-row">none</td>
                    </tr>
                `;
            }
            
            return `
                <tr>
                    <td class="icon-cell">${resourceIcon}</td>
                    <td class="warning">${formatNumber(pessimist)}</td>
                    <td class="neutral">${formatNumber(average)}</td>
                    <td class="positive">${formatNumber(optimist)}</td>
                </tr>
            `;
        };
        
        // Create array of resources with their data for sorting
        const resourceData = [
            { name: 'Alien Fruits', icon: 'fruit10.jpg', data: scenarios.fruits },
            { name: 'Steaks', icon: 'alien_steak.jpg', data: scenarios.steaks },
            { name: 'Fuel', icon: 'fuel_capsule.jpg', data: scenarios.fuel },
            { name: 'Oxygen', icon: 'oxy_capsule.jpg', data: scenarios.oxygen },
            { name: 'Artefacts', icon: 'artefact.png', data: scenarios.artefacts },
            { name: 'Starmaps', icon: 'super_map.jpg', data: scenarios.starmaps }
        ];
        
        // Sort resources: those with values first, then "none" resources
        resourceData.sort((a, b) => {
            const aHasValues = a.data.pessimist > 0 || a.data.average > 0 || a.data.optimist > 0;
            const bHasValues = b.data.pessimist > 0 || b.data.average > 0 || b.data.optimist > 0;
            
            if (aHasValues && !bHasValues) return -1; // a first
            if (!aHasValues && bHasValues) return 1;  // b first
            return 0; // maintain original order for resources of same type
        });
        
        // Generate rows from sorted data
        const tableRows = resourceData.map(resource => 
            generateRow(
                getResourceIcon(resource.icon, resource.name),
                resource.data.pessimist,
                resource.data.average,
                resource.data.optimist
            )
        ).join('');
        
        return `
            <div class="outcome-category">
                <h5>Resources</h5>
                <table class="resource-table">
                    <thead>
                        <tr>
                            <th>Resource</th>
                            <th class="pessimist-col">Pessimist</th>
                            <th class="average-col">Average</th>
                            <th class="optimist-col">Optimist</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Generates combat risks section HTML
     * @param {Object} combat - Combat outcomes
     * @returns {string} - HTML string
     */
    generateCombatRisksHTML(combat) {
        const hasCombat = Object.entries(combat.fightBreakdown).length > 0;
        
        if (!hasCombat) {
            return `
                <div class="outcome-category">
                    <h5>Combat Risks</h5>
                    <div class="outcome-item"><span>No combat encounters</span></div>
                </div>
            `;
        }

        const combatEntries = Object.entries(combat.fightBreakdown)
            .sort((a, b) => {
                if (a[0] === 'Variable (8/10/12/15/18/32)') return 1;
                if (b[0] === 'Variable (8/10/12/15/18/32)') return -1;
                return parseInt(a[0]) - parseInt(b[0]);
            })
            .map(([damage, probabilities]) => {
                const n = probabilities.length;
                const p = probabilities[0];
                const expectedFights = n * p;
                
                let distributions = [];
                for (let k = 0; k <= n; k++) {
                    const binomialCoeff = factorial(n) / (factorial(k) * factorial(n - k));
                    const prob = binomialCoeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
                    
                    if (prob >= 0.01) {
                        distributions.push(`${k}: ${(prob * 100).toFixed(1)}%`);
                    }
                }
                
                return `<div class="outcome-item">
                    <span>${damage} damage fights:</span>
                    <div class="fight-stats">
                        <div class="expected-fights">Average: ${expectedFights.toFixed(1)} fights</div>
                        <div class="fight-distribution">${distributions.join(' | ')}</div>
                    </div>
                </div>`;
            }).join('');

        return `
            <div class="outcome-category">
                <h5>Combat Risks</h5>
                ${combatEntries}
            </div>
        `;
    }

    /**
     * Generates combat damage section HTML
     * @param {Object} combat - Combat outcomes
     * @returns {string} - HTML string
     */
    generateCombatDamageHTML(combat) {
        const hasCombat = Object.entries(combat.fightBreakdown).length > 0;
        
        if (!hasCombat) {
            return `
                <div class="outcome-category">
                    <h5>Combat Damage</h5>
                    <div class="outcome-item"><span>No combat damage expected</span></div>
                </div>
            `;
        }

        return `
            <div class="outcome-category">
                <h5>Combat Damage</h5>
                ${this.calculateCombatDamageScenarios(combat.fightBreakdown)}
            </div>
        `;
    }

    /**
     * Calculates combat damage scenarios
     * @param {Object} fightBreakdown - Fight breakdown data
     * @returns {string} - HTML for damage scenarios
     */
    calculateCombatDamageScenarios(fightBreakdown) {
        // Use the fight handler to calculate damage scenarios
        const results = this.fightHandler.calculateCombatDamageScenarios(fightBreakdown);
        
        const hpIcon = `<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`;
        
        return `
            <div class="outcome-item">
                <span>Optimist Scenario: (${formatProbability(results.combinedOptimistProb)}%)</span>
                <span class="positive">${hpIcon}<strong>${Math.round(results.totalOptimistDamage)}</strong></span>
            </div>
            <div class="outcome-item">
                <span>Average HP Lost:</span>
                <span class="danger">${hpIcon}<strong>${Math.round(results.totalAverageDamage)}</strong></span>
            </div>
            <div class="outcome-item">
                <span>Pessimist Scenario: (${formatProbability(results.combinedPessimistProb)}%)</span>
                <span class="critical">${hpIcon}<strong>${Math.round(results.totalPessimistDamage)}</strong></span>
            </div>
            <div class="outcome-item">
                <span>Worst Case Scenario: (${formatProbability(results.combinedWorstCaseProb)}%)</span>
                <span class="critical bold-damage">${hpIcon}<strong>${Math.round(results.totalWorstCaseDamage)}</strong></span>
            </div>
        `;
    }

    /**
     * Generates event risks section HTML
     * @param {Object} damages - Damage outcomes with breakdown
     * @returns {string} - HTML string
     */
    generateEventRisksHTML(damages) {
        const hasEventDamage = damages.damageBreakdown.singleDamage.length > 0 || 
                              damages.damageBreakdown.groupDamageOther.length > 0;
        
        if (!hasEventDamage) {
            return `
                <div class="outcome-category">
                    <h5>Event Risks</h5>
                    <div class="outcome-item"><span>No event damage risks</span></div>
                </div>
            `;
        }

        const risks = this.eventDamageHandler.calculateEventDamageRisks(damages.damageBreakdown);
        
        const eventEntries = Object.entries(risks)
            .map(([eventType, riskData]) => {
                const eventName = eventType === 'singleDamage' ? 'Single Target Damage (3-5 HP)' : 'Group Damage (2 HP to all)';
                
                return `<div class="outcome-item">
                    <span>${eventName}:</span>
                    <div class="fight-stats">
                        <div class="expected-fights">Average: ${riskData.expectedEvents.toFixed(1)} events</div>
                        <div class="fight-distribution">${riskData.distributions.join(' | ')}</div>
                    </div>
                </div>`;
            }).join('');

        return `
            <div class="outcome-category">
                <h5>Event Risks</h5>
                ${eventEntries}
            </div>
        `;
    }

    /**
     * Generates event damages section HTML
     * @param {Object} damages - Damage outcomes
     * @param {Object} risks - Risk outcomes
     * @returns {string} - HTML string
     */
    generateEventDamagesHTML(damages, risks) {
        const hasEventDamage = damages.damageBreakdown.singleDamage.length > 0 || 
                              damages.damageBreakdown.groupDamageOther.length > 0;
        
        if (!hasEventDamage) {
            return `
                <div class="outcome-category">
                    <h5>Event Damage</h5>
                    <div class="outcome-item"><span>No event damage expected</span></div>
                </div>
            `;
        }

        return `
            <div class="outcome-category">
                <h5>Event Damage</h5>
                ${this.calculateEventDamageScenarios(damages.damageBreakdown)}
            </div>
        `;
    }

    /**
     * Calculates event damage scenarios
     * @param {Object} damageBreakdown - Damage breakdown data
     * @returns {string} - HTML for damage scenarios
     */
    calculateEventDamageScenarios(damageBreakdown) {
        // Use the event damage handler to calculate damage scenarios
        const results = this.eventDamageHandler.calculateEventDamageScenarios(damageBreakdown);
        
        const hpIcon = `<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`;
        
        return `
            <div class="outcome-item">
                <span>Optimist Scenario: (${formatProbability(results.combinedOptimistProb)}%)</span>
                <span class="positive">${hpIcon}<strong>${Math.round(results.totalOptimistDamage)}</strong></span>
            </div>
            <div class="outcome-item">
                <span>Average HP Lost:</span>
                <span class="danger">${hpIcon}<strong>${Math.round(results.totalAverageDamage)}</strong></span>
            </div>
            <div class="outcome-item">
                <span>Pessimist Scenario: (${formatProbability(results.combinedPessimistProb)}%)</span>
                <span class="critical">${hpIcon}<strong>${Math.round(results.totalPessimistDamage)}</strong></span>
            </div>
            <div class="outcome-item">
                <span>Worst Case Scenario: (${formatProbability(results.combinedWorstCaseProb)}%)</span>
                <span class="critical bold-damage">${hpIcon}<strong>${Math.round(results.totalWorstCaseDamage)}</strong></span>
            </div>
        `;
    }

    /**
     * Generates events section HTML with table layout using scenario system
     * @param {Object} risks - Risk outcomes  
     * @param {Object} setbacks - Setback outcomes
     * @param {Object} special - Special event outcomes
     * @returns {string} - HTML string
     */
    generateEventsHTML(risks, setbacks, special) {
        // Get the selected sectors from the outcomes that were passed through
        const selectedSectors = risks.selectedSectors || setbacks.selectedSectors || special.selectedSectors || [];
        
        // Use the event scenario handler to calculate pessimist/average/optimist scenarios
        const scenarios = this.eventScenarioHandler.calculateEventScenariosFromSectors(selectedSectors);
        
        // Helper function to format numbers (remove .0 for whole numbers)
        const formatNumber = (num) => {
            // Round to 1 decimal place first to handle floating point precision issues
            const rounded = Math.round(num * 10) / 10;
            // Check if it's effectively a whole number
            return rounded % 1 === 0 ? Math.round(rounded).toString() : rounded.toFixed(1);
        };
        
        // Helper function to generate row HTML for events with scenario values
        const generateEventRow = (eventName, eventData, isSpecial = false) => {
            // Check if all values are 0
            if (eventData.pessimist === 0 && eventData.average === 0 && eventData.optimist === 0) {
                return `
                    <tr>
                        <td>${eventName}</td>
                        <td colspan="3" class="neutral none-row">none</td>
                    </tr>
                `;
            }
            
            // Use the same fixed color scheme as resources
            return `
                <tr>
                    <td>${eventName}</td>
                    <td class="warning">${formatNumber(eventData.optimist)}</td>
                    <td class="neutral">${formatNumber(eventData.average)}</td>
                    <td class="positive">${formatNumber(eventData.pessimist)}</td>
                </tr>
            `;
        };
        
        // Create array of events with their data for sorting
        const eventData = [
            { name: 'Player Lost', data: scenarios.playerLoss, isSpecial: false },
            { name: 'Sector Unexplored', data: scenarios.rerolls, isSpecial: false },
            { name: 'Forced Retreat', data: scenarios.retreat, isSpecial: false },
            { name: 'Item Loss', data: scenarios.itemLoss, isSpecial: false },
            { name: 'Disease', data: scenarios.disease, isSpecial: true },
            { name: 'Mush Trap', data: scenarios.mushTrap, isSpecial: true },
            { name: 'Kill Lost Player', data: scenarios.killLost, isSpecial: true },
            { name: 'Kill All', data: scenarios.killAll, isSpecial: true },
            { name: 'Kill One', data: scenarios.killOne, isSpecial: true }
        ];
        
        // Sort events: those with values first, then "none" events
        eventData.sort((a, b) => {
            const aHasValues = a.data.pessimist > 0 || a.data.average > 0 || a.data.optimist > 0;
            const bHasValues = b.data.pessimist > 0 || b.data.average > 0 || b.data.optimist > 0;
            
            if (aHasValues && !bHasValues) return -1; // a first
            if (!aHasValues && bHasValues) return 1;  // b first
            return 0; // maintain original order for events of same type
        });
        
        // Generate rows from sorted data
        const tableRows = eventData.map(event => 
            generateEventRow(event.name, event.data, event.isSpecial)
        ).join('');
        
        return `
            <div class="outcome-category">
                <h5>Negative Events</h5>
                <table class="events-table">
                    <thead>
                        <tr>
                            <th>Event Type</th>
                            <th class="pessimist-col">Pessimist</th>
                            <th class="average-col">Average</th>
                            <th class="optimist-col">Optimist</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Gets the sector click handler function for UI manager
     * @returns {Function} - The sector click handler
     */
    getSectorClickHandler() {
        return (sectorName) => this.handleAddSector(sectorName);
    }
}

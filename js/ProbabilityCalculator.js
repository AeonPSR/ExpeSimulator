// Probability Calculator - Handles all expedition outcome calculations

class ProbabilityCalculator {
    constructor() {
        // Initialize handlers
        this.fightHandler = new FightHandler();
        this.resourceHandler = new ResourceHandler();
        this.eventScenarioHandler = new EventScenarioHandler();
        this.eventDamageHandler = new EventDamageHandler();
        this.sectorManager = null; // Will be set by EventHandler
    }

    /**
     * Returns the list of players that are active for the expedition (respecting oxygenless rule).
     * Falls back to all players if playerManager is not available.
     */
    getActivePlayers() {
        if (!this.playerManager || !this.playerManager.getPlayers) return this.players || [];
        const all = this.playerManager.getPlayers();
        if (!this.playerManager.isPlayerActive) return all;
        return all.filter(p => this.playerManager.isPlayerActive(p));
    }

    /**
     * Sets the sector manager reference
     * @param {Object} sectorManager - The sector manager instance
     */
    setSectorManager(sectorManager) {
        this.sectorManager = sectorManager;
    }

    /**
     * Calculates all expedition outcomes and returns a pure data object.
     * This is the new central function for all calculations.
     * @param {Array<Object>} selectedSectors - Array of {id, name} objects
     * @param {Array<Object>} players - Array of player objects
     * @param {Object} playerManager - The player manager instance
     * @returns {Object} - A comprehensive object with all calculated outcomes.
     */
    calculateExpeditionOutcomes(selectedSectors, players, playerManager) {
        console.log(`PROBA CALCULATOR DEBUG: calculateExpeditionOutcomes called with ${selectedSectors.length} sectors, ${players.length} players`);
        
    // Store players data and playerManager for use in handlers
    this.players = players;
    this.playerManager = playerManager;

        // Determine oxygen availability from selected sectors: if OXYGEN sector is present, no suit required
        try {
            const oxygenSelected = selectedSectors.some(s => (typeof s === 'string' ? s : s && s.name) === 'OXYGEN');
            if (this.playerManager) {
                this.playerManager.oxygenlessPlanet = !oxygenSelected;
                console.log(`[OXYGEN RULE] oxygenSelected=${oxygenSelected} -> oxygenlessPlanet=${this.playerManager.oxygenlessPlanet}`);
                // Keep UI indicators in sync when oxygen state flips due to sector changes
                if (typeof this.playerManager.updateFightingPowerDisplay === 'function') {
                    this.playerManager.updateFightingPowerDisplay();
                }
            }
        } catch (e) {
            console.warn('[OXYGEN RULE] Could not evaluate oxygen sector presence:', e);
        }

    const outcomes = this.initializeOutcomes();
        // Compute and track movements early so UI can reflect it
        if (this.playerManager && typeof this.playerManager.calculateMovements === 'function') {
            const movements = this.playerManager.calculateMovements();
            outcomes.movements = movements;
            // Sync UI display
            if (typeof this.playerManager.updateMovementsDisplay === 'function') {
                this.playerManager.updateMovementsDisplay(movements);
            }
        } else {
            outcomes.movements = 0;
        }
        
        // Apply ability and item modifications to sector data
    const modifiedSectorData = this.applyAbilityAndItemModifications(selectedSectors, players, playerManager);

        // Scale sector event probabilities by visit likelihood using movement budget and exploration weights
        let scaledSectorData = modifiedSectorData;
        try {
            if (typeof SectorSelectionWeighting !== 'undefined' && outcomes && typeof outcomes.movements === 'number') {
                // Apply item-driven exploration weight multipliers (Echo Sounder, Heat Seeker)
                const multipliers = {};
                try {
                    // Determine active players (respect oxygenless gating)
                    const activePlayers = this.getActivePlayers();
                    // Collect active items names without extension
                    const activeItemNames = [];
                    activePlayers.forEach(p => {
                        (p.items || []).forEach(it => { if (it) activeItemNames.push(it.replace(/\.(jpg|png)$/,'')); });
                    });
                    const hasEcho = activeItemNames.includes('echo_sounder');
                    const hasHeat = activeItemNames.includes('heat_seeker');
                    if (hasEcho) {
                        multipliers['HYDROCARBON'] = 5; // x5 total vs base (config defines +4 bonus, we model as x5 weight)
                    }
                    if (hasHeat) {
                        ['RUMINANT','MANKAROG','INSECT','PREDATOR','INTELLIGENT'].forEach(s => { multipliers[s] = 5; });
                    }
                } catch (e) { /* ignore */ }
                if (typeof SectorSelectionWeighting.setExplorationWeightMultipliers === 'function') {
                    SectorSelectionWeighting.setExplorationWeightMultipliers(multipliers);
                }
                scaledSectorData = SectorSelectionWeighting.scaleEventProbabilities(modifiedSectorData, outcomes.movements);
            }
        } catch (e) {
            console.warn('[SectorSelectionWeighting] Failed to scale event probabilities:', e);
            scaledSectorData = modifiedSectorData;
        }
        
    this.calculateSectorOutcomes(outcomes, scaledSectorData);
        
        // Store modified sector data for all calculations
    // Store both original (post-mods) and scaled maps if needed downstream
    outcomes.modifiedSectorData = modifiedSectorData;
    outcomes.scaledSectorData = scaledSectorData;

        // 1. Resource Scenarios
    outcomes.resources.scenarios = this.resourceHandler.calculateResourceScenariosFromSectors(scaledSectorData);

        // 2. Combat Damage Scenarios
        const fightingPower = this.playerManager.calculateFightingPower();
        console.log(`PROBA CALCULATOR DEBUG: Calling calculateCombatDamageScenarios with fighting power: ${fightingPower}`);
    outcomes.combat.scenarios = this.fightHandler.calculateCombatDamageScenarios(outcomes.combat.fightBreakdown, fightingPower, this.playerManager, scaledSectorData);
        outcomes.combat.scenarios.adjustedForEventPriority = false; // Initialize adjustment flag
        
    // (Deferred combat logging & storage until after worst-case adjustments)

        // 3. Event Damage Risks & Scenarios
    outcomes.damages.risks = this.eventDamageHandler.calculateEventDamageRisks(outcomes.damages.damageBreakdown);
    outcomes.damages.scenarios = this.eventDamageHandler.calculateEventDamageScenarios(outcomes.damages.damageBreakdown, this.playerManager, scaledSectorData);
        outcomes.damages.scenarios.adjustedForCombatPriority = false; // Initialize adjustment flag

    // (Deferred event damage storage until after worst-case adjustments)

        // 4. Negative Event Scenarios
        outcomes.events = this.eventScenarioHandler.calculateEventScenariosFromSectors(modifiedSectorData);

        // 5. Adjust worst-case scenarios based on fightVsDamageThreshold
        this.adjustWorstCaseScenarios(outcomes);

        // --- POST-ADJUSTMENT LOGGING & STORAGE (final state) ---
        const { damageInstances: finalCombatInstances } = outcomes.combat.scenarios;
        if (finalCombatInstances) {
            console.log('=== FINAL COMBAT DAMAGE INSTANCES (POST-ADJUSTMENT) ===');
            ['optimist', 'average', 'pessimist', 'worstCase'].forEach(scenario => {
                console.log(`\n${scenario.toUpperCase()} Scenario:`);
                if (!finalCombatInstances[scenario] || finalCombatInstances[scenario].length === 0) {
                    console.log('  No combat events');
                } else {
                    finalCombatInstances[scenario].forEach(instance => {
                        console.log(`  ${instance.count}x ${instance.type} (${instance.damagePerInstance} dmg) = ${instance.count * instance.damagePerInstance}`);
                        if (instance.sources && instance.sources.length > 0) {
                            const sourceList = instance.sources.map(source => `${source.sectorName}#${source.sectorId}`).join(', ');
                            console.log(`    Sources: ${sourceList}`);
                        }
                    });
                    const scenarioTotal = finalCombatInstances[scenario].reduce((sum, inst) => sum + (inst.count * inst.damagePerInstance), 0);
                    console.log(`  TOTAL: ${scenarioTotal} damage`);
                }
            });
            console.log('===============================================\n');
        }

        // DEBUG: Final structures summary
        console.log('PROBA CALCULATOR DEBUG: Final combat scenarios structure:', {
            optimist: outcomes.combat.scenarios.damageInstances.optimist ? outcomes.combat.scenarios.damageInstances.optimist.length : 0,
            average: outcomes.combat.scenarios.damageInstances.average ? outcomes.combat.scenarios.damageInstances.average.length : 0,
            pessimist: outcomes.combat.scenarios.damageInstances.pessimist ? outcomes.combat.scenarios.damageInstances.pessimist.length : 0,
            worstCase: outcomes.combat.scenarios.damageInstances.worstCase ? outcomes.combat.scenarios.damageInstances.worstCase.length : 0
        });

        // Expose override flags to playerManager so UI logic can suppress double-counting
        if (this.playerManager) {
            this.playerManager.combatOverridesWorstCase = !!(outcomes.damages.scenarios && outcomes.damages.scenarios.adjustedForCombatPriority);
            this.playerManager.eventOverridesWorstCase = !!(outcomes.combat.scenarios && outcomes.combat.scenarios.adjustedForEventPriority);
        }

        // Store final (post-adjustment) combat damage results
        if (this.playerManager && typeof this.playerManager.storeCombatDamage === 'function') {
            this.playerManager.storeCombatDamage(outcomes.combat.scenarios);
        }
        // Store final (post-adjustment) event damage results
        if (this.playerManager && typeof this.playerManager.storeEventDamage === 'function') {
            this.playerManager.storeEventDamage(outcomes.damages.scenarios);
        }

        return outcomes;
    }

    /**
     * Adjusts worst-case scenarios for sectors with fightVsDamageThreshold.
     * This ensures that for a given sector, only the true worst-case (either a fight or an event) is counted.
     * @param {Object} outcomes - The outcomes object to modify in place.
     * @private
     */
    adjustWorstCaseScenarios(outcomes) {
        if (!this.playerManager || !outcomes.modifiedSectorData) {
            return;
        }

        const playerCount = this.getActivePlayers().length;
    const abilitiesForWorstCase = this.collectActiveAbilities(this.getActivePlayers());
    const itemsForWorstCase = this.collectActiveItems(this.getActivePlayers());
    // Consider any source that removed combat events (diplomacy, skillful, white_flag) from ACTIVE participants
    const hasCombatEventRemoval = abilitiesForWorstCase.has('diplomacy') || abilitiesForWorstCase.has('skillful') || itemsForWorstCase.includes('white_flag');

        outcomes.modifiedSectorData.forEach((sectorData, sectorKey) => {
            if (sectorData.fightVsDamageThreshold !== undefined) {
                const sectorId = sectorKey.split('_')[1];

                // Determine the true worst-case for this sector
                const worstCaseIsFight = !hasCombatEventRemoval && (playerCount <= sectorData.fightVsDamageThreshold);

                if (worstCaseIsFight) {
                    // The worst case is a fight, so we must remove the corresponding event damage instance.
                    const eventDamageInstances = outcomes.damages.scenarios.damageInstances.worstCase;
                    const instanceIndex = eventDamageInstances.findIndex(instance => 
                        instance.sources.some(source => source.sectorId == sectorId)
                    );

                    if (instanceIndex > -1) {
                        const instance = eventDamageInstances[instanceIndex];
                        
                        // Remove only the specific source for this sector
                        const sourceIndex = instance.sources.findIndex(source => source.sectorId == sectorId);
                        if (sourceIndex > -1) {
                            // Remove the source
                            instance.sources.splice(sourceIndex, 1);
                            
                            // Decrease count and recalculate total damage
                            instance.count--;
                            const damageReduction = instance.damagePerInstance;
                            outcomes.damages.scenarios.totalWorstCaseDamage -= damageReduction;
                            
                            // If no sources remain, remove the entire instance
                            if (instance.sources.length === 0 || instance.count <= 0) {
                                eventDamageInstances.splice(instanceIndex, 1);
                            }
                            
                            outcomes.damages.scenarios.adjustedForCombatPriority = true; // Flag for tooltip on event section
                        }
                    }
                } else {
                    // The worst case is an event damage, so we must remove the corresponding combat damage instance.
                    const combatDamageInstances = outcomes.combat.scenarios.damageInstances.worstCase;
                    const instanceIndex = combatDamageInstances.findIndex(instance => 
                        instance.sources.some(source => source.sectorId == sectorId)
                    );

                    if (instanceIndex > -1) {
                        const instance = combatDamageInstances[instanceIndex];
                        
                        // Remove only the specific source for this sector
                        const sourceIndex = instance.sources.findIndex(source => source.sectorId == sectorId);
                        if (sourceIndex > -1) {
                            // Remove the source
                            instance.sources.splice(sourceIndex, 1);
                            
                            // Decrease count and recalculate total damage
                            instance.count--;
                            const damageReduction = instance.damagePerInstance;
                            outcomes.combat.scenarios.totalWorstCaseDamage -= damageReduction;
                            
                            // If no sources remain, remove the entire instance
                            if (instance.sources.length === 0 || instance.count <= 0) {
                                combatDamageInstances.splice(instanceIndex, 1);
                            }
                            
                            outcomes.combat.scenarios.adjustedForEventPriority = true; // Flag for tooltip on combat section
                        }
                    }
                }
            }
        });
    }

    /**
     * Calculates probabilities for the selected sectors
     * @param {Array<string>|Array<Object>} selectedSectors - Array of selected sector names or {id, name} objects
     * @param {Array<Object>} players - Array of player objects with abilities and items
     * @param {Object} playerManager - The player manager instance for grenade consumption
     * @returns {string} - HTML string with probability results
     */
    calculateProbabilities(selectedSectors, players = [], playerManager = null) {
        if (selectedSectors.length === 0) {
            return 'Select sectors to see expected outcomes';
        }

        // New flow: First, calculate all outcomes as pure data
        const outcomes = this.calculateExpeditionOutcomes(selectedSectors, players, playerManager);
        
        // Then, generate the HTML from the data
        return this.generateProbabilityHTML(outcomes);
    }

    /**
     * Applies ability and item modifications to sector data
     * @param {Array<string>|Array<Object>} selectedSectors - Selected sectors (array of names or array of {id, name} objects)
     * @param {Array<Object>} players - Player objects with abilities and items
     * @param {Object} playerManager - The player manager instance to check for active projects
     * @returns {Map<string, Object>} - Modified sector data keyed by "sectorName_id"
     */
    applyAbilityAndItemModifications(selectedSectors, players, playerManager) {
        const modifiedData = new Map();
        
        // Determine who is active for this expedition (space suit gating)
        const activePlayers = playerManager ? players.filter(p => p && playerManager.isPlayerActive(p)) : players;

        // Collect abilities and items from ACTIVE players only
        const activeAbilities = this.collectActiveAbilities(activePlayers);
        const activeItems = this.collectActiveItems(activePlayers);

        // Exceptions: Pilot and Traitor abilities still work even if holders are inactive
        if (players && Array.isArray(players)) {
            const anyPilot = players.some(p => p && p.abilities && p.abilities.includes('pilot.png'));
            const anyTraitor = players.some(p => p && p.abilities && p.abilities.includes('traitor.png'));
            if (anyPilot) activeAbilities.add('pilot');
            if (anyTraitor) activeAbilities.add('traitor');
        }

        // Count survival abilities (stacking steak bonus)
    const survivalCount = activePlayers.reduce((sum, p) => {
            if (!p || !p.abilities) return sum;
            return sum + p.abilities.filter(a => a === 'survival.png').length;
        }, 0);
        this._survivalSteakBonus = survivalCount; // store for use in ability modifications
        
        // Handle both old format (array of strings) and new format (array of {id, name} objects)
        const sectorsWithIds = selectedSectors.map((sector, index) => {
            if (typeof sector === 'string') {
                // Legacy format - create temporary ID
                return { id: index, name: sector };
            } else {
                // New format - sector already has {id, name}
                return sector;
            }
        });
        
        sectorsWithIds.forEach(sector => {
            const originalSector = PlanetSectorConfigData.find(s => s.sectorName === sector.name);
            if (!originalSector) return;
            
            // Deep copy the sector data
            const modifiedSector = JSON.parse(JSON.stringify(originalSector));
            
            // Apply ability modifications
            this.applyAbilityModifications(modifiedSector, activeAbilities, sector.name);
            
            // Apply item modifications
            this.applyItemModifications(modifiedSector, activeItems, sector.name);
            
            // Apply project modifications if playerManager is available
            if (playerManager) {
                this.applyProjectModifications(modifiedSector, playerManager, sector.name);
            }
            
            // Use sector ID to create unique keys that persist through modifications
            modifiedData.set(`${sector.name}_${sector.id}`, modifiedSector);
        });
        
        return modifiedData;
    }
    
    /**
     * Applies project modifications to sector data based on active projects
     * @param {Object} sectorData - The sector data to modify
     * @param {Object} playerManager - The player manager instance with project states
     * @param {string} sectorName - The name of the sector
     */
    applyProjectModifications(sectorData, playerManager, sectorName) {
        // Check if antigrav propeller is active
        if (playerManager.antigravPropellerState) {
            const projectConfig = ProjectEffects['antigrav_propeller'];
            if (!projectConfig || !projectConfig.effects) return;
            
            const effects = projectConfig.effects;
            
            // Apply sector event modifier if available for this sector
            if (effects.sectorEventModifier && effects.sectorEventModifier[sectorName]) {
                const eventModifiers = effects.sectorEventModifier[sectorName];
                
                // Apply each event modifier
                for (const eventName in eventModifiers) {
                    if (sectorData.explorationEvents[eventName]) {
                        // Store original weight for logging
                        const originalWeight = sectorData.explorationEvents[eventName];
                        
                        // Multiply the weight by the modifier value
                        const modifier = eventModifiers[eventName];
                        sectorData.explorationEvents[eventName] *= modifier;
                        
                        // Log the modification
                        console.log(`[Project] Antigrav Propeller: Modified ${sectorName} event ${eventName} weight from ${originalWeight} to ${sectorData.explorationEvents[eventName]}`);
                    }
                }
            }
        }
    }

    /**
     * Collects all active abilities from players
     * @param {Array<Object>} players - Player objects
     * @returns {Set<string>} - Set of active ability names
     */
    collectActiveAbilities(players) {
        const abilities = new Set();
        players.forEach(player => {
            if (player.abilities && Array.isArray(player.abilities)) {
                player.abilities.forEach(ability => {
                    if (ability) { // Check if ability is not null
                        // Remove .png extension if present
                        const abilityName = ability.replace('.png', '');
                        abilities.add(abilityName);
                    }
                });
            }
        });
        return abilities;
    }

    /**
     * Collects all active items from players
     * @param {Array<Object>} players - Player objects
     * @returns {Array<string>} - Array of active item names
     */
    collectActiveItems(players) {
        const items = [];
        players.forEach(player => {
            if (player.items && Array.isArray(player.items)) {
                player.items.forEach(item => {
                    if (item) { // Check if item is not null
                        // Remove .jpg extension if present
                        const itemName = item.replace('.jpg', '');
                        items.push(itemName);
                    }
                });
            }
        });
        return items;
    }

    /**
     * Applies ability modifications to sector data
     * @param {Object} sectorData - Sector data to modify
     * @param {Set<string>} activeAbilities - Active abilities
     * @param {string} sectorName - Current sector name
     */
    applyAbilityModifications(sectorData, activeAbilities, sectorName) {
        activeAbilities.forEach(ability => {
            const abilityConfig = AbilityEffects[ability];
            if (!abilityConfig || !abilityConfig.effects) return;
            
            const effects = abilityConfig.effects;
            
            // Remove combat events (Diplomacy ability)
            if (effects.removeCombatEvents) {
                this.removeCombatEvents(sectorData);
            }
            
            // Double negative events (Traitor ability)
            if (effects.doubleNegativeEvents) {
                this.doubleNegativeEvents(sectorData);
            }
            
            // Increase fruit gains (Botanic ability)
            if (effects.fruitBonus) {
                this.applyFruitBonus(sectorData, effects.fruitBonus);
            }

            // Survival steak bonus: additive per survival instance counted earlier
            if (ability === 'survival' && this._survivalSteakBonus > 0) {
                this.applySteakBonus(sectorData, this._survivalSteakBonus);
            }
            
            // Sector-specific modifications (Pilot ability)
            if (effects.sectorModifications && effects.sectorModifications[sectorName]) {
                this.applySectorModifications(sectorData, effects.sectorModifications[sectorName]);
            }
        });
    }

    /**
     * Applies item modifications to sector data
     * @param {Object} sectorData - Sector data to modify
     * @param {Array<string>} activeItems - Active items
     * @param {string} sectorName - Current sector name
     */
    applyItemModifications(sectorData, activeItems, sectorName) {
        activeItems.forEach(item => {
            const itemConfig = ItemEffects[item];
            if (!itemConfig || !itemConfig.effects) return;
            
            const effects = itemConfig.effects;
            
            // Remove combat events (White Flag)
            if (effects.removeCombatEvents) {
                this.removeCombatEvents(sectorData);
            }
            
            // Remove specific events (Quad Compass)
            if (effects.removeEvents) {
                this.removeSpecificEvents(sectorData, effects.removeEvents);
            }

            // Solo expedition extra protection (Quad Compass): if only 1 player, remove PLAYER_LOST event from pools
            if (item === 'quad_compass' && this.getActivePlayers().length === 1) {
                if (sectorData.explorationEvents && sectorData.explorationEvents['PLAYER_LOST']) {
                    delete sectorData.explorationEvents['PLAYER_LOST'];
                    this.normalizeEventWeights(sectorData);
                    console.log('[Quad Compass] Solo expedition: removed PLAYER_LOST event from', sectorName);
                }
            }
            
            // Double fuel gains (Driller)
            if (effects.doubleFuelGains) {
                this.applyFuelDoubling(sectorData);
            }
            
            // Sector-specific event bonuses (Trad Module)
            if (effects.sectorEventBonus && effects.sectorEventBonus[sectorName]) {
                this.applySectorEventBonus(sectorData, effects.sectorEventBonus[sectorName]);
            }
        });
    }

    /**
     * Removes combat events from sector data
     * @param {Object} sectorData - Sector data to modify
     */
    removeCombatEvents(sectorData) {
        const combatEvents = Object.keys(sectorData.explorationEvents).filter(event => 
            event.includes('FIGHT_')
        );
        
        combatEvents.forEach(event => {
            delete sectorData.explorationEvents[event];
        });
        
        // Recalculate probabilities after removing combat events
        this.normalizeEventWeights(sectorData);
    }

    /**
     * Doubles the weight of negative events
     * @param {Object} sectorData - Sector data to modify
     */
    doubleNegativeEvents(sectorData) {
        Object.keys(sectorData.explorationEvents).forEach(event => {
            if (NegativeEvents.includes(event)) {
                sectorData.explorationEvents[event] *= 2;
            }
        });
        
        // Renormalize weights after doubling negative events
        this.normalizeEventWeights(sectorData);
    }

    /**
     * Removes specific events from sector data
     * @param {Object} sectorData - Sector data to modify
     * @param {Array<string>} eventsToRemove - Events to remove
     */
    removeSpecificEvents(sectorData, eventsToRemove) {
        eventsToRemove.forEach(event => {
            if (sectorData.explorationEvents[event]) {
                delete sectorData.explorationEvents[event];
            }
        });
        
        // Renormalize remaining events
        this.normalizeEventWeights(sectorData);
    }

    /**
     * Applies sector-specific modifications
     * @param {Object} sectorData - Sector data to modify
     * @param {Object} modifications - Modifications to apply
     */
    applySectorModifications(sectorData, modifications) {
        if (modifications.removeEvents) {
            this.removeSpecificEvents(sectorData, modifications.removeEvents);
        }
    }

    /**
     * Applies sector-specific event bonuses
     * @param {Object} sectorData - Sector data to modify
     * @param {Object} eventBonuses - Event bonuses to apply
     */
    applySectorEventBonus(sectorData, eventBonuses) {
        Object.entries(eventBonuses).forEach(([event, multiplier]) => {
            if (sectorData.explorationEvents[event]) {
                sectorData.explorationEvents[event] *= multiplier;
            }
        });
    }

    /**
     * Applies fruit bonus to harvest events
     * @param {Object} sectorData - Sector data to modify
     * @param {number} bonus - Bonus amount to add to fruit gains
     */
    applyFruitBonus(sectorData, bonus) {
        // Create new harvest events with increased amounts
        const newEvents = {};
        
        Object.entries(sectorData.explorationEvents).forEach(([event, weight]) => {
            if (event.startsWith('HARVEST_')) {
                const originalAmount = parseInt(event.split('_')[1]);
                const newAmount = originalAmount + bonus;
                const newEventName = `HARVEST_${newAmount}`;
                newEvents[newEventName] = weight;
            } else {
                newEvents[event] = weight;
            }
        });
        
        sectorData.explorationEvents = newEvents;
    }

    /**
     * Applies steak bonus (Survival ability) to provision events
     * @param {Object} sectorData - Sector data to modify
     * @param {number} bonus - Bonus steaks to add (already summed across multiple Survival abilities)
     */
    applySteakBonus(sectorData, bonus) {
        if (bonus <= 0) return;
        const newEvents = {};
        Object.entries(sectorData.explorationEvents).forEach(([event, weight]) => {
            if (event.startsWith('PROVISION_')) {
                const originalAmount = parseInt(event.split('_')[1]);
                const newAmount = originalAmount + bonus;
                const newEventName = `PROVISION_${newAmount}`;
                newEvents[newEventName] = weight;
            } else {
                newEvents[event] = weight;
            }
        });
        sectorData.explorationEvents = newEvents;
    }

    /**
     * Doubles fuel gains from fuel events
     * @param {Object} sectorData - Sector data to modify
     */
    applyFuelDoubling(sectorData) {
        // Create new fuel events with doubled amounts
        const newEvents = {};
        
        Object.entries(sectorData.explorationEvents).forEach(([event, weight]) => {
            if (event.startsWith('FUEL_')) {
                const originalAmount = parseInt(event.split('_')[1]);
                const newAmount = originalAmount * 2;
                const newEventName = `FUEL_${newAmount}`;
                newEvents[newEventName] = weight;
            } else {
                newEvents[event] = weight;
            }
        });
        
        sectorData.explorationEvents = newEvents;
    }

    /**
     * Normalizes event weights after modifications
     * @param {Object} sectorData - Sector data to normalize
     */
    normalizeEventWeights(sectorData) {
        // Get current total weight
        const currentTotal = Object.values(sectorData.explorationEvents).reduce((a, b) => a + b, 0);
        
        // If there are remaining events, normalize them back to the original scale
        if (currentTotal > 0) {
            const scaleFactor = 100 / currentTotal; // Scale back to 100 (typical total)
            Object.keys(sectorData.explorationEvents).forEach(event => {
                sectorData.explorationEvents[event] *= scaleFactor;
            });
        }
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
            movements: 0,
            combat: { fightBreakdown: {} },
            damages: { 
                groupDamageOther: 0, 
                singleDamage: 0,
                // Track damage events for detailed calculations
                damageBreakdown: {
                    singleDamage: [],
                    groupDamageOther: [],
                    // Individual event types for proper display
                    TIRED_2: [],
                    ACCIDENT_3_5: [],
                    DISASTER_3_5: []
                }
            },
            risks: { playerLoss: 0, killLost: 0, killAll: 0, killOne: 0 },
            setbacks: { rerolls: 0, retreat: 0, itemLoss: 0 },
            special: { disease: 0, mushTrap: 0 }
        };
    }

    /**
     * Calculates outcomes for each sector
     * @param {Object} outcomes - Outcomes object to populate
     * @param {Map<string, Object>} sectorDataMap - Map of sector name to sector data objects
     */
    calculateSectorOutcomes(outcomes, sectorDataMap) {
        sectorDataMap.forEach((sectorData, sectorName) => {
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
        
        // Other damages - keep each event type separate
        else if (event === 'ACCIDENT_3_5' || event === 'TIRED_2' || event === 'DISASTER_3_5') {
            // Initialize the event type in damageBreakdown if it doesn't exist
            if (!outcomes.damages.damageBreakdown[event]) {
                outcomes.damages.damageBreakdown[event] = [];
            }
            outcomes.damages.damageBreakdown[event].push(probability);
            
            // Also maintain legacy totals for backward compatibility
            if (event === 'ACCIDENT_3_5') {
                outcomes.damages.singleDamage += probability;
            } else if (event === 'TIRED_2' || event === 'DISASTER_3_5') {
                outcomes.damages.groupDamageOther += probability;
            }
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
        // Pass the calculated scenarios to each HTML generation function
        return `
            ${this.generateResourcesHTML(outcomes.resources)}
            ${this.generateCombatRisksHTML(outcomes.combat)}
            ${this.generateCombatDamageHTML(outcomes.combat)}
            ${this.generateEventRisksHTML(outcomes.damages)}
            ${this.generateEventDamagesHTML(outcomes.damages)}
            ${this.generateEventsHTML(outcomes.events)}
        `;
    }

    /**
     * Generates resources section HTML
     * @param {Object} resources - Resources outcomes
     * @returns {string} - HTML string
     */
    generateResourcesHTML(resources) {
        // Scenarios are now pre-calculated and passed in the resources object
        const scenarios = resources.scenarios;
        
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
        
    // Detect skew case where Optimist (percentile) is below Average (mean)
    const showSkewTooltip = resourceData.some(r => (r.data?.optimist ?? 0) < (r.data?.average ?? 0));
        
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
                ${showSkewTooltip ? `<div class="tooltip-item"><span>Note: If Optimist is below Average, it's due to a skewed distribution (many zeros with a small chance of a big gain). In such cases the mean can exceed the optimistic percentile.</span></div>` : ''}
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

        const results = combat.scenarios;
        const hpIcon = `<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`;
    const adjustedForEventPriority = results.adjustedForEventPriority;
    const showPessimistTooltip = (results.totalPessimistDamage ?? 0) > (results.totalAverageDamage ?? 0);

        return `
            <div class="outcome-category">
                <h5>Combat Damage</h5>
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
                ${adjustedForEventPriority ? `<div class="tooltip-item"><span>Since we can't have both an event and a combat on the same sector, Worst Case values may seem odd as they're partially handled by event damage.</span></div>` : ''}
                ${showPessimistTooltip ? `<div class="tooltip-item"><span>Note: Pessimist is a high-percentile (tail) outcome. With skewed damage (rare big hits), it can be higher than the Average—this is expected.</span></div>` : ''}
            </div>
        `;
    }

    /**
     * Generates event risks section HTML
     * @param {Object} damages - Damage outcomes with breakdown
     * @returns {string} - HTML string
     */
    generateEventRisksHTML(damages) {
        const hasEventDamage = damages.damageBreakdown.TIRED_2?.length > 0 ||
                              damages.damageBreakdown.ACCIDENT_3_5?.length > 0 ||
                              damages.damageBreakdown.DISASTER_3_5?.length > 0;
        
        if (!hasEventDamage) {
            return `
                <div class="outcome-category">
                    <h5>Event Risks</h5>
                    <div class="outcome-item"><span>No event damage risks</span></div>
                </div>
            `;
        }

        const risks = damages.risks;
        
        const eventEntries = Object.entries(risks)
            .map(([eventType, riskData]) => {
                const eventName = riskData.displayName || eventType;
                
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
    generateEventDamagesHTML(damages) {
        const hasEventDamage = damages.damageBreakdown.TIRED_2?.length > 0 ||
                              damages.damageBreakdown.ACCIDENT_3_5?.length > 0 ||
                              damages.damageBreakdown.DISASTER_3_5?.length > 0;
        
        if (!hasEventDamage) {
            return `
                <div class="outcome-category">
                    <h5>Event Damage</h5>
                    <div class="outcome-item"><span>No event damage expected</span></div>
                </div>
            `;
        }

        const results = damages.scenarios;
        const hpIcon = `<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`;
    const adjustedForCombatPriority = results.adjustedForCombatPriority;

        return `
            <div class="outcome-category">
                <h5>Event Damage</h5>
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
                ${adjustedForCombatPriority ? `<div class="tooltip-item"><span>Since we can't have both an event and a combat on the same sector, Worst Case values may seem odd as they're partially handled by combat damage.</span></div>` : ''}
            </div>
        `;
    }

    /**
     * Generates events section HTML with table layout using scenario system
     * @param {Object} events - The pre-calculated event scenarios
     * @returns {string} - HTML string
     */
    generateEventsHTML(events) {
        // Scenarios are now pre-calculated and passed in the 'events' object
        const scenarios = events;
        
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
        
    // Detect skew case where Optimist (percentile) is below Average (mean)
    const showSkewTooltip = eventData.some(e => (e.data?.optimist ?? 0) < (e.data?.average ?? 0));
    // Detect tail case where Pessimist (high-percentile) exceeds Average (mean)
    const showPessimistTooltip = eventData.some(e => (e.data?.pessimist ?? 0) > (e.data?.average ?? 0));
        
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
                ${showSkewTooltip ? `<div class="tooltip-item"><span>Note: If Optimist is below Average, it's due to a skewed distribution (many zeros with a small chance of a big effect). In such cases the mean can exceed the optimistic percentile.</span></div>` : ''}
                ${showPessimistTooltip ? `<div class="tooltip-item"><span>Note: Pessimist is a high-percentile (tail) outcome. With skewed counts (rare big effects), it can be higher than the Average—this is expected.</span></div>` : ''}
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

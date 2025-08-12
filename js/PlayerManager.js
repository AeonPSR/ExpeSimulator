// Player Manager - Handles player profiles and management

class PlayerManager {
    constructor(onPlayerUpdateCallback = null) {
        this.players = [];
        this.nextPlayerId = 1;
        this.toggleState = false; // Toggle button state
        this.antigravPropellerState = false; // Antigrav propeller button state
        this.currentMode = 'icarus'; // Mode button state: 'patrol' or 'icarus' (default: icarus)
    this.oxygenlessPlanet = false; // If true, players without space suit are stuck on ship
    this.currentMovements = 0; // Cached movements value for UI
        this.onPlayerUpdateCallback = onPlayerUpdateCallback;
        this.combatDamage = {
            optimist: [],
            average: [],
            pessimist: [],
            worstCase: []
        };
        this.eventDamage = {
            optimist: 0,
            average: 0,
            pessimist: 0,
            worstCase: 0
        };
        this.eventDamagePerPlayer = {
            optimist: [],
            average: [],
            pessimist: [],
            worstCase: []
        };
        // Track damage sources count per player
        this.damageSources = {
            optimist: [],
            average: [],
            pessimist: [],
            worstCase: []
        };
        // Create an instance of FightHandler for damage distribution
        this.fightHandler = new FightHandler();
        this.availableCharacters = [
            'andie.png', 'chao.png', 'chun.png', 'derek.png', 'eleesha.png',
            'finola.png', 'frieda.png', 'gioele.png', 'hua.png', 'ian.png',
            'janice.png', 'jin_su.png', 'kuan_ti.png', 'paola.png', 
            'raluca.png', 'roland.png', 'stephen.png', 'terrence.png',
            'lambda_f.png' // Lambda at the end
        ];
        this.normalAbilities = [
            'survival.png', 'botanic.png', 'pilot.png', 'gunman.png', 'diplomacy.png', 'sprint.png', 'skillful.png'
        ];
        this.pinkAbilities = [
            'traitor.png'
        ];
        this.availableItems = [
            'blaster.jpg', 'driller.jpg', 'echo_sounder.jpg', 'grenade.jpg', 'heat_seeker.jpg',
            'knife.jpg', 'machine_gun.jpg', 'missile_launcher.jpg', 'natamy_riffle.jpg',
            'plastenite_armor.jpg', 'postit.jpg', 'quad_compass.jpg', 'rope.jpg',
            'sniper_riffle.jpg', 'space_suit.jpg', 'trad_module.jpg', 'white_flag.jpg'
        ];
    }

    /**
     * Initialize player management
     */
    initialize() {
        this.attachEventListeners();
    }

    /**
     * Attach event listeners for player management
     */
    attachEventListeners() {
        const addPlayerBtn = document.getElementById('add-player-btn');
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', () => this.addPlayer());
        }
        
        // Initialize toggle button
        this.initializeToggle();
        
        // Initialize antigrav propeller button
        this.initializeAntigravPropeller();
        
        // Initialize mode button
        this.initializeModeButton();

    // Initialize oxygenless planet toggle
    this.initializeOxygenlessPlanetToggle();
    }

    /**
     * Add a new player profile
     */
    addPlayer() {
        // Check if we've reached the maximum number of players
        if (this.players.length >= 8) {
            return;
        }

        const playerId = this.nextPlayerId++;
        
        const player = {
            id: playerId,
            avatar: 'lambda_f.png', // Default character
            abilities: [null, null, null, null, null], // 4 regular + 1 pink
            items: [null, null, null], // 3 item slots
            health: 14 // Default starting health
        };
        
        this.players.push(player);
        this.renderPlayer(player);
        
        // Update add button visibility/state if needed
        this.updateAddButtonState();
        
        // Trigger update callback
        this.triggerPlayerUpdate();
    }

    /**
     * Show character selection modal
     * @param {number} playerId - Player ID
     */
    showCharacterSelection(playerId) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'character-selection-modal';
        modal.innerHTML = `
            <div class="character-selection-content">
                <div class="character-selection-close">×</div>
                <div class="character-grid">
                    ${this.availableCharacters.map(char => `
                        <div class="character-option" data-character="${char}">
                            <img src="${getResourceURL(`characters/${char}`)}" alt="${char.replace('.png', '').replace('_', ' ')}" />
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(modal);

        // Add click handlers for character options
        const characterOptions = modal.querySelectorAll('.character-option');
        characterOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedCharacter = option.getAttribute('data-character');
                this.updatePlayerAvatar(playerId, selectedCharacter);
                document.body.removeChild(modal);
            });
        });

        // Add close button handler
        const closeBtn = modal.querySelector('.character-selection-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Highlight current character if any
        const currentPlayer = this.players.find(p => p.id === playerId);
        if (currentPlayer && currentPlayer.avatar) {
            const currentOption = modal.querySelector(`[data-character="${currentPlayer.avatar}"]`);
            if (currentOption) {
                currentOption.classList.add('selected');
            }
        }
    }

    /**
     * Update player avatar
     * @param {number} playerId - Player ID
     * @param {string} avatarFile - Avatar filename
     */
    updatePlayerAvatar(playerId, avatarFile) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.avatar = avatarFile;
            
            // Update the avatar image in the UI
            const avatarElement = document.querySelector(`[data-player-id="${playerId}"] .player-avatar img`);
            if (avatarElement) {
                avatarElement.src = getResourceURL(`characters/${avatarFile}`);
            }
            
            // Trigger update callback (though avatar changes don't affect probabilities, keeping consistent)
            this.triggerPlayerUpdate();
        }
    }

    /**
     * Render a player profile in the UI
     * @param {Object} player - Player object
     */
    renderPlayer(player) {
        const playersContainer = document.getElementById('players-container');
        const addPlayerBtn = document.getElementById('add-player-btn');
        
        const playerElement = document.createElement('div');
        playerElement.className = 'player-profile';
        playerElement.setAttribute('data-player-id', player.id);
        
        playerElement.innerHTML = `
            <div class="player-avatar" data-player-id="${player.id}">
                <img src="${getResourceURL(`characters/${player.avatar}`)}" alt="Player Avatar" />
            </div>
            <div class="player-details">
                <div class="player-abilities">
                    ${this.renderAbilitySlots(player)}
                </div>
                <div class="player-bottom-row">
                    ${this.renderItemSlots(player)}
                    <div class="health-slot" data-type="health" data-player-id="${player.id}">
                        ${player.health}
                        <img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />
                    </div>
                </div>
            </div>
            <div class="player-remove-btn" data-player-id="${player.id}">×</div>
        `;
        
        // Insert before the add button
        playersContainer.insertBefore(playerElement, addPlayerBtn);
        
        // Attach event listeners for this player
        this.attachPlayerEventListeners(player.id);
    }

    /**
     * Render ability slots for a player
     * @param {Object} player - Player object
     * @returns {string} - HTML string for ability slots
     */
    renderAbilitySlots(player) {
        let html = '';
        for (let i = 0; i < 5; i++) {
            const isPink = i === 4; // Last slot is pink
            const cssClass = isPink ? 'ability-slot pink' : 'ability-slot';
            const ability = player.abilities[i];
            const abilityContent = ability ? `<img src="${getResourceURL(`abilities/${ability}`)}" alt="Ability" />` : '';
            html += `<div class="${cssClass}" data-type="ability" data-slot="${i}" data-player-id="${player.id}">${abilityContent}</div>`;
        }
        return html;
    }

    /**
     * Render item slots for a player
     * @param {Object} player - Player object
     * @returns {string} - HTML string for item slots
     */
    renderItemSlots(player) {
        let html = '';
        for (let i = 0; i < 3; i++) {
            const item = player.items[i];
            const itemContent = item ? `<img src="${getResourceURL(`items_exploration/${item}`)}" alt="Item" />` : '';
            html += `<div class="item-slot" data-type="item" data-slot="${i}" data-player-id="${player.id}">${itemContent}</div>`;
        }
        return html;
    }

    /**
     * Attach event listeners for a specific player
     * @param {number} playerId - Player ID
     */
    attachPlayerEventListeners(playerId) {
        // Avatar click for character selection
        const avatarElement = document.querySelector(`[data-player-id="${playerId}"] .player-avatar`);
        if (avatarElement) {
            avatarElement.addEventListener('click', () => this.showCharacterSelection(playerId));
        }

        // Remove button
        const removeBtn = document.querySelector(`[data-player-id="${playerId}"].player-remove-btn`);
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removePlayer(playerId));
        }

        // Health and morale slots (for future editing)
        const healthSlot = document.querySelector(`[data-player-id="${playerId}"][data-type="health"]`);
        const moraleSlot = document.querySelector(`[data-player-id="${playerId}"][data-type="morale"]`);
        
        if (healthSlot) {
            healthSlot.addEventListener('click', () => this.editPlayerStat(playerId, 'health'));
        }
        
        if (moraleSlot) {
            moraleSlot.addEventListener('click', () => this.editPlayerStat(playerId, 'morale'));
        }

        // Ability and item slots (for future functionality)
        const abilitySlots = document.querySelectorAll(`[data-player-id="${playerId}"][data-type="ability"]`);
        const itemSlots = document.querySelectorAll(`[data-player-id="${playerId}"][data-type="item"]`);
        
        abilitySlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const slotIndex = parseInt(slot.getAttribute('data-slot'));
                this.editPlayerAbility(playerId, slotIndex);
            });
        });
        
        itemSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const slotIndex = parseInt(slot.getAttribute('data-slot'));
                this.editPlayerItem(playerId, slotIndex);
            });
        });
    }

    /**
     * Remove a player
     * @param {number} playerId - Player ID to remove
     */
    removePlayer(playerId) {
        // Remove from players array
        this.players = this.players.filter(p => p.id !== playerId);
        
        // Remove from UI
        const playerElement = document.querySelector(`[data-player-id="${playerId}"].player-profile`);
        if (playerElement) {
            playerElement.remove();
        }
        
        // Update add button visibility/state
        this.updateAddButtonState();
        
        // Trigger update callback
        this.triggerPlayerUpdate();
    }

    /**
     * Update add button visibility based on player count
     */
    updateAddButtonState() {
        const addPlayerBtn = document.getElementById('add-player-btn');
        if (addPlayerBtn) {
            if (this.players.length >= 8) {
                addPlayerBtn.style.display = 'none';
            } else {
                addPlayerBtn.style.display = 'flex';
            }
        }
    }

    /**
     * Edit player health or morale
     * @param {number} playerId - Player ID
     * @param {string} statType - 'health' or 'morale'
     */
    editPlayerStat(playerId, statType) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const currentValue = player[statType];
        const newValue = prompt(`Enter new ${statType} value:`, currentValue);
        
        if (newValue !== null && !isNaN(newValue)) {
            const numValue = parseInt(newValue);
            if (numValue >= 0) {
                player[statType] = numValue;
                
                // Update UI - preserve the heart icon for health
                const slot = document.querySelector(`[data-player-id="${playerId}"][data-type="${statType}"]`);
                if (slot) {
                    if (statType === 'health') {
                        // For health, preserve the heart icon
                        slot.innerHTML = `${numValue}<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`;
                    } else {
                        // For other stats, just update the text
                        slot.textContent = numValue;
                    }
                }
            }
        }
    }

    /**
     * Edit player ability (placeholder for future functionality)
     * @param {number} playerId - Player ID
     * @param {number} slotIndex - Ability slot index
     */
    editPlayerAbility(playerId, slotIndex) {
        const isPinkSlot = slotIndex === 4;
        this.showAbilitySelection(playerId, slotIndex, isPinkSlot);
    }

    /**
     * Show ability selection modal
     * @param {number} playerId - Player ID
     * @param {number} slotIndex - Ability slot index
     * @param {boolean} isPinkSlot - Whether this is a pink ability slot
     */
    showAbilitySelection(playerId, slotIndex, isPinkSlot) {
        const availableAbilities = isPinkSlot ? this.pinkAbilities : this.normalAbilities;
        const slotType = isPinkSlot ? 'Pink' : 'Normal';
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'character-selection-modal ability-selection'; // Add ability-selection class
        modal.innerHTML = `
            <div class="character-selection-content">
                <div class="character-selection-close">×</div>
                <div class="character-grid">
                    <div class="character-option" data-ability="null">
                        <div style="width: auto; height: 100%; display: flex; align-items: center; justify-content: center; color: #bdc3c7; font-size: 24px;">×</div>
                    </div>
                    ${availableAbilities.map(ability => `
                        <div class="character-option" data-ability="${ability}">
                            <img src="${getResourceURL(`abilities/${ability}`)}" alt="${ability.replace('.png', '').replace('_', ' ')}" />
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(modal);

        // Add click handlers for ability options
        const abilityOptions = modal.querySelectorAll('.character-option');
        abilityOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedAbility = option.getAttribute('data-ability');
                const abilityValue = selectedAbility === 'null' ? null : selectedAbility;
                this.updatePlayerAbility(playerId, slotIndex, abilityValue);
                document.body.removeChild(modal);
            });
        });

        // Add close button handler
        const closeBtn = modal.querySelector('.character-selection-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Highlight current ability if any
        const currentPlayer = this.players.find(p => p.id === playerId);
        if (currentPlayer && currentPlayer.abilities[slotIndex]) {
            const currentOption = modal.querySelector(`[data-ability="${currentPlayer.abilities[slotIndex]}"]`);
            if (currentOption) {
                currentOption.classList.add('selected');
            }
        } else {
            // Highlight the "remove" option if no ability selected
            const removeOption = modal.querySelector('[data-ability="null"]');
            if (removeOption) {
                removeOption.classList.add('selected');
            }
        }
    }

    /**
     * Update player ability
     * @param {number} playerId - Player ID
     * @param {number} slotIndex - Ability slot index
     * @param {string|null} abilityFile - Ability filename or null to remove
     */
    updatePlayerAbility(playerId, slotIndex, abilityFile) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.abilities[slotIndex] = abilityFile;
            
            // Update the ability slot in the UI
            const abilitySlot = document.querySelector(`[data-player-id="${playerId}"][data-type="ability"][data-slot="${slotIndex}"]`);
            if (abilitySlot) {
                if (abilityFile) {
                    abilitySlot.innerHTML = `<img src="${getResourceURL(`abilities/${abilityFile}`)}" alt="Ability" />`;
                } else {
                    abilitySlot.innerHTML = '';
                }
            }
            
            // Trigger update callback
            this.triggerPlayerUpdate();
        }
    }

    /**
     * Edit player item (placeholder for future functionality)
     * @param {number} playerId - Player ID
     * @param {number} slotIndex - Item slot index
     */
    editPlayerItem(playerId, slotIndex) {
        this.showItemSelection(playerId, slotIndex);
    }

    /**
     * Show item selection modal
     * @param {number} playerId - Player ID
     * @param {number} slotIndex - Item slot index
     */
    showItemSelection(playerId, slotIndex) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'character-selection-modal item-selection'; // Add item-selection class
        modal.innerHTML = `
            <div class="character-selection-content">
                <div class="character-selection-close">×</div>
                <div class="character-grid">
                    <div class="character-option" data-item="null">
                        <div style="width: auto; height: 100%; display: flex; align-items: center; justify-content: center; color: #bdc3c7; font-size: 24px;">×</div>
                    </div>
                    ${this.availableItems.map(item => `
                        <div class="character-option" data-item="${item}">
                            <img src="${getResourceURL(`items_exploration/${item}`)}" alt="${item.replace(/\.(jpg|png)/, '').replace('_', ' ')}" />
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(modal);

        // Add click handlers for item options
        const itemOptions = modal.querySelectorAll('.character-option');
        itemOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedItem = option.getAttribute('data-item');
                const itemValue = selectedItem === 'null' ? null : selectedItem;
                this.updatePlayerItem(playerId, slotIndex, itemValue);
                document.body.removeChild(modal);
            });
        });

        // Add close button handler
        const closeBtn = modal.querySelector('.character-selection-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Highlight current item if any
        const currentPlayer = this.players.find(p => p.id === playerId);
        if (currentPlayer && currentPlayer.items[slotIndex]) {
            const currentOption = modal.querySelector(`[data-item="${currentPlayer.items[slotIndex]}"]`);
            if (currentOption) {
                currentOption.classList.add('selected');
            }
        } else {
            // Highlight the "remove" option if no item selected
            const removeOption = modal.querySelector('[data-item="null"]');
            if (removeOption) {
                removeOption.classList.add('selected');
            }
        }
    }

    /**
     * Update player item
     * @param {number} playerId - Player ID
     * @param {number} slotIndex - Item slot index
     * @param {string|null} itemFile - Item filename or null to remove
     */
    updatePlayerItem(playerId, slotIndex, itemFile) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            const oldItemFile = player.items[slotIndex];
            player.items[slotIndex] = itemFile;
            
            // Update the item slot in the UI
            const itemSlot = document.querySelector(`[data-player-id="${playerId}"][data-type="item"][data-slot="${slotIndex}"]`);
            if (itemSlot) {
                if (itemFile) {
                    itemSlot.innerHTML = `<img src="${getResourceURL(`items_exploration/${itemFile}`)}" alt="Item" />`;
                } else {
                    itemSlot.innerHTML = '';
                }
            }
            
            // Trigger update callback
            this.triggerPlayerUpdate();
        }
    }

    /**
     * Consume/use a single-use item
     * @param {number} playerId - Player ID
     * @param {number} slotIndex - Item slot index
     */
    consumeItem(playerId, slotIndex) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const itemFile = player.items[slotIndex];
        if (!itemFile) return;

        const itemConfig = ItemEffects[itemFile.replace(/\.(jpg|png)$/, '')];
        if (!itemConfig || !itemConfig.effects.singleUse) return;

        // Remove the item from inventory after use
        this.updatePlayerItem(playerId, slotIndex, null);
    }

    /**
     * Get all players data
     * @returns {Array} - Array of player objects
     */
    getPlayers() {
        return this.players;
    }

    /**
     * Get a specific player by ID
     * @param {number} playerId - Player ID
     * @returns {Object|null} - Player object or null if not found
     */
    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId) || null;
    }

    /**
     * Initialize toggle button functionality
     */
    initializeToggle() {
        const toggleBtn = document.querySelector('.players-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleState = !this.toggleState;
                toggleBtn.setAttribute('data-active', this.toggleState.toString());
                
                // Update fighting power display immediately
                this.updateFightingPowerDisplay();
                
                // Trigger callback for other updates
                if (this.onPlayerUpdateCallback) {
                    this.onPlayerUpdateCallback();
                }
            });
        }
    }

    /**
     * Initialize antigrav propeller button functionality
     */
    initializeAntigravPropeller() {
        const antigravBtn = document.querySelector('.antigrav-propeller-btn');
        if (antigravBtn) {
            antigravBtn.addEventListener('click', () => {
                this.antigravPropellerState = !this.antigravPropellerState;
                antigravBtn.setAttribute('data-active', this.antigravPropellerState.toString());
                
                // Update fighting power display immediately
                this.updateFightingPowerDisplay();
                
                // Trigger callback for other updates
                if (this.onPlayerUpdateCallback) {
                    this.onPlayerUpdateCallback();
                }
            });
        }
    }

    /**
     * Initialize mode button functionality
     */
    initializeModeButton() {
        const modeBtn = document.querySelector('.players-mode-btn');
        if (modeBtn) {
            modeBtn.addEventListener('click', () => {
                // Switch between icarus and patrol modes
                this.currentMode = this.currentMode === 'icarus' ? 'patrol' : 'icarus';
                modeBtn.setAttribute('data-mode', this.currentMode);
                
                // Update the image source
                const img = modeBtn.querySelector('img');
                if (img) {
                    const imageName = this.currentMode === 'icarus' ? 'icarus_access.png' : 'patrol_ship.png';
                    img.src = getResourceURL(`others/${imageName}`);
                    img.alt = this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
                }
                
                // Update fighting power display
                this.updateFightingPowerDisplay();

                // Update movements display immediately when mode changes
                this.updateMovementsDisplay();

                // Trigger callback to refresh all calculations/UI (re-run simulation)
                if (this.onPlayerUpdateCallback) {
                    this.onPlayerUpdateCallback();
                }
            });
        }
    }

    /**
     * Initialize oxygenless planet toggle functionality
     */
    initializeOxygenlessPlanetToggle() {
        const oxyBtn = document.querySelector('#oxygenless-planet-btn');
        if (oxyBtn) {
            oxyBtn.addEventListener('click', () => {
                this.oxygenlessPlanet = !this.oxygenlessPlanet;
                oxyBtn.setAttribute('data-active', this.oxygenlessPlanet.toString());
                // Trigger callback to refresh all calculations/UI
                if (this.onPlayerUpdateCallback) {
                    this.onPlayerUpdateCallback();
                }
                this.updateFightingPowerDisplay();
                this.updateMovementsDisplay();
            });
        }
    }

    /**
     * Returns true if the player is considered active for the expedition (not stuck in ship)
     * On oxygenless planets, only players with a space suit are active.
     * @param {number|Object} playerOrIndex - Player object or index
     */
    isPlayerActive(playerOrIndex) {
        const player = typeof playerOrIndex === 'number' ? this.players[playerOrIndex] : playerOrIndex;
        if (!player) return false;
        if (!this.oxygenlessPlanet) return true; // Oxygen available: all players active
        // Oxygenless: needs space suit to participate
        return (player.items || []).some(it => it && it.startsWith('space_suit'));
    }

    /**
     * Get indices of active players only (those who will be accounted for in calculations)
     * @returns {number[]} indices of active players in this.players
     */
    getActivePlayerIndices() {
        const indices = [];
        this.players.forEach((p, i) => {
            if (this.isPlayerActive(p)) indices.push(i);
        });
        return indices;
    }
    
    /**
     * Calculate the party's total fighting power
     * @param {number} requiredPower - The power required to win the combat (if provided)
     * @returns {number} - Total fighting power
     */
    calculateFightingPower() {
        let fightingPower = 0;

        // Only active players contribute to fighting power on oxygenless planets
        const activeIndices = this.getActivePlayerIndices();
        fightingPower += activeIndices.length;

        // Add power from permanent items and abilities (only from active players)
        activeIndices.forEach(idx => {
            const player = this.players[idx];
            // Add non-grenade item powers
            player.items.forEach((item) => {
                if (item) {
                    const itemKey = item.replace(/\.(jpg|png)$/, '');
                    if (itemKey !== 'grenade') {
                        fightingPower += this.getWeaponPower(item);
                    }
                }
            });
            
            // Add ability powers for this player
            player.abilities.forEach(ability => {
                if (ability) {
                    fightingPower += this.getAbilityPower(ability, player);
                }
            });
        });
        
        return fightingPower;
    }
    
    /**
     * Stores the combat damage results for player HP preview
     * @param {Object} combatResults - Results from FightHandler.calculateCombatDamageScenarios
     */
    storeCombatDamage(combatResults) {
        if (!combatResults) return;
        
        // Distribute combat damage instances among players for each scenario
        this.combatDamage = this.distributeCombatDamageInstances(combatResults.damageInstances);
        
        // Track combat damage as a source for each player who receives damage
        this.trackDamageSources('combat', this.combatDamage);
    }

    /**
     * Distributes combat damage instances among players (fights distribute damage among all players)
     * @param {Object} damageInstances - Combat damage instances from FightHandler
     * @returns {Object} - Per-player damage arrays for each scenario
     */
    distributeCombatDamageInstances(damageInstances) {
        const totalPlayers = this.players.length;
        const activeIndices = this.getActivePlayerIndices();
        const activeCount = activeIndices.length;

        // If no active players, return zeroed arrays sized to total players for stable indexing
        if (activeCount === 0) {
            return {
                optimist: Array(totalPlayers).fill(0),
                average: Array(totalPlayers).fill(0),
                pessimist: Array(totalPlayers).fill(0),
                worstCase: Array(totalPlayers).fill(0)
            };
        }

        // Initialize per-player damage arrays
        const perPlayerDamage = {
            optimist: Array(totalPlayers).fill(0),
            average: Array(totalPlayers).fill(0),
            pessimist: Array(totalPlayers).fill(0),
            worstCase: Array(totalPlayers).fill(0)
        };

        // Process each scenario
        // Precompute armor/survival reduction per ACTIVE player index
        const armorReductionActive = activeIndices.map(idx => {
            const p = this.players[idx];
            return p.items && p.items.some(it => it && it.startsWith('plastenite_armor')) ? 1 : 0;
        });
        const survivalReductionActive = activeIndices.map(idx => {
            const p = this.players[idx];
            return p.abilities && p.abilities.some(ab => ab === 'survival.png') ? 1 : 0;
        });

        ['optimist', 'average', 'pessimist', 'worstCase'].forEach(scenario => {
            if (damageInstances[scenario]) {
                damageInstances[scenario].forEach(instance => {
                    this.distributeCombatInstanceDamage(
                        instance.count,
                        instance.damagePerInstance,
                        perPlayerDamage[scenario],
                        armorReductionActive,
                        survivalReductionActive,
                        activeIndices
                    );
                });
            }
        });

        return perPlayerDamage;
    }

    /**
     * Distributes damage from a single combat instance to players
     * @param {number} count - Number of fights of this type
     * @param {number} damagePerInstance - Damage per fight instance
     * @param {Array<number>} playerDamageArray - Array to update with damage distribution
     */
    distributeCombatInstanceDamage(count, damagePerInstance, playerDamageArray, armorReductionActive = [], survivalReductionActive = [], activeIndices = []) {
        const activeCount = activeIndices.length;
        if (activeCount === 0) return;

        // Process each instance of this fight type
        for (let i = 0; i < count; i++) {
            let totalDamage = damagePerInstance;

            // COMBAT: Always distribute among all players (like TIRED_2/DISASTER_3_5)
            const baseDamagePerPlayer = Math.floor(totalDamage / activeCount);
            const remainderDamage = totalDamage - (baseDamagePerPlayer * activeCount);

            // Temporary array to apply per-instance reductions before aggregating
            const instanceDamage = new Array(activeCount).fill(baseDamagePerPlayer);

            // Apply remainder
            for (let j = 0; j < remainderDamage; j++) {
                instanceDamage[j % activeCount] += 1;
            }

            // Apply armor reduction (1 per fight instance for equipped players), not below 0
            for (let j = 0; j < activeCount; j++) {
                if (armorReductionActive[j] > 0 && instanceDamage[j] > 0) {
                    instanceDamage[j] = Math.max(0, instanceDamage[j] - armorReductionActive[j]);
                }
            }

            // Apply survival reduction (1 per fight instance for players with Survival), cumulative with armor
            for (let j = 0; j < activeCount; j++) {
                if (survivalReductionActive[j] > 0 && instanceDamage[j] > 0) {
                    instanceDamage[j] = Math.max(0, instanceDamage[j] - survivalReductionActive[j]);
                }
            }

            // Add to cumulative array
            for (let j = 0; j < activeCount; j++) {
                const playerIndex = activeIndices[j];
                playerDamageArray[playerIndex] += instanceDamage[j];
            }
        }
    }
    
    /**
     * Stores the event damage results for player HP preview
     * @param {Object} eventResults - Results from EventDamageHandler.calculateEventDamageScenarios
     */
    storeEventDamage(eventResults) {
        if (!eventResults) return;
        
        this.eventDamage.optimist = eventResults.totalOptimistDamage || 0;
        this.eventDamage.average = eventResults.totalAverageDamage || 0;
        this.eventDamage.pessimist = eventResults.totalPessimistDamage || 0;
        this.eventDamage.worstCase = eventResults.totalWorstCaseDamage || 0;

        // Remove event damage for worstCase if combat is the true worst case (flag set by ProbabilityCalculator)
        if (eventResults.combatOverridesWorstCase) {
            eventResults.damageInstances.worstCase = [];
            eventResults.totalWorstCaseDamage = 0;
        }

        // Distribute damage instances among players for each scenario
        this.eventDamagePerPlayer = this.distributeDamageInstances(eventResults.damageInstances);

        // If there's any event damage, track it as a source (will be properly distributed later)
        if (eventResults.totalOptimistDamage > 0 || 
            eventResults.totalAverageDamage > 0 || 
            eventResults.totalPessimistDamage > 0 || 
            eventResults.totalWorstCaseDamage > 0) {
            this.trackEventDamageSources(eventResults);
        }
    }

    /**
     * Distributes damage instances among players based on event types
     * @param {Object} damageInstances - Damage instances from EventDamageHandler
     * @returns {Object} - Per-player damage arrays for each scenario
     */
    distributeDamageInstances(damageInstances) {
    const totalPlayers = this.players.length;
    const activeIndices = this.getActivePlayerIndices();
    const activeCount = activeIndices.length;

    // If no active players, return zeroed arrays sized to total players for stable indexing
    if (activeCount === 0) {
            return {
        optimist: Array(totalPlayers).fill(0),
        average: Array(totalPlayers).fill(0),
        pessimist: Array(totalPlayers).fill(0),
        worstCase: Array(totalPlayers).fill(0)
            };
        }

        // Initialize per-player damage arrays
    const perPlayerDamage = {
        optimist: Array(totalPlayers).fill(0),
        average: Array(totalPlayers).fill(0),
        pessimist: Array(totalPlayers).fill(0),
        worstCase: Array(totalPlayers).fill(0)
    };

        // Process each scenario
        ['optimist', 'average', 'pessimist', 'worstCase'].forEach(scenario => {
            if (damageInstances[scenario]) {
                // DEBUG: Log damage instances for each scenario
                console.log(`PLAYER MANAGER DEBUG: Processing scenario "${scenario}" with ${damageInstances[scenario].length} damage instances:`);
                damageInstances[scenario].forEach((instance, index) => {
                    console.log(`PLAYER MANAGER DEBUG: Instance ${index}: type=${instance.type}, count=${instance.count}, damagePerInstance=${instance.damagePerInstance}`);
                });
                
                damageInstances[scenario].forEach(instance => {
                    this.distributeInstanceDamage(
                        instance.type,
                        instance.count,
                        instance.damagePerInstance,
                        perPlayerDamage[scenario],
                        instance.sources || [],
                        activeIndices
                    );
                });
            }
        });

        return perPlayerDamage;
    }

    /**
     * Distributes damage from a single damage instance to players
     * @param {string} eventType - Type of event (TIRED_2, ACCIDENT_3_5, DISASTER_3_5)
     * @param {number} count - Number of events of this type
     * @param {number} damagePerInstance - Damage per event instance
     * @param {Array<number>} playerDamageArray - Array to update with damage distribution
     * @param {Array<Object>} sources - Array of assigned source information with {sectorId, sectorName} for each instance
     */
    distributeInstanceDamage(eventType, count, damagePerInstance, playerDamageArray, sources = [], activeIndices = []) {
        const activeCount = activeIndices.length;
        if (activeCount === 0) return;

        // DEBUG: Log parameters received by PlayerManager
        if (eventType === 'ACCIDENT_3_5') {
            console.log(`PLAYER MANAGER DEBUG: distributeInstanceDamage called for ${eventType}`);
            console.log(`PLAYER MANAGER DEBUG: count = ${count}, damagePerInstance = ${damagePerInstance}`);
            console.log(`PLAYER MANAGER DEBUG: total damage to distribute = ${count * damagePerInstance}`);
            console.log(`PLAYER MANAGER DEBUG: sources array length = ${sources.length}`);
            console.log(`PLAYER MANAGER DEBUG: sources =`, sources);
        }

        // Process each instance of this event type
        for (let i = 0; i < count; i++) {
            let actualDamage = damagePerInstance;
            
            // Get the assigned source for this specific instance
            const source = sources[i] || null;

            if (eventType === 'ACCIDENT_3_5') {
                // ACCIDENT: Single target damage - randomly select one player
                const targetActiveIdx = Math.floor(Math.random() * activeCount);
                const targetPlayerIndex = activeIndices[targetActiveIdx];
                
                // Check if the target player has sector-specific immunity
                if (source && this.hasItemImmunity(targetPlayerIndex, eventType, source.sectorName)) {
                    console.log(`Player ${targetPlayerIndex} is immune to ${eventType} from ${source.sectorName}#${source.sectorId} (Rope protection)`);
                    actualDamage = 0;
                }

                // Survival reduction for targeted events
                const targetPlayer = this.players[targetPlayerIndex];
                if (actualDamage > 0 && targetPlayer && targetPlayer.abilities && targetPlayer.abilities.some(ab => ab === 'survival.png')) {
                    actualDamage = Math.max(0, actualDamage - 1);
                }
                
                playerDamageArray[targetPlayerIndex] += actualDamage;
            } else {
                // TIRED_2 and DISASTER_3_5: Multi-target damage - apply to ALL players
                for (let aj = 0; aj < activeCount; aj++) {
                    const j = activeIndices[aj];
                    let playerDamage = actualDamage;
                    
                    // Check if this player has sector-specific immunity
                    if (source && this.hasItemImmunity(j, eventType, source.sectorName)) {
                        console.log(`Player ${j} is immune to ${eventType} from ${source.sectorName}#${source.sectorId} (Rope protection)`);
                        playerDamage = 0;
                    }
                    
                    // Survival reduction for AoE events
                    const playerObj = this.players[j];
                    if (playerDamage > 0 && playerObj && playerObj.abilities && playerObj.abilities.some(ab => ab === 'survival.png')) {
                        playerDamage = Math.max(0, playerDamage - 1);
                    }
                    playerDamageArray[j] += playerDamage;
                }
            }
        }
    }
    
    /**
     * Checks if a player has item-based immunity to a specific event from a specific sector
     * @param {number} playerIndex - Index of the player to check
     * @param {string} eventType - Type of event (e.g., "ACCIDENT_3_5")
     * @param {string} sectorName - Name of the sector causing the event
     * @returns {boolean} - True if the player is immune
     */
    hasItemImmunity(playerIndex, eventType, sectorName) {
        if (!this.players[playerIndex] || !this.players[playerIndex].items) {
            return false;
        }

        // Check each item the player has
        for (const item of this.players[playerIndex].items) {
            if (!item) continue;
            
            // Extract item name without file extension
            const itemName = item.replace(/\.(jpg|png)$/, '');
            
            // Check if this item provides immunity
            if (ItemEffects[itemName] && ItemEffects[itemName].effects && ItemEffects[itemName].effects.sectorSpecificImmunity) {
                const immunities = ItemEffects[itemName].effects.sectorSpecificImmunity;
                
                // Check if this item provides immunity to this event type in this sector
                if (immunities[sectorName] && immunities[sectorName].includes(eventType)) {
                    return true;
                }
            }
        }

        return false;
    }
    
    /**
     * Tracks damage sources for all players
     * @param {string} sourceType - Type of damage source (e.g., 'combat', 'event')
     * @param {Object} perPlayerDamage - Per-player damage object with optimist, average, etc. arrays
     * @private
     */
    trackDamageSources(sourceType, perPlayerDamage) {
        // Initialize damage sources arrays if needed
        if (this.damageSources.optimist.length !== this.players.length) {
            this.resetDamageSources();
        }
        
        // For each player, increment source count if they received damage
        this.players.forEach((player, index) => {
            // Check each scenario
            ['optimist', 'average', 'pessimist', 'worstCase'].forEach(scenario => {
                if (perPlayerDamage[scenario] && 
                    perPlayerDamage[scenario].length > index && 
                    perPlayerDamage[scenario][index] > 0) {
                    this.damageSources[scenario][index]++;
                }
            });
        });
    }
    
    /**
     * Tracks event damage sources that will be distributed among players
     * @param {Object} eventResults - Event damage results
     * @private
     */
    trackEventDamageSources(eventResults) {
        // For event damage, we need to know how many sources affected each player
        // This depends on event types from eventResults.damageCalculations if available
        
        // Simple approach: if there's any damage in a scenario, count it as one source for all players
        const playerCount = this.players.length;
        
        // Initialize damage sources arrays if needed
        if (this.damageSources.optimist.length !== playerCount) {
            this.resetDamageSources();
        }
        
        // Count event damage as one source per scenario with damage
        if (eventResults.totalOptimistDamage > 0) {
            for (let i = 0; i < playerCount; i++) {
                this.damageSources.optimist[i]++;
            }
        }
        
        if (eventResults.totalAverageDamage > 0) {
            for (let i = 0; i < playerCount; i++) {
                this.damageSources.average[i]++;
            }
        }
        
        if (eventResults.totalPessimistDamage > 0) {
            for (let i = 0; i < playerCount; i++) {
                this.damageSources.pessimist[i]++;
            }
        }
        
        if (eventResults.totalWorstCaseDamage > 0) {
            for (let i = 0; i < playerCount; i++) {
                this.damageSources.worstCase[i]++;
            }
        }
    }
    
    /**
     * Resets the damage sources tracking arrays
     * @private
     */
    resetDamageSources() {
        const playerCount = this.players.length;
        this.damageSources = {
            optimist: Array(playerCount).fill(0),
            average: Array(playerCount).fill(0),
            pessimist: Array(playerCount).fill(0),
            worstCase: Array(playerCount).fill(0)
        };
    }

    /**
     * Get the number of damage sources affecting a player in each scenario
     * @param {number} playerIndex - Index of the player
     * @returns {Object} - Object with damage source counts for each scenario
     */
    getPlayerDamageSources(playerIndex) {
        if (playerIndex < 0 || playerIndex >= this.players.length || 
            this.damageSources.optimist.length <= playerIndex) {
            return { optimist: 0, average: 0, pessimist: 0, worstCase: 0 };
        }
        
        return {
            optimist: this.damageSources.optimist[playerIndex],
            average: this.damageSources.average[playerIndex],
            pessimist: this.damageSources.pessimist[playerIndex],
            worstCase: this.damageSources.worstCase[playerIndex]
        };
    }

    /**
     * Get fighting power bonus from a weapon
     * @param {string} weaponFile - Weapon filename
     * @returns {number} - Power bonus from weapon
     */
    getWeaponPower(weaponFile) {
        // Remove file extension to get the item key
        const itemKey = weaponFile.replace(/\.(jpg|png)$/, '');
        
        // Look up the item in the config
        const itemConfig = ItemEffects[itemKey];
        let basePower = 0;
        if (itemConfig && itemConfig.effects && itemConfig.effects.combatPowerBonus) {
            basePower = itemConfig.effects.combatPowerBonus;
        }
        
        // Apply Centauri base effect for blasters when toggle is active
        if (this.toggleState && itemKey === 'blaster') {
            const centauriEffect = BaseEffects['centauri'];
            if (centauriEffect && centauriEffect.effects && centauriEffect.effects.blasterCombatBonus) {
                basePower += centauriEffect.effects.blasterCombatBonus;
            }
        }
        
        return basePower;
    }

    /**
     * Get fighting power bonus from an ability
     * @param {string} abilityFile - Ability filename
     * @param {Object} player - Player object to check for equipment requirements
     * @returns {number} - Power bonus from ability
     */
    getAbilityPower(abilityFile, player) {
        // Remove file extension to get the ability key
        const abilityKey = abilityFile.replace(/\.(jpg|png)$/, '');
        
        // Look up the ability in the config
        const abilityConfig = AbilityEffects[abilityKey];
        if (!abilityConfig || !abilityConfig.effects) {
            return 0;
        }
        
        // Handle gunman ability - only gives bonus if player has a firearm
        if (abilityKey === 'gunman') {
            const effects = abilityConfig.effects;
            if (effects.requiresGun && effects.gunTypes) {
                // Convert gun types to include file extensions
                const gunTypes = effects.gunTypes.map(gun => gun + '.jpg');
                const hasFirearm = player.items.some(item => item && gunTypes.includes(item));
                return hasFirearm ? (effects.combatPowerBonus || 0) : 0;
            }
        }
        
        // For other abilities, return combat power bonus if any
        return abilityConfig.effects.combatPowerBonus || 0;
    }

    /**
     * Get the total number of grenades in the team
     * @returns {number} - Number of grenades available
     */
    getGrenadeCount() {
        let grenadeCount = 0;
        const activeIndices = this.getActivePlayerIndices();
        activeIndices.forEach(idx => {
            const player = this.players[idx];
            player.items.forEach(item => {
                if (item) {
                    const itemKey = item.replace(/\.(jpg|png)$/, '');
                    if (itemKey === 'grenade') {
                        grenadeCount++;
                    }
                }
            });
        });
        return grenadeCount;
    }

    /**
     * Trigger update callback when players change
     */
    triggerPlayerUpdate() {
        if (this.onPlayerUpdateCallback && typeof this.onPlayerUpdateCallback === 'function') {
            this.onPlayerUpdateCallback();
        }
        
        // Update fighting power display
        this.updateFightingPowerDisplay();

    // Update movements display
    this.updateMovementsDisplay();
    }

    /**
     * Update the fighting power display
     */
    updateFightingPowerDisplay() {
        const basePower = this.calculateFightingPower();
        
        // Create a display power that includes grenade bonus for preview
        let displayPower = basePower;
        
        // Add grenade bonus if available
        if (this.getGrenadeCount() > 0) {
            displayPower += 3;
        }
        
        const fightingPowerValue = document.getElementById('fighting-power-value');
        if (fightingPowerValue) {
            fightingPowerValue.textContent = displayPower;
        }

    }

    /**
     * Calculate team movements based on mode and Sprinter abilities.
     * Base: 9 for Icarus, 3 for Patrol. +1 per player with Sprint (counts even if stuck on ship).
     * @returns {number}
     */
    calculateMovements() {
        const base = this.currentMode === 'patrol' ? 3 : 9;
        let sprinters = 0;
        this.players.forEach(p => {
            if (p && Array.isArray(p.abilities)) {
                sprinters += p.abilities.filter(a => a === 'sprint.png').length;
            }
        });
        return base + sprinters;
    }

    /**
     * Update the movements value in the UI and cache it.
     * If a value is provided, use it; otherwise compute locally.
     * @param {number} [value]
     */
    updateMovementsDisplay(value) {
        const movements = typeof value === 'number' ? value : this.calculateMovements();
        this.currentMovements = movements;
        const el = document.getElementById('movements-value');
        if (el) {
            el.textContent = movements;
        }
    }

    /**
     * Render expedition results showing final player health
     * @returns {string} - HTML string for expedition results
     */
    renderExpeditionResults() {
        if (this.players.length === 0) {
            return '<div style="text-align: center; color: #95a5a6; font-style: italic;">Add players to see expedition results</div>';
        }

        // Reset damage sources before calculating new ones
        this.resetDamageSources();

        const resultsHTML = this.players.map((player, index) => {
            // Use real calculated combat damage if available, otherwise use no damage
            let optimistDamage = 0;
            let averageDamage = 0;
            let pessimistDamage = 0;
            let worstCaseDamage = 0;

            // If we have combat damage data, use it instead of default values
            if (this.combatDamage && this.combatDamage.optimist && this.combatDamage.optimist.length > index) {
                optimistDamage = this.combatDamage.optimist[index];
                averageDamage = this.combatDamage.average[index];
                pessimistDamage = this.combatDamage.pessimist[index];
                worstCaseDamage = this.combatDamage.worstCase[index];

                // Track combat damage sources
                if (optimistDamage > 0) this.damageSources.optimist[index]++;
                if (averageDamage > 0) this.damageSources.average[index]++;
                if (pessimistDamage > 0) this.damageSources.pessimist[index]++;
                if (worstCaseDamage > 0) this.damageSources.worstCase[index]++;
            }

            // Add event damage using the already-distributed per-player arrays
            const playerCount = this.players.filter(p => p !== null).length;
            if (playerCount > 0 && this.eventDamagePerPlayer) {
                // Use the pre-calculated per-player damage from EventDamageHandler
                if (this.eventDamagePerPlayer.optimist && this.eventDamagePerPlayer.optimist.length > index) {
                    optimistDamage += this.eventDamagePerPlayer.optimist[index];
                }
                if (this.eventDamagePerPlayer.average && this.eventDamagePerPlayer.average.length > index) {
                    averageDamage += this.eventDamagePerPlayer.average[index];
                }
                if (this.eventDamagePerPlayer.pessimist && this.eventDamagePerPlayer.pessimist.length > index) {
                    pessimistDamage += this.eventDamagePerPlayer.pessimist[index];
                }
                // For worstCase, only add event damage if combatOverridesWorstCase is NOT true
                if (!this.combatOverridesWorstCase && this.eventDamagePerPlayer.worstCase && this.eventDamagePerPlayer.worstCase.length > index) {
                    worstCaseDamage += this.eventDamagePerPlayer.worstCase[index];
                }

                // Track event damage sources
                if (this.eventDamagePerPlayer.optimist && this.eventDamagePerPlayer.optimist[index] > 0) this.damageSources.optimist[index]++;
                if (this.eventDamagePerPlayer.average && this.eventDamagePerPlayer.average[index] > 0) this.damageSources.average[index]++;
                if (this.eventDamagePerPlayer.pessimist && this.eventDamagePerPlayer.pessimist[index] > 0) this.damageSources.pessimist[index]++;
                if (!this.combatOverridesWorstCase && this.eventDamagePerPlayer.worstCase && this.eventDamagePerPlayer.worstCase[index] > 0) this.damageSources.worstCase[index]++;
            }
            
            const isActive = this.isPlayerActive(player);
            // Calculate final health by subtracting damage from current health (only matters if active)
            const optimistHealth = isActive ? Math.max(0, player.health - optimistDamage) : player.health;
            const averageHealth = isActive ? Math.max(0, player.health - averageDamage) : player.health;
            const pessimistHealth = isActive ? Math.max(0, player.health - pessimistDamage) : player.health;
            const worstHealth = isActive ? Math.max(0, player.health - worstCaseDamage) : player.health;
            
            // Function to determine health class
            const getHealthClass = (health) => {
                if (health <= 0) return 'health-dead';
                if (health <= 3) return 'health-critical';
                if (health <= 6) return 'health-low';
                if (health <= 10) return 'health-medium';
                return 'health-high';
            };

            return `
                <div class="expedition-result-card">
                    <div class="expedition-result-avatar">
                        <img src="${getResourceURL(`characters/${player.avatar}`)}" alt="Player Avatar" />
                    </div>
                    <div class="expedition-result-health-container">
                        <div class="expedition-result-health worst ${getHealthClass(worstHealth)}">
                            ${isActive ? (worstHealth > 0 ? 
                                `${worstHealth}<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />` : 
                                `<img src="${getResourceURL('others/dead.png')}" alt="Dead" class="dead-icon" />`) :
                                `<img src="${getResourceURL('others/stuck_in_ship.png')}" alt="Stuck" class="dead-icon" />`}
                        </div>
                        <div class="expedition-result-health pessimist ${getHealthClass(pessimistHealth)}">
                            ${isActive ? (pessimistHealth > 0 ? 
                                `${pessimistHealth}<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />` : 
                                `<img src="${getResourceURL('others/dead.png')}" alt="Dead" class="dead-icon" />`) :
                                `<img src="${getResourceURL('others/stuck_in_ship.png')}" alt="Stuck" class="dead-icon" />`}
                        </div>
                        <div class="expedition-result-health average ${getHealthClass(averageHealth)}">
                            ${isActive ? (averageHealth > 0 ? 
                                `${averageHealth}<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />` : 
                                `<img src="${getResourceURL('others/dead.png')}" alt="Dead" class="dead-icon" />`) :
                                `<img src="${getResourceURL('others/stuck_in_ship.png')}" alt="Stuck" class="dead-icon" />`}
                        </div>
                        <div class="expedition-result-health optimist ${getHealthClass(optimistHealth)}">
                            ${isActive ? (optimistHealth > 0 ? 
                                `${optimistHealth}<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />` : 
                                `<img src="${getResourceURL('others/dead.png')}" alt="Dead" class="dead-icon" />`) :
                                `<img src="${getResourceURL('others/stuck_in_ship.png')}" alt="Stuck" class="dead-icon" />`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Append an integrated legend card styled like a player card
        const legendBlock = this.renderExpeditionLegend();
        const legendCard = `
            <div class="expedition-legend-card">
                ${legendBlock}
            </div>
        `;

        return resultsHTML + legendCard;
    }

    /**
     * Generates the expedition results legend HTML
     * @returns {string} - HTML string for the legend
     */
    renderExpeditionLegend() {
        return `
            <div class="expedition-legend">
                <h5>Health Scenarios</h5>
                <div class="legend-items">
                    <div class="legend-item">
                        <div class="legend-color worst"></div>
                        <div class="legend-text">Worst</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color pessimist"></div>
                        <div class="legend-text">Pessimist</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color average"></div>
                        <div class="legend-text">Average</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color optimist"></div>
                        <div class="legend-text">Optimist</div>
                    </div>
                </div>
            </div>
        `;
    }
}

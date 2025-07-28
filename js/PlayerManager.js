// Player Manager - Handles player profiles and management

class PlayerManager {
    constructor() {
        this.players = [];
        this.nextPlayerId = 1;
        this.toggleState = false; // Toggle button state
        this.currentMode = 'icarus'; // Mode button state: 'patrol' or 'icarus' (default: icarus)
        this.availableCharacters = [
            'andie.png', 'chao.png', 'chun.png', 'derek.png', 'eleesha.png',
            'finola.png', 'frieda.png', 'gioele.png', 'hua.png', 'ian.png',
            'janice.png', 'jin_su.png', 'kuan_ti.png', 'paola.png', 
            'raluca.png', 'roland.png', 'stephen.png', 'terrence.png',
            'lambda_f.png' // Lambda at the end
        ];
        this.normalAbilities = [
            'survival.png', 'botanic.png', 'pilot.png', 'gunman.png', 'diplomacy.png', 'sprint.png'
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
        
        // Initialize mode button
        this.initializeModeButton();
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
        }
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
            });
        }
    }
}

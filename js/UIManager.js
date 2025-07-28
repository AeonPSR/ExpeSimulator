// UI Management - Handles all UI creation and updates

class UIManager {
    constructor() {
        this.panel = null;
    }

    /**
     * Creates the main expedition simulator panel
     * @returns {HTMLElement} - The created panel element
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'expedition-simulator';
        this.panel.className = 'expedition-panel';
        
        this.panel.innerHTML = this.getPanelHTML();
        document.body.appendChild(this.panel);
        
        return this.panel;
    }

    /**
     * Gets the HTML structure for the main panel
     * @returns {string} - HTML string for the panel
     */
    getPanelHTML() {
        return `
            ${this.getInlineStyles()}
            <div class="panel-tongue">
                <img src="${getResourceURL('astro/astrophysicist.png')}" alt="Expedition" />
            </div>
            <div class="panel-main">
                <div class="panel-header">
                    <h3>Expedition Simulator</h3>
                </div>
                <div class="panel-content">
                    <div class="section-selector">
                        <div class="sectors-header">
                            <h4>Available Sectors</h4>
                            <button id="sectors-toggle-btn" class="sectors-toggle-btn" data-active="false">
                                <img src="${getResourceURL('abilities/traitor.png')}" alt="Toggle" />
                            </button>
                        </div>
                        <div class="sector-grid" id="sector-grid"></div>
                    </div>
                    <div class="selected-sectors">
                        <h4 id="selected-header">Selected Expedition (1/20)</h4>
                        <div class="selected-grid" id="selected-grid"></div>
                        <button id="clear-all" class="clear-btn">Clear All</button>
                        <div class="example-worlds">
                            <h4>Example Worlds</h4>
                            <div class="debug-row">
                                <button id="debug-rocky" class="debug-btn">Rocky World</button>
                                <button id="debug-fugubos" class="debug-btn">Fugubos</button>
                                <button id="debug-vie" class="debug-btn">Vie Heureuse</button>
                            </div>
                            <div class="debug-row">
                                <button id="debug-loss" class="debug-btn">Loss</button>
                                <button id="debug-nurgle" class="debug-btn">Nurgle's Throne</button>
                                <button id="debug-cuts" class="debug-btn">Thousands Cuts</button>
                            </div>
                            <div class="debug-row">
                                <button id="debug-polyphemus" class="debug-btn">Polyphemus</button>
                                <button id="debug-museum" class="debug-btn">Museum</button>
                            </div>
                        </div>
                    </div>
                    <div class="players-section">
                        <div class="players-header">
                            <h4>Players</h4>
                            <div class="players-controls">
                                <button id="players-mode-btn" class="players-mode-btn" data-mode="icarus">
                                    <img src="${getResourceURL('others/icarus_access.png')}" alt="Mode" />
                                </button>
                                <button id="players-toggle-btn" class="players-toggle-btn" data-active="false">
                                    <img src="${getResourceURL('others/base03.png')}" alt="Toggle" />
                                </button>
                            </div>
                        </div>
                        <div class="players-container" id="players-container">
                            <button id="add-player-btn" class="add-player-btn">
                                <span class="plus-icon">+</span>
                            </button>
                        </div>
                    </div>
                    <div class="probability-display">
                        <h4>Event Probabilities</h4>
                        <div class="prob-content" id="prob-content">
                            Select sectors to see probabilities
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Gets inline styles for the panel (to avoid conflicts)
     * @returns {string} - CSS styles as HTML string
     */
    getInlineStyles() {
        return `
            <style>
                .sector-item, .selected-sector-item {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                    -webkit-tap-highlight-color: transparent;
                }
                .sector-item img, .selected-sector-item img {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                    -webkit-tap-highlight-color: transparent;
                    pointer-events: none;
                }
                .sector-item:focus, .selected-sector-item:focus {
                    outline: none;
                }
            </style>
        `;
    }

    /**
     * Populates the sector grid with available sectors
     * @param {Function} onSectorClick - Callback function for sector clicks
     */
    populateSectorGrid(onSectorClick) {
        const grid = document.getElementById('sector-grid');
        const uniqueSectors = [...new Set(PlanetSectorConfigData.map(s => s.sectorName))];
        
        uniqueSectors.forEach(sectorName => {
            const sectorDiv = this.createSectorElement(sectorName, onSectorClick);
            grid.appendChild(sectorDiv);
        });
    }

    /**
     * Creates a sector element for the grid
     * @param {string} sectorName - Name of the sector
     * @param {Function} onSectorClick - Click handler function
     * @returns {HTMLElement} - Created sector element
     */
    createSectorElement(sectorName, onSectorClick) {
        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'sector-item';
        sectorDiv.dataset.sector = sectorName;
        
        const img = document.createElement('img');
        img.src = getResourceURL(`astro/${sectorName.toLowerCase()}.png`);
        img.alt = sectorName;
        img.title = formatSectorName(sectorName);
        
        sectorDiv.appendChild(img);
        sectorDiv.addEventListener('click', () => onSectorClick(sectorName));
        
        return sectorDiv;
    }

    /**
     * Updates the selected sectors display
     * @param {Array<string>} selectedSectors - Array of selected sector names
     * @param {string} headerText - Header text to display
     * @param {Function} onRemoveClick - Callback for remove sector clicks
     */
    updateSelectedDisplay(selectedSectors, headerText, onRemoveClick) {
        const selectedGrid = document.getElementById('selected-grid');
        const header = document.getElementById('selected-header');
        
        header.textContent = headerText;
        selectedGrid.innerHTML = '';
        
        selectedSectors.forEach((sectorName, index) => {
            const sectorDiv = this.createSelectedSectorElement(sectorName, index, onRemoveClick);
            selectedGrid.appendChild(sectorDiv);
        });
    }

    /**
     * Creates a selected sector element
     * @param {string} sectorName - Name of the sector
     * @param {number} index - Index of the sector
     * @param {Function} onRemoveClick - Remove click handler
     * @returns {HTMLElement} - Created selected sector element
     */
    createSelectedSectorElement(sectorName, index, onRemoveClick) {
        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'selected-sector-item';
        sectorDiv.dataset.index = index;
        sectorDiv.title = `${formatSectorName(sectorName)} - Click to remove`;
        
        const img = document.createElement('img');
        img.src = getResourceURL(`astro/${sectorName.toLowerCase()}.png`);
        img.alt = sectorName;
        
        sectorDiv.appendChild(img);
        sectorDiv.addEventListener('click', () => onRemoveClick(index));
        
        return sectorDiv;
    }

    /**
     * Updates sector availability in the grid
     * @param {Function} getSectorAvailability - Function to get sector availability info
     */
    updateSectorAvailability(getSectorAvailability) {
        const grid = document.getElementById('sector-grid');
        const sectorItems = grid.querySelectorAll('.sector-item');
        
        sectorItems.forEach(sectorDiv => {
            const sectorName = sectorDiv.dataset.sector;
            const { shouldDisable, tooltipText } = getSectorAvailability(sectorName);
            
            if (shouldDisable) {
                sectorDiv.classList.add('sector-disabled');
                sectorDiv.style.pointerEvents = 'none';
            } else {
                sectorDiv.classList.remove('sector-disabled');
                sectorDiv.style.pointerEvents = 'auto';
            }
            
            // Update the title
            const img = sectorDiv.querySelector('img');
            if (img) {
                img.title = tooltipText;
            }
        });
    }

    /**
     * Updates the probability display content
     * @param {string} htmlContent - HTML content to display
     */
    updateProbabilityDisplay(htmlContent) {
        const probContent = document.getElementById('prob-content');
        probContent.innerHTML = htmlContent;
    }

    /**
     * Gets the main panel element
     * @returns {HTMLElement} - The panel element
     */
    getPanel() {
        return this.panel;
    }
}

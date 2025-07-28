// Main Expedition Simulator Class - Orchestrates all components

class ExpeditionSimulator {
    constructor() {
        try {
            // Check if extension context is valid before initialization
            if (!isExtensionContextValid()) {
                this.showExtensionError();
                return;
            }
            
            this.sectorManager = new SectorManager();
            this.uiManager = new UIManager();
            this.playerManager = new PlayerManager();
            this.probabilityCalculator = new ProbabilityCalculator();
            this.eventHandler = null; // Will be initialized after UI creation
            
            this.init();
        } catch (error) {
            console.error('Failed to initialize Expedition Simulator:', error);
            this.showExtensionError();
        }
    }

    /**
     * Initializes the expedition simulator
     */
    init() {
        this.createPanel();
        this.setupEventHandlers();
        this.populateInitialData();
        this.updateAllDisplays();
    }

    /**
     * Creates the main UI panel
     */
    createPanel() {
        this.uiManager.createPanel();
    }

    /**
     * Sets up event handlers
     */
    setupEventHandlers() {
        this.eventHandler = new EventHandler(
            this.sectorManager,
            this.uiManager,
            this.probabilityCalculator
        );
        
        this.eventHandler.attachEventListeners();
        
        // Initialize player manager after UI is created
        this.playerManager.initialize();
        
        // Prevent click propagation to underlying elements
        this.setupClickPrevention();
    }

    /**
     * Prevents clicks from propagating to underlying page elements
     */
    setupClickPrevention() {
        const panel = document.getElementById('expedition-simulator');
        if (panel) {
            panel.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            
            panel.addEventListener('mousedown', (event) => {
                event.stopPropagation();
            });
            
            panel.addEventListener('mouseup', (event) => {
                event.stopPropagation();
            });
        }
    }

    /**
     * Populates initial data in the UI
     */
    populateInitialData() {
        this.uiManager.populateSectorGrid(
            this.eventHandler.getSectorClickHandler()
        );
    }

    /**
     * Updates all displays with current state
     */
    updateAllDisplays() {
        this.eventHandler.updateAllDisplays();
    }

    /**
     * Gets the main panel element (for external access if needed)
     * @returns {HTMLElement} - The main panel element
     */
    getPanel() {
        return this.uiManager.getPanel();
    }

    /**
     * Gets the sector manager (for external access if needed)
     * @returns {SectorManager} - The sector manager instance
     */
    getSectorManager() {
        return this.sectorManager;
    }

    /**
     * Gets the UI manager (for external access if needed)
     * @returns {UIManager} - The UI manager instance
     */
    getUIManager() {
        return this.uiManager;
    }

    /**
     * Gets the probability calculator (for external access if needed)
     * @returns {ProbabilityCalculator} - The probability calculator instance
     */
    getProbabilityCalculator() {
        return this.probabilityCalculator;
    }

    /**
     * Shows an error message when the extension context is invalidated
     */
    showExtensionError() {
        const existingPanel = document.getElementById('expedition-simulator');
        if (existingPanel) {
            existingPanel.remove();
        }

        const errorPanel = document.createElement('div');
        errorPanel.id = 'expedition-simulator';
        errorPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: linear-gradient(135deg, #2c1810, #4a2c1a);
            border: 2px solid #8b4513;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            color: #ff6b6b;
        `;

        errorPanel.innerHTML = `
            <div style="text-align: center;">
                <h3 style="margin: 0 0 10px 0; color: #ff6b6b;">⚠️ Extension Error</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.4;">
                    The extension context has been invalidated. Please reload the page to continue using the Expedition Simulator.
                </p>
                <button onclick="location.reload()" style="
                    background: #8b4513;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">Reload Page</button>
            </div>
        `;

        document.body.appendChild(errorPanel);
    }
}

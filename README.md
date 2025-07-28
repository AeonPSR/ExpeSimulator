# Expedition Simulator - Web Extension

A Chrome/Edge web extension that simulates planet expeditions based on game configuration data. The extension provides real-time probability calculations for exploration events across different planet sectors.

## 🚀 Features

- **Visual Sector Selection**: Click on sector images to build your expedition
- **Real-time Probability Calculation**: See event probabilities update as you add sectors
- **Modern UI**: Beautiful, responsive interface with smooth animations
- **Expandable Side Panel**: Collapsible panel that doesn't interfere with web browsing
- **Support for up to 20 sectors per expedition**
- **Color-coded probability display** (high/medium/low chances)

## 📁 Project Structure

```
ExpeSimulator/
├── manifest.json					# Extension manifest (Chrome/Edge)
├── config.js						# Planet sector configuration data
├── content.js						# Application entry point (simplified)
├── styles.css						# Extension styling
├── popup.html						# Extension popup interface
├── js/								# Modular JavaScript components
│   ├── utils.js					# Utility functions and helpers
│   ├── SectorManager.js			# Sector selection and validation logic
│   ├── UIManager.js				# UI creation and management
│   ├── ProbabilityCalculator.js 	# Statistical calculations
│   ├── EventHandler.js				# Event listeners and user interactions
│   └── ExpeditionSimulator.js		# Main orchestrator class
├── astro/							# Sector icons
│   ├── cave.png
│   ├── forest.png
│   ├── ocean.png
│   └── ... (all sector images)
└── README.md
```

## 🛠️ Installation

### Method 1: Developer Mode (Recommended for testing)

1. Open Chrome or Edge browser
2. Navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `ExpeSimulator` folder
6. The extension should now appear in your extensions list

### Method 2: Package as .crx (For distribution)

1. Follow steps 1-2 from Method 1
2. Click "Pack extension"
3. Select the `ExpeSimulator` folder
4. This will create a .crx file that can be shared

## 🎮 How to Use

1. **Activate the Extension**: Once installed, the extension automatically loads on all web pages
2. **Open the Panel**: Click the toggle button (▶) on the left side of the screen
3. **Select Sectors**: Click on sector images to add them to your expedition
4. **View Probabilities**: Watch real-time probability calculations in the bottom panel
5. **Manage Expedition**: 
   - Remove sectors by clicking the × button next to each selected sector
   - Clear all sectors with the "Clear All" button
   - Maximum 20 sectors per expedition

## ⚙️ Configuration

### Modifying Sector Data

Edit `config.js` to modify:
- **PlanetSectorConfigData**: Array containing all sector configurations
- **EventDescriptions**: Human-readable event names with emojis

### Example Sector Configuration:
```javascript
{
    name: 'FOREST_default',
    sectorName: 'FOREST',
    weightAtPlanetGeneration: 8,
    weightAtPlanetAnalysis: 12,
    weightAtPlanetExploration: 8,
    maxPerPlanet: 4,
    explorationEvents: {
        'HARVEST_2': 4,
        'AGAIN': 3,
        'DISEASE': 2,
        'PLAYER_LOST': 1
    }
}
```

### Adding New Sectors

1. Add the sector data to `PlanetSectorConfigData` in `config.js`
2. Add corresponding image to the `astro/` folder (name should match `sectorName.toLowerCase()`)
3. Add event descriptions to `EventDescriptions` if needed

## 🎨 Customization

### Styling
Modify `styles.css` to change:
- Colors and themes
- Panel dimensions
- Animations and transitions
- Responsive behavior

### Behavior
Modify the appropriate module files to change:
- **Sector Logic**: Edit `js/SectorManager.js`
- **UI Behavior**: Edit `js/UIManager.js`
- **Calculations**: Edit `js/ProbabilityCalculator.js`
- **User Interactions**: Edit `js/EventHandler.js`
- **Overall Coordination**: Edit `js/ExpeditionSimulator.js`

## 🔧 Development

### Modular Architecture

The extension now uses a modular architecture with clear separation of concerns:

#### Core Components

- **`js/ExpeditionSimulator.js`**: Main orchestrator class that coordinates all components
- **`js/SectorManager.js`**: Handles sector selection logic, validation, and state management
- **`js/UIManager.js`**: Manages all UI creation, updates, and DOM manipulation
- **`js/ProbabilityCalculator.js`**: Performs statistical calculations and probability analysis
- **`js/EventHandler.js`**: Manages user interactions and event coordination
- **`js/utils.js`**: Utility functions and helper methods

#### Entry Point

- **`content.js`**: Simplified entry point that initializes the application (now only ~7 lines!)

#### Configuration and Data

- **`config.js`**: Contains all game data (sectors, events, probabilities)
- **`styles.css`**: All styling and animations
- **`manifest.json`**: Extension configuration with proper module loading order

### Key Classes and Methods

#### SectorManager
- `addSector(sectorName)`: Adds a sector with validation
- `removeSector(index)`: Removes a sector by index
- `canAddSector(sectorName)`: Checks if sector can be added
- `getSectorAvailability(sectorName)`: Gets availability info for UI

#### UIManager
- `createPanel()`: Creates the main UI panel
- `populateSectorGrid(onSectorClick)`: Creates sector selection grid
- `updateSelectedDisplay(sectors, headerText, onRemove)`: Updates selected sectors
- `updateSectorAvailability(getSectorAvailability)`: Updates sector states

#### ProbabilityCalculator
- `calculateProbabilities(selectedSectors)`: Main calculation method
- `generateResourcesHTML(resources)`: Creates resource display
- `generateCombatDamageHTML(combat)`: Creates damage scenarios

#### EventHandler
- `handleAddSector(sectorName)`: Processes sector addition
- `handleRemoveSector(index)`: Processes sector removal
- `updateAllDisplays()`: Coordinates all UI updates

## 🌟 Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Microsoft Edge (Manifest V3)
- ✅ Responsive design for different screen sizes
- ✅ Modular architecture for easier maintenance and testing

## 🏗️ Architecture Benefits

- **Separation of Concerns**: Each module has a single, clear responsibility
- **Maintainability**: Easy to locate and modify specific functionality
- **Testability**: Individual components can be tested in isolation
- **Scalability**: Simple to add new features without affecting existing code
- **Readability**: Smaller, focused files are easier to understand
- **Reusability**: Components designed for potential reuse

## 📝 Future Enhancements

- [ ] Export/Import expedition configurations
- [ ] Detailed event descriptions and tooltips
- [ ] Historical expedition tracking
- [ ] Multiple expedition comparison
- [ ] Custom sector creation interface
- [ ] Firefox compatibility (Manifest V2)
- [ ] Unit tests for individual modules
- [ ] Configuration validation and error handling
- [ ] Advanced statistical analysis features

## 🐛 Troubleshooting

### Extension Not Loading
- Ensure all files are in the correct directory structure
- Check that `js/` folder contains all required modules
- Check that `astro/` folder contains all required images
- Verify manifest.json syntax and module loading order

### Images Not Displaying
- Confirm image names match sector names (lowercase)
- Check file extensions (.png)
- Verify web_accessible_resources in manifest.json

### Probability Calculations Incorrect
- Check `config.js` for data consistency
- Verify explorationEvents weights are numbers
- Ensure sector names match between config and UI
- Check `js/ProbabilityCalculator.js` for calculation logic
- Verify utility functions in `js/utils.js`

## 📄 License

This project is open source. Feel free to modify and distribute according to your needs.

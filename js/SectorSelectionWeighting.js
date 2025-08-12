// SectorSelectionWeighting - helper to estimate which selected sectors are likely to be visited
// Uses weightAtPlanetExploration from PlanetSectorConfigData and the current movement budget

/*
Contract
- Inputs:
  - selectedSectors: Array<string | { id: number|string, name: string }>
  - numberOfSectorsToExplore: number (movement budget X)
- Output:
  - Map<string, number>: key is "<SECTOR_NAME>_<id>", value in [0,1] is the approximate likelihood
    that this concrete sector instance will be visited at least once.
Notes
- This is an analytic approximation: p_visit_j ≈ clamp(X * w_j / Σw, 0..1)
- When Σw == 0, we fall back to a uniform split: p_visit_j ≈ clamp(X / N, 0..1)
- We treat each selected sector instance independently, using its type's weightAtPlanetExploration.
*/

class SectorSelectionWeighting {
    /**
     * Computes an approximate per-sector visit likelihood based on exploration weights and movement budget.
     * @param {Array<string|{id: (number|string), name: string}>} selectedSectors - The sectors picked by the user (can be names or {id,name}).
     * @param {number} numberOfSectorsToExplore - Movement budget X (how many sectors will be explored).
     * @returns {Map<string, number>} - Map from "<SECTOR_NAME>_<id>" to visit likelihood in [0,1].
     */
    static computeVisitLikelihoods(selectedSectors, numberOfSectorsToExplore) {
        const sectorsWithIds = (selectedSectors || []).map((sector, index) => {
            return typeof sector === 'string' ? { id: index, name: sector } : sector;
        });

        const sectorWeights = [];
        let totalExplorationWeight = 0; // only for non-LANDING sectors
        const landingSectorKeys = new Set();

        sectorsWithIds.forEach(({ id, name }) => {
            const sectorDefinition = SectorSelectionWeighting.findSectorDefinitionByName(name);
            const explorationWeight = sectorDefinition ? (sectorDefinition.weightAtPlanetExploration || 0) : 0;
            const key = `${name}_${id}`;
            sectorWeights.push({ key, name, explorationWeight });
            if (name === 'LANDING') {
                landingSectorKeys.add(key);
            } else {
                totalExplorationWeight += explorationWeight;
            }
        });

        const numberOfSelectedSectors = sectorsWithIds.length;
        const numberOfNormalSectors = sectorWeights.filter(s => s.name !== 'LANDING').length;
        const movementBudget = Math.max(0, Number(numberOfSectorsToExplore || 0));
        const likelihoods = new Map();

        if (numberOfSelectedSectors === 0) return likelihoods;

        // LANDING: Always visited if present, but does not consume movement budget
        landingSectorKeys.forEach(key => likelihoods.set(key, 1));

        // If there are no non-LANDING sectors, we're done.
        if (numberOfNormalSectors === 0) return likelihoods;

        // Fallback: if all non-LANDING weights are zero, use uniform share across non-LANDING sectors
        if (totalExplorationWeight <= 0) {
            const uniformShare = SectorSelectionWeighting._clamp(movementBudget / numberOfNormalSectors, 0, 1);
            sectorWeights
                .filter(s => s.name !== 'LANDING')
                .forEach(({ key }) => likelihoods.set(key, uniformShare));
            return likelihoods;
        }

        // Standard approximation: p_visit_j ≈ clamp(X * w_j / Σw, 0..1)
        sectorWeights.forEach(({ key, name, explorationWeight }) => {
            if (name === 'LANDING') return; // already handled
            const selectionLikelihood = SectorSelectionWeighting._clamp((movementBudget * explorationWeight) / totalExplorationWeight, 0, 1);
            likelihoods.set(key, selectionLikelihood);
        });

        return likelihoods;
    }

    /**
     * Returns a new sector data map where each sector's event probabilities have been scaled by its visit likelihood.
     * - Does NOT renormalize inside each sector; scaling reflects that some sectors may not be visited at all.
     * @param {Map<string, Object>} sectorDataMap - Map keyed by "<SECTOR_NAME>_<id>" with sector data objects (must contain explorationEvents map of weights).
     * @param {number} numberOfSectorsToExplore - Movement budget X.
     * @returns {Map<string, Object>} - New Map with scaled event weights per sector.
     */
    static scaleEventProbabilities(sectorDataMap, numberOfSectorsToExplore) {
        if (!sectorDataMap || !(sectorDataMap instanceof Map)) return sectorDataMap;

        // Derive visit likelihoods from the keys present in the map
        const selectedSectors = Array.from(sectorDataMap.keys()).map((key, index) => {
            // key format: "<SECTOR_NAME>_<id>"; recover name and id to maintain compatibility
            const lastUnderscore = key.lastIndexOf('_');
            const name = key.substring(0, lastUnderscore);
            const id = key.substring(lastUnderscore + 1);
            return { id, name };
        });

        const visitLikelihoods = SectorSelectionWeighting.computeVisitLikelihoods(selectedSectors, numberOfSectorsToExplore);

        const scaledMap = new Map();
        sectorDataMap.forEach((sectorData, key) => {
            const selectionLikelihood = visitLikelihoods.get(key) ?? 0;
            const clonedSector = JSON.parse(JSON.stringify(sectorData));

            if (clonedSector && clonedSector.explorationEvents) {
                const originalTotal = Object.values(clonedSector.explorationEvents).reduce((a, b) => a + b, 0);
                // Scale meaningful events by selectionLikelihood
                Object.keys(clonedSector.explorationEvents).forEach(eventName => {
                    clonedSector.explorationEvents[eventName] *= selectionLikelihood;
                });
                // Inject a synthetic mass for "not visited" so per-sector normalization yields scaled probabilities
                if (selectionLikelihood < 1 && originalTotal > 0) {
                    const notVisitedWeight = (1 - selectionLikelihood) * originalTotal;
                    clonedSector.explorationEvents['__NOT_VISITED__'] = (clonedSector.explorationEvents['__NOT_VISITED__'] || 0) + notVisitedWeight;
                }
            }

            scaledMap.set(key, clonedSector);
        });

        return scaledMap;
    }

    // --- helpers ---

    /**
     * Finds the sector definition object by its sectorName.
     * @param {string} sectorName - e.g., 'FOREST', 'RUINS'.
     * @returns {Object|null}
     */
    static findSectorDefinitionByName(sectorName) {
        try {
            return (PlanetSectorConfigData || []).find(s => s && s.sectorName === sectorName) || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Clamps a numeric value into [min, max].
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    static _clamp(value, min, max) {
        if (Number.isNaN(value)) return min;
        return Math.max(min, Math.min(max, value));
    }
}

// Expose globally (no module system here)
window.SectorSelectionWeighting = SectorSelectionWeighting;

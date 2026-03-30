# Star Rating Backend — Roadmap

## Overview

Build `PlanetReviewScorer.js`: a pure function that takes `sectors[]` and returns the star rating data object consumed by `StarRating.update()`.

**Pipeline:** `sectors[]` → `PlanetReviewScorer.score(sectors)` → `{ overall, axes, booleans }`

---

## Phase 1 — Sub-category axis scores (raw)

Compute a 0–6 star score for each axis based solely on the sector event pools in `PlanetSectorConfigData`.

### Star scale

- **0 stars** — Planet has zero contribution to this axis
- **5 stars** — Planet reaches 75% of the theoretical maximum for this axis
- **6 stars** — Planet exceeds the 5-star threshold (only displayed when score > 5)

The 6th star acts as an "exceptional" indicator. It is not normally shown (only 5 empty stars rendered by default). It appears only when the raw score exceeds the 75% ceiling, meaning the planet is unusually strong on that axis.

### Computing the 5-star ceiling per axis

1. For each axis, find **all sectors** whose event pool contributes to it
2. Compute each sector's **expected value (EV)** for that axis
3. **Greedily fill a theoretical max planet** (20 non-special sectors), picking the highest-EV sectors first, respecting each sector's `maxPerPlanet` limit
4. Sum all EVs → this is the **theoretical maximum** for the axis
5. **5 stars = 75% of that theoretical maximum**
6. Scores above 75% continue scaling linearly beyond 5 (capped at 6)

The 75% threshold is a tunable constant (`FIVE_STAR_RATIO = 0.75`).

### Steps

1. **Event magnitude parser** — Extract numeric value from event names:
   - `HARVEST_3` → 3, `FUEL_6` → 6, `PROVISION_4` → 4, `OXYGEN_24` → 24
   - `FIGHT_12` → 12, `FIGHT_8_10_12_15_18_32` → average of values
   - `ACCIDENT_3_5` → midpoint (4), `DISASTER_3_5` → midpoint (4), `TIRED_2` → 2
   - Fixed magnitudes: `ARTEFACT` → 1, `STARMAP` → 1, `DISEASE` → 1, `PLAYER_LOST` → 1, `ITEM_LOST` → 1, `MUSH_TRAP` → 1, `KILL_RANDOM` → 1, `KILL_ALL` → 1

2. **Event-to-axis mapping** — Assign each event type to exactly one axis:
   | Axis | Events |
   |---|---|
   | Fruits | `HARVEST_N` |
   | Steaks | `PROVISION_N` |
   | Fuel | `FUEL_N` |
   | Artifacts | `ARTEFACT`, `STARMAP` |
   | Lethality | `KILL_ALL`, `KILL_RANDOM`, `KILL_LOST`, `MUSH_TRAP`, `FIGHT_N` |
   | Hazards | `DISEASE`, `PLAYER_LOST`, `ITEM_LOST`, `ACCIDENT_*`, `DISASTER_*`, `TIRED_*` |

3. **Per-sector expected value** — For each sector, compute each axis's expected contribution:
   ```
   axis_ev = Σ (event_weight × event_magnitude) / total_weight_of_sector
   ```
   Only sum events belonging to that axis.

4. **Compute 5-star ceiling** — For each axis, build the theoretical max planet and take 75%:
   ```
   ceiling[axis] = theoretical_max[axis] × FIVE_STAR_RATIO
   ```

5. **Planet-level aggregation** — Sum across all selected sectors:
   ```
   raw_score[axis] = Σ sector_axis_ev
   ```

6. **Normalization** — Map raw score to stars:
   ```
   stars[axis] = (raw_score[axis] / ceiling[axis]) × 5
   ```
   Clamped to [0, 6]. Scores above 5 mean the planet exceeds the 75% ceiling.

7. **Booleans** — Derived directly from sector list:
   - `oxygen`: at least one `OXYGEN` sector is present

8. **Tests** — Unit tests for magnitude parsing, ceiling computation, per-sector scoring, full planet scoring against known example worlds.

---

## Phase 2 — Overall score

Combine the sub-category scores into a single 0–6 overall rating.

### Steps

1. **Weighted formula** — Define axis weights for the overall score:
   - Positive axes (fruits, steaks, fuel, artifacts) contribute positively
   - Negative axes (lethality, hazards) contribute negatively
   - Formula: `overall = base + Σ(positive_weight × positive_stars) - Σ(negative_weight × negative_stars)`
   - Clamp to [0, 6]

2. **Calibration** — Tune weights against example worlds:
   - "America's Dream" (fuel bonanza, low danger) should be high
   - "Polyphemus" (seismic + volcanic + mankarog) should be low
   - "Museum" (artifacts but fights) should be middling
   - "Nurgle's Throne" (insects, disease) should be low-mid

3. **Tests** — Overall score for each example world, sanity checks.

---

## Phase 3 — Traits and modifiers

Planet-level traits that give bonus/malus to axis scores or the overall score, based on structural properties of the planet (not displayed to the user as labels — purely internal scoring adjustments).

### Steps

1. **Source diversity modifier** — Per axis, count how many distinct sectors contribute to that axis. More sources = bonus multiplier (abilities like Botanic/Survival scale with source count).
   - 1 source: ×1.0
   - 2 sources: ×1.1
   - 3 sources: ×1.2
   - 4+ sources: ×1.3
   - Thresholds TBD during calibration

2. **Planet size modifier** — Larger planets have more total events. Apply a size-based adjustment:
   - Tiny (≤5 non-special sectors): slight malus on resource axes
   - Medium (6–12): neutral
   - Large (13–20): slight bonus on resource axes
   - Exact multipliers TBD during calibration

3. **Rope relevance** — If 2+ sectors have `ACCIDENT_ROPE_*` events, reduce the hazards score slightly (rope mitigates those reliably).

4. **Fight threshold sectors** — Sectors with `fightVsDamageThreshold` mean fights can resolve as damage instead. Adjust lethality score downward for those sectors proportionally.

5. **Re-calibrate** — Re-tune normalization thresholds from Phase 1 and overall weights from Phase 2 after applying modifiers.

6. **Tests** — Verify modifiers shift scores in the expected direction. Compare same-sectors planet at different sizes. Compare diverse vs. concentrated planet.

---

## Wiring (after all phases)

- Remove `PlanetaryReview._EXAMPLE_REVIEW_DATA` and the TODO fallback
- `app.js` calls `PlanetReviewScorer.score(sectors)` and passes the result into `this._planetaryReview.update(worldName, reviewData)`
- Register `PlanetReviewScorer.js` in `manifest.json` (in the probability/ section, before `app.js`)

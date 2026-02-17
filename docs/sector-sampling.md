# Sector Sampling: Accounting for Movement Speed

## The Problem

The simulator currently treats all sectors on a planet as visited. If a planet has 20 sectors but the expedition team only explores 9 (Icarus base speed), results are wildly inflated — twice the damage, twice the resources, twice the negative events.

We need to account for the fact that **which sectors get explored is itself random**. Movement speed (9 for Icarus, 3 for patrol, +1 per sprinter) determines how many sectors are visited, but not which ones.

---

## Key Constraint: Exploration Is NOT Uniform

Sectors are **not equally likely** to be explored. Each sector type has a `weightAtPlanetExploration` value (typically 6, 8, or 10) that determines how likely it is to be picked at each step. Furthermore, items can modify these weights:

- **Echo Sounder**: ×5 to HYDROCARBON exploration weight
- **Heat Seeker**: ×5 to LOST, INTELLIGENT, RUMINANT, PREDATOR, INSECT, MANKAROG exploration weight

This means exploration is a **weighted sampling without replacement** process — not a uniform hypergeometric draw.

---

## Optimization: Skip When Unnecessary

When the movement speed K ≥ total sectors N on the planet, **all sectors are visited** and no sampling is needed. The existing engine runs unchanged. This is the common case for small planets or high-speed expeditions, and should be the first check before any sampling logic runs.

---

## The Approach: Weighted Composition Enumeration

There are two layers of randomness:
1. **Which sectors you visit** (determined by movement speed + planet composition + exploration weights)
2. **What happens in those sectors** (the existing convolution engine)

The naive approach — averaging — collapses layer 1 and loses rare-but-critical events (player death on LOST, mush trap on CRISTAL_FIELD). Instead, we **enumerate all possible visited compositions** and combine their full probability distributions, weighted by how likely each composition is given the exploration weights.

### How it works

Given a planet with sector counts like `{FOREST: 3, DESERT: 4, LOST: 1, ...}` totaling N=16 sectors, movement speed K=9, and per-type exploration weights:

1. **Enumerate all valid compositions** of K sectors drawn from the planet. A composition is a tuple like `(2 FOREST, 3 DESERT, 0 LOST, ...)` where each count ≤ available and the sum = K.

2. **For each composition**, calculate its probability using **Fisher's noncentral multivariate hypergeometric distribution**:

$$P(k_1, ..., k_m) = \frac{\prod_i \binom{n_i}{k_i} \cdot \omega_i^{\,k_i}}{\sum_{\text{all valid}} \prod_j \binom{n_j}{k_j} \cdot \omega_j^{\,k_j}}$$

Where:
- $n_i$ = count of sector type $i$ on the planet
- $k_i$ = count of type $i$ in this composition
- $\omega_i$ = effective exploration weight of type $i$ (base `weightAtPlanetExploration` + item bonuses)
- The denominator sums over all valid compositions, normalizing to 1

When all weights are equal ($\omega_i = \omega$ for all $i$), the $\omega^{k_i}$ terms cancel across numerator and denominator, and this reduces to the ordinary multivariate hypergeometric — the uniform case. The weights only matter when they differ across sector types.

3. **For each composition**, expand it into a sector list and run it through the existing calculation engine (`EventWeightCalculator.calculate`). This produces a full result structure with probability distributions for resources, damage, negative events, etc.

4. **Merge all distributions** by weighting each composition's distributions by its noncentral hypergeometric probability. This produces a single combined distribution that accounts for both layers of randomness.

5. **Extract scenarios** (pessimist/average/optimist/worstCase) from the combined distributions.

### Why this preserves rare events

If there's 1 LOST sector on a planet with 16 sectors and you explore 9:
- Some fraction of compositions include it (depends on LOST's exploration weight vs others)
- The rest don't

The compositions that include LOST contribute their full, scary distributions (including KILL_LOST) to the combined result. The pessimist/worstCase tail still reflects the danger — an outcome like "player lost" still appears in the final worst case. It's just properly weighted by the chance of actually visiting that sector.

### How item weight bonuses work

Items like Echo Sounder and Heat Seeker **multiply** `weightAtPlanetExploration` for specific sector types. This shifts the composition probabilities:
- With Heat Seeker, PREDATOR sectors (base weight 6) become weight 30 (×5), making compositions with more PREDATORs much more likely
- This directly flows into the $\omega_i$ terms in the formula above

The effective weight for each sector type is computed from the loadout before enumeration, using the `sectorDiscoveryMultiplier` data in `ItemEffects`.

### Computational feasibility

The number of valid compositions is bounded by the multivariate hypergeometric support. For typical planets:

- A planet has ~5-10 distinct sector types
- Each type has 1-4 copies
- Total sectors: 5-21

The number of compositions is the number of ways to partition K into parts bounded by per-type counts. For a planet like "Thousands Cuts" (21 sectors, 5 types of 4 each + LANDING), drawing 9 sectors yields ~70 compositions. For extreme cases (many types with low counts), this might reach a few hundred.

The existing convolution engine runs in microseconds per composition. Even 1000 compositions would compute in well under a second.

The normalization constant (denominator) is computed for free — it's just the sum of unnormalized values across all enumerated compositions.

---

## Implementation Plan

### Step 1: Weighted Composition Generator
**File:** `js/probability/SectorSampler.js` (new)  
**Complexity:** Medium  

Create a utility that, given:
- A sector count map `{FOREST: 3, DESERT: 4, LOST: 1, ...}`
- A weight map `{FOREST: 8, DESERT: 8, LOST: 8, ...}` (base + item bonuses)
- A number K (movement speed)

Returns all valid compositions with their noncentral hypergeometric probabilities.

Key functions:
- `enumerateCompositions(sectorCounts, K)` → `[{ composition: {FOREST: 2, DESERT: 3, ...} }, ...]` — pure combinatorial enumeration
- `binomial(n, k)` — helper for computing $\binom{n}{k}$, with memoization
- `computeProbabilities(compositions, sectorCounts, weights, N, K)` — assigns each composition its noncentral hypergeometric probability using the formula above
- `getEffectiveWeights(sectorTypes, loadout)` — multiplies base `weightAtPlanetExploration` by `sectorDiscoveryMultiplier` from items

Validation: probabilities of all compositions must sum to 1.0.

### Step 2: Distribution Mixer
**File:** `js/probability/SectorSampler.js` (same file) or `DistributionCalculator.js` (extend)  
**Complexity:** Low  

Add a function to merge multiple weighted probability distributions:

```
mixDistributions(weightedDistributions) 
  Input:  [{ distribution: Map<value, prob>, weight: 0.0xyz }, ...]
  Output: Map<value, prob>
```

For each value, the mixed probability = Σ(weight_i × prob_i). This is just a weighted sum — trivial to implement.

This needs to work for all types of distributions the engine produces (resources, damage, negative events).

### Step 3: Integrate into EventWeightCalculator.calculate
**File:** `js/probability/EventWeightCalculator.js` (modify)  
**Complexity:** High  

This is the core integration point. The current `calculate(sectors, loadout, players)` method processes a flat sector list. We need a new entry point or wrapper:

**Option A — New method:** `calculateWithSampling(sectorCounts, exploredCount, loadout, players)`
- Checks if K ≥ N → if so, fall through to existing `calculate()` with all sectors (no sampling needed)
- Otherwise, computes effective weights from loadout
- Generates weighted compositions via Step 1
- For each composition, expands to a sector list and calls the existing `calculate()`
- Merges all result distributions via Step 2
- Returns a single result object with the same shape as `calculate()`

**Option B — Modify `calculate()` to accept an optional `exploredCount` parameter**
- If `exploredCount` is null or ≥ total sectors → current behavior (no sampling)
- If `exploredCount` < total sectors → run composition enumeration internally

Option B is cleaner for the caller (app.js barely changes) but mixes concerns. Option A is more explicit.

Regardless, the merging needs to handle every distribution in the result:
- `resources.*` — each resource has an occurrence distribution
- `combat.damage` — damage distribution
- `combat.damageInstances` — per-scenario damage paths (these need special handling)
- `eventDamage.damage` — event damage distribution
- `eventDamage.damageInstances` — per-scenario event damage paths
- `negativeEvents.*` — per-event-type distributions
- `sectorBreakdown` — this becomes a weighted/expected breakdown

The tricky part is **damageInstances and sampledPaths** — these are per-scenario explaining paths that reference specific sectors. With composition sampling, we'd want the paths from the *most probable composition that produces each scenario value*. This may require resampling after merging.

### Step 4: Wire into app.js
**File:** `js/app.js` (modify)  
**Complexity:** Low  

Update `_calculateExpeditionResults()` to:
1. Get the explored sector count from `_playerSection.getExploredSectors()`
2. Build a sector count map from the selected sectors
3. Call the new sampling-aware calculation method instead of `calculate()` when explored < total
4. Pass results downstream as before

The sector count map is trivial — just count occurrences of each sector name in the existing sectors array.

### Step 5: Handle LANDING and LOST (special sectors)
**File:** `js/probability/SectorSampler.js`  
**Complexity:** Low  

LANDING is always the first sector visited and **does not count toward the movement speed limit**. LOST appears when oxygen runs out. Both should be excluded from the random sampling:
- LANDING: always included, remove from pool but do NOT subtract from K (it's free)
- LOST: current behavior (appears based on oxygen). Don't include in the hypergeometric pool — handle it the same way it's handled now

### Step 6: Register in manifest.json
**File:** `manifest.json` (modify)  
**Complexity:** Trivial  

Add `js/probability/SectorSampler.js` to the content scripts list.

---

## Complexity Summary

| Step | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| 1 | Weighted Composition Generator | Medium | None |
| 2 | Distribution Mixer | Low | Step 1 |
| 3 | Integration into EventWeightCalculator | **High** | Steps 1, 2 |
| 4 | Wire into app.js | Low | Step 3 |
| 5 | Handle special sectors (LANDING/LOST) | Low | Step 1 |
| 6 | Register in manifest | Trivial | Step 1 |

**Total estimated effort:** Step 3 is the bulk of the work. Everything else is straightforward.

---

## Example: Nurgle's Throne (13 sectors, movement speed 9)

Planet: 1 LANDING, 4 INSECT, 4 FOREST, 4 SWAMP

LANDING is always visited for free. Remaining pool = 12 sectors, movement speed K = 9, so we pick 9 from 12.
All three types have `weightAtPlanetExploration: 8`, so weights are equal and this reduces to ordinary hypergeometric.

Some example compositions and their probabilities:

| INSECT | FOREST | SWAMP | P(composition) |
|--------|--------|-------|----------------|
| 0 | 4 | 4 | 0.20% |
| 1 | 3 | 4 | 3.23% |
| 1 | 4 | 3 | 3.23% |
| 2 | 2 | 4 | 7.27% |
| 2 | 3 | 3 | 19.39% |
| 2 | 4 | 2 | 7.27% |
| 3 | 1 | 4 | 3.23% |
| 3 | 2 | 3 | 19.39% |
| 3 | 3 | 2 | 19.39% |
| 3 | 4 | 1 | 3.23% |
| 4 | 0 | 4 | 0.20% |
| 4 | 1 | 3 | 3.23% |
| 4 | 2 | 2 | 7.27% |
| 4 | 3 | 1 | 3.23% |
| 4 | 4 | 0 | 0.20% |

→ Only 15 compositions total. Each runs through the convolution engine, distributions get mixed. Done.

### Same example with Heat Seeker

If a player carries a Heat Seeker, INSECT gets ×5 → effective weight 40 (vs 8 for FOREST and SWAMP).

The same 15 compositions exist, but now compositions with more INSECTs are far more probable:

| INSECT | FOREST | SWAMP | Without Heat Seeker | With Heat Seeker |
|--------|--------|-------|--------------------|-----------------|
| 0 | 4 | 4 | 0.20% | **0.00%** |
| 1 | 3 | 4 | 3.23% | **0.11%** |
| 1 | 4 | 3 | 3.23% | **0.11%** |
| 2 | 2 | 4 | 7.27% | **1.18%** |
| 2 | 3 | 3 | 19.39% | **3.15%** |
| 2 | 4 | 2 | 7.27% | **1.18%** |
| 3 | 1 | 4 | 3.23% | **2.63%** |
| 3 | 2 | 3 | 19.39% | **15.77%** |
| 3 | 3 | 2 | 19.39% | **15.77%** |
| 3 | 4 | 1 | 3.23% | **2.63%** |
| 4 | 0 | 4 | 0.20% | **0.82%** |
| 4 | 1 | 3 | 3.23% | **13.14%** |
| 4 | 2 | 2 | 7.27% | **29.56%** |
| 4 | 3 | 1 | 3.23% | **13.14%** |
| 4 | 4 | 0 | 0.20% | **0.82%** |

Without Heat Seeker, all three types are symmetric and the most likely compositions are the balanced ones (19.39% each for 2/3/3, 3/2/3, 3/3/2). With Heat Seeker, the distribution shifts dramatically: "4 INSECT + 2 FOREST + 2 SWAMP" jumps to **29.56%** (from 7.27%), while "0 INSECT + 4 FOREST + 4 SWAMP" drops to nearly zero (0.00%).

---

## What Does NOT Change

- The convolution engine itself (DistributionCalculator, DamageDistributionEngine)
- Per-sector probability calculations (ModifierApplicator, AbilityModifiers, etc.)
- The UI components (SectorGrid, PlayerSection, ResultsDisplay, ProbabilityDisplay)
- The display layer — it still receives the same result shape
- DamageSpreader and per-player health calculations (they operate on the final merged result)

---

## Implementation Flow (How It Actually Works)

### Before Sampling (Original Flow)

```
User selects sectors: [LANDING, FOREST, FOREST, DESERT, SWAMP, ...]
                              ↓
_calculateExpeditionResults() 
                              ↓
EventWeightCalculator.calculate([LANDING, FOREST, FOREST, ...], loadout, players)
                              ↓
Results calculated assuming ALL sectors are visited
```

### After Sampling (New Flow)

```
User selects 12 sectors: [LANDING, FOREST, FOREST, FOREST, DESERT, DESERT, SWAMP, ...]
Movement speed: 9 (from PlayerSection)
                              ↓
_calculateExpeditionResults() 
                              ↓
Step 1: Separate special vs explorable
        alwaysInclude = [LANDING]
        sectorCounts = {FOREST: 3, DESERT: 2, SWAMP: ...}  (11 explorable)
                              ↓
Step 2: Check if sampling needed
        9 < 11? YES → use sampling
                              ↓
EventWeightCalculator.calculateWithSampling(sectorCounts, 9, loadout, players, {alwaysInclude})
                              ↓
Step 3: Generate compositions (SectorSampler)
        "Which 9 of 11 sectors could we visit?"
        → [{composition: {FOREST:3, DESERT:2, SWAMP:2, ...}, probability: 0.15}, ...]
        → Maybe 50 possible compositions
                              ↓
Step 4: For EACH composition:
        a) Expand: {FOREST:2, DESERT:3, ...} → ['FOREST','FOREST','DESERT','DESERT','DESERT',...]
        b) Add LANDING: [..., 'LANDING']
        c) Run existing calculate(): EventWeightCalculator.calculate(sectors, loadout, players)
        d) Get full results (resources, combat, eventDamage, negativeEvents, damageInstances)
                              ↓
Step 5: Mix all results (DistributionCalculator.mixDistributions)
        - Each composition's distribution is weighted by how likely that composition is
        - Combine into single distribution
        - Extract new scenarios (pessimist/avg/optimist/worst)
        - Pick damageInstances from most probable composition for each scenario
                              ↓
Final merged result (same shape as before)
```

### Key Insight

**Nothing downstream changed.** The result from `calculateWithSampling()` has the **exact same shape** as `calculate()`. The rest of `_calculateExpeditionResults()` (DamageSpreader, health calculations, etc.) doesn't know or care that sampling happened.

The "magic" is:
1. `calculateWithSampling` calls `calculate` many times (once per composition)
2. Mixes the results weighted by composition probability
3. Returns a single result that looks identical to a non-sampled result

### Files Involved

| File | Role |
|------|------|
| `js/probability/SectorSampler.js` | Generates weighted compositions, computes hypergeometric probabilities |
| `js/probability/DistributionCalculator.js` | `mixDistributions()` combines weighted probability maps |
| `js/probability/EventWeightCalculator.js` | `calculateWithSampling()` orchestrates the whole flow |
| `js/app.js` | `_calculateExpeditionResults()` decides whether to use sampling |

### Debug Page

Open `tests/sector-sampler-debug.html` in a browser to:
- Test composition generation with different planets
- See effective weights with/without items
- Run full integration tests with real calculators
- Validate that probabilities sum to 1

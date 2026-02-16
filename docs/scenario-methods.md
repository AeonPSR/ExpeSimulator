# Scenario Extraction Methods

## Overview

After convolving per-sector distributions into a final probability distribution,
we need to extract three human-readable numbers: **pessimist**, **average**, **optimist**.

This project uses **two different methods** depending on the distribution shape.

---

## Method 1: Percentiles (for Damage & Fights)

**Used by:** `DistributionCalculator.getScenarios()` → called from `OccurrenceCalculator`, `DamageDistributionEngine`

**How it works:** Pick the value at a specific cumulative probability threshold.

```
pessimist = value at 75th percentile (high damage — bad)
average   = value at 50th percentile
optimist  = value at 25th percentile (low damage — good)
worstCase = value at 100th percentile (maximum possible)
```

**Why it works here:** Damage distributions are **dense** — events like TIRED_2, ACCIDENT_3_5, FIGHT_12 each deal multiple HP and most sectors have at least one damage event. The resulting convolved distribution spans many integer values with meaningful probability mass at each, so percentile boundaries land on distinct values.

**Example:** 3 sectors with various damage events → distribution might be `{0: 5%, 2: 15%, 4: 25%, 5: 20%, 7: 18%, 9: 12%, 12: 5%}`. Percentiles yield smooth, distinct values: optimist=2, average=5, pessimist=9.

---

## Method 2: Conditional Tail Expectations (for Resources & Negative Events)

**Used by:** `ResourceCalculator._getTailScenarios()`, `NegativeEventCalculator._getTailScenarios()`

**How it works:** Instead of picking a single cutoff value, compute the **average outcome within the best/worst quartile of runs**.

```
pessimist = E[X | bottom 25% of runs]   (for resources: fewest resources)
average   = E[X]                         (expected value of full distribution)
optimist  = E[X | top 25% of runs]       (for resources: most resources)
```

For negative events, the directions are flipped (fewer = better):
```
pessimist = E[X | top 25% of runs]       (most negative events — worst luck)
average   = E[X]
optimist  = E[X | bottom 25% of runs]    (fewest negative events — best luck)
```

### Why percentiles fail here

Resource and negative event distributions are **sparse** — dominated by a single value (usually 0). Most sectors have a 70-90% chance of producing 0 of any given resource or negative event.

With a distribution like `{0: 0.85, 1: 0.15}`:

| Method | Pessimist | Average | Optimist |
|--------|-----------|---------|----------|
| Percentile (p25/p50/p75) | 0 | 0 | 0 |
| Conditional tail expectation | 0.0 | 0.15 | 0.6 |

Percentiles return 0 for all three scenarios because 85% of mass sits at value 0 — you need the event probability to exceed 25% before *any* percentile becomes non-zero.

### Algorithm: `_conditionalExpectation(sorted, tailFraction, side)`

1. Sort the distribution entries by value
2. Walk from the specified side (ascending for 'bottom', descending for 'top')
3. Accumulate probability mass until `tailFraction` (0.25) is collected
4. Partial entries are split proportionally (take only what's needed)
5. Return the weighted sum divided by `tailFraction`

---

## Worked Example: PLAYER_LOST with 3× COLD sectors

### Step 1: Per-sector distribution

COLD has `PLAYER_LOST` weight 2 out of total 10 → `P(event) = 0.20`

```
Sector distribution: {0: 0.80, 1: 0.20}
```

### Step 2: Convolve 3 sectors

| Total events | Probability | Calculation |
|-------------|-------------|-------------|
| 0 | 0.512 | 0.8³ |
| 1 | 0.384 | 3 × 0.8² × 0.2 |
| 2 | 0.096 | 3 × 0.8 × 0.2² |
| 3 | 0.008 | 0.2³ |

### Step 3: Extract scenarios (fewer = better for negative events)

**Average** = E[X] = 0×0.512 + 1×0.384 + 2×0.096 + 3×0.008 = **0.60**

**Optimist** (bottom 25% — fewest events):
- Walk ascending: value 0, prob 0.512 → take 0.25 (all we need)
- Weighted sum = 0 × 0.25 = 0
- Result = 0 / 0.25 = **0.0**

**Pessimist** (top 25% — most events):
- Walk descending:
  - Value 3, prob 0.008 → take 0.008
  - Value 2, prob 0.096 → take 0.096
  - Value 1, prob 0.384 → take 0.146 (only need 0.25 - 0.008 - 0.096 = 0.146)
- Weighted sum = 3×0.008 + 2×0.096 + 1×0.146 = 0.362
- Result = 0.362 / 0.25 = **1.45**

### Comparison

| Method | Pessimist | Average | Optimist |
|--------|-----------|---------|----------|
| Percentile | 1 | 0 | 0 |
| **Conditional tail** | **1.45** | **0.60** | **0.0** |

The conditional tail method reveals that the pessimist case averages 1.45 events — more informative than just "1".

---

## Worked Example: Artefacts with 1× RUINS sector

### Per-sector distribution

RUINS has `ARTEFACT` weight 4 out of total 10 → `P(artefact) = 0.40`  
Real artefact = 8/9 of that → `P(real) = 0.356`

```
Distribution: {0: 0.644, 1: 0.356}
```

### With percentiles (old method)

- p25 = 0, p50 = 0, p75 = 1
- Pessimist=0, Average=0, Optimist=1

### With conditional tail expectations (new method)

- **Average** = 0.356
- **Optimist** (top 25%): value 1 prob 0.356 → take 0.25, result = 1×0.25/0.25 = **1.0**
- **Pessimist** (bottom 25%): value 0 prob 0.644 → take 0.25, result = 0×0.25/0.25 = **0.0**

Both methods agree on optimist (1.0) since artefact probability exceeds 25%.
But average is now **0.4** instead of the misleading **0**.

---

## Summary

| | Percentiles | Conditional Tail Expectations |
|---|---|---|
| **Values** | Integer (snaps to distribution values) | Fractional (smooth) |
| **Good for** | Dense distributions (damage, fights) | Sparse distributions (resources, negative events) |
| **Fails when** | Dominant probability mass at one value | N/A |
| **Output fields** | pessimist, average, optimist, worstCase, *Prob | pessimist, average, optimist |
| **Used by** | DistributionCalculator | ResourceCalculator, NegativeEventCalculator |

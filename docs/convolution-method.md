# Convolution Method for Resource Calculation

## Overview

The convolution method is used to calculate the **exact probability distribution** of total resources obtained from multiple expedition sectors. It answers the question: "What are all the possible outcomes, and how likely is each?"

---

## The Problem

When exploring multiple sectors, each sector independently produces a random amount of resources. We want to know:
- What's the **average** (expected) total?
- What's a **pessimistic** estimate? (things go poorly)
- What's an **optimistic** estimate? (things go well)

---

## Single Sector: Simple Case

For a single RUMINANT sector, the distribution is straightforward:

| Outcome | Probability | Meaning |
|---------|-------------|---------|
| 0 steaks | 30% | No food event occurred |
| 2 steaks | 30% | PROVISION_2 event |
| 4 steaks | 40% | PROVISION_4 event |

**Expected value** = 0×0.30 + 2×0.30 + 4×0.40 = **2.2 steaks**

---

## Two Sectors: Where Convolution Comes In

With **two** RUMINANT sectors, what are the possible outcomes?

Each sector can give 0, 2, or 4 steaks. The **convolution** combines these by considering all combinations:

| Sector 1 | Sector 2 | Total | Probability |
|----------|----------|-------|-------------|
| 0 | 0 | **0** | 0.30 × 0.30 = 0.09 |
| 0 | 2 | **2** | 0.30 × 0.30 = 0.09 |
| 0 | 4 | **4** | 0.30 × 0.40 = 0.12 |
| 2 | 0 | **2** | 0.30 × 0.30 = 0.09 |
| 2 | 2 | **4** | 0.30 × 0.30 = 0.09 |
| 2 | 4 | **6** | 0.30 × 0.40 = 0.12 |
| 4 | 0 | **4** | 0.40 × 0.30 = 0.12 |
| 4 | 2 | **6** | 0.40 × 0.30 = 0.12 |
| 4 | 4 | **8** | 0.40 × 0.40 = 0.16 |

Grouping by total:

| Total Steaks | Probability | Cumulative |
|--------------|-------------|------------|
| 0 | 9% | 9% |
| 2 | 18% | 27% |
| 4 | 33% | 60% |
| 6 | 24% | 84% |
| 8 | 16% | 100% |

---

## What Do Percentiles Mean?

### The 25th Percentile (Pessimistic)
> "25% of the time, you'll get **this value or less**"

Looking at the cumulative probabilities above:
- 9% chance of getting ≤0
- 27% chance of getting ≤2 ← **This crosses 25%!**

So **25th percentile = 2 steaks**

This means: "In a bad run (bottom 25% of luck), you'll get 2 or fewer steaks."

### The 75th Percentile (Optimistic)
> "75% of the time, you'll get **this value or less**"  
> Or equivalently: "25% of the time, you'll get **more than this**"

- 60% chance of getting ≤4
- 84% chance of getting ≤6 ← **This crosses 75%!**

So **75th percentile = 6 steaks**

This means: "In a good run (top 25% of luck), you'll get 6 or more steaks."

### The Average (Expected Value)
The probability-weighted mean of all outcomes:

0×0.09 + 2×0.18 + 4×0.33 + 6×0.24 + 8×0.16 = **4.4 steaks**

---

## Visual Representation

```
Probability Distribution for 2× RUMINANT:

    33% |        ████
    24% |             ████
    18% |   ████
    16% |                  ████
     9% |████
        +---------------------------
          0    2    4    6    8  steaks
          
          ↑         ↑         ↑
       pessimist  avg     optimist
         (2)     (4.4)      (6)
```

---

## Why Convolution?

### Alternative 1: Monte Carlo Simulation
Run thousands of random simulations and count results.
- ❌ Slow for many scenarios
- ❌ Results vary each time
- ❌ Memory-intensive for accuracy

### Alternative 2: Normal Approximation
Assume the distribution is bell-shaped.
- ❌ Inaccurate for small N (1-5 sectors)
- ❌ Discrete outcomes don't fit continuous model

### Convolution
Compute exact probabilities by combining distributions.
- ✅ **Exact results** - no randomness
- ✅ **Fast** - O(outcomes²) per sector
- ✅ **Works for any N** - even 1 sector
- ✅ **Low memory** - just store the distribution map

---

## How Bonuses Work

### Additive Bonuses (Survival, Botanist)

Bonuses are applied **per event**, not to the final total.

**Without Survival** (2× RUMINANT):
- Each sector: {0: 30%, 2: 30%, 4: 40%}
- Average: 2.2 per sector → 4.4 total

**With 1× Survival** (+1 per PROVISION event):
- Each sector: {0: 30%, **3**: 30%, **5**: 40%}
- Average: 0×0.3 + 3×0.3 + 5×0.4 = **2.9 per sector** → **5.8 total**

The bonus adds +1 to each event that fires, not +1 to the final sum!

### Multiplicative Bonuses (Driller)

**Without Driller** (1× HYDROCARBON):
- {3: 40%, 4: 30%, 5: 20%, 6: 10%}
- Average: 4.0 fuel

**With 1× Driller** (×2 fuel):
- {6: 40%, 8: 30%, 10: 20%, 12: 10%}
- Average: 8.0 fuel

**With 2× Drillers** (×4 fuel):
- {12: 40%, 16: 30%, 20: 20%, 24: 10%}
- Average: 16.0 fuel

---

## Implementation Summary

```javascript
// 1. Build per-sector distribution (with bonuses applied)
sectorDist = { 0: 0.30, 3: 0.30, 5: 0.40 }  // RUMINANT + Survival

// 2. Convolve all sector distributions together
combined = convolve(sector1Dist, sector2Dist, ...)

// 3. Extract statistics from combined distribution
pessimist = getPercentile(combined, 0.25)
average = getExpectedValue(combined)
optimist = getPercentile(combined, 0.75)
```

---

## Interpreting Results in the UI

| Value | Meaning | Use Case |
|-------|---------|----------|
| **Pessimist** | 25th percentile | "Assume bad luck" planning |
| **Average** | Expected value | Long-term planning |
| **Optimist** | 75th percentile | "Assume good luck" scenarios |

**Example reading**: "With 4 RUMINANT sectors, expect **6-11 steaks** (pessimist-optimist range), averaging **8.8**."

---

## Mathematical Definition

For two independent discrete distributions A and B, their convolution C is:

$$P(C = k) = \sum_{i} P(A = i) \cdot P(B = k - i)$$

In other words: the probability of getting total k is the sum of all ways to split k between A and B, weighted by their probabilities.

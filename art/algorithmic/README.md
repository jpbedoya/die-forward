# Algorithmic Art Explorations — Die Forward

**Date:** February 16, 2026  
**Location:** `code/die-forward/art/`  
**Stack:** p5.js, standalone HTML files with interactive controls

## Overview

Created a series of procedural art pieces for Die Forward's visual identity. Each piece runs as a standalone HTML file with a sidebar of tweakable parameters. All share the same color palette derived from the game's aesthetic.

## Color Palette

```css
--crypt-bg: #0a0908      /* Near-black base */
--abyssal-blue: #1a3a4a  /* Deep water */
--drowned-green: #3d5c4a /* Decay, moss */
--bone-white: #d4d0c8    /* Remains, highlights */
--blood-rust: #8b3a3a    /* Dried blood */
--amber: #f59e0b         /* UI accents */
```

---

## 1. Dark Water Ripples
**File:** `dark-water-ripples.html`

Concentric rings appearing on black water — something disturbing the surface from below.

**Features:**
- Concentric rings on still black water
- Something disturbing the surface from below
- Occasional clustered ripples (something big moved)
- Colors: abyssal blue, drowned green, rare bone-white

**Techniques:**
- Multiple ring layers with decay
- Cluster spawning (2-5 ripples near each other)
- Alpha falloff over distance

**Vibe:** Patient menace beneath the surface

---

## 2. Drifting Fog
**File:** `drifting-fog.html`

Horizontal bands of mist at different depths, creating that "flooded halls" atmosphere.

**Features:**
- Horizontal bands of mist at different depths
- Parallax effect (back layers drift slower)
- Layered from surface to abyss colors
- Undulating, organic wave shapes

**Techniques:**
- Layered fog bands with Perlin noise deformation
- Multi-pass rendering for volume
- Parallax speed based on depth
- Gradient background (surface → abyss)

**Vibe:** Atmospheric, quiet dread

---

## 3. Corpse Architecture (Organic Veins)
**File:** `organic-veins.html`

Branching tendrils growing from edges/center — veins of memory spreading through stone.

**Features:**
- Branching tendrils growing from edges/center
- Veins of memory spreading through stone
- Generational color shifts (deeper = bone/blood hints)
- Subtle bioluminescent glow

**Techniques:**
- Recursive branching with angle variation
- Thickness decay along branches
- Color shift with depth (blood-rust → bone-white)
- Organic curves via noise displacement

**Vibe:** Unsettling, alive — the dungeon built from accumulated death

---

## 4. Rising Ash
**File:** `rising-ash.html`

Particles drifting UPWARD from below — ash rising from something burning in the depths.

**Features:**
- Particles drift upward from below
- Mix of gray ash + glowing embers
- Warm underglow from "something burning" below
- Ash has irregular shapes, embers flicker

**Techniques:**
- Upward particle flow with turbulence
- Two particle types: ash (irregular, gray) and embers (bright, flickering)
- Radial glow at bottom
- Perlin noise for drift variation

**Vibe:** Aftermath, smoldering — inverts the descent motif

---

## 5. Eternal Descent ⭐ (Flagship)
**File:** `eternal-descent.html`  
**Philosophy Doc:** `eternal-descent-philosophy.md`

The flagship piece. Particles descend through layered noise fields, accumulating into sedimentary patterns. Represents the game's core truth: *your death feeds the depths*.

**Concept:**
- Particles = Fallen souls drifting through flooded halls
- Layered depth = Surface turbulence → deep stillness
- Accumulation = Bodies becoming dungeon architecture

**Techniques:**
- Stratified Perlin noise (surface turbulence → deep stillness)
- Color based on velocity and depth
- Accumulation over time (never reaches equilibrium)
- Interference patterns suggest buried architecture

**Controls:**
| Parameter | Effect |
|-----------|--------|
| Fallen Souls | Number of particles (500-5000) |
| Descent Speed | How fast they fall |
| Current Turbulence | Noise field intensity |
| Depth Layers | Stratification (2-6 layers) |
| Trail Persistence | How long trails linger |

**Vibe:** Inevitability, geological time

---

## Design Process

Started with Eternal Descent (falling particles), but the trails gave off the wrong vibe. Brainstormed alternatives that better fit Die Forward's themes:

**Considered Approaches:**
1. **Dark Water Ripples** ✅ — Concentric rings, something patient disturbs the surface from below
2. **Drifting Fog Layers** ✅ — Horizontal mist bands, "flooded halls" atmosphere
3. **Organic Veins/Cracks** ✅ — Branching patterns, "corpses become architecture"
4. **Floating Ash/Embers** ✅ — Particles drifting UP, ash from something burning below
5. **Interference Patterns** — Moiré patterns through dark water (not built yet)

**Guiding Themes:**
- "Something patient waiting below"
- "Corpses become architecture"
- Avoid anything that reads as cheerful or decorative

Built all four main directions. Dark Water Ripples and Organic Veins best capture the core themes.

---

## Ideas to Explore

1. **Animated backgrounds for game screens** — Low-particle-count versions for title/death/victory screens
2. **NFT generative series** — Seeded variations with rarity traits
3. **Interactive depth transitions** — Fog/water effects that react to game state
4. **Composite piece** — Layer multiple effects (fog + ash + descent)
5. **Export to video** — Capture loops for social/marketing

## How to Preview

```bash
# Open any piece in browser
open ~/workspace/code/die-forward/art/dark-water-ripples.html
open ~/workspace/code/die-forward/art/drifting-fog.html
open ~/workspace/code/die-forward/art/organic-veins.html
open ~/workspace/code/die-forward/art/rising-ash.html
open ~/workspace/code/die-forward/art/eternal-descent.html
```

Each has interactive controls in the sidebar — tweak params, find interesting seeds, export frames.

---

*Created with the algorithmic-art skill using p5.js. All pieces designed to capture Die Forward's aesthetic of beautiful dread.*

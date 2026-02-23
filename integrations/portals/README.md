# Portals Integration — 3D Game Mode

**Status:** 📋 Planned  
**Purpose:** Alternative 3D gameplay experience using Portals rooms

## Overview

Die Forward as a dual-experience game:
- **Text Mode** (current) — Mobile-first, turn-based narrative
- **Portals Mode** (new) — Browser-based 3D dungeon crawl

Same game mechanics, different medium. Players choose their experience.

## Why Portals?

- Browser-based, no download required
- AI-powered room creation via MCP tools
- Built-in trigger/effect system perfect for turn-based combat
- Quest system with state tracking
- Shared multiplayer spaces (spectating, corpse discovery)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              SHARED GAME STATE (InstantDB)          │
│  - Player HP, stamina, inventory                    │
│  - Dungeon seed & room progression                  │
│  - Corpse registry                                  │
│  - Meta-progression (unlocks, achievements)         │
└──────────────────┬──────────────────┬───────────────┘
                   │                  │
      ┌────────────▼────────┐  ┌──────▼───────────────┐
      │    TEXT MODE        │  │    PORTALS MODE      │
      │  (React Native)     │  │  (3D Browser)        │
      │                     │  │                      │
      │  - Card-based UI    │  │  - Walk through      │
      │  - Tap to act       │  │  - Click to interact │
      │  - Quick sessions   │  │  - Immersive         │
      │  - Mobile-first     │  │  - Desktop-first     │
      └─────────────────────┘  └──────────────────────┘
```

### Separate Runs, Shared Progress

- Each mode starts fresh runs independently
- Meta-progression syncs across modes:
  - Unlocked creatures
  - Achievement badges
  - Lifetime stats (rooms cleared, deaths, etc.)
- Corpses from either mode appear in both

## Room-by-Room 3D Layout

Die Forward has 13 rooms across 3 depth tiers. Here's how they map to Portals:

### Tier 1: The Upper Crypts (Rooms 1-4)

| Room | Type | 3D Environment |
|------|------|----------------|
| 1 | Explore | Entry chamber — crumbling stone, torchlight, single door forward |
| 2 | Combat/Corpse | Narrow hallway — encounter creature OR find corpse |
| 3 | Combat | Small tomb — sarcophagi, combat arena |
| 4 | Cache | Offering alcove — supplies on pedestal, healing available |

**Aesthetic:** Gray stone, dim torches, dust particles, ambient dripping

### Tier 2: The Flooded Depths (Rooms 5-8)

| Room | Type | 3D Environment |
|------|------|----------------|
| 5 | Explore | Descent stairway — water seeping through walls |
| 6 | Combat/Corpse | Flooded chamber — knee-deep water, creatures lurking |
| 7 | Combat | Collapsed gallery — broken pillars, tight combat space |
| 8 | Cache | Hidden shrine — glowing items, rest point |

**Aesthetic:** Blue-green lighting, water reflections, fog, echo audio

### Tier 3: The Bone Halls (Rooms 9-12 + Exit)

| Room | Type | 3D Environment |
|------|------|----------------|
| 9 | Explore | Ossuary entrance — walls of skulls, ethereal glow |
| 10 | Combat/Corpse | Ritual chamber — candles, summoning circles |
| 11 | Combat | Throne approach — long hall, elite creatures |
| 12 | Combat (BOSS) | Throne room — final boss arena, dramatic lighting |
| 13 | Exit | Ascent portal — victory room, light streaming down |

**Aesthetic:** Purple/ethereal lighting, bone textures, whisper audio, particle effects

## Combat System in 3D

### Combat Flow

```
1. Player enters room with creature
2. Creature NPC activates, blocks path
3. Player approaches → Combat zone triggers
4. Combat UI appears (floating buttons)
5. Turn-based loop:
   - Enemy intent shown (icon above head)
   - Player selects action (Strike/Dodge/Brace/Flee)
   - VFX plays (slash, dodge roll, shield, run)
   - Damage numbers pop
   - Stamina/HP update
6. Victory → creature death animation, path opens
   OR Death → fade to black, death screen
   OR Flee → escape door appears, player exits
```

### Combat UI Elements

| Element | Implementation |
|---------|----------------|
| Action buttons | 4 floating panels in front of player (Strike ⚔️, Dodge 💨, Brace 🛡️, Flee 🏃) |
| Enemy intent | Icon floating above creature's head + color aura |
| Player HP | Minimal HUD top-left, health bar |
| Stamina | 3 diamond icons next to HP |
| Inventory | Bottom bar, clickable items |
| Damage numbers | Pop-up text at impact point |

### Visual Effects

| Action | VFX |
|--------|-----|
| Strike | Sword slash particle, creature recoil animation |
| Dodge | Player roll/sidestep, whoosh particles |
| Brace | Shield shimmer, impact absorption |
| Flee | Dust cloud, door materializes |
| Take damage | Screen red tint, shake, blood particles |
| Deal damage | Impact sparks, enemy stagger |
| Critical hit | Screen flash, bigger slash effect |
| Victory | Creature dissolve, loot sparkle |
| Death | Fade to red, collapse animation |

## Corpse System

### Discovery

- Corpses appear as glowing bodies on the ground
- Player approaches → info panel appears:
  - Player name (@username)
  - Final message (their death quote)
  - Loot they carried
- Interact to search
- Tip button if wallet connected

### Cross-Mode Visibility

- Text mode deaths create corpses in Portals
- Portals deaths create corpses in text mode
- Same InstantDB corpse registry

## Portals Technical Implementation

### MCP Tools Available

From `portals-mcp`:
- 26+ item types (cubes, 3D models, lights, NPCs, triggers, collectibles)
- 21 trigger types (click, enter zone, collide, hover, key press)
- 63+ effects (show/hide, move, teleport, play sound, spawn particles, damage)
- Quest system with state tracking
- Room settings (lighting, fog, physics)

### Key Triggers for Die Forward

| Game Event | Portals Trigger | Effect |
|------------|-----------------|--------|
| Enter room | Zone enter | Show room narrative, activate NPCs |
| Approach enemy | Proximity | Start combat mode |
| Click action button | Click | Execute combat action |
| Pick up item | Collide/Click | Add to inventory, hide item |
| Search corpse | Click | Show corpse panel |
| Open door | Click (after combat victory) | Teleport to next room |
| Player death | HP reaches 0 | Teleport to death room |
| Victory | Exit room 13 | Teleport to victory room |

### State Sync

Options for syncing InstantDB state with Portals:

**Option A: Portals-native state**
- Use Portals quest system for room progression
- Sync to InstantDB on room transitions
- Simpler, but state lives in two places

**Option B: InstantDB as source of truth**
- Portals reads/writes via API calls
- Custom trigger effects call external endpoints
- More complex, but single source of truth

**Recommendation:** Start with Option A for prototype, migrate to B for production.

## Development Phases

### Phase 1: Prototype (1-2 weeks)
- [ ] Set up Portals room for Room 1
- [ ] Basic movement and door trigger
- [ ] Single combat encounter
- [ ] Prove the concept works

### Phase 2: Full Dungeon (2-3 weeks)
- [ ] Build all 13 rooms
- [ ] Implement combat system with all 4 actions
- [ ] Enemy intent visualization
- [ ] Item pickups
- [ ] Victory/death flows

### Phase 3: Polish (1-2 weeks)
- [ ] VFX for all combat actions
- [ ] Audio integration (ambient, SFX)
- [ ] Corpse system integration
- [ ] Cross-mode meta-progression sync

### Phase 4: Launch
- [ ] Mode selector in main menu
- [ ] Deep links to Portals rooms
- [ ] Analytics for mode preference
- [ ] Performance optimization

## Open Questions

1. **Authentication** — How to link Portals session to Die Forward wallet?
2. **Real-time sync** — How often to sync state between Portals and InstantDB?
3. **Spectating** — Can other players watch your run in real-time?
4. **Mobile Portals** — Does Portals work well on mobile browsers?
5. **Room generation** — Static rooms or procedurally generate per run?

## Resources

- [Portals MCP GitHub](https://github.com/busportals/portals-mcp)
- [Portals Platform](https://theportal.to)
- Die Forward game state: `mobile/lib/GameContext.tsx`
- Combat logic: `mobile/app/combat.tsx`
- Room content: `mobile/lib/content.ts`

## Notes

- Portals rooms are browser-based — natural fit for desktop "sit down and play" sessions
- Text mode remains the quick mobile experience
- Both modes should feel like the same game, just different vibes
- The shared corpse system creates a cool cross-platform social layer

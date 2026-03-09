# Admin Settings

All game mechanics are configurable via InstantDB. Settings sync in real-time across all connected clients.

## How to Access

Settings are stored in the `gameSettings` table in InstantDB. You can modify them via:
- InstantDB Dashboard: https://instantdb.com/dash
- Direct API calls

## Available Settings

### Loot Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `lootChanceBase` | 0.5 | Loot drop chance for rooms 1-4 (50%) |
| `lootChanceDepth5` | 0.65 | Loot drop chance for rooms 5-8 (65%) |
| `lootChanceDepth9` | 0.8 | Loot drop chance for rooms 9-12 (80%) |

Deeper rooms have better loot chances to reward progression.

### Combat Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `baseDamageMin` | 15 | Minimum base damage per hit |
| `baseDamageMax` | 25 | Maximum base damage per hit |
| `tier2Multiplier` | 1.5 | Damage multiplier for Tier 2 enemies |
| `tier3Multiplier` | 2.0 | Damage multiplier for Tier 3 enemies |
| `enemyCounterMultiplier` | 0.85 | Enemy damage multiplier when player counters correctly |
| `chargePunishment` | 2.0 | Multiplier applied to enemy damage when CHARGING goes unpunished |
| `intentCounterBonus` | 1.5 | Player damage bonus for striking into AGGRESSIVE or HUNTING intent |
| `erraticDamageMax` | 1.3 | Max variance cap on ERRATIC enemy damage modifier (prevents one-shots) |

Enemy tiers increase with depth:
- Rooms 1-4: Tier 1 (base damage)
- Rooms 5-8: Tier 2 (1.5x damage)
- Rooms 9-12: Tier 3 (2x damage)

### Action Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `strikeCost` | 2 | Stamina cost per Strike action |
| `dodgeSuccessRate` | 0.65 | Chance to successfully dodge (65%) |
| `braceReduction` | 0.5 | Damage reduction when bracing (50%) |
| `braceBaseDamageMin` | 6 | Minimum damage taken when bracing (floor, not zero) |
| `braceBaseDamageMax` | 12 | Maximum damage taken when bracing |
| `criticalChance` | 0.15 | Chance for critical hit on Strike (15%) |
| `criticalMultiplier` | 1.75 | Damage multiplier on critical hits |

> **Strike costs 2**: With a pool of 4 and regen of 1/turn, you get roughly 2 strikes before needing recovery. Brace is free but always deals some damage — it's a recovery move, not a winning move.

### Flee Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `fleeChanceBase` | 0.5 | Base chance to flee successfully (50%) |
| `fleeCleanRatio` | 0.6 | Of successful flees, % that are clean escapes (60%) |

Flee has 3 outcomes:
1. **Clean escape** (60% of flee chance) - Exit combat, no damage
2. **Painful escape** (40% of flee chance) - Exit combat, take some damage
3. **Failed escape** (beyond flee chance) - Stay in combat, take more damage

### Player Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `staminaPool` | 4 | Maximum stamina capacity |
| `staminaRegen` | 1 | Stamina recovered per combat turn. Also controls Pale Rations restore amount. |

### Victory Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `victoryBonusPercent` | 50 | Bonus percentage added to stake on victory |

### UI Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `showLeaderboardLink` | false | Show "◈ RANKS" link in top-left of title screen |

The leaderboard link navigates to the RANKS screen. Toggle it on/off from the admin panel under **Settings → UI**.

Example: 0.05 SOL stake with 50% bonus = 0.075 SOL reward on escape.

## Example: Updating Settings

```typescript
import { init, tx, id } from '@instantdb/admin';

const db = init({
  appId: process.env.INSTANT_APP_ID,
  adminToken: process.env.INSTANT_ADMIN_KEY,
});

// Update a setting
await db.transact([
  tx.gameSettings['settings-id'].update({
    criticalChance: 0.2,  // Increase crit chance to 20%
    fleeChanceBase: 0.6,  // Make fleeing easier
  })
]);
```

## Real-time Sync

Settings changes propagate immediately to all connected clients via InstantDB's real-time subscriptions. No restart required.

## Default Fallbacks

If no settings exist in the database, the game uses hardcoded defaults from `DEFAULT_GAME_SETTINGS` in `mobile/lib/instant.ts`.

## Balance Rationale (v1.4.0)

These defaults were derived from gauntlet simulations (persistent HP across rooms, 500–2000 runs each). Key findings:

**Why stamina pool = 4, strike cost = 2**
- Old system (pool 3, cost 1): stamina was net-zero. Regen matched cost — spam Strike every turn, no decisions.
- New system: 2 strikes depletes your pool. Third action must be Brace or Dodge. Creates real pacing.
- Gauntlet sim result: ~60% of runs die by room 5 (as intended). Skilled players who read intent routinely reach room 8+.

**Why intent counter bonus = 1.5×**
- Reading intent needs a mechanical reward, not just flavor.
- Striking into AGGRESSIVE/HUNTING gives a meaningful damage spike.
- Dodging CHARGING counter-attacks — both punish the enemy AND conserve stamina long-term.

**Why erratic cap = 1.3×**
- ERRATIC was one-shotting players at 2× variance with no counter-play.
- 1.3× keeps unpredictability without removing agency.

**Why brace min damage = 6**
- Old brace: effectively free (minimal damage). Turtling was always optimal.
- New brace: guaranteed cost keeps Strike competitive. Recovery, not immunity.

**Why dodge success = 0.65 (down from 0.70)**
- Small nerf to prevent dodge-spam as a dominant strategy.
- Still the best response to CHARGING (counter-attack reward offsets the 35% fail rate).

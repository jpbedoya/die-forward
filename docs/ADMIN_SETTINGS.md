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
| `baseDamageMin` | 15 | Minimum damage per hit |
| `baseDamageMax` | 25 | Maximum damage per hit |
| `tier2Multiplier` | 1.5 | Damage multiplier for Tier 2 enemies |
| `tier3Multiplier` | 2.0 | Damage multiplier for Tier 3 enemies |

Enemy tiers increase with depth:
- Rooms 1-4: Tier 1 (base damage)
- Rooms 5-8: Tier 2 (1.5x damage)
- Rooms 9-12: Tier 3 (2x damage)

### Action Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `dodgeSuccessRate` | 0.7 | Chance to successfully dodge (70%) |
| `braceReduction` | 0.5 | Damage reduction when bracing (50%) |
| `criticalChance` | 0.15 | Chance for critical hit on Strike (15%) |
| `criticalMultiplier` | 1.5 | Damage multiplier on critical hits |

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
| `staminaRegen` | 1 | Stamina recovered per combat turn |

### Victory Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `victoryBonusPercent` | 50 | Bonus percentage added to stake on victory |

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

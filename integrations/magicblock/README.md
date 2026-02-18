# MagicBlock Integration

**Status:** 📋 Planned  
**Test Page:** TBD

## What is MagicBlock?

High-performance infrastructure for real-time Solana games:
- **Ephemeral Rollups (ER):** Zero-fee, real-time transactions
- **Private ERs:** Hidden game state (fog of war)
- **VRF:** Provably fair on-chain randomness
- **BOLT:** Entity Component System framework for on-chain games

- **Docs:** https://docs.magicblock.gg
- **Validators:** Mainnet + Devnet available

## Use Cases for Die Forward

### 1. Real-Time Combat (Ephemeral Rollups)
Currently combat is off-chain → result posted on-chain. With ER:
- Each attack/defend is a real transaction
- Zero fees during combat
- State commits back to Solana on death/victory

```
[Player stakes on Solana]
       ↓
[Delegate to Ephemeral Rollup]
       ↓
[Combat: instant 0-fee txs]
  - attack → damage
  - defend → block
  - flee → escape roll
       ↓
[Commit final state to Solana]
```

### 2. Provably Fair Randomness (VRF)
Currently: Pseudo-random via client seed  
With MagicBlock VRF: On-chain verifiable randomness

- Creature encounters
- Damage rolls
- Loot drops
- Flee success chance

```typescript
// Request VRF
const randomness = await magicblock.vrf.request();

// Use in game logic
const damage = (randomness % maxDamage) + minDamage;
```

### 3. Hidden State / Fog of War (Private ER)
Future feature: Don't reveal what's ahead until player encounters it.
- Creature at next depth hidden until you descend
- Other players can't see your current state
- Reveal on death/victory

### 4. Real-Time Multiplayer (Future)
- PvP duels in ERs
- Co-op dungeon runs
- Racing to depth 10

## Architecture

### Current (Hybrid)
```
Client → InstantDB (game state) → Solana (stake/settle)
```

### With MagicBlock
```
Client → Ephemeral Rollup (combat) → Solana (stake/settle)
              ↓
         VRF (randomness)
```

## Validator Endpoints

**Devnet:**
- US: `devnet-us.magicblock.app`
- EU: `devnet-eu.magicblock.app`  
- Asia: `devnet-as.magicblock.app`

**Mainnet:**
- US: `us.magicblock.app` — `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd`
- EU: `eu.magicblock.app` — `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e`
- Asia: `as.magicblock.app` — `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`

## Implementation Plan

### Phase 1: VRF for Randomness
- [ ] Integrate MagicBlock VRF
- [ ] Replace client-side RNG with on-chain VRF
- [ ] Verifiable damage rolls, loot, encounters

### Phase 2: Ephemeral Combat
- [ ] Delegate staked game to ER on combat start
- [ ] Real-time attack/defend transactions
- [ ] Commit final state on death/victory

### Phase 3: Advanced Features
- [ ] Private ER for hidden encounters
- [ ] Real-time multiplayer

## BOLT Framework (Optional)

Entity Component System for on-chain games:
```rust
// Component
#[component]
pub struct Health {
    pub current: u64,
    pub max: u64,
}

// System
#[system]
pub fn take_damage(health: &mut Health, damage: u64) {
    health.current = health.current.saturating_sub(damage);
}
```

Could restructure Die Forward using BOLT for cleaner on-chain logic.

## Links

- Docs: https://docs.magicblock.gg
- Quickstart: https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart
- BOLT Framework: https://docs.magicblock.gg/pages/tools/bolt/introduction
- VRF: https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs/how-to-guide/quickstart
- Pricing: https://docs.magicblock.gg/pages/overview/additional-information/pricing

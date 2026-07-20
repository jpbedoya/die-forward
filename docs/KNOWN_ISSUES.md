# Known Issues & Limitations

## Security

### Client-Side HP/Inventory (Hackathon-era Limitation)
**Status:** ⚠️ Partly resolved — request auth shipped; combat state itself is still client-authoritative

The original gap ("players can edit localStorage to set HP to arbitrary values, add items, modify stamina") is **narrowed but not eliminated** by the security phase (see `docs/superpowers/specs/2026-07-04-the-shift-design.md`):

- ✅ **Fixed:** every session/game request now carries a verified InstantDB `customToken` (`Authorization: Bearer`, checked server-side via `verifyAuthToken` in `src/lib/auth-server.ts`, fail-closed). Session routes derive the acting identity from that token — a body-supplied `authId`/`walletAddress` can never touch a balance-affecting op (`death`/`victory`/`advance` reject a token whose `authId` mismatches the session's — `sessionAuthMismatch`).
- ✅ **Fixed:** Coin-Bound (Pale Coins) earn/spend is gated on token-verified provenance (`session.authVerified`) in `src/app/api/session/death/route.ts` and `.../victory/route.ts` — an unverified session grants **zero** coin delta even if the client reports a win.
- ✅ **Fixed:** `instant.perms.ts` denies direct client writes to `gameSettings`/`runReceipts`/`sessions`/`worldShifts` by default (view-only); `reports` is create-only. Admin writes go through authenticated + admin-gated `/api/admin/settings` (+ `/admin/bestiary`, `/admin/content`).
- ❌ **Still open:** in-run combat math (HP, stamina, inventory contents) is still computed and held client-side during a run; nothing server-side re-derives or signs individual combat turns. A modified client can still fake HP/inventory state for the run's duration — the fix above stops that state from being *laundered into money or coins* server-side, but doesn't stop the client from lying about it to itself.

**Remaining KNOWN residuals (grief-only on devnet, must close before coins/stakes carry real value):**
- **A5:** `walletAddress`-based sybil keying — nothing yet stops one person operating many wallets to farm coin earn.
- **`players` perms:** no ownership check — any authenticated client can currently write another player's `paleCoins` row directly (perms allow authed writes to `players`, not scoped to the caller's own row).
- **`CRON_SECRET`:** the `/api/session/cleanup`, `/api/game/shift`, and `/api/game/dispatch` cron routes accept requests unguarded (with a console warning) when `CRON_SECRET` is unset. **Must be set before prod launch.**
- **Admin settings whitelist gap:** several `gameSettings` fields are read at runtime but are **not** in `KNOWN_SETTINGS_KEYS` (`src/lib/settings-validation.ts`), so they can't be edited via the authenticated `/api/admin/settings` route at all (only fixable by direct DB edit): `ugcMinAccountAgeDays` and `ugcReportThreshold` (read in `src/app/api/game/shift/route.ts`), and `baitCost` (read in `mobile/app/combat.tsx` / defaulted in `mobile/lib/instant.ts`). (`curseNodeThreshold` and `apexMinKills` ARE already in the whitelist — verified present.)
- SOL payout address is still body-supplied on `session/start` (bound on-chain by the stake tx itself, so this is not an independent risk).

### What IS Protected
- ✅ Room progression (server-tracked)
- ✅ Victory requires completing all rooms (server-verified)
- ✅ Double-claim prevention (session status check)
- ✅ Stake amounts validated server-side
- ✅ Death hash verified on-chain (browser wallet flow)
- ✅ Request identity (verified InstantDB token, fail-closed) — see above
- ✅ Coin earn/spend gated on verified auth — see above
- ✅ `gameSettings`/`runReceipts`/`sessions`/`worldShifts` deny-by-default via `instant.perms.ts`

---

## Staking Flows

### AgentWallet Stakes Are Custodial
**Status:** Known limitation, architectural — narrower in scope now that Pale Coins exist as a non-custodial alternative

AI agents using AgentWallet cannot sign arbitrary Solana transactions. `src/app/api/agent/start/route.ts` still only supports `stakeMode: 'agentwallet'` (custodial SOL transfer via the AgentWallet API) or `'free'` — it does **not** yet support Coin-Bound (Pale Coins) mode:
- ❌ Can't use on-chain escrow program for SOL stakes
- ❌ SOL stakes go to game pool wallet (custodial)
- ❌ Payouts issued by server, not smart contract
- ❌ Agent routes are session-id-gated but currently **grant no Pale Coins** either (no `verifyAuthToken`/`authVerified` path wired into `agent/start` — coin earn requires a verified InstantDB token per the security-phase model, which API-token-based agent clients don't present)

**Impact:** Agent players choosing a real SOL stake must trust the game operator for that stake. Browser wallet users get full trustless escrow. Since The Shift, this is no longer the *only* staking-related gap for agents — the bigger practical limitation is that agents can't participate in the Coin-Bound rung (Pale Coins) at all, custodial or not, because it's gated on the browser-wallet/InstantDB auth flow.

**Why:** AgentWallet API only supports simple transfers, not complex transaction signing; Pale Coins earn is intentionally gated on verified auth to prevent balance forgery, and agent sessions don't carry that token today.

**Future Fix:** If AgentWallet adds `signTransaction()` support, agents could use the same escrow flow as browser wallets. Separately, wiring a token-verified auth path for agent sessions (or an equivalent server-trusted identity check) would let agents earn Pale Coins without custodial SOL at all — likely the more valuable fix given the Offering Ladder's Unbound/Coin-Bound/Blood-Bound design.

**See:** `docs/STAKING_FLOWS.md` for full comparison of staking modes.

### Pool Funding Requirement
**Status:** Operational consideration

The on-chain escrow pays victory bonuses (50%) from the pool. If the pool is underfunded:
- Winners may not receive full bonus
- Pool needs seeding or deaths to accumulate funds

**Mitigation:** Pool receives all death stakes (95% after fee). As long as win rate stays below ~67%, pool remains solvent.

### On-Chain Escrow Status
**Status:** ✅ Working (verified Feb 13, 2026)

The Anchor escrow program is live on devnet and handling real transactions:
- Stakes deposited to PDAs
- 5% fee collected on stake
- Victory payouts from pool
- Death verification via Memo program

---

## Gameplay

### Enemy Balance
**Status:** Needs tuning

Some enemy + intent combinations may be too punishing or too easy. Combat balance is based on limited playtesting.

### Depth Progression
**Status:** Working as designed

Later depths (Flooded Halls, Bone Gardens) are significantly harder. This is intentional — clear rate should be ~10-15%.

### activeTitle / activeBorder Not Rendered
**Status:** Known gap (Phase 1) — still open, verified July 2026

`activeTitle` (e.g., "The Persistent", "The Undying") and `activeBorder` (e.g., bone frame) are still stored on the player record when death milestones are unlocked (`mobile/lib/instant.ts`), but no `.tsx` screen reads either field — checked `mobile/app/death.tsx`, `mobile/app/victory.tsx`, `mobile/lib/shareCard.tsx`, and the play screen; none render `activeTitle`/`activeBorder`.

**Impact:** Death milestone cosmetics are still effectively invisible to the player.

**Fix:** Read `activeTitle` and `activeBorder` from the player record on death screen, victory screen, and share card generation.

### Modifier Badge Missing from Combat Screen
**Status:** Known gap (Phase 1) — still open, verified July 2026

The run modifier badge/row is present on the play screen (`mobile/app/play.tsx`, "Zone name + modifier row", `game.currentModifier` + `modifierExpanded`), but `mobile/app/combat.tsx` has no equivalent — it applies modifier *effects* (e.g. `modifierBraceNegatesAll`, `modifierHidesFirstIntent`, `getModifiedDamageBonus`) but never renders a badge. Players may still forget their active modifier during fights.

**Impact:** Minor UX issue — modifier effects still apply correctly, just not labeled on the combat screen.

**Fix:** Add a modifier badge to the combat screen header alongside enemy tier/intent display.

---

## Technical

### InstantDB Real-Time
**Status:** Working, occasional lag

Corpse discovery and death feed use InstantDB's real-time queries. Occasionally there's 1-2s lag on updates.

### Mobile Wallet Adapter
**Status:** Partial support

Works with Phantom mobile browser. Deep-link flow may have issues with some wallet apps.

---

## Not Bugs (By Design)

| Behavior | Reason |
|----------|--------|
| Can't pause mid-run | Roguelite design — commitment matters |
| Corpses disappear after discovery | One-time content, encourages re-runs |
| No HP recovery between rooms (base) | Roguelite resource management — cache rooms provide the only healing |
| Final message is permanent | Core mechanic — death = content |
| Stake is locked until run ends | Prevents gaming the system |
| Death's Mantle consumed on save | Intentional — legendary items shouldn't be indefinitely reusable |
| Voidblade deals -5 HP/turn | Intentional tradeoff — high risk/reward legendary |

---

## Recently Resolved (The Shift, verified July 2026)

### Wallet-Auth Player Lookup Silently Broken for Mixed-Case Addresses
**Status:** ✅ Fixed (2026-07-19)

`useCurrentPlayer()` (`mobile/lib/instant.ts`) derives the player-lookup `authId` by stripping the domain off the InstantDB auth session's `user.email` (e.g. `<address>@wallet.dieforward.com`). InstantDB lowercases that email, but Solana wallet addresses are case-sensitive base58, so the derived `authId` never matched the mixed-case `authId` written to the player row at link-wallet time. An exact-match `where: { authId }` query silently returned no player for any wallet address containing an uppercase letter — a DB audit found **15 of 19 wallet-type player rows (79%)** affected. This had existed since the email-derivation logic was added (2026-03-23) but only became user-visible once two independent recent changes started depending on `player` actually resolving: the stake screen's `stakingPosture: 'ritual'` gating (`totalDeaths >= 3` threshold, reads `player?.totalDeaths ?? 0`) and the new Settings modal's DISPATCHES (notification opt-in) section.

Fix: indexed `players.authId` and gave it an enforced `string` type in the live InstantDB schema (`src/instant.schema.ts`, pushed via `instant-cli push schema`) so `useCurrentPlayer()` can use a case-insensitive `$ilike` match instead of exact-match. No data migration — `walletAddress` and the original-case `authId` values are untouched; only the schema's index/type metadata changed.

### Sunken Crypt Explore Rooms — Tertiary Option Fallback Text
**Status:** ✅ Fixed

49 of 50 Sunken Crypt explore room variations (`mobile/lib/zones/sunken-crypt.json` and all 6 locale variants) had only 2 authored options; the UI's always-present 3rd "observe carefully" choice fell back to a generic `play.observeCarefully` string for all of them.

Fix: authored a bespoke 3rd option for every variation, each tied to a concrete detail in that variation's own narrative text, in English and translated across all 6 locales (es/ja/ko/pt-BR/vi/zh-TW) — the generic fallback is no longer reachable from Sunken Crypt.

### Void Salt Damage Bonus Not Wired (Phase 1)
**Status:** ✅ Fixed

`voidSaltBonus` was set on item effects but never applied to damage, and no BESTIARY creatures had an `aquatic` tag.

Fix: `getTagDamageBonus` in `mobile/lib/content.ts` (`if (effects.voidSaltBonus && creatureTags.includes('aquatic')) bonus += 0.4;`) is now called from `mobile/app/combat.tsx` (`tagDamageBonus: isPlayerAttacking ? getTagDamageBonus(itemEffects, creatureTags) : 0`), and multiple BESTIARY creatures carry `tags: ['aquatic', ...]` in `content.ts`.

### Zone-Aware Depth Names Not Surfaced (Phase 1)
**Status:** ✅ Fixed

The play screen always showed Sunken Crypt depth names regardless of active zone.

Fix: `mobile/app/play.tsx` now computes `const depth = getZoneDepth(loadZone(game.zoneId), roomNumber);` (comment in source: "Zone-aware depth display — bug fix: getDepthForRoom used hardcoded sunken-crypt values for every zone, mislabeling non-sunken depths"), backed by `getZoneDepth`/`loadZone` in `mobile/lib/zone-loader.ts`.

---

## Recently Resolved (Feb–Mar 2026)

### Run Modifier Not Applied to Healing (Phase 1)
**Status:** ✅ Fixed

Healing was applied inconsistently — cache room heals, Herbs usage, and combat heals each had their own logic. Blood Pact's -30% healing reduction was not applied in all cases.

Fix: All healing routes through `applyHealing(amount)` in GameContext. Blood Pact modifier applied at that single choke point.

### Combat Randomness Not Seeded (Phase 1)
**Status:** ✅ Fixed

Creature HP and intent were using `Math.random()`, producing inconsistent results and allowing potential manipulation.

Fix: `getCreatureHealthSeeded` and `getCreatureIntentSeeded` now use seeded RNG derived from `seed + '-gameplay'` sub-seed. All combat is deterministic and reproducible from the run seed.

### Nickname Mismatch — Death Echoes vs. Toll (Feb 21)
**Status:** ✅ Fixed

Root cause: `recordDeathAction` in `GameContext.tsx` built `playerName` from the wallet address format (`Ab12...ef34`) instead of `state.nickname`.

Fix: `playerName = state.nickname || walletAddressFormat || 'Wanderer'`; added `state.nickname` to `recordDeathAction` dependency array.

### Nickname Prompt Shown Repeatedly (Empty-Handed) (Feb 21)
**Status:** ✅ Fixed

Root cause: On guest auth, `syncNickname` was passing the local nickname to `getOrCreatePlayerByAuth` which could overwrite a fresh guest DB record; combined with a logic bug, the prompt was shown even when a name was already set.

Fix: Separated wallet vs. guest sync paths explicitly. Guest path: only prompts if no local name AND never prompted before.

### Nickname Not Updating on Wallet Bind (Feb 21)
**Status:** ✅ Fixed

Root cause: `signInWithWallet()` (which triggers `syncNickname`) was only called inside `handleStake()`, not on wallet connect. DB nickname wasn't loaded until user tapped SEAL YOUR FATE.

Fix: Added `useEffect` in `GameContext` that auto-authenticates when `unifiedWallet.connected` becomes true. DB nickname loads immediately on wallet bind.

### Nickname Surviving Logout (Feb 21)
**Status:** ✅ Fixed

Root cause: `syncNickname` awaits a DB call. If logout fires during that await, the DB result wrote back over the freshly cleared state (stale async closure).

Fix: Added `cancelled` cleanup flag to `syncNickname` useEffect. `disconnect()` now also does a full reset: clears `AsyncStorage` keys for nickname, prompted flag, and guest progress — not just auth state.

### Android Stake Screen Crash (`.map` of undefined)
**Status:** ✅ Fixed

Root cause: MWA provider context value omitted `connectors`, so stake screen attempted `.map()` on undefined.

Fix: Added `connectors: []` and `connectTo` to native MWA context value.

### Native Wallet Connect No-Op
**Status:** ✅ Fixed

Root cause: `mwa-provider.tsx` used a private context instance, while `GameContext` read from `unified.tsx` context.

Fix: Exported shared `UnifiedWalletContext` from `unified.tsx`; native provider now writes to same context consumed by game state.

### Audio Not Starting on Title/Victory
**Status:** ✅ Fixed

Root cause: `playAmbient()` called before native audio module init completed.

Fix: Added `audioReady` gating in title and victory `useEffect` hooks.

### Free Mode Showing Claim Rewards
**Status:** ✅ Fixed

Root cause: free mode runs were persisting selected stake amount instead of zero.

Fix: In `startGame`, demo/free mode now stores `stakeAmount: 0`.

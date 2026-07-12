# Die Forward Test Plan

## Quick Links
- **Production:** https://play.dieforward.com
- **API:** https://www.dieforward.com/api/
- **InstantDB:** https://instantdb.com (check deaths, sessions, corpses)

---

## 🔥 Smoke Test (2 min)

Run after every deploy. Should pass before announcing anything.

| # | Test | Expected | ✓ |
|---|------|----------|---|
| 1 | Load play.dieforward.com | Splash screen with ASCII logo | |
| 2 | Tap to enter | Main menu loads (START GAME, FREE PLAY) | |
| 3 | Click FREE PLAY | Toll/stake screen loads (Unbound / Coin-Bound / Blood-Bound per `stakingPosture`) | |
| 4 | Click FREE PLAY (No Stake / Unbound) | Game starts, branching map view loads at depth 1 | |
| 5 | Press forward along an edge | Depth counter increments, next node's options render | |
| 6 | If combat: Enter + Strike once | Combat resolves, damage numbers show | |

**Pass criteria:** All 6 steps work without errors.

---

## 🧪 End-to-End Test (15 min)

Full playthrough testing all features.

### Phase 1: Navigation
| Test | Steps | Expected |
|------|-------|----------|
| Splash screen | Load site | ASCII logo + "TAP TO ENTER" |
| Main menu | Tap splash | Title, tagline, all buttons visible |
| Pool stats | Check stats area | Shows "◎ ... SOL Staked" and "💀 ... Total Deaths" |
| Leaderboard link | Click 🏆 Leaderboard | Leaderboard page loads |
| Feed link | Click 💀 Feed | Death feed page loads |
| Back navigation | Click ← BACK | Returns to previous screen |

### Phase 2: The Offering Ladder (staking)
| Test | Steps | Expected |
|------|-------|----------|
| Unbound | Click FREE PLAY (No Stake) | Game starts, offline-capable, no currency/leaderboard writes |
| Coin-Bound amount selection | At the Toll, pick a Pale Coin stake (60 / 120 / 240) | Amount updates, bonus recalculates (`coinBonusPercent`, default 50%, pool-capped) |
| Coin-Bound requires auth | Attempt coin-mode `session/start` without a signed-in wallet/token | Rejected — coin mode requires a verified InstantDB token, never a body-supplied `authId` |
| Coin earn on descent | Descend several depths in a Coin-Bound run | `paleCoins` balance increases per `computeCoinEarn` (concave `floor(4·√min(depth,13))` + clear bonuses) |
| Death burns stake | Die in a Coin-Bound run | Stake is burned into `coinPool`; `bindingStreak` resets to 0 |
| Escape returns stake + bonus | Clear a Coin-Bound run | Stake returned + `coinBonusPercent` bonus (pool-capped); `bindingStreak` increments |
| Binding Streak seal tiers | Chain 3 / 7 / 15 consecutive Coin-Bound clears | Public seal tier advances (tiers 0/1/2/3) |
| Blood-Bound visibility | Check Toll screen under different `stakingPosture` admin settings (hidden/ritual/open) | SOL staking UI is shown/hidden accordingly |
| Blood-Bound amount selection | Click ◎ 0.1 (when posture allows SOL staking) | Amount updates, bonus recalculates |
| Custom amount | Type 0.15 | Custom amount shows in summary |
| Victory bonus | Check calculation | Shows configured `victoryBonusPercent` of stake amount |

### Phase 3: Branching Map Navigation
| Test | Steps | Expected |
|------|-------|----------|
| Map generation | Start game | Node-graph map renders at depth 1 (zone graphs are 20–23 nodes; each zone's dungeon spans 13 canonical depth tiers) |
| Depth indicator | Check header | Shows current zone tier, e.g. "◈ THE UPPER CRYPT" for zone 1 (Sunken Crypt), depths 1–4 |
| Edge advance | Click an edge to descend | `currentRoom` (1-based depth projection) increments by exactly 1; next node's options render |
| Multiple edges | Reach a branch node | More than one descent edge is offered; each leads to a different node/encounter |
| Side chamber (gated) | Reach a node with a `side: true` branch behind a `gate: { item, consumes }` | Branch is only enterable while holding the required item; item is consumed on entry |
| Bone Dust reveal | Use Bone Dust (`codex.items.consumable.boneDust`) near a branch | Branch types are revealed before committing (consumable) |
| Explore room | Find explore-type node | Single option: "Press forward" |
| Corpse room | Find corpse-type node | Purple message + "Search body" option |
| Cache room | Find cache-type node | "Take supplies (+30 HP)" option |
| Looting | Search corpse | Item added to inventory (🎒) |
| Healing | Take supplies | HP increases (capped at 100) |
| Daily world shift | Reload on two different UTC days with `dailyShiftEnabled` on | Modifier-choice pool differs per day; some map edges/side doors are masked, deterministically per zone/day |
| World shift off | Toggle `dailyShiftEnabled` off in `/admin` | Map falls back to the unmodified seeded layout |

### Phase 4: Combat
| Test | Steps | Expected |
|------|-------|----------|
| Combat entry | Click "Enter combat" | Combat screen loads |
| Enemy display | Check enemy card | Name, emoji, tier, HP bar |
| Enemy intent | Check intent box | Shows intent description |
| Strike | Click Strike | Both take damage, narrative shows |
| Dodge (success) | Click Dodge | "No damage" or reduced damage |
| Brace | Click Brace | Reduced incoming damage |
| Flee (success) | Click Flee | Returns to play screen, advances room |
| Stamina cost | Use actions | Stamina decreases, regenerates next turn |
| Victory | Kill enemy | Returns to play, advances to next room |

### Phase 5: Combat Mechanics
| Test | Steps | Expected |
|------|-------|----------|
| CHARGING intent | Wait for charge | Shows "⚠️ CHARGING — DOUBLE damage next turn!" |
| Double damage | Get hit while charging | Damage is ~2x normal |
| STALKING intent | Check flee | Shows "harder to escape" |
| HUNTING intent | Check damage | Shows "deals bonus damage" |
| Item damage bonus | Have Rusty Blade | Strike damage increased |
| Tier scaling | Reach Tier 2/3 rooms | Enemies hit harder |

### Phase 6: Death Flow
| Test | Steps | Expected |
|------|-------|----------|
| Death trigger | HP reaches 0 | Death screen loads |
| Death info | Check death screen | Shows killer, zone/depth, node, stake lost (coin burn or SOL loss depending on rung) |
| Final words input | Type message | Text appears in input |
| Submit death | Click "LEAVE YOUR MARK" | Confirmation message shows; `runReceipts` gets a record (`runSeed`, `dayKey`, `dailyShiftEnabled`, `chosenModifierId`, `finalMessage`, `outcome`, `coinDelta`, `streakAfter`, ...) |
| Cross-account rejection | Replay a `death` call with a valid token whose `authId` differs from the session's | Rejected — `sessionAuthMismatch` guards against acting as another account |
| Share button | After submit | "📤 SHARE DEATH CARD" appears |
| Descend again | Click button | Returns to the Toll/stake screen |

### Phase 7: Victory Flow
| Test | Steps | Expected |
|------|-------|----------|
| Exit node | Reach the zone's final depth | "🌟 Ascend to victory!" option |
| Victory trigger | Click ascend | Victory screen loads |
| Victory info | Check screen | Shows stats, reward amount (SOL bonus or coin stake + `coinBonusPercent`) |
| Cross-account rejection | Replay a `victory` call with a mismatched token authId | Rejected — same `sessionAuthMismatch` guard as death |
| Share button | Check options | "📤 SHARE VICTORY CARD" appears |

### Phase 8: Depths Progression (per zone)
| Test | Steps | Expected |
|------|-------|----------|
| Tier 1 (depths 1-4) | Check header, zone 1 (Sunken Crypt) | "THE UPPER CRYPT" |
| Tier 2 (depths 5-8) | Check header, zone 1 | "THE FLOODED HALLS" |
| Tier 3 (depths 9-12) | Check header, zone 1 | "THE ABYSS" |
| Boss node | Final depth of the zone | Boss warning + zone boss |
| Zone unlock progression | Clear a zone | Next zone (of 5: sunken-crypt, ashen-crypts, frozen-gallery, living-tomb, void-beyond) becomes available, locale-aware content loads |
| Apex creature buff | Encounter the community-flagged apex creature for the day | +15% HP/damage buff applied (`applyApexBuff`); bounty (bonus loot roll + bestiary-mastery credit) on kill |
| Curse node | Reach a node flagged as a mass-death curse node | Curse presentation/effect appears (threshold-gated via `curseNodeThreshold`, default 10) |
| Architect node | Reach the single deadliest node of the day | Architect wall inscription shows a moderated `@nickname: words` excerpt |
| Echo Husk recital | Encounter an Echo Husk (Repeating signature rule) | Recites a moderated phrase sourced from `runReceipts.finalMessage` |

### Phase 9: Cartographer Dispatches + Notifications
| Test | Steps | Expected |
|------|-------|----------|
| Home dispatch panel | Load home screen | Dispatch renders via shared `renderDispatch` pipeline |
| Zone-select dispatch | Open zone select | Same dispatch content appears there too |
| Scarcity registers (F7) | Observe dispatch across multiple days | Rotates banner/ambient/silent presentation across warning/lament/invitation registers; no push on quiet days |
| First-death opt-in | Die for the first time | Diegetic push-notification opt-in prompt appears; nothing is gated on granting/denying permission |
| Push delivery (manual/backend) | Trigger `/api/game/dispatch` cron with a test `pushToken`/`timezone`/`notifOptIn=true` player | `selectFanoutRecipients` includes the player; push arrives once per day, at local morning, English-only body |
| Opt-out respected | Set `notifOptIn=false` | Player excluded from fan-out |

### Phase 10: UGC Moderation (A2)
| Test | Steps | Expected |
|------|-------|----------|
| Filter — obfuscation | Submit a `finalMessage` using leet-speak/homoglyphs to slip through the block-list | Server-side filter (NFKC + Cyrillic/Greek homoglyph fold + leet normalization) still catches it |
| Filter — URLs | Submit a message with a generic-TLD URL or handle-like link | Blocked |
| Trust weighting | Submit as a new (< `ugcMinAccountAgeDays`, default 3) unstaked, non-wallet-authed account vs. an established one | New/unknown-author messages are treated fail-closed (more conservative) |
| Report threshold | Report the same corpse/message from `ugcReportThreshold` (default 2) distinct accounts | Message becomes suppressed |
| Report auth | Call `/api/moderation/report` unauthenticated | Rejected (auth-only create) |
| Report client-text ignored | Submit a report with a spoofed target/text in the body | Server looks up the real target server-side; client-supplied text is not trusted |
| Corpse display filtering | View a corpse whose `finalMessage` was moderated/suppressed | Client-side mirror filter renders `t('corpse.redacted')` ("The words are lost to rot.") instead |
| Home feed / feed screen filtering | Browse home feed and the dedicated feed screen | Same client-side redaction applies to any surface showing another player's `finalMessage` |

---

## 🔒 Internal Test (Backend Verification)

*For Pisco/developers only - requires API/DB access*

### API Health
```bash
# Session start (Unbound / demo — no token required)
curl -X POST https://www.dieforward.com/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"test123","stakeAmount":0.05,"demoMode":true}'
# Expected: {"success":true,"sessionToken":"...","zone":"THE SUNKEN CRYPT"}

# Session start — Coin-Bound WITHOUT a token (should be rejected)
curl -X POST https://www.dieforward.com/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"stakeMode":"coins","stakeAmount":60}'
# Expected: 401/error — coin mode requires a verified Authorization: Bearer <customToken>

# Session start — Coin-Bound WITH a token
curl -X POST https://www.dieforward.com/api/session/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customToken>" \
  -d '{"stakeMode":"coins","stakeAmount":60}'
# Expected: {"success":true,"sessionToken":"..."}; session.authVerified === true

# Session advance
curl -X POST https://www.dieforward.com/api/session/advance \
  -H "Content-Type: application/json" \
  -d '{"sessionToken":"TOKEN_FROM_ABOVE","fromRoom":1}'
# Expected: {"success":true,"currentRoom":2}

# Cross-account rejection on death/victory
curl -X POST https://www.dieforward.com/api/session/death \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token for a DIFFERENT account than the session>" \
  -d '{"sessionToken":"TOKEN_FROM_ABOVE", ...}'
# Expected: rejected via sessionAuthMismatch (token authId != session.authId)

# World shift (public read)
curl https://www.dieforward.com/api/game/shift
# Expected: 200, current day's worldShifts doc (apex/curse/architect fields)

# Game settings (public read)
curl https://www.dieforward.com/api/game/settings
# Expected: 200, current gameSettings (dailyShiftEnabled, stakingPosture, coinBonusPercent, etc.)

# Moderation report — unauthenticated (should be rejected)
curl -X POST https://www.dieforward.com/api/moderation/report \
  -H "Content-Type: application/json" \
  -d '{"targetType":"corpse","targetId":"..."}'
# Expected: 401 — report creation is auth-only

# Admin settings — unauthenticated/non-admin (should be rejected)
curl -X POST https://www.dieforward.com/api/admin/settings \
  -H "Content-Type: application/json" \
  -d '{"dailyShiftEnabled":false}'
# Expected: 401/403 — requires verifyAuthToken + isAdminAuthId; coinPool is never writable via this route

# Dispatch/aggregation crons (require CRON_SECRET in prod)
curl -X POST https://www.dieforward.com/api/game/shift -H "x-cron-secret: $CRON_SECRET"
curl -X POST https://www.dieforward.com/api/game/dispatch -H "x-cron-secret: $CRON_SECRET"
# Expected: 200; both also accept GET (Vercel Cron compatibility)
```

### InstantDB Checks
After a death, verify in InstantDB:
- [ ] New record in `Death` table
- [ ] `finalMessage` contains player's words (raw, pre-moderation, if author's own account)
- [ ] `killedBy` matches enemy name
- [ ] `room`/`currentRoom` matches death depth
- [ ] Zone matches current zone name
- [ ] New `runReceipts` record with matching `runSeed`, `dayKey`, `dailyShiftEnabled`, `chosenModifierId`, `outcome`, `coinDelta`, `streakAfter`
- [ ] `Player.paleCoins`/`bindingStreak`/`bestBindingStreak` updated only when `session.authVerified === true`
- [ ] `reports` namespace: view/update/delete denied by default; only authenticated `create` succeeds
- [ ] `worldShifts` namespace: deny-by-default, written only by the nightly aggregation cron

### CORS Verification
```bash
curl -I -X OPTIONS "https://www.dieforward.com/api/session/start" \
  -H "Origin: https://play.dieforward.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: 200 with Access-Control-Allow-Origin: *
```

### Creature Consistency
1. Note enemy name in play screen preview (e.g., "🐺 The Hunched blocks...")
2. Enter combat
3. Verify combat screen shows SAME enemy name and emoji

### Audio Loading (Dev Mode)
```bash
# Verify audio files accessible
curl -I https://dieforward.com/audio/strike-hit.mp3
# Expected: 200 OK
```

---

## 👥 External Test Script

*For friends and agents - copy/paste friendly*

---

### DIE FORWARD PLAYTEST 🎮💀

**URL:** https://play.dieforward.com

Thanks for testing! Please play through and report any issues.

#### Quick Start
1. Go to https://play.dieforward.com
2. Tap the screen to enter
3. Click "🎮 FREE PLAY (Demo)" 
4. Click "🎮 FREE PLAY (No Stake)"
5. Play until you die or win!

#### What to Test
- [ ] Does the game load properly?
- [ ] Can you navigate the branching map — do choices at a fork lead somewhere different?
- [ ] Did you find a side chamber (needs an item like Bone Dust to open)?
- [ ] Does combat work? (Strike, Dodge, Brace, Flee, Bait)
- [ ] Do enemies have different behaviors (signature rules — rupture, blink, drain, etc.)?
- [ ] Can you pick up items from corpses?
- [ ] When you die, can you leave final words?
- [ ] Does your HP/stamina display correctly?
- [ ] If you tried Coin-Bound (Pale Coins) staking, did the stake and streak behave as expected?
- [ ] Did you see a daily dispatch/message on the home screen or zone select?
- [ ] Did you ever see another player's death message on a corpse or in the feed? Was it ever obviously redacted/filtered?

#### Please Report
1. **Browser:** (Chrome/Safari/Firefox/etc)
2. **Device:** (Desktop/Mobile/Tablet)
3. **Any errors:** (screenshot if possible)
4. **Where you died:** (Room number + enemy)
5. **Anything confusing:** (unclear UI, weird behavior)
6. **Fun factor:** (1-10, honest feedback!)

#### Bonus Tests (if you have time)
- [ ] Try the Leaderboard (🏆)
- [ ] Check the Death Feed (💀)
- [ ] Play multiple runs - is it fun to retry?
- [ ] Does dodging feel useful?
- [ ] Are enemy intents clear?

#### Known Issues
- Death feed may load slowly
- Audio requires user interaction first (browser policy)
- No wallet connection in demo mode

**Report issues to:** [your contact method]

---

## 🐛 Bug Report Template

```
**Summary:** [One line description]

**Steps to reproduce:**
1. 
2. 
3. 

**Expected:** [What should happen]

**Actual:** [What actually happened]

**Environment:**
- URL: play.dieforward.com
- Browser: 
- Device: 
- Room #: 

**Screenshot:** [if applicable]
```

---

## 📊 Test Coverage Matrix

| Feature | Smoke | E2E | Internal | External |
|---------|-------|-----|----------|----------|
| Page load | ✓ | ✓ | | ✓ |
| Navigation | ✓ | ✓ | | ✓ |
| Free play (Unbound) start | ✓ | ✓ | ✓ | ✓ |
| Coin-Bound staking + streak | | ✓ | ✓ | ✓ |
| Coin-mode auth requirement | | | ✓ | |
| Cross-account rejection (death/victory) | | ✓ | ✓ | |
| Blood-Bound staking / posture | | ✓ | | |
| Branching map / DAG navigation | ✓ | ✓ | | ✓ |
| Side chambers (item-gated) | | ✓ | | ✓ |
| Bone Dust branch reveal | | ✓ | | |
| Daily world shift | | ✓ | ✓ | |
| Combat - basic | ✓ | ✓ | | ✓ |
| Combat - all actions incl. Bait | | ✓ | | ✓ |
| Combat - intents | | ✓ | ✓ | |
| Creature signature rules | | ✓ | ✓ | ✓ |
| Creature consistency | | ✓ | ✓ | |
| Looting | | ✓ | | ✓ |
| Death flow / runReceipts | | ✓ | ✓ | ✓ |
| Victory flow | | ✓ | | |
| API health | | | ✓ | |
| CORS | | | ✓ | |
| InstantDB writes | | | ✓ | |
| Depths progression | | ✓ | | |
| Boss fight | | ✓ | | |
| Apex buff + bounty | | ✓ | | |
| Curse / Architect nodes | | ✓ | | |
| Cartographer dispatch + push opt-in | | ✓ | ✓ | ✓ |
| A2 moderation (filter/trust/report) | | ✓ | ✓ | |
| Corpse/feed redaction display | | ✓ | | ✓ |
| Leaderboard | | ✓ | | ✓ |
| Death feed | | ✓ | ✓ | ✓ |

---

## ✅ Automated Test Suites

These are the actual regression suites — run before/after any change and cite these numbers, not stale ones, when reporting coverage.

```bash
# Web (root) — combat math, coins, moderation, auth-server, settings validation,
# zone mechanics, world-shift aggregation, dispatch-fanout, payout, agent-combat
npm test
# 10 suites / 229 tests, all passing (verified 2026-07-11)

# Mobile — creature rules/synergies, dungeon/zone-graph generation & traversal,
# corpse adjacency, i18n (660 keys × 7 locales), milestones, modifiers, stake
# posture/intent, escrow, dispatch, notifications, bestiary mastery, gate UI,
# seeded RNG, stamina defaults, item tags, world shift
cd mobile && npm test
# 31 suites / 362 tests, all passing (verified 2026-07-11)
```

Notable suites for The Shift specifically (non-exhaustive):
- `src/lib/__tests__/coins.test.ts` — Pale Coin earn curve, stake burn/return math
- `src/lib/__tests__/auth-server.test.ts` — `verifyAuthToken`, `sessionAuthMismatch`
- `src/lib/__tests__/moderation.test.ts` — filter, homoglyph/leet normalization, trust weighting
- `src/lib/__tests__/world-shift-agg.test.ts` — nightly aggregation (apex/curse/architect)
- `src/lib/__tests__/dispatch-fanout.test.ts` — `selectFanoutRecipients` opt-in/timezone gating
- `mobile/lib/__tests__/zone-graph.test.ts`, `traversal.test.ts`, `dungeon.test.ts` — DAG generation/validation, side chambers
- `mobile/lib/__tests__/stake-posture.test.ts`, `stake-intent.test.ts`, `escrow.test.ts` — Offering Ladder / SOL escrow
- `mobile/lib/__tests__/modifier-choice.test.ts` — daily modifier pool
- `mobile/lib/__tests__/dispatch.test.ts`, `notifications.test.ts` — dispatch rendering, push scaffolding
- `mobile/lib/__tests__/i18n.test.ts` — locale key-parity across all 7 locales

These automated suites cover math/logic; the manual phases above still own live UI, live API, and cross-service (InstantDB/Vercel/push) verification.

---

## 🚀 Pre-Deploy Checklist

Before deploying new features:

- [ ] Run smoke test on staging/preview
- [ ] Run relevant E2E tests for changed features
- [ ] Check browser console for errors
- [ ] Test on mobile viewport
- [ ] Verify API endpoints respond
- [ ] Check InstantDB connection

After deploy:

- [ ] Run smoke test on production
- [ ] Verify new feature works
- [ ] Monitor for errors (Vercel logs)
- [ ] Do one full playthrough

---

*Last updated: 2026-07-11*
*Maintainer: Pisco 🐵*

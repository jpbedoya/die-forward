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
| 3 | Click FREE PLAY | Stake screen loads | |
| 4 | Click FREE PLAY (No Stake) | Game starts, Room 1/13 loads | |
| 5 | Press forward | Room 2 loads (check room counter) | |
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

### Phase 2: Staking
| Test | Steps | Expected |
|------|-------|----------|
| Amount selection | Click ◎ 0.1 | Amount updates, bonus recalculates |
| Custom amount | Type 0.15 | Custom amount shows in summary |
| Victory bonus | Check calculation | Shows 50% of stake amount |
| Free Play | Click FREE PLAY (No Stake) | Game starts without wallet |

### Phase 3: Exploration
| Test | Steps | Expected |
|------|-------|----------|
| Room generation | Start game | Room 1/13 shows, narrative loads |
| Depth indicator | Check header | Shows "◈ THE UPPER CRYPT" |
| Room advance | Click "Press forward" | Room counter increments |
| Explore room | Find explore room | Single option: "Press forward" |
| Corpse room | Find corpse room | Purple message + "Search body" option |
| Cache room | Find cache room | "Take supplies (+30 HP)" option |
| Looting | Search corpse | Item added to inventory (🎒) |
| Healing | Take supplies | HP increases (capped at 100) |

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
| Death info | Check death screen | Shows killer, depth, room, stake lost |
| Final words input | Type message | Text appears in input |
| Submit death | Click "LEAVE YOUR MARK" | Confirmation message shows |
| Share button | After submit | "📤 SHARE DEATH CARD" appears |
| Descend again | Click button | Returns to stake screen |

### Phase 7: Victory Flow
| Test | Steps | Expected |
|------|-------|----------|
| Exit room | Reach room 13 | "🌟 Ascend to victory!" option |
| Victory trigger | Click ascend | Victory screen loads |
| Victory info | Check screen | Shows stats, reward amount |
| Share button | Check options | "📤 SHARE VICTORY CARD" appears |

### Phase 8: Depths Progression
| Test | Steps | Expected |
|------|-------|----------|
| Tier 1 (Rooms 1-4) | Check header | "THE UPPER CRYPT" |
| Tier 2 (Rooms 5-8) | Check header | "THE FLOODED HALLS" |
| Tier 3 (Rooms 9-12) | Check header | "THE ABYSS" |
| Boss room | Room 12 | Boss warning + The Keeper |

---

## 🔒 Internal Test (Backend Verification)

*For Pisco/developers only - requires API/DB access*

### API Health
```bash
# Session start
curl -X POST https://www.dieforward.com/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"test123","stakeAmount":0.05,"demoMode":true}'
# Expected: {"success":true,"sessionToken":"...","zone":"THE SUNKEN CRYPT"}

# Session advance
curl -X POST https://www.dieforward.com/api/session/advance \
  -H "Content-Type: application/json" \
  -d '{"sessionToken":"TOKEN_FROM_ABOVE","fromRoom":1}'
# Expected: {"success":true,"currentRoom":2}
```

### InstantDB Checks
After a death, verify in InstantDB:
- [ ] New record in `deaths` table
- [ ] `finalMessage` contains player's words
- [ ] `killedBy` matches enemy name
- [ ] `room` matches death location
- [ ] `depth` matches current depth name

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
- [ ] Can you navigate through rooms?
- [ ] Does combat work? (Strike, Dodge, Brace, Flee)
- [ ] Do enemies have different behaviors?
- [ ] Can you pick up items from corpses?
- [ ] When you die, can you leave final words?
- [ ] Does your HP/stamina display correctly?

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
| Free play start | ✓ | ✓ | ✓ | ✓ |
| Room progression | ✓ | ✓ | ✓ | ✓ |
| Combat - basic | ✓ | ✓ | | ✓ |
| Combat - all actions | | ✓ | | ✓ |
| Combat - intents | | ✓ | ✓ | |
| Creature consistency | | ✓ | ✓ | |
| Looting | | ✓ | | ✓ |
| Death flow | | ✓ | ✓ | ✓ |
| Victory flow | | ✓ | | |
| API health | | | ✓ | |
| CORS | | | ✓ | |
| InstantDB writes | | | ✓ | |
| Depths progression | | ✓ | | |
| Boss fight | | ✓ | | |
| Leaderboard | | ✓ | | ✓ |
| Death feed | | ✓ | ✓ | ✓ |

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

*Last updated: 2026-02-14*
*Maintainer: Pisco 🐵*

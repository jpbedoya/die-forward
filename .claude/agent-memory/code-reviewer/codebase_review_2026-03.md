---
name: Comprehensive codebase review findings (March 2026)
description: Critical security, architecture, and correctness patterns discovered during full codebase review of Die Forward
type: project
---

Key findings from full codebase review:

**Security patterns:**
- Auth routes use nonce freshness checks (5 min window) + signature verification via tweetnacl - solid
- SKIP_VERIFICATION sentinel is explicitly blocked on server side
- Hardcoded InstantDB APP_ID fallback in mobile/lib/instant.ts line 15 (production ID exposed)
- CORS is `Access-Control-Allow-Origin: *` everywhere - acceptable for public API but worth noting
- Session token is just an InstantDB `id()` - UUID, not signed; anyone who guesses it can control the session
- escrow.ts (mobile) uses Math.random() for session ID generation - not crypto-secure

**Architecture patterns:**
- Dual escrow clients: mobile/lib/solana/escrow.ts (Kit Address types) vs src/lib/escrow-program.ts (raw PublicKey) - hardcoded discriminators in mobile, computed via sha256 on server
- Dual instant.ts: mobile uses @instantdb/react-native, web uses @instantdb/react - schema types duplicated
- GameContext.tsx is ~1100 lines, single useState blob pattern with updateState partial merge
- MagicBlock integration has 3-tier fallback (atomic commit -> legacy -> SDK direct)

**Correctness concerns:**
- Buffer.alloc usage in mobile escrow.ts (lines 106, 138, 166) - Buffer may not exist in React Native
- getZoneCreature (non-seeded) uses Math.random() breaking determinism for staked runs
- applyVoidbladeEffect/checkDeathSave use synchronous setState closure to return values - fragile pattern
- Victory bonus hardcoded to 50% in API route despite configurable victoryBonusPercent in settings

**How to apply:** Reference these patterns when reviewing PRs touching auth, staking, or game state.

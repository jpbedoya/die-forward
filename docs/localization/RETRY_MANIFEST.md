# Localization manifest — handoff state (updated 2026-07-10)

Kit: `docs/localization/LOC_KIT.md` — canonical glossary + voice rules. All work below follows it.

## COMPLETE packages (5 zones + 7 content packs, all structure/placeholder-validated, committed)
- **es** ✅  **ja** ✅  **pt-BR** ✅  **zh-TW** ✅  **ko** ✅

## UI catalog reality (as of phase 3b, July 2026)
All 7 locale catalogs (`mobile/lib/locales/{en,es,ja,pt-BR,zh-TW,ko,vi}.json`) are **structurally identical — 639 keys each, verified** (605 as of phase 2b + 18 in phase 3a + 16 new in phase 3b, see below). Only two player-facing surfaces remain literal (not keyed): the music-test screen and `[DEVNET]` badges — both dev-only, not in player-facing scope. Structural identity is not translation completeness: every non-en catalog carries **English values for every key added since that locale's last translation pass** (Phase 2a's `hint.*`/`trail.*`, Phase 2b's 530-key screen-string extraction across `codex.*`, `stake.*`, `leaderboard.*`, `index.*`, `feed.*`, `bestiary.*`, `zoneSelect.*`, `play.*`, `combat.ui.*`, `death.*`, `victory.*`, Phase 3a's `modifier.*`/`shift.*`/`stake.offer.*`, Phase 3b's `coin.*`/`stake.coin.*`/`feed.seal.*`/`death.coin.*`/`victory.coin.*`/`stake.ritual.intro` below). Translation debt for any locale is enumerable by diffing that locale's values against `en.json` — identical value = untranslated. **vi is the exception:** it never had an original pass on the UI catalog at all (see below), so its debt is the full 639 keys, not just the delta.

## Remaining
- **vi:** `lib/zones/void-beyond.vi.json`; `content/{combat-actions,combat-rooms,corpse-rooms,death-epitaphs,exit-rooms,explore-rooms}.vi.json`; `lib/locales/vi.json`
  (already done: sunken-crypt/ashen-crypts/frozen-gallery/living-tomb zones, cache-rooms)
  `lib/locales/vi.json` now EXISTS with English placeholder values throughout — it needs its **full original pass** (639 keys), not just the post-launch delta the other five locales owe.
- **es/ja/pt-BR/zh-TW/ko:** owe the delta only — every key landed after each locale's original UI-catalog pass, carried as English placeholders:
  - Phase 2a addendum: `hint.*` (branch hint sense-line + tag) and `trail.*` (path-trail screen).
  - Phase 2b screen-string extraction: the 530 keys listed above.
  - Phase 3a addendum (The Shift, seeded layer): 18 keys — `stake.offer.title`; `modifier.*` (12, 6 modifier name/desc pairs: `blood-pact`, `blind-descent`, `deaths-echo`, `numbing-cold`, `iron-will`, `glass-cannon`); `shift.*` (5): `shift.header`, `shift.line`, `shift.offers` (`{mods}` placeholder), `shift.zone.sealed` (`{n}` placeholder), `shift.zone.open`.
  - **Phase 3b addendum (Pale Coins / Coin-Bound staking):** 16 new keys, all pending translation in es/ja/pt-BR/zh-TW/ko (English placeholders) and part of vi's full-pass debt —
    - `stake.ritual.intro` (1) — the ritual-posture staking gate line ("You have died enough to be noticed...").
    - `stake.coin.*` (3) — `stake.coin.title` (PALE COIN BINDING), `stake.coin.balance` (`{amount}` placeholder), `stake.coin.bind_action`.
    - `coin.streak` (1) — shared streak line (`{n}` placeholder).
    - `death.coin.*` (4) — `death.coin.balance`, `death.coin.gained` (`{amount}` placeholder), `death.coin.stakeFeeds`, `death.coin.streakBroken`.
    - `victory.coin.*` (4) — `victory.coin.balance`, `victory.coin.gained` (`{amount}` placeholder), `victory.coin.returned` (`{amount}` placeholder), `victory.coin.streak` (`{n}` placeholder).
    - `feed.seal.*` (3) — `feed.seal.1`/`.2`/`.3`, the death-feed seal-tier glyph badges (⟐/⟐⟐/⟐⟐⟐).

## Process notes (learned the hard way)
- **Write-first**: agents must write each file to disk as soon as it's translated — session-limit deaths then cost at most one partial file.
- **Chunked writes** for sunken-crypt (~78KB): Write + Edit-appends in 3–4 sections.
- Validate every file: identical JSON structure vs source, identifier fields (`id`,`version`,`template`,`type`,`name`,`behaviors`,`boss`,`artUrl`) verbatim, `{placeholders}`/[BRACKETED] intact, zero exclamation marks. Validation scripts are embedded in prior agent prompts (see git history of this file's first version).
- Match register to completed siblings in the same locale (e.g. ashen-crypts.ko.json for ko).
- Flee prefixes are translated display markers (es EVADIDO precedent); corpse narratives keep trailing colon (full-width where applicable).
- Glossary gaps found mid-work: The Archivist → ja 記録者; Cartographer's Ghost → ja 地図描きの亡霊 — add equivalents per locale when encountered (ko: 지도장이의 유령 for Cartographer's Ghost); combat tokens (Strike/Brace/CHARGING) inside prose stay English (identifier convention) pending a displayName decision.

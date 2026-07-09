# Localization manifest — handoff state (updated 2026-07-07)

Kit: `docs/localization/LOC_KIT.md` — canonical glossary + voice rules. All work below follows it.

## COMPLETE packages (5 zones + 7 content packs + UI catalog, all structure/placeholder-validated, committed)
- **es** ✅  **ja** ✅  **pt-BR** ✅  **zh-TW** ✅  **ko** ✅

## Remaining
- **vi:** `lib/zones/void-beyond.vi.json`; `content/{combat-actions,combat-rooms,corpse-rooms,death-epitaphs,exit-rooms,explore-rooms}.vi.json`; `lib/locales/vi.json`
  (already done: sunken-crypt/ashen-crypts/frozen-gallery/living-tomb zones, cache-rooms)
  `lib/locales/vi.json` now EXISTS with English placeholder values — translate values in place, don't create.

## Process notes (learned the hard way)
- **Write-first**: agents must write each file to disk as soon as it's translated — session-limit deaths then cost at most one partial file.
- **Chunked writes** for sunken-crypt (~78KB): Write + Edit-appends in 3–4 sections.
- Validate every file: identical JSON structure vs source, identifier fields (`id`,`version`,`template`,`type`,`name`,`behaviors`,`boss`,`artUrl`) verbatim, `{placeholders}`/[BRACKETED] intact, zero exclamation marks. Validation scripts are embedded in prior agent prompts (see git history of this file's first version).
- Match register to completed siblings in the same locale (e.g. ashen-crypts.ko.json for ko).
- Flee prefixes are translated display markers (es EVADIDO precedent); corpse narratives keep trailing colon (full-width where applicable).
- Glossary gaps found mid-work: The Archivist → ja 記録者; Cartographer's Ghost → ja 地図描きの亡霊 — add equivalents per locale when encountered (ko: 지도장이의 유령 for Cartographer's Ghost); combat tokens (Strike/Brace/CHARGING) inside prose stay English (identifier convention) pending a displayName decision.

/**
 * Whitelist + validation for admin gameSettings writes.
 *
 * `instant.perms.ts` (Phase 3b) denies direct client writes to `gameSettings`
 * by default, so edits now go through the authenticated
 * `POST /api/admin/settings` route (see `src/app/api/admin/settings/route.ts`),
 * which writes via the ADMIN InstantDB client (bypasses perms). Since that
 * write is now server-trusted, we must not let a caller forge arbitrary
 * fields on the row (e.g. a huge `coinPool`, which is server-managed and
 * intentionally NOT in this whitelist) — every key in the patch must be a
 * known, editable settings field.
 *
 * Pure (no admin SDK import), so this — and `validateSettingsPatch` — are
 * trivially unit-testable.
 */

// Numeric/toggle fields mirrored from the `GameSettings` interface in
// src/app/admin/page.tsx (excluding `id`, which is never part of a patch).
const GAME_SETTINGS_FIELD_KEYS = [
  'lootChanceBase',
  'lootChanceDepth5',
  'lootChanceDepth9',
  'baseDamageMin',
  'baseDamageMax',
  'tier2Multiplier',
  'tier3Multiplier',
  'victoryBonusPercent',
  'showLeaderboardLink',
  'enableMagicBlock',
  'enableVRF',
  'criticalChance',
  'criticalMultiplier',
  'dodgeSuccessRate',
  'braceReduction',
  'fleeChanceBase',
  'fleeCleanRatio',
  'staminaPool',
  'staminaRegen',
  'strikeCost',
  'enemyCounterMultiplier',
  'chargePunishment',
  'intentCounterBonus',
  'braceBaseDamageMin',
  'braceBaseDamageMax',
  'erraticDamageMax',
  'enableRoomTextStreaming',
  'roomTextStreamSpeedMs',
  'dailyShiftEnabled',
  'coinBonusPercent',
] as const;

// Raw columns that live outside the GameSettings interface but are still
// admin-editable (see SettingsTab/ZonesTab in src/app/admin/page.tsx).
const STAKING_AND_ZONE_KEYS = [
  'stakingPosture',
  'enabledZones',
] as const;

// Per-zone ambient track overrides — one fixed key per known zone id (zone
// ids come from ZONE_META in src/app/admin/page.tsx; hyphens become
// underscores, matching `ambientTrack_${zoneId.replace(/-/g, '_')}`).
const AMBIENT_TRACK_KEYS = [
  'ambientTrack_sunken_crypt',
  'ambientTrack_ashen_crypts',
  'ambientTrack_frozen_gallery',
  'ambientTrack_living_tomb',
  'ambientTrack_void_beyond',
] as const;

// Deliberately EXCLUDED: `coinPool` — server-managed (death burns, victory
// payouts), read-only in the admin UI. Do not add it here.
export const KNOWN_SETTINGS_KEYS: readonly string[] = [
  ...GAME_SETTINGS_FIELD_KEYS,
  ...STAKING_AND_ZONE_KEYS,
  ...AMBIENT_TRACK_KEYS,
];

// Defaults used when the gameSettings singleton row doesn't exist yet and an
// admin write needs to create it. Mirrors DEFAULT_SETTINGS in
// src/app/admin/page.tsx (kept as a separate copy since src/app/admin is a
// client component and this module is imported from a server route).
export const DEFAULT_GAME_SETTINGS: Record<string, unknown> = {
  lootChanceBase: 0.5,
  lootChanceDepth5: 0.65,
  lootChanceDepth9: 0.8,
  baseDamageMin: 15,
  baseDamageMax: 25,
  tier2Multiplier: 1.5,
  tier3Multiplier: 2.0,
  victoryBonusPercent: 50,
  showLeaderboardLink: false,
  enableMagicBlock: false,
  enableVRF: false,
  criticalChance: 0.15,
  criticalMultiplier: 1.5,
  dodgeSuccessRate: 0.70,
  braceReduction: 0.50,
  fleeChanceBase: 0.50,
  fleeCleanRatio: 0.60,
  staminaPool: 4,
  staminaRegen: 1,
  strikeCost: 2,
  enemyCounterMultiplier: 0.85,
  chargePunishment: 2.0,
  intentCounterBonus: 1.5,
  braceBaseDamageMin: 6,
  braceBaseDamageMax: 12,
  erraticDamageMax: 1.3,
  enableRoomTextStreaming: false,
  roomTextStreamSpeedMs: 28,
  dailyShiftEnabled: true,
  coinBonusPercent: 50,
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validates an admin gameSettings patch: must be a plain object, non-empty,
 * and every key must be in `KNOWN_SETTINGS_KEYS`. Does not validate value
 * types/ranges (the admin UI's sliders/toggles already constrain those; the
 * security concern here is *field forgery*, not value tuning).
 */
export function validateSettingsPatch(patch: unknown): ValidationResult {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: 'settings must be an object' };
  }

  const keys = Object.keys(patch as Record<string, unknown>);
  if (keys.length === 0) {
    return { ok: false, error: 'settings patch must not be empty' };
  }

  const unknownKeys = keys.filter((k) => !KNOWN_SETTINGS_KEYS.includes(k));
  if (unknownKeys.length > 0) {
    return { ok: false, error: `Unknown settings key(s): ${unknownKeys.join(', ')}` };
  }

  return { ok: true };
}

/**
 * Zone overrides — persists admin edits to InstantDB so they survive Vercel's read-only filesystem.
 *
 * Overrides are stored as JSON blobs in the `zoneOverrides` namespace:
 *   { zoneId, section, data (JSON string), updatedAt }
 *
 * Sections:
 *   "bestiary"            → bestiary.local array
 *   "fragments_explore"   → fragments.explore
 *   "fragments_combat"    → fragments.combat
 *   "fragments_corpse"    → fragments.corpse
 *   "fragments_cache"     → fragments.cache
 *   "fragments_exit"      → fragments.exit
 *   "fragments_options"   → fragments.options
 */

import { init, tx, id } from '@instantdb/admin';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

/**
 * Fetch a zone override from InstantDB.
 * Returns the parsed JSON value, or null if no override exists.
 */
export async function getZoneOverride(zoneId: string, section: string): Promise<unknown | null> {
  try {
    const result = await db.query({
      zoneOverrides: {
        $: { where: { zoneId, section }, limit: 1 },
      },
    });

    const records = result?.zoneOverrides;
    if (!records || records.length === 0) return null;

    const record = records[0] as Record<string, unknown>;
    const raw = record.data as string | undefined;
    if (!raw) return null;

    return JSON.parse(raw);
  } catch (err) {
    console.error(`[zone-overrides] getZoneOverride(${zoneId}, ${section}) failed:`, err);
    return null;
  }
}

/**
 * Upsert a zone override in InstantDB.
 * `data` should be the JS value to persist (will be JSON-stringified).
 */
export async function setZoneOverride(zoneId: string, section: string, data: unknown): Promise<void> {
  try {
    // Check for existing record so we can update in-place
    const result = await db.query({
      zoneOverrides: {
        $: { where: { zoneId, section }, limit: 1 },
      },
    });

    const records = result?.zoneOverrides;
    const existing = records && records.length > 0 ? (records[0] as Record<string, unknown>) : null;

    const payload = {
      zoneId,
      section,
      data: JSON.stringify(data),
      updatedAt: Date.now(),
    };

    if (existing) {
      await db.transact([tx.zoneOverrides[existing.id as string].update(payload)]);
    } else {
      await db.transact([tx.zoneOverrides[id()].update(payload)]);
    }
  } catch (err) {
    console.error(`[zone-overrides] setZoneOverride(${zoneId}, ${section}) failed:`, err);
    throw err;
  }
}

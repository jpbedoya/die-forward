import fs from 'fs';
import path from 'path';

/**
 * The zone packages exist in two places, each bundled by a different app:
 *   - `mobile/lib/zones/<zone>.json`  — canonical; consumed by the Expo app
 *     (`mobile/lib/zone-loader.ts`, graph-based dungeon generation).
 *   - `zones/<zone>.json`             — repo-root copy bundled by the Next.js
 *     web/API app (`src/lib/content.ts` `loadZone`, used by session/start,
 *     agent/start, and the 4a apex-creature allowlist in game/shift).
 *
 * They MUST stay byte-identical. The web side only reads meta/bestiary/depths,
 * but a silent drift (e.g. a zone's bestiary edited in mobile but not here)
 * would make the server's apex allowlist / zone names stale. This test fails
 * CI on any divergence — if it fails, re-sync: `cp mobile/lib/zones/<z>.json zones/<z>.json`.
 */
const ZONE_IDS = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
const REPO_ROOT = path.resolve(__dirname, '../../..');

describe('zone package sync (repo-root web copy === mobile canonical)', () => {
  for (const zoneId of ZONE_IDS) {
    it(`${zoneId}.json is identical in zones/ and mobile/lib/zones/`, () => {
      const webPath = path.join(REPO_ROOT, 'zones', `${zoneId}.json`);
      const mobilePath = path.join(REPO_ROOT, 'mobile', 'lib', 'zones', `${zoneId}.json`);
      const web = fs.readFileSync(webPath, 'utf8');
      const mobile = fs.readFileSync(mobilePath, 'utf8');
      // Compare parsed JSON (tolerant of trailing-whitespace/formatting) so the
      // failure message is about content, not bytes.
      expect(JSON.parse(web)).toEqual(JSON.parse(mobile));
    });
  }
});

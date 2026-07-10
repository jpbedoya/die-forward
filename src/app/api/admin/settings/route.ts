import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuthToken, isAdminAuthId } from '@/lib/auth-server';
import { validateSettingsPatch, DEFAULT_GAME_SETTINGS } from '@/lib/settings-validation';

/**
 * POST /api/admin/settings
 *
 * Authenticated replacement for the direct-from-browser
 * `db.transact([tx.gameSettings...])` writes that `instant.perms.ts`
 * (Phase 3b) now blocks for anonymous/non-admin clients. Requires a valid
 * `Authorization: Bearer <customToken>` for a wallet in the admin allowlist;
 * the write itself goes through the ADMIN InstantDB client (`@/lib/db`),
 * which bypasses the perms-deny.
 *
 * Body: `{ settings: Partial<GameSettings> }` — every key must be in the
 * `KNOWN_SETTINGS_KEYS` whitelist (see settings-validation.ts) to prevent a
 * caller forging arbitrary fields (e.g. a huge `coinPool`) via a typo'd or
 * malicious key.
 */
export async function POST(req: NextRequest) {
  const identity = await verifyAuthToken(req);
  if (!identity || !isAdminAuthId(identity.authId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch = (body as { settings?: unknown } | null)?.settings;
  const validation = validateSettingsPatch(patch);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const settingsPatch = patch as Record<string, unknown>;

  try {
    const existing = await db.query({ gameSettings: {} });
    const row = existing.gameSettings?.[0] as { id: string } | undefined;

    const { tx, id } = await import('@instantdb/admin');

    if (!row) {
      await db.transact([
        tx.gameSettings[id()].update({ ...DEFAULT_GAME_SETTINGS, ...settingsPatch }),
      ]);
    } else {
      await db.transact([tx.gameSettings[row.id].update(settingsPatch)]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[AdminSettings] write failed:', err);
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}

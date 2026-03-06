import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getZoneOverride, setZoneOverride } from '@/lib/zone-overrides';

const ZONES_DIR = path.join(process.cwd(), 'zones');
const VALID_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
const VALID_CATEGORIES = ['explore', 'combat', 'corpse', 'cache', 'exit', 'options'];

function zonePath(zoneId: string) {
  return path.join(ZONES_DIR, `${zoneId}.json`);
}

/** InstantDB section key for fragment categories */
function fragmentSection(category: string) {
  return `fragments_${category}`;
}

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone') || 'sunken-crypt';
  const category = req.nextUrl.searchParams.get('category') || 'explore';

  if (!VALID_ZONES.includes(zone) || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid zone or category' }, { status: 400 });
  }

  try {
    // Check InstantDB override first
    const override = await getZoneOverride(zone, fragmentSection(category));
    if (override !== null) {
      return NextResponse.json({ fragments: override });
    }

    // Fall back to bundled JSON file
    const raw = await fs.readFile(zonePath(zone), 'utf-8');
    const data = JSON.parse(raw);

    // Zones use fragments (new system) or rooms (old sunken-crypt system)
    const fragments = data.fragments?.[category] ?? data.rooms?.[category] ?? {};
    return NextResponse.json({ fragments });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load zone' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { zone, category, fragments } = await req.json();

    if (!VALID_ZONES.includes(zone) || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid zone or category' }, { status: 400 });
    }

    // Persist to InstantDB (works in production on Vercel)
    await setZoneOverride(zone, fragmentSection(category), fragments);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getZoneOverride, setZoneOverride } from '@/lib/zone-overrides';

const VALID_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
const VALID_CATEGORIES = ['explore', 'combat', 'corpse', 'cache', 'exit', 'options'];

// Static zone loaders — same pattern as content.ts so Next.js bundles them at build time
type ZoneData = { fragments?: Record<string, unknown>; rooms?: Record<string, unknown> };
const ZONE_LOADERS: Record<string, () => Promise<ZoneData>> = {
  'sunken-crypt':   () => import('../../../../../zones/sunken-crypt.json').then(m => m.default as unknown as ZoneData),
  'ashen-crypts':  () => import('../../../../../zones/ashen-crypts.json').then(m => m.default as unknown as ZoneData),
  'frozen-gallery':() => import('../../../../../zones/frozen-gallery.json').then(m => m.default as unknown as ZoneData),
  'living-tomb':   () => import('../../../../../zones/living-tomb.json').then(m => m.default as unknown as ZoneData),
  'void-beyond':   () => import('../../../../../zones/void-beyond.json').then(m => m.default as unknown as ZoneData),
};

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

    // Fall back to bundled zone data (works on Vercel — no fs required)
    const data = await ZONE_LOADERS[zone]();

    // Only return fragments (new system) — old sunken-crypt rooms format is not editable here
    const fragments = data.fragments?.[category] ?? {};
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

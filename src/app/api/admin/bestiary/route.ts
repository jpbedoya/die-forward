import { NextRequest, NextResponse } from 'next/server';
import { getZoneOverride, setZoneOverride } from '@/lib/zone-overrides';

const VALID_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];

// Static zone loaders — same pattern as content.ts so Next.js bundles them at build time
const ZONE_LOADERS: Record<string, () => Promise<{ bestiary?: { local?: unknown[] } }>> = {
  'sunken-crypt':   () => import('../../../../../zones/sunken-crypt.json').then(m => m.default as unknown as { bestiary?: { local?: unknown[] } }),
  'ashen-crypts':  () => import('../../../../../zones/ashen-crypts.json').then(m => m.default as unknown as { bestiary?: { local?: unknown[] } }),
  'frozen-gallery':() => import('../../../../../zones/frozen-gallery.json').then(m => m.default as unknown as { bestiary?: { local?: unknown[] } }),
  'living-tomb':   () => import('../../../../../zones/living-tomb.json').then(m => m.default as unknown as { bestiary?: { local?: unknown[] } }),
  'void-beyond':   () => import('../../../../../zones/void-beyond.json').then(m => m.default as unknown as { bestiary?: { local?: unknown[] } }),
};

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone') || 'sunken-crypt';
  if (!VALID_ZONES.includes(zone)) {
    return NextResponse.json({ error: 'Invalid zone' }, { status: 400 });
  }

  try {
    // Check InstantDB override first
    const override = await getZoneOverride(zone, 'bestiary');
    if (override !== null) {
      return NextResponse.json({ creatures: override });
    }

    // Fall back to bundled zone data (works on Vercel — no fs required)
    const data = await ZONE_LOADERS[zone]();
    const local: unknown[] = (data.bestiary?.local || []).map((c: unknown) => {
      const creature = c as Record<string, unknown>;
      return {
        name: typeof creature === 'string' ? creature : creature.name,
        tier: creature.tier ?? 1,
        health: creature.health ?? { min: 40, max: 60 },
        behaviors: creature.behaviors ?? [],
        description: creature.description ?? '',
        emoji: creature.emoji ?? '👾',
        artUrl: creature.artUrl ?? '',
      };
    });
    return NextResponse.json({ creatures: local });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load zone' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { zone, creatures } = await req.json();
    if (!VALID_ZONES.includes(zone)) {
      return NextResponse.json({ error: 'Invalid zone' }, { status: 400 });
    }
    if (!Array.isArray(creatures)) {
      return NextResponse.json({ error: 'creatures must be an array' }, { status: 400 });
    }

    // Persist to InstantDB (works in production on Vercel)
    await setZoneOverride(zone, 'bestiary', creatures);
    return NextResponse.json({ ok: true, count: creatures.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getZoneOverride, setZoneOverride } from '@/lib/zone-overrides';

const ZONES_DIR = path.join(process.cwd(), 'zones');
const VALID_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];

function zonePath(zoneId: string) {
  return path.join(ZONES_DIR, `${zoneId}.json`);
}

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

    // Fall back to bundled JSON file
    const raw = await fs.readFile(zonePath(zone), 'utf-8');
    const data = JSON.parse(raw);
    const local: unknown[] = (data.bestiary?.local || []).map((c: Record<string, unknown>) => ({
      name: typeof c === 'string' ? c : c.name,
      tier: c.tier ?? 1,
      health: c.health ?? { min: 40, max: 60 },
      behaviors: c.behaviors ?? [],
      description: c.description ?? '',
      emoji: c.emoji ?? '👾',
      artUrl: c.artUrl ?? '',
    }));
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

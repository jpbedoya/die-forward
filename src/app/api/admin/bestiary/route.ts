import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

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
    const raw = await fs.readFile(zonePath(zone), 'utf-8');
    const data = JSON.parse(raw);
    const local: any[] = (data.bestiary?.local || []).map((c: any) => ({
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
    const raw = await fs.readFile(zonePath(zone), 'utf-8');
    const data = JSON.parse(raw);
    data.bestiary = data.bestiary || {};
    data.bestiary.local = creatures;
    await fs.writeFile(zonePath(zone), JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, count: creatures.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 });
  }
}

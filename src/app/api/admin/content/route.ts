import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ZONES_DIR = path.join(process.cwd(), 'zones');
const VALID_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];
const VALID_CATEGORIES = ['explore', 'combat', 'corpse', 'cache', 'exit', 'options'];

function zonePath(zoneId: string) {
  return path.join(ZONES_DIR, `${zoneId}.json`);
}

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone') || 'sunken-crypt';
  const category = req.nextUrl.searchParams.get('category') || 'explore';

  if (!VALID_ZONES.includes(zone) || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid zone or category' }, { status: 400 });
  }

  try {
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

    const raw = await fs.readFile(zonePath(zone), 'utf-8');
    const data = JSON.parse(raw);

    // Write to fragments (preferred) or rooms (sunken-crypt legacy)
    if (data.fragments) {
      data.fragments[category] = fragments;
    } else if (data.rooms) {
      data.rooms[category] = fragments;
    } else {
      data.fragments = { [category]: fragments };
    }

    await fs.writeFile(zonePath(zone), JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 });
  }
}

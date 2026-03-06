import { NextResponse } from 'next/server';
import { init } from '@instantdb/admin';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// DEV: all zones enabled by default until explicitly set in admin
const DEFAULT_ENABLED_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const result = await db.query({ gameSettings: {} });
    const settings = result?.gameSettings?.[0] as Record<string, unknown> | undefined;

    const rawEnabledZones = (settings?.enabledZones as string) ?? DEFAULT_ENABLED_ZONES.join(',');
    const enabledZones = rawEnabledZones
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    // Always include sunken-crypt as a safety net
    if (!enabledZones.includes('sunken-crypt')) {
      enabledZones.unshift('sunken-crypt');
    }

    return NextResponse.json({ enabledZones }, { headers: corsHeaders });
  } catch (err) {
    console.error('[game/settings] Failed to load settings:', err);
    return NextResponse.json(
      { enabledZones: DEFAULT_ENABLED_ZONES },
      { headers: corsHeaders },
    );
  }
}

import { NextResponse } from 'next/server';
import { init } from '@instantdb/admin';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

// DEV: all zones enabled by default until explicitly set in admin
const DEFAULT_ENABLED_ZONES = ['sunken-crypt', 'ashen-crypts', 'frozen-gallery', 'living-tomb', 'void-beyond'];

// The Shift (Phase 3b, Task 6): admin-controlled staking posture.
// 'hidden' = no SOL UI at all; 'ritual' = progressive disclosure after
// enough deaths; 'open' = SOL UI always shown (legacy behavior). Defaults
// to 'ritual' when absent/invalid so freshly-provisioned settings rows
// (and GET failures) lean toward the in-fiction reveal, not the raw ask.
type StakingPosture = 'hidden' | 'ritual' | 'open';
const DEFAULT_STAKING_POSTURE: StakingPosture = 'ritual';

function normalizeStakingPosture(value: unknown): StakingPosture {
  return value === 'hidden' || value === 'ritual' || value === 'open'
    ? value
    : DEFAULT_STAKING_POSTURE;
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

    const stakingPosture = normalizeStakingPosture(settings?.stakingPosture);

    return NextResponse.json({ enabledZones, stakingPosture });
  } catch (err) {
    console.error('[game/settings] Failed to load settings:', err);
    return NextResponse.json(
      { enabledZones: DEFAULT_ENABLED_ZONES, stakingPosture: DEFAULT_STAKING_POSTURE },
    );
  }
}

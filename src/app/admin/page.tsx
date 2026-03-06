'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { init, tx, id } from '@instantdb/react';

// ─── InstantDB ───────────────────────────────────────────────────────────────
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || '';
const db = init({ appId: APP_ID });

// ─── Audius API ──────────────────────────────────────────────────────────────
const AUDIUS_API = 'https://api.audius.co/v1';

interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  user: { name: string; handle: string };
  artwork?: { '150x150'?: string; '480x480'?: string };
}

// ─── Admin check ─────────────────────────────────────────────────────────────
const ADMIN_WALLETS = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || '')
  .split(',').map(w => w.trim()).filter(Boolean)
  .concat(['D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL']);

// ─── Types ───────────────────────────────────────────────────────────────────
interface GameSettings {
  id: string;
  lootChanceBase: number;
  lootChanceDepth5: number;
  lootChanceDepth9: number;
  baseDamageMin: number;
  baseDamageMax: number;
  tier2Multiplier: number;
  tier3Multiplier: number;
  victoryBonusPercent: number;
  showLeaderboardLink: boolean;
  enableMagicBlock: boolean;
  enableVRF: boolean;
  criticalChance: number;
  criticalMultiplier: number;
  dodgeSuccessRate: number;
  braceReduction: number;
  fleeChanceBase: number;
  fleeCleanRatio: number;
  staminaRegen: number;
}

interface Playlist {
  id: string;
  audiusId: string;
  name: string;
  emoji: string;
  vibe: string;
  trackCount: number;
  enabled: boolean;
  order: number;
}

const DEFAULT_SETTINGS: Omit<GameSettings, 'id'> = {
  lootChanceBase: 0.5,
  lootChanceDepth5: 0.65,
  lootChanceDepth9: 0.8,
  baseDamageMin: 15,
  baseDamageMax: 25,
  tier2Multiplier: 1.5,
  tier3Multiplier: 2.0,
  victoryBonusPercent: 50,
  showLeaderboardLink: false,
  enableMagicBlock: false,
  enableVRF: false,
  criticalChance: 0.15,
  criticalMultiplier: 1.5,
  dodgeSuccessRate: 0.70,
  braceReduction: 0.50,
  fleeChanceBase: 0.50,
  fleeCleanRatio: 0.60,
  staminaRegen: 1,
};

type Tab = 'dashboard' | 'settings' | 'zones' | 'bestiary' | 'content' | 'music' | 'deaths' | 'corpses';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { publicKey, connected } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (connected && publicKey) {
      setIsAdmin(ADMIN_WALLETS.includes(publicKey.toBase58()));
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  }, [connected, publicKey]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] flex items-center justify-center">
        <div className="text-[var(--amber)] animate-pulse font-mono">Loading...</div>
      </div>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl text-[var(--amber-bright)] mb-4 font-mono">🔒 Admin Dashboard</h1>
        <p className="text-[var(--text-dim)] mb-6 font-mono">Connect your wallet to access admin features.</p>
        <WalletMultiButton />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl text-[var(--red)] mb-4 font-mono">⛔ Access Denied</h1>
        <p className="text-[var(--text-dim)] mb-2 font-mono">Wallet not authorized.</p>
        <p className="text-[var(--text-muted)] text-sm font-mono">{publicKey?.toBase58()}</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'zones', label: 'Zones', icon: '🗺️' },
    { id: 'bestiary', label: 'Bestiary', icon: '👹' },
    { id: 'content', label: 'Content', icon: '📜' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'deaths', label: 'Deaths', icon: '💀' },
    { id: 'corpses', label: 'Corpses', icon: '⚰️' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] font-mono">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <img src="/logo-horizontal.png" alt="Die Forward" className="h-6" />
              <span className="text-[var(--text-dim)] text-sm">Admin</span>
            </div>
            <a href="/" className="text-[var(--amber-dim)] hover:text-[var(--amber)] text-sm">
              ← Back to Game
            </a>
          </div>

          {/* Tabs - horizontally scrollable on mobile */}
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-[var(--amber)] text-[var(--amber-bright)]'
                    : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border)]'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'zones' && <ZonesTab />}
        {activeTab === 'bestiary' && <BestiaryTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'music' && <MusicTab />}
        {activeTab === 'deaths' && <DeathsTab />}
        {activeTab === 'corpses' && <CorpsesTab />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardTab() {
  const { data: deathsData } = db.useQuery({ deaths: {} });
  const { data: corpsesData } = db.useQuery({ corpses: {} });
  const { data: playersData } = db.useQuery({ players: {} });

  const deaths = deathsData?.deaths || [];
  const corpses = corpsesData?.corpses || [];
  const players = playersData?.players || [];

  const totalDeaths = deaths.length;
  const totalPlayers = players.length;
  const avgDepth = deaths.length > 0
    ? (deaths.reduce((sum: number, d: any) => sum + (d.room || 1), 0) / deaths.length).toFixed(1)
    : '0';
  const maxDepth = deaths.length > 0
    ? Math.max(...deaths.map((d: any) => d.room || 1))
    : 0;
  const discoveredCorpses = corpses.filter((c: any) => c.discovered).length;
  const discoveryRate = corpses.length > 0
    ? ((discoveredCorpses / corpses.length) * 100).toFixed(1)
    : '0';
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentDeaths = deaths.filter((d: any) => (d.createdAt || d.timestamp) > oneDayAgo).length;
  const roomCounts: Record<number, number> = {};
  deaths.forEach((d: any) => { roomCounts[d.room || 1] = (roomCounts[d.room || 1] || 0) + 1; });
  const deadliestRoom = Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard label="Total Deaths" value={totalDeaths} />
      <MetricCard label="Total Players" value={totalPlayers} />
      <MetricCard label="Deaths (24h)" value={recentDeaths} />
      <MetricCard label="Avg Depth" value={avgDepth} />
      <MetricCard label="Max Depth" value={maxDepth} />
      <MetricCard label="Corpses Found" value={`${discoveryRate}%`} />
      <MetricCard
        label="Deadliest Room"
        value={deadliestRoom ? `Room ${deadliestRoom[0]}` : 'N/A'}
        subtitle={deadliestRoom ? `${deadliestRoom[1]} deaths` : undefined}
      />
      <MetricCard label="Active Corpses" value={corpses.filter((c: any) => !c.discovered).length} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsTab() {
  const { data: settingsData } = db.useQuery({ gameSettings: {} });
  const settings = settingsData?.gameSettings?.[0] || null;

  const saveSettings = async (newSettings: Partial<GameSettings>) => {
    if (!settings) {
      await db.transact([tx.gameSettings[id()].update({ ...DEFAULT_SETTINGS, ...newSettings })]);
    } else {
      await db.transact([tx.gameSettings[settings.id].update(newSettings)]);
    }
  };

  const cs: GameSettings = {
    id: settings?.id || '',
    lootChanceBase: settings?.lootChanceBase ?? DEFAULT_SETTINGS.lootChanceBase,
    lootChanceDepth5: settings?.lootChanceDepth5 ?? DEFAULT_SETTINGS.lootChanceDepth5,
    lootChanceDepth9: settings?.lootChanceDepth9 ?? DEFAULT_SETTINGS.lootChanceDepth9,
    baseDamageMin: settings?.baseDamageMin ?? DEFAULT_SETTINGS.baseDamageMin,
    baseDamageMax: settings?.baseDamageMax ?? DEFAULT_SETTINGS.baseDamageMax,
    tier2Multiplier: settings?.tier2Multiplier ?? DEFAULT_SETTINGS.tier2Multiplier,
    tier3Multiplier: settings?.tier3Multiplier ?? DEFAULT_SETTINGS.tier3Multiplier,
    victoryBonusPercent: settings?.victoryBonusPercent ?? DEFAULT_SETTINGS.victoryBonusPercent,
    showLeaderboardLink: settings?.showLeaderboardLink ?? DEFAULT_SETTINGS.showLeaderboardLink,
    enableMagicBlock: settings?.enableMagicBlock ?? DEFAULT_SETTINGS.enableMagicBlock,
    enableVRF: settings?.enableVRF ?? DEFAULT_SETTINGS.enableVRF,
    criticalChance: settings?.criticalChance ?? DEFAULT_SETTINGS.criticalChance,
    criticalMultiplier: settings?.criticalMultiplier ?? DEFAULT_SETTINGS.criticalMultiplier,
    dodgeSuccessRate: settings?.dodgeSuccessRate ?? DEFAULT_SETTINGS.dodgeSuccessRate,
    braceReduction: settings?.braceReduction ?? DEFAULT_SETTINGS.braceReduction,
    fleeChanceBase: settings?.fleeChanceBase ?? DEFAULT_SETTINGS.fleeChanceBase,
    fleeCleanRatio: settings?.fleeCleanRatio ?? DEFAULT_SETTINGS.fleeCleanRatio,
    staminaRegen: settings?.staminaRegen ?? DEFAULT_SETTINGS.staminaRegen,
  } as GameSettings;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-lg">
      <SettingsSection title="Loot Chances">
        <SettingSlider label="Base Bonus Loot (Rooms 1-4)" value={cs.lootChanceBase} min={0} max={1} step={0.05} format={pct} onChange={(v) => saveSettings({ lootChanceBase: v })} />
        <SettingSlider label="Flooded Halls Bonus (Rooms 5-8)" value={cs.lootChanceDepth5} min={0} max={1} step={0.05} format={pct} onChange={(v) => saveSettings({ lootChanceDepth5: v })} />
        <SettingSlider label="The Abyss Bonus (Rooms 9-12)" value={cs.lootChanceDepth9} min={0} max={1} step={0.05} format={pct} onChange={(v) => saveSettings({ lootChanceDepth9: v })} />
      </SettingsSection>
      <SettingsSection title="Combat">
        <SettingSlider label="Base Damage Min" value={cs.baseDamageMin} min={5} max={30} step={1} onChange={(v) => saveSettings({ baseDamageMin: v })} />
        <SettingSlider label="Base Damage Max" value={cs.baseDamageMax} min={10} max={50} step={1} onChange={(v) => saveSettings({ baseDamageMax: v })} />
        <SettingSlider label="Tier 2 Multiplier" value={cs.tier2Multiplier} min={1} max={3} step={0.1} format={mult} onChange={(v) => saveSettings({ tier2Multiplier: v })} />
        <SettingSlider label="Tier 3 Multiplier" value={cs.tier3Multiplier} min={1} max={4} step={0.1} format={mult} onChange={(v) => saveSettings({ tier3Multiplier: v })} />
      </SettingsSection>
      <SettingsSection title="Victory">
        <SettingSlider label="Victory Pool Bonus" value={cs.victoryBonusPercent} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => saveSettings({ victoryBonusPercent: v })} />
      </SettingsSection>
      <SettingsSection title="⚔️ COMBAT TUNING">
        <SettingSlider label="Critical Chance" value={cs.criticalChance} min={0} max={1} step={0.01} format={pct} onChange={(v) => saveSettings({ criticalChance: v })} />
        <SettingSlider label="Critical Multiplier" value={cs.criticalMultiplier} min={1} max={3} step={0.05} format={mult} onChange={(v) => saveSettings({ criticalMultiplier: v })} />
        <SettingSlider label="Dodge Success Rate" value={cs.dodgeSuccessRate} min={0} max={1} step={0.01} format={pct} onChange={(v) => saveSettings({ dodgeSuccessRate: v })} />
        <SettingSlider label="Brace Reduction" value={cs.braceReduction} min={0} max={1} step={0.01} format={pct} onChange={(v) => saveSettings({ braceReduction: v })} />
        <SettingSlider label="Flee Chance Base" value={cs.fleeChanceBase} min={0} max={1} step={0.01} format={pct} onChange={(v) => saveSettings({ fleeChanceBase: v })} />
        <SettingSlider label="Flee Clean Ratio" value={cs.fleeCleanRatio} min={0} max={1} step={0.01} format={pct} onChange={(v) => saveSettings({ fleeCleanRatio: v })} />
        <SettingSlider label="Stamina Regen" value={cs.staminaRegen} min={0} max={3} step={1} onChange={(v) => saveSettings({ staminaRegen: v })} />
      </SettingsSection>
      <SettingsSection title="UI">
        <SettingToggle label="Show Leaderboard Link" description="Display leaderboard link on the title screen" value={cs.showLeaderboardLink} onChange={(v) => saveSettings({ showLeaderboardLink: v })} />
        <SettingToggle
          label="MagicBlock Ephemeral Rollups"
          description="Record runs on-chain via ER. Settlement requires ER commit before L1 payout. Falls back to legacy if unavailable."
          value={cs.enableMagicBlock}
          onChange={(v) => saveSettings(v ? { enableMagicBlock: true } : { enableMagicBlock: false, enableVRF: false })}
        />
        <SettingToggle
          label="Use VRF Randomness (requires ER)"
          description="Use MagicBlock VRF oracle for verifiable run seeds. Free on ER."
          value={cs.enableVRF && cs.enableMagicBlock}
          disabled={!cs.enableMagicBlock}
          onChange={(v) => saveSettings({ enableVRF: v })}
        />
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🗺️ ZONES TAB
// ═══════════════════════════════════════════════════════════════════════════════

const ZONE_META = [
  {
    id: 'sunken-crypt',
    name: 'The Sunken Crypt',
    theme: 'Drowned ruins, echoing halls',
    mechanic: 'Core zone — full variation pool',
    boss: 'The Drowned Warden',
    emoji: '🏚️',
    creatures: 21,
    fragmented: false,
  },
  {
    id: 'ashen-crypts',
    name: 'The Ashen Crypts',
    theme: 'Scorched bone and ember',
    mechanic: 'BURN — damage over time stacks',
    boss: 'Pyre Keeper',
    emoji: '🔥',
    creatures: 8,
    fragmented: true,
  },
  {
    id: 'frozen-gallery',
    name: 'The Frozen Gallery',
    theme: 'Glacial silence, preserved dead',
    mechanic: 'CHILL/FREEZE — slows and locks actions',
    boss: 'Glacial Sovereign',
    emoji: '❄️',
    creatures: 5,
    fragmented: true,
  },
  {
    id: 'living-tomb',
    name: 'The Living Tomb',
    theme: 'Flesh and root, writhing walls',
    mechanic: 'INFECTION — spreads debuffs between enemies',
    boss: 'The Root',
    emoji: '🌿',
    creatures: 5,
    fragmented: true,
  },
  {
    id: 'void-beyond',
    name: 'The Void Beyond',
    theme: 'Sanity breaks, reality warps',
    mechanic: 'FLUX/CLARITY — reverse card effects',
    boss: 'The Unwritten',
    emoji: '🌀',
    creatures: 5,
    fragmented: true,
  },
];

function ZonesTab() {
  const { data: settingsData } = db.useQuery({ gameSettings: {} });
  const settings = settingsData?.gameSettings?.[0] as any;

  // enabledZones is stored as a comma-separated string in gameSettings
  const rawEnabled: string = settings?.enabledZones ?? 'sunken-crypt,ashen-crypts,frozen-gallery,living-tomb,void-beyond';
  const enabledZones: string[] = rawEnabled.split(',').map((s: string) => s.trim()).filter(Boolean);

  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [trackValue, setTrackValue] = useState('');

  const toggleZone = async (zoneId: string) => {
    const next = enabledZones.includes(zoneId)
      ? enabledZones.filter(z => z !== zoneId)
      : [...enabledZones, zoneId];
    // Always keep sunken-crypt enabled
    if (!next.includes('sunken-crypt')) next.unshift('sunken-crypt');
    const value = next.join(',');
    if (!settings) {
      await db.transact([tx.gameSettings[id()].update({ ...DEFAULT_SETTINGS, enabledZones: value })]);
    } else {
      await db.transact([tx.gameSettings[settings.id].update({ enabledZones: value })]);
    }
  };

  const saveAmbientTrack = async (zoneId: string, trackUrl: string) => {
    const key = `ambientTrack_${zoneId.replace(/-/g, '_')}`;
    if (!settings) {
      await db.transact([tx.gameSettings[id()].update({ ...DEFAULT_SETTINGS, [key]: trackUrl })]);
    } else {
      await db.transact([tx.gameSettings[settings.id].update({ [key]: trackUrl })]);
    }
    setEditingTrack(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-[var(--text-dim)] text-sm mb-2">
        Enable/disable zones live. Sunken Crypt is always on. Ambient tracks can be overridden here — leave blank to use the zone JSON default.
      </div>

      {ZONE_META.map(zone => {
        const isEnabled = enabledZones.includes(zone.id);
        const isCore = zone.id === 'sunken-crypt';
        const trackKey = `ambientTrack_${zone.id.replace(/-/g, '_')}`;
        const trackOverride = settings?.[trackKey] || '';

        return (
          <div
            key={zone.id}
            className={`bg-[var(--bg-surface)] border rounded-lg p-5 transition-opacity ${
              isEnabled ? 'border-[var(--amber-dim)]' : 'border-[var(--border)] opacity-60'
            }`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{zone.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--amber-bright)] font-bold">{zone.name}</span>
                    {isCore && (
                      <span className="text-[10px] px-2 py-0.5 bg-[var(--amber)]/20 text-[var(--amber)] rounded">CORE</span>
                    )}
                    {!isEnabled && (
                      <span className="text-[10px] px-2 py-0.5 bg-[var(--border)] text-[var(--text-dim)] rounded">DISABLED</span>
                    )}
                  </div>
                  <div className="text-[var(--text-dim)] text-sm mt-0.5">{zone.theme}</div>
                </div>
              </div>
              <button
                onClick={() => toggleZone(zone.id)}
                disabled={isCore}
                className={`px-3 py-1.5 border text-sm flex-shrink-0 transition-colors ${
                  isCore
                    ? 'border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-40'
                    : isEnabled
                    ? 'border-green-600 text-green-500 hover:bg-red-900/20 hover:border-red-600 hover:text-red-400'
                    : 'border-[var(--border)] text-[var(--text-dim)] hover:border-green-600 hover:text-green-500'
                }`}
              >
                {isEnabled ? '● LIVE' : '○ OFF'}
              </button>
            </div>

            {/* Details row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
              <div className="bg-[var(--bg-dark)] p-2 rounded">
                <div className="text-[var(--text-muted)] mb-0.5">MECHANIC</div>
                <div className="text-[var(--text)]">{zone.mechanic}</div>
              </div>
              <div className="bg-[var(--bg-dark)] p-2 rounded">
                <div className="text-[var(--text-muted)] mb-0.5">BOSS</div>
                <div className="text-[var(--text)]">{zone.boss}</div>
              </div>
              <div className="bg-[var(--bg-dark)] p-2 rounded">
                <div className="text-[var(--text-muted)] mb-0.5">BESTIARY</div>
                <div className={zone.creatures >= 8 ? 'text-green-400' : 'text-[var(--amber)]'}>
                  {zone.creatures} creatures {zone.creatures < 8 ? '⚠' : '✓'}
                </div>
              </div>
              <div className="bg-[var(--bg-dark)] p-2 rounded">
                <div className="text-[var(--text-muted)] mb-0.5">CONTENT</div>
                <div className={zone.fragmented ? 'text-[var(--amber)]' : 'text-green-400'}>
                  {zone.fragmented ? 'Fragment-based' : 'Full variations ✓'}
                </div>
              </div>
            </div>

            {/* Ambient track override */}
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] text-xs flex-shrink-0">🔊 Ambient:</span>
              {editingTrack === zone.id ? (
                <>
                  <input
                    autoFocus
                    value={trackValue}
                    onChange={e => setTrackValue(e.target.value)}
                    placeholder="https://... or /audio/zones/..."
                    className="flex-1 bg-[var(--bg-dark)] border border-[var(--amber)] text-[var(--text)] px-2 py-1 text-xs focus:outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveAmbientTrack(zone.id, trackValue);
                      if (e.key === 'Escape') setEditingTrack(null);
                    }}
                  />
                  <button onClick={() => saveAmbientTrack(zone.id, trackValue)} className="px-2 py-1 border border-[var(--amber)] text-[var(--amber)] text-xs">Save</button>
                  <button onClick={() => setEditingTrack(null)} className="px-2 py-1 border border-[var(--border)] text-[var(--text-dim)] text-xs">Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-[var(--text-dim)] text-xs flex-1 truncate">
                    {trackOverride || <span className="italic text-[var(--text-muted)]">using zone default</span>}
                  </span>
                  <button
                    onClick={() => { setEditingTrack(zone.id); setTrackValue(trackOverride); }}
                    className="px-2 py-1 border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-xs flex-shrink-0"
                  >
                    ✎ Edit
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className="text-[var(--text-muted)] text-xs pt-2">
        ⚠ Zone mechanics (BURN, CHILL, INFECTION, FLUX) are content-wired but not yet implemented in combat. Enabling these zones will serve correct lore/creatures but mechanics are pending.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👹 BESTIARY TAB
// ═══════════════════════════════════════════════════════════════════════════════

const BEHAVIORS = ['AGGRESSIVE', 'DEFENSIVE', 'CHARGING', 'ERRATIC', 'HUNTING', 'STALKING', 'RETREATING'];
const TIERS = [1, 2, 3];

const EMPTY_CREATURE = {
  name: '',
  tier: 1,
  health: { min: 40, max: 60 },
  behaviors: ['AGGRESSIVE'],
  description: '',
  emoji: '👾',
  artUrl: '',
};

function BestiaryTab() {
  const [selectedZone, setSelectedZone] = useState('sunken-crypt');
  const [creatures, setCreatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<any>({ ...EMPTY_CREATURE });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState('');

  useEffect(() => {
    setLoading(true);
    setEditingIdx(null);
    setAdding(false);
    fetch(`/api/admin/bestiary?zone=${selectedZone}`)
      .then(r => r.json())
      .then(d => { setCreatures(d.creatures || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedZone]);

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setSaveError(msg); setTimeout(() => setSaveError(''), 4000); }
    else { setSaveOk(msg); setTimeout(() => setSaveOk(''), 3000); }
  };

  const saveAll = async (updated: any[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/bestiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone: selectedZone, creatures: updated }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCreatures(updated);
      flash('Saved ✓');
    } catch (e: any) {
      flash(e.message || 'Save failed', true);
    } finally {
      setSaving(false);
    }
  };

  const commitEdit = () => {
    if (editingIdx === null || !editForm) return;
    const updated = creatures.map((c, i) => i === editingIdx ? editForm : c);
    setEditingIdx(null);
    saveAll(updated);
  };

  const deleteCreature = (idx: number) => {
    if (!confirm(`Delete "${creatures[idx].name}"?`)) return;
    saveAll(creatures.filter((_, i) => i !== idx));
  };

  const commitAdd = () => {
    if (!addForm.name.trim()) return;
    saveAll([...creatures, { ...addForm }]);
    setAdding(false);
    setAddForm({ ...EMPTY_CREATURE });
  };

  const CreatureForm = ({ form, setForm, onSave, onCancel, label }: any) => (
    <div className="mt-3 bg-[var(--bg-dark)] border border-[var(--amber)] p-4 space-y-3">
      <div className="text-[var(--amber)] text-xs mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[var(--text-muted)] text-xs mb-1">NAME</div>
          <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--amber)]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[var(--text-muted)] text-xs mb-1">EMOJI</div>
            <input value={form.emoji} onChange={e => setForm((f: any) => ({ ...f, emoji: e.target.value }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--amber)]" />
          </div>
          <div>
            <div className="text-[var(--text-muted)] text-xs mb-1">TIER</div>
            <select value={form.tier} onChange={e => setForm((f: any) => ({ ...f, tier: Number(e.target.value) }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none">
              {TIERS.map(t => <option key={t} value={t}>Tier {t}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[var(--text-muted)] text-xs mb-1">HP MIN</div>
          <input type="number" value={form.health?.min ?? 40} onChange={e => setForm((f: any) => ({ ...f, health: { ...f.health, min: Number(e.target.value) } }))}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--amber)]" />
        </div>
        <div>
          <div className="text-[var(--text-muted)] text-xs mb-1">HP MAX</div>
          <input type="number" value={form.health?.max ?? 60} onChange={e => setForm((f: any) => ({ ...f, health: { ...f.health, max: Number(e.target.value) } }))}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--amber)]" />
        </div>
      </div>
      <div>
        <div className="text-[var(--text-muted)] text-xs mb-1">ART URL</div>
        <input value={form.artUrl || ''} onChange={e => setForm((f: any) => ({ ...f, artUrl: e.target.value }))}
          placeholder="https://... or /images/beasts/..."
          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--amber)]" />
      </div>
      <div>
        <div className="text-[var(--text-muted)] text-xs mb-1">BEHAVIORS</div>
        <div className="flex flex-wrap gap-2">
          {BEHAVIORS.map(b => (
            <label key={b} className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={(form.behaviors || []).includes(b)}
                onChange={e => {
                  const cur = form.behaviors || [];
                  setForm((f: any) => ({ ...f, behaviors: e.target.checked ? [...cur, b] : cur.filter((x: string) => x !== b) }));
                }} className="accent-[var(--amber)]" />
              <span className="text-xs text-[var(--text)]">{b}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[var(--text-muted)] text-xs mb-1">DESCRIPTION</div>
        <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--amber)] resize-none" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving}
          className="px-4 py-1.5 bg-[var(--amber)] text-black text-sm font-bold hover:bg-[var(--amber-bright)] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 border border-[var(--border)] text-[var(--text-dim)] text-sm hover:border-[var(--amber)]">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Zone picker */}
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-muted)] text-sm">Zone:</span>
        <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
          className="bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--amber)]">
          {ZONE_META.map(z => <option key={z.id} value={z.id}>{z.emoji} {z.name}</option>)}
        </select>
        <span className="text-[var(--text-muted)] text-xs">{creatures.length} creatures</span>
        {saveOk && <span className="text-green-400 text-xs">{saveOk}</span>}
        {saveError && <span className="text-[var(--red)] text-xs">{saveError}</span>}
      </div>

      {loading && <div className="text-[var(--text-muted)] text-sm">Loading…</div>}

      {/* Creature list */}
      <div className="space-y-2">
        {creatures.map((c, i) => (
          <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg">
            <div className="flex items-start gap-3 p-4">
              {/* Art / emoji */}
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-[var(--bg-dark)] rounded overflow-hidden border border-[var(--border)]">
                {c.artUrl
                  ? <img src={c.artUrl} alt={c.name} className="w-full h-full object-cover" />
                  : <span className="text-2xl">{c.emoji}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[var(--amber-bright)] font-bold">{c.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[var(--border)] text-[var(--text-muted)] rounded">T{c.tier}</span>
                  <span className="text-[var(--text-muted)] text-xs">HP {c.health?.min}–{c.health?.max}</span>
                  {(c.behaviors || []).map((b: string) => (
                    <span key={b} className="text-[10px] px-1.5 py-0.5 bg-[var(--amber)]/10 text-[var(--amber)] rounded">{b}</span>
                  ))}
                </div>
                <div className="text-[var(--text-dim)] text-xs mt-1 line-clamp-2">{c.description}</div>
                {c.artUrl && <div className="text-[var(--text-muted)] text-[10px] mt-1 truncate">🖼 {c.artUrl}</div>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditingIdx(i); setEditForm({ ...c }); }}
                  className="px-2 py-1 border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-xs">✎</button>
                <button onClick={() => deleteCreature(i)}
                  className="px-2 py-1 border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--red)] hover:text-[var(--red)] text-xs">✕</button>
              </div>
            </div>
            {editingIdx === i && editForm && (
              <div className="px-4 pb-4">
                <CreatureForm form={editForm} setForm={setEditForm} onSave={commitEdit} onCancel={() => setEditingIdx(null)} label="✎ EDITING" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      {adding ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
          <CreatureForm form={addForm} setForm={setAddForm} onSave={commitAdd} onCancel={() => setAdding(false)} label="+ NEW CREATURE" />
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2 border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-sm transition-colors">
          + Add Creature
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📜 CONTENT TAB
// ═══════════════════════════════════════════════════════════════════════════════

const FRAG_CATEGORIES = ['explore', 'combat', 'corpse', 'cache', 'exit', 'options'] as const;
type FragCategory = typeof FRAG_CATEGORIES[number];

function ContentTab() {
  const [selectedZone, setSelectedZone] = useState('sunken-crypt');
  const [category, setCategory] = useState<FragCategory>('explore');
  const [fragments, setFragments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null); // "section:idx"
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    setEditKey(null);
    fetch(`/api/admin/content?zone=${selectedZone}&category=${category}`)
      .then(r => r.json())
      .then(d => { setFragments(d.fragments || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedZone, category]);

  const flash = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(''), 3000); };

  const saveEdit = async (section: string, idx: number, value: string) => {
    setSaving(true);
    try {
      const updated = { ...fragments };
      if (!updated[section]) updated[section] = [];
      updated[section][idx] = value;
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone: selectedZone, category, fragments: updated }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFragments(updated);
      setEditKey(null);
      flash('Saved ✓');
    } catch (e: any) {
      flash('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const addFragment = async (section: string) => {
    const updated = { ...fragments };
    if (!updated[section]) updated[section] = [];
    updated[section] = [...updated[section], '[New fragment — click to edit]'];
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone: selectedZone, category, fragments: updated }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFragments(updated);
      flash('Added ✓');
    } catch (e: any) { flash('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const deleteFragment = async (section: string, idx: number) => {
    const updated = { ...fragments };
    updated[section] = updated[section].filter((_: any, i: number) => i !== idx);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone: selectedZone, category, fragments: updated }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFragments(updated);
      flash('Deleted ✓');
    } catch (e: any) { flash('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const sections = Object.keys(fragments);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
          className="bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--amber)]">
          {ZONE_META.map(z => <option key={z.id} value={z.id}>{z.emoji} {z.name}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {FRAG_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-xs border transition-colors ${category === cat ? 'border-[var(--amber)] text-[var(--amber)] bg-[var(--amber)]/10' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--amber)]'}`}>
              {cat}
            </button>
          ))}
        </div>
        {saveMsg && <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-[var(--red)]' : 'text-green-400'}`}>{saveMsg}</span>}
      </div>

      {loading && <div className="text-[var(--text-muted)] text-sm">Loading…</div>}

      {sections.length === 0 && !loading && (
        <div className="text-[var(--text-muted)] text-sm py-4 text-center">No fragments found for this category.</div>
      )}

      {/* Sections */}
      {sections.map(section => (
        <div key={section} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-dark)] border-b border-[var(--border)]">
            <span className="text-[var(--amber)] text-sm font-bold uppercase tracking-wider">{section}</span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] text-xs">{(fragments[section] || []).length} entries</span>
              <button onClick={() => addFragment(section)}
                className="px-2 py-0.5 border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-xs">+ Add</button>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(fragments[section] || []).map((frag: any, idx: number) => {
              const key = `${section}:${idx}`;
              const isEditing = editKey === key;
              const text = typeof frag === 'string' ? frag : JSON.stringify(frag);
              return (
                <div key={idx} className="group px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea value={editVal} onChange={e => setEditVal(e.target.value)} rows={4}
                        className="w-full bg-[var(--bg-dark)] border border-[var(--amber)] text-[var(--text)] px-2 py-1 text-sm focus:outline-none resize-y" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(section, idx, editVal)} disabled={saving}
                          className="px-3 py-1 bg-[var(--amber)] text-black text-xs font-bold disabled:opacity-50">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditKey(null)}
                          className="px-3 py-1 border border-[var(--border)] text-[var(--text-dim)] text-xs">Cancel</button>
                        <button onClick={() => deleteFragment(section, idx)}
                          className="px-3 py-1 border border-[var(--border)] text-[var(--red)] hover:border-[var(--red)] text-xs ml-auto">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="text-[var(--text-muted)] text-xs w-5 flex-shrink-0 pt-0.5">{idx + 1}</span>
                      <span className="flex-1 text-[var(--text)] text-sm leading-relaxed">{text}</span>
                      <button onClick={() => { setEditKey(key); setEditVal(text); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-xs flex-shrink-0">✎</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎵 MUSIC TAB
// ═══════════════════════════════════════════════════════════════════════════════
function MusicTab() {
  const { data: playlistData } = db.useQuery({ playlists: {} });
  const playlists = ((playlistData?.playlists || []) as unknown as Playlist[])
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Add playlist state
  const [addUrl, setAddUrl] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Player state
  const [previewPlaylistId, setPreviewPlaylistId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudiusTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // ─── Audius helpers ──────────────────────────────────────────────────────
  const resolveAudiusId = (input: string): string => {
    // Handle full URLs like https://audius.co/user/playlist/ID
    const match = input.match(/audius\.co\/.*?\/playlist\/([\w]+)/);
    if (match) return match[1];
    // Handle API-style IDs
    return input.trim();
  };

  const fetchPlaylistMeta = async (audiusId: string) => {
    const res = await fetch(`${AUDIUS_API}/playlists/${audiusId}`);
    if (!res.ok) throw new Error('Playlist not found on Audius');
    const json = await res.json();
    return json.data?.[0] || json.data;
  };

  const fetchPlaylistTracks = async (audiusId: string): Promise<AudiusTrack[]> => {
    const res = await fetch(`${AUDIUS_API}/playlists/${audiusId}/tracks`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  };

  // ─── Add playlist ────────────────────────────────────────────────────────
  const handleAddPlaylist = async () => {
    if (!addUrl.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const audiusId = resolveAudiusId(addUrl);
      // Check for duplicates
      if (playlists.some(p => p.audiusId === audiusId)) {
        setAddError('Playlist already added');
        return;
      }
      const meta = await fetchPlaylistMeta(audiusId);
      if (!meta) throw new Error('Could not fetch playlist');
      const maxOrder = playlists.reduce((max, p) => Math.max(max, p.order || 0), 0);
      await db.transact([
        tx.playlists[id()].update({
          audiusId,
          name: meta.playlist_name || meta.name || 'Unknown',
          emoji: '🎵',
          vibe: '',
          trackCount: meta.track_count || meta.playlist_contents?.length || 0,
          enabled: true,
          order: maxOrder + 1,
        }),
      ]);
      setAddUrl('');
    } catch (e: any) {
      setAddError(e.message || 'Failed to add playlist');
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Toggle / Delete / Reorder ───────────────────────────────────────────
  const toggleEnabled = (pl: Playlist) => {
    db.transact([tx.playlists[pl.id].update({ enabled: !pl.enabled })]);
  };

  const deletePlaylist = (pl: Playlist) => {
    if (confirm(`Delete "${pl.name}"?`)) {
      db.transact([tx.playlists[pl.id].delete()]);
    }
  };

  const movePlaylist = (pl: Playlist, direction: 'up' | 'down') => {
    const idx = playlists.findIndex(p => p.id === pl.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= playlists.length) return;
    const other = playlists[swapIdx];
    db.transact([
      tx.playlists[pl.id].update({ order: other.order }),
      tx.playlists[other.id].update({ order: pl.order }),
    ]);
  };

  const updateField = (pl: Playlist, field: string, value: string) => {
    db.transact([tx.playlists[pl.id].update({ [field]: value })]);
  };

  // ─── Preview player ─────────────────────────────────────────────────────
  const loadPreview = async (pl: Playlist) => {
    if (previewPlaylistId === pl.audiusId) {
      setPreviewPlaylistId(null);
      setTracks([]);
      return;
    }
    setPreviewPlaylistId(pl.audiusId);
    setTracksLoading(true);
    try {
      const t = await fetchPlaylistTracks(pl.audiusId);
      setTracks(t);
    } catch {
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  };

  const playTrack = async (track: AudiusTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      const streamUrl = `${AUDIUS_API}/tracks/${track.id}/stream`;
      const audio = new Audio(streamUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTrack(null);
      };
      await audio.play();
      setCurrentTrack(track);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  return (
    <div className="space-y-6">
      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="bg-[var(--bg-surface)] border border-[var(--amber-dim)] p-4 rounded-lg flex items-center gap-4">
          {currentTrack.artwork?.['150x150'] ? (
            <img src={currentTrack.artwork['150x150']} alt="" className="w-12 h-12 rounded border border-[var(--border)]" />
          ) : (
            <div className="w-12 h-12 rounded border border-[var(--border)] flex items-center justify-center bg-[var(--bg-dark)]">🎵</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[var(--amber)] text-sm font-bold truncate">{currentTrack.title}</div>
            <div className="text-[var(--text-dim)] text-xs truncate">{currentTrack.user.name}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={togglePlayPause} className="px-3 py-1 border border-[var(--amber)] text-[var(--amber)] hover:bg-[var(--amber)]/10 text-sm">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={stopPlayback} className="px-3 py-1 border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--red)] hover:text-[var(--red)] text-sm">
              ■
            </button>
          </div>
        </div>
      )}

      {/* Add Playlist */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-lg">
        <h3 className="text-[var(--text)] text-sm mb-3">Add Playlist</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="Audius playlist ID or URL..."
            className="flex-1 bg-[var(--bg-dark)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--amber)]"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlaylist()}
          />
          <button
            onClick={handleAddPlaylist}
            disabled={addLoading || !addUrl.trim()}
            className="px-4 py-2 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber)] text-sm hover:bg-[var(--amber-dim)]/50 disabled:opacity-30"
          >
            {addLoading ? '...' : '+ Add'}
          </button>
        </div>
        {addError && <p className="text-[var(--red)] text-xs mt-2">⚠ {addError}</p>}
      </div>

      {/* Playlist List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="text-[var(--text)] text-sm">Playlists ({playlists.length})</h3>
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-dim)] text-xs">
              {playlists.filter(p => p.enabled).length} enabled
            </span>
            <button
              onClick={async () => {
                const removed = await deduplicatePlaylists(playlists);
                if (removed > 0) alert(`Removed ${removed} duplicate(s)`);
              }}
              className="px-2 py-1 border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)] text-xs"
            >
              🧹 Dedupe
            </button>
          </div>
        </div>

        {playlists.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-dim)] text-sm">
            No playlists yet. Add one above or seed the defaults.
            <button
              onClick={() => seedDefaultPlaylists(playlists)}
              className="block mx-auto mt-4 px-4 py-2 border border-[var(--amber)] text-[var(--amber)] text-sm hover:bg-[var(--amber)]/10"
            >
              Seed Default Playlists
            </button>
          </div>
        ) : (
          <div>
            {playlists.map((pl, i) => (
              <div key={pl.id} className={`border-b border-[var(--border)] last:border-b-0 ${!pl.enabled ? 'opacity-50' : ''}`}>
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => movePlaylist(pl, 'up')} disabled={i === 0} className="text-[var(--text-dim)] hover:text-[var(--amber)] disabled:opacity-20 text-xs leading-none">▲</button>
                    <button onClick={() => movePlaylist(pl, 'down')} disabled={i === playlists.length - 1} className="text-[var(--text-dim)] hover:text-[var(--amber)] disabled:opacity-20 text-xs leading-none">▼</button>
                  </div>

                  {/* Emoji (editable) */}
                  <input
                    value={pl.emoji}
                    onChange={(e) => updateField(pl, 'emoji', e.target.value)}
                    className="w-8 text-center bg-transparent text-lg focus:outline-none"
                    maxLength={2}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text)] text-sm font-medium truncate">{pl.name}</span>
                      <span className="text-[var(--text-dim)] text-xs">{pl.trackCount} tracks</span>
                    </div>
                    <input
                      value={pl.vibe}
                      onChange={(e) => updateField(pl, 'vibe', e.target.value)}
                      placeholder="vibe description..."
                      className="bg-transparent text-[var(--text-dim)] text-xs focus:outline-none focus:text-[var(--text)] w-full"
                    />
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => loadPreview(pl)}
                    className={`px-2 py-1 border text-xs ${
                      previewPlaylistId === pl.audiusId
                        ? 'border-[var(--amber)] text-[var(--amber)] bg-[var(--amber)]/10'
                        : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)]'
                    }`}
                  >
                    {previewPlaylistId === pl.audiusId ? '▶ Playing' : '♪ Preview'}
                  </button>

                  <button
                    onClick={() => toggleEnabled(pl)}
                    className={`px-2 py-1 border text-xs ${
                      pl.enabled
                        ? 'border-green-600 text-green-500'
                        : 'border-[var(--border)] text-[var(--text-dim)]'
                    }`}
                  >
                    {pl.enabled ? 'ON' : 'OFF'}
                  </button>

                  <button
                    onClick={() => deletePlaylist(pl)}
                    className="px-2 py-1 border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--red)] hover:text-[var(--red)] text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Track list preview */}
                {previewPlaylistId === pl.audiusId && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-dark)] max-h-64 overflow-y-auto">
                    {tracksLoading ? (
                      <div className="p-4 text-center text-[var(--amber)] text-sm animate-pulse">Loading tracks...</div>
                    ) : tracks.length === 0 ? (
                      <div className="p-4 text-center text-[var(--text-dim)] text-sm">No tracks found</div>
                    ) : (
                      tracks.map((track, ti) => (
                        <button
                          key={track.id}
                          onClick={() => playTrack(track)}
                          className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-surface)] border-b border-[var(--border)]/50 last:border-b-0 ${
                            currentTrack?.id === track.id ? 'bg-[var(--amber)]/10' : ''
                          }`}
                        >
                          <span className={`text-xs w-6 ${currentTrack?.id === track.id ? 'text-[var(--amber)]' : 'text-[var(--text-dim)]'}`}>
                            {currentTrack?.id === track.id && isPlaying ? '♪' : String(ti + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm truncate ${currentTrack?.id === track.id ? 'text-[var(--amber)]' : 'text-[var(--text)]'}`}>
                              {track.title}
                            </div>
                            <div className="text-[var(--text-dim)] text-xs truncate">{track.user.name}</div>
                          </div>
                          <span className="text-[var(--text-dim)] text-xs">
                            {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Seed default playlists into InstantDB (skips existing)
async function seedDefaultPlaylists(existingPlaylists: Playlist[] = []) {
  const defaults = [
    { audiusId: 'emQa2', name: 'Dungeon Synth', emoji: '🏰', vibe: 'Dark, atmospheric', trackCount: 21 },
    { audiusId: 'DN6Pp', name: 'Gaming Arena', emoji: '🎮', vibe: 'High energy', trackCount: 33 },
    { audiusId: 'nqZmb', name: 'Lo-Fi Nights', emoji: '🌙', vibe: 'Chill', trackCount: 198 },
    { audiusId: '3AA6Z', name: 'Dark Ambient', emoji: '🌑', vibe: 'Moody, intense', trackCount: 9 },
    { audiusId: '5ON2AWX', name: 'Gaming Mix', emoji: '🕹️', vibe: 'Variety', trackCount: 331 },
    { audiusId: 'ebd1O', name: 'Lofi Road Trip', emoji: '🚗', vibe: 'Chill vibes', trackCount: 112 },
  ];
  const existingIds = new Set(existingPlaylists.map(p => p.audiusId));
  const toAdd = defaults.filter(d => !existingIds.has(d.audiusId));
  if (toAdd.length === 0) {
    alert('All default playlists already exist!');
    return;
  }
  const maxOrder = existingPlaylists.reduce((max, p) => Math.max(max, p.order || 0), 0);
  const txns = toAdd.map((pl, i) =>
    tx.playlists[id()].update({ ...pl, enabled: true, order: maxOrder + i + 1 })
  );
  await db.transact(txns);
}

// Remove duplicate playlists (keep first by order)
async function deduplicatePlaylists(playlists: Playlist[]) {
  const seen = new Map<string, Playlist>();
  const toDelete: string[] = [];
  for (const pl of playlists) {
    if (seen.has(pl.audiusId)) {
      toDelete.push(pl.id);
    } else {
      seen.set(pl.audiusId, pl);
    }
  }
  if (toDelete.length === 0) {
    alert('No duplicates found!');
    return 0;
  }
  const txns = toDelete.map(plId => tx.playlists[plId].delete());
  await db.transact(txns);
  return toDelete.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💀 DEATHS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DeathsTab() {
  const { data: deathsData } = db.useQuery({ deaths: {} });
  const deaths = deathsData?.deaths || [];

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-lg">
      <h2 className="text-lg text-[var(--amber)] mb-4">💀 Recent Deaths</h2>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {[...deaths].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50).map((death: any, i: number) => (
          <div key={death.id || i} className="flex justify-between text-sm border-b border-[var(--border)] pb-2">
            <div className="flex flex-col">
              <span className="text-[var(--text)]">
                {death.playerName || 'Unknown'} — Room {death.room || '?'}
              </span>
              {death.killedBy && (
                <span className="text-[var(--text-muted)] text-xs">Killed by: {death.killedBy}</span>
              )}
              {death.finalMessage && (
                <span className="text-[var(--text-dim)] text-xs italic">"{death.finalMessage}"</span>
              )}
            </div>
            <span className="text-[var(--text-dim)] text-right text-xs whitespace-nowrap ml-4">
              {(death.createdAt || death.timestamp)
                ? new Date(death.createdAt || death.timestamp).toLocaleString('en-US', {
                    month: '2-digit', day: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  })
                : 'Unknown'}
            </span>
          </div>
        ))}
        {deaths.length === 0 && (
          <p className="text-[var(--text-dim)]">No deaths recorded yet.</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚰️ CORPSES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CorpsesTab() {
  const { data: corpsesData } = db.useQuery({ corpses: {} });
  const corpses = corpsesData?.corpses || [];
  const sorted = [...corpses].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

  const undiscovered = sorted.filter((c: any) => !c.discovered);
  const discovered = sorted.filter((c: any) => c.discovered && !c.tipped);
  const tipped = sorted.filter((c: any) => c.tipped);

  const getZoneColor = (zone: string) => {
    if (zone?.includes('Upper')) return 'var(--amber)';
    if (zone?.includes('Flooded')) return '#60a5fa';
    if (zone?.includes('Abyss')) return 'var(--purple)';
    return 'var(--text-dim)';
  };

  const renderCorpse = (corpse: any) => (
    <div
      key={corpse.id}
      className={`border p-4 rounded-lg mb-3 ${
        !corpse.discovered
          ? 'border-[var(--green)] bg-[var(--green)]/5'
          : corpse.tipped
          ? 'border-[var(--amber)] bg-[var(--amber)]/5'
          : 'border-[var(--border)] bg-[var(--bg-surface)]'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">💀</span>
          <span className="text-[var(--purple)] font-bold">@{corpse.playerName}</span>
        </div>
        <div className="flex gap-2">
          {!corpse.discovered && (
            <span className="text-[10px] px-2 py-0.5 bg-[var(--green)]/20 text-[var(--green)] rounded">ACTIVE</span>
          )}
          {corpse.discovered && !corpse.tipped && (
            <span className="text-[10px] px-2 py-0.5 bg-[var(--border)] text-[var(--text-dim)] rounded">LOOTED</span>
          )}
          {corpse.tipped && (
            <span className="text-[10px] px-2 py-0.5 bg-[var(--amber)]/20 text-[var(--amber)] rounded">TIPPED</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm mb-2">
        <span style={{ color: getZoneColor(corpse.zone) }}>{corpse.zone}</span>
        <span className="text-[var(--text-dim)]">•</span>
        <span className="text-[var(--text-muted)]">Room {corpse.room}</span>
      </div>

      <div className="bg-black/20 p-2 rounded mb-2">
        <p className="text-[var(--text)] text-sm italic">"{corpse.finalMessage}"</p>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-[var(--amber)]">{corpse.lootEmoji} {corpse.loot}</span>
        <span className="text-[var(--text-dim)]">
          {corpse.createdAt ? new Date(corpse.createdAt).toLocaleString('en-US', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
          }) : 'Unknown'}
        </span>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] mt-1">
        {corpse.walletAddress?.slice(0, 8)}...{corpse.walletAddress?.slice(-4)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--green)] p-4 rounded-lg text-center">
          <div className="text-2xl text-[var(--green)] font-bold">{undiscovered.length}</div>
          <div className="text-[var(--text-dim)] text-sm">Active (Undiscovered)</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-lg text-center">
          <div className="text-2xl text-[var(--text)] font-bold">{discovered.length}</div>
          <div className="text-[var(--text-dim)] text-sm">Looted</div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--amber)] p-4 rounded-lg text-center">
          <div className="text-2xl text-[var(--amber)] font-bold">{tipped.length}</div>
          <div className="text-[var(--text-dim)] text-sm">Tipped</div>
        </div>
      </div>

      {/* Active Corpses */}
      {undiscovered.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-lg">
          <h2 className="text-lg text-[var(--green)] mb-4">🟢 Active Corpses ({undiscovered.length})</h2>
          <div className="max-h-[400px] overflow-y-auto">
            {undiscovered.map(renderCorpse)}
          </div>
        </div>
      )}

      {/* All Corpses */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-lg">
        <h2 className="text-lg text-[var(--amber)] mb-4">⚰️ All Corpses ({sorted.length})</h2>
        <div className="max-h-[600px] overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="text-[var(--text-dim)]">No corpses found.</p>
          ) : (
            sorted.map(renderCorpse)
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-lg">
      <div className="text-2xl text-[var(--amber-bright)] font-bold">{value}</div>
      <div className="text-[var(--text-dim)] text-sm">{label}</div>
      {subtitle && <div className="text-[var(--text-muted)] text-xs">{subtitle}</div>}
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[var(--text)] font-medium mb-3">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const mult = (v: number) => `${v.toFixed(1)}x`;

function SettingSlider({ label, value, min, max, step, format = (v) => v.toString(), onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-[var(--text-dim)] text-sm w-48">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-[var(--amber)]" />
      <span className="text-[var(--amber)] text-sm w-16 text-right">{format(value)}</span>
    </div>
  );
}

function SettingToggle({ label, description, value, onChange, disabled = false }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  const id = `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-60' : ''}`}>
      <div>
        <label htmlFor={id} className={`text-[var(--text-dim)] text-sm ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>{label}</label>
        {description && <p className="text-[var(--text-muted)] text-xs mt-0.5">{description}</p>}
      </div>
      <label htmlFor={id} className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          id={id}
          checked={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full peer peer-checked:bg-[var(--amber)] peer-checked:border-[var(--amber)] transition-colors disabled:opacity-50" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

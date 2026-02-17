'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { init, tx, id } from '@instantdb/react';

// InstantDB setup
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || '';
const db = init({ appId: APP_ID });

// Admin wallet addresses - set via env or hardcode
const ADMIN_WALLETS = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || '')
  .split(',')
  .map(w => w.trim())
  .filter(Boolean)
  .concat([
    'D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL', // Pool wallet (fallback)
  ]);

interface GameSettings {
  id: string;
  // Loot settings
  lootChanceBase: number;      // Base bonus loot chance (0-1)
  lootChanceDepth5: number;    // Bonus loot at depth 5+ (0-1)
  lootChanceDepth9: number;    // Bonus loot at depth 9+ (0-1)
  // Combat settings
  baseDamageMin: number;
  baseDamageMax: number;
  tier2Multiplier: number;
  tier3Multiplier: number;
  // Victory settings
  victoryBonusPercent: number; // % of pool for winners
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
};

export default function AdminPage() {
  const { publicKey, connected } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check admin status
  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toBase58();
      setIsAdmin(ADMIN_WALLETS.includes(walletAddress));
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  }, [connected, publicKey]);

  // Query metrics from InstantDB
  const { data: deathsData } = db.useQuery({ deaths: {} });
  const { data: corpsesData } = db.useQuery({ corpses: {} });
  const { data: playersData } = db.useQuery({ players: {} });
  const { data: settingsData } = db.useQuery({ gameSettings: {} });

  const deaths = deathsData?.deaths || [];
  const corpses = corpsesData?.corpses || [];
  const players = playersData?.players || [];
  const settings = settingsData?.gameSettings?.[0] || null;

  // Calculate metrics
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
  
  // Deaths in last 24h
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentDeaths = deaths.filter((d: any) => (d.createdAt || d.timestamp) > oneDayAgo).length;
  
  // Most common death room
  const roomCounts: Record<number, number> = {};
  deaths.forEach((d: any) => {
    const room = d.room || 1;
    roomCounts[room] = (roomCounts[room] || 0) + 1;
  });
  const deadliestRoom = Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0];

  // Save settings handler
  const saveSettings = async (newSettings: Partial<GameSettings>) => {
    if (!settings) {
      // Create new settings
      await db.transact([
        tx.gameSettings[id()].update({
          ...DEFAULT_SETTINGS,
          ...newSettings,
        }),
      ]);
    } else {
      // Update existing
      await db.transact([
        tx.gameSettings[settings.id].update(newSettings),
      ]);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] flex items-center justify-center">
        <div className="text-[var(--amber)] animate-pulse">Loading...</div>
      </div>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl text-[var(--amber-bright)] mb-4">🔒 Admin Dashboard</h1>
        <p className="text-[var(--text-dim)] mb-6">Connect your wallet to access admin features.</p>
        <WalletMultiButton />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl text-[var(--red)] mb-4">⛔ Access Denied</h1>
        <p className="text-[var(--text-dim)] mb-2">Your wallet is not authorized for admin access.</p>
        <p className="text-[var(--text-muted)] text-sm font-mono">{publicKey?.toBase58()}</p>
      </div>
    );
  }

  // Current settings (with defaults)
  const currentSettings: GameSettings = {
    id: settings?.id || '',
    lootChanceBase: settings?.lootChanceBase ?? DEFAULT_SETTINGS.lootChanceBase,
    lootChanceDepth5: settings?.lootChanceDepth5 ?? DEFAULT_SETTINGS.lootChanceDepth5,
    lootChanceDepth9: settings?.lootChanceDepth9 ?? DEFAULT_SETTINGS.lootChanceDepth9,
    baseDamageMin: settings?.baseDamageMin ?? DEFAULT_SETTINGS.baseDamageMin,
    baseDamageMax: settings?.baseDamageMax ?? DEFAULT_SETTINGS.baseDamageMax,
    tier2Multiplier: settings?.tier2Multiplier ?? DEFAULT_SETTINGS.tier2Multiplier,
    tier3Multiplier: settings?.tier3Multiplier ?? DEFAULT_SETTINGS.tier3Multiplier,
    victoryBonusPercent: settings?.victoryBonusPercent ?? DEFAULT_SETTINGS.victoryBonusPercent,
  };

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl text-[var(--amber-bright)]">🎛️ Admin Dashboard</h1>
            <p className="text-[var(--text-dim)] text-sm">Die Forward Game Settings</p>
          </div>
          <a href="/" className="text-[var(--amber-dim)] hover:text-[var(--amber)] text-sm">
            ← Back to Game
          </a>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* Settings Panel */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-lg">
          <h2 className="text-lg text-[var(--amber)] mb-6">⚙️ Game Settings</h2>
          
          {/* Loot Settings */}
          <SettingsSection title="Loot Chances">
            <SettingSlider
              label="Base Bonus Loot (Rooms 1-4)"
              value={currentSettings.lootChanceBase}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => saveSettings({ lootChanceBase: v })}
            />
            <SettingSlider
              label="Flooded Halls Bonus (Rooms 5-8)"
              value={currentSettings.lootChanceDepth5}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => saveSettings({ lootChanceDepth5: v })}
            />
            <SettingSlider
              label="The Abyss Bonus (Rooms 9-12)"
              value={currentSettings.lootChanceDepth9}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => saveSettings({ lootChanceDepth9: v })}
            />
          </SettingsSection>

          {/* Combat Settings */}
          <SettingsSection title="Combat">
            <SettingSlider
              label="Base Damage Min"
              value={currentSettings.baseDamageMin}
              min={5}
              max={30}
              step={1}
              onChange={(v) => saveSettings({ baseDamageMin: v })}
            />
            <SettingSlider
              label="Base Damage Max"
              value={currentSettings.baseDamageMax}
              min={10}
              max={50}
              step={1}
              onChange={(v) => saveSettings({ baseDamageMax: v })}
            />
            <SettingSlider
              label="Tier 2 Damage Multiplier"
              value={currentSettings.tier2Multiplier}
              min={1}
              max={3}
              step={0.1}
              format={(v) => `${v.toFixed(1)}x`}
              onChange={(v) => saveSettings({ tier2Multiplier: v })}
            />
            <SettingSlider
              label="Tier 3 Damage Multiplier"
              value={currentSettings.tier3Multiplier}
              min={1}
              max={4}
              step={0.1}
              format={(v) => `${v.toFixed(1)}x`}
              onChange={(v) => saveSettings({ tier3Multiplier: v })}
            />
          </SettingsSection>

          {/* Victory Settings */}
          <SettingsSection title="Victory">
            <SettingSlider
              label="Victory Pool Bonus"
              value={currentSettings.victoryBonusPercent}
              min={10}
              max={100}
              step={5}
              format={(v) => `${v}%`}
              onChange={(v) => saveSettings({ victoryBonusPercent: v })}
            />
          </SettingsSection>
        </div>

        {/* Recent Deaths */}
        <div className="mt-8 bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-lg">
          <h2 className="text-lg text-[var(--amber)] mb-4">💀 Recent Deaths</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...deaths].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 20).map((death: any, i: number) => (
              <div key={death.id || i} className="flex justify-between text-sm border-b border-[var(--border)] pb-2">
                <div className="flex flex-col">
                  <span className="text-[var(--text)]">
                    {death.playerName || 'Unknown'} — Room {death.room || '?'}
                  </span>
                  {death.killedBy && (
                    <span className="text-[var(--text-muted)] text-xs">Killed by: {death.killedBy}</span>
                  )}
                </div>
                <span className="text-[var(--text-dim)] text-right">
                  {(death.createdAt || death.timestamp) 
                    ? new Date(death.createdAt || death.timestamp).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
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
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-lg">
      <div className="text-2xl text-[var(--amber-bright)] font-bold">{value}</div>
      <div className="text-[var(--text-dim)] text-sm">{label}</div>
      {subtitle && <div className="text-[var(--text-muted)] text-xs">{subtitle}</div>}
    </div>
  );
}

// Settings Section Component
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[var(--text)] font-medium mb-3">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Setting Slider Component
function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  format = (v) => v.toString(),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-[var(--text-dim)] text-sm w-48">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-[var(--amber)]"
      />
      <span className="text-[var(--amber)] text-sm w-16 text-right font-mono">
        {format(value)}
      </span>
    </div>
  );
}

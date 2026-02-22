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
  showVictorsFeed: boolean;
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
  showVictorsFeed: false,
};

type Tab = 'dashboard' | 'settings' | 'music' | 'deaths';

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
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'deaths', label: 'Deaths', icon: '💀' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] font-mono">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl text-[var(--amber-bright)]">🎛️ Die Forward Admin</h1>
            </div>
            <a href="/" className="text-[var(--amber-dim)] hover:text-[var(--amber)] text-sm">
              ← Back to Game
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm border-b-2 transition-colors ${
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
        {activeTab === 'music' && <MusicTab />}
        {activeTab === 'deaths' && <DeathsTab />}
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
    showVictorsFeed: settings?.showVictorsFeed ?? DEFAULT_SETTINGS.showVictorsFeed,
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
      <SettingsSection title="UI">
        <SettingToggle label="Show Victors Feed" description="Display the victors tab on the title screen" value={cs.showVictorsFeed} onChange={(v) => saveSettings({ showVictorsFeed: v })} />
      </SettingsSection>
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
          <span className="text-[var(--text-dim)] text-xs">
            {playlists.filter(p => p.enabled).length} enabled
          </span>
        </div>

        {playlists.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-dim)] text-sm">
            No playlists yet. Add one above or seed the defaults.
            <button
              onClick={() => seedDefaultPlaylists()}
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

// Seed default playlists into InstantDB
async function seedDefaultPlaylists() {
  const defaults = [
    { audiusId: 'emQa2', name: 'Dungeon Synth', emoji: '🏰', vibe: 'Dark, atmospheric', trackCount: 21 },
    { audiusId: 'DN6Pp', name: 'Gaming Arena', emoji: '🎮', vibe: 'High energy', trackCount: 33 },
    { audiusId: 'nqZmb', name: 'Lo-Fi Nights', emoji: '🌙', vibe: 'Chill', trackCount: 198 },
    { audiusId: '3AA6Z', name: 'Dark Ambient', emoji: '🌑', vibe: 'Moody, intense', trackCount: 9 },
    { audiusId: '5ON2AWX', name: 'Gaming Mix', emoji: '🕹️', vibe: 'Variety', trackCount: 331 },
    { audiusId: 'ebd1O', name: 'Lofi Road Trip', emoji: '🚗', vibe: 'Chill vibes', trackCount: 112 },
  ];
  const txns = defaults.map((pl, i) =>
    tx.playlists[id()].update({ ...pl, enabled: true, order: i + 1 })
  );
  await db.transact(txns);
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

function SettingToggle({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label className="text-[var(--text-dim)] text-sm">{label}</label>
        {description && <p className="text-[var(--text-muted)] text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative ${
          value ? 'bg-[var(--amber)]' : 'bg-[var(--bg-surface)]'
        } border border-[var(--border)]`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}

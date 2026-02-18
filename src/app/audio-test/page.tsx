'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

interface SoundPreset {
  id: string;
  name: string;
  prompt: string;
  duration: number;
  category: string;
}

const presets: SoundPreset[] = [
  // Ambient (loops)
  { id: 'ambient-explore', name: 'Exploration Loop', prompt: 'dark cave ambient atmosphere water dripping echoes distant rumble underground dungeon mysterious low drone', duration: 15, category: 'Ambient' },
  { id: 'ambient-combat', name: 'Combat Loop', prompt: 'tense combat music pulsing danger heartbeat drums aggressive dark battle tension rising stakes fight', duration: 15, category: 'Ambient' },
  { id: 'ambient-title', name: 'Title Loop', prompt: 'mysterious title screen ambient dark fantasy dungeon crawler ominous anticipation ancient evil lurking ethereal choir low', duration: 15, category: 'Ambient' },
  { id: 'ambient-death', name: 'Death Loop', prompt: 'somber death ambient dark mourning low drone despair fading hope final moments haunting ethereal sad', duration: 12, category: 'Ambient' },
  { id: 'ambient-victory', name: 'Victory Loop', prompt: 'triumphant victory ambient relief success emerged from darkness hopeful yet eerie dungeon conquered mystical ascending', duration: 12, category: 'Ambient' },
  
  // Combat (original)
  { id: 'sword-slash', name: 'Attack Impact', prompt: 'heavy blunt impact thud bone cracking wet flesh thump weapon hitting body cave echo', duration: 1.5, category: 'Combat' },
  { id: 'blunt-hit', name: 'Blunt Impact', prompt: 'heavy blunt impact thud flesh bone crushing hit meaty punch', duration: 1.5, category: 'Combat' },
  { id: 'damage-taken', name: 'Damage Taken', prompt: 'painful grunt impact wound flesh tear visceral hurt', duration: 1.5, category: 'Combat' },
  { id: 'enemy-death', name: 'Enemy Death', prompt: 'monster death gurgle creature dying last breath grotesque wet', duration: 2, category: 'Combat' },
  
  // Combat (new)
  { id: 'boss-intro', name: 'Boss Intro', prompt: 'Deep ominous rumble and low growl of an ancient creature awakening in a dark dungeon', duration: 3, category: 'Combat' },
  { id: 'boss-roar', name: 'Boss Roar', prompt: 'Terrifying monster roar attack sound in a cave, echoing', duration: 2, category: 'Combat' },
  { id: 'dodge-whoosh', name: 'Dodge Whoosh', prompt: 'Quick swoosh of fast movement dodging an attack, cloth and air', duration: 1, category: 'Combat' },
  { id: 'brace-impact', name: 'Brace Impact', prompt: 'Shield blocking heavy impact, metal thud with grunt', duration: 1, category: 'Combat' },
  { id: 'flee-run', name: 'Flee Run', prompt: 'Frantic running footsteps on stone, splashing through water', duration: 2, category: 'Combat' },
  { id: 'flee-fail', name: 'Flee Fail', prompt: 'Body stumbling and falling on stone floor, impact thud, no voice no scream, physical fall sound only', duration: 1.5, category: 'Combat' },
  { id: 'enemy-growl', name: 'Enemy Growl', prompt: 'Menacing creature growl, undead monster preparing to attack', duration: 1.5, category: 'Combat' },
  { id: 'critical-hit', name: 'Critical Hit', prompt: 'Powerful sword slash impact, bone crunch, devastating blow', duration: 1, category: 'Combat' },
  { id: 'parry-clang', name: 'Parry Clang', prompt: 'Metal sword parry clang, sparks flying, defensive block', duration: 1, category: 'Combat' },
  { id: 'attack-miss', name: 'Attack Miss', prompt: 'Sword swing through air missing target, whoosh', duration: 1, category: 'Combat' },
  
  // Player (original)
  { id: 'player-death', name: 'Player Death', prompt: 'dark dramatic death final breath soul leaving body haunting echo fade', duration: 3, category: 'Player' },
  { id: 'victory', name: 'Victory Resolve', prompt: 'silence then single deep resolution tone low drone relief tension release fading echo solemn', duration: 4, category: 'Player' },
  { id: 'heal', name: 'Heal', prompt: 'soft magical shimmer gentle restoration subtle glow followed by relieved exhale breath out calm recovery', duration: 2, category: 'Player' },
  
  // Player (new)
  { id: 'heartbeat-low', name: 'Low Health Heartbeat', prompt: 'Tense heartbeat pounding, low health warning, pulse racing', duration: 2, category: 'Player' },
  { id: 'stamina-depleted', name: 'Stamina Depleted', prompt: 'Exhausted gasp for breath, out of energy, tired panting', duration: 1.5, category: 'Player' },
  { id: 'stamina-recover', name: 'Stamina Recover', prompt: 'Deep breath recovery, catching breath, energy returning', duration: 1.5, category: 'Player' },
  { id: 'poison-tick', name: 'Poison Tick', prompt: 'Poison damage sound, sizzling pain, toxic effect', duration: 1, category: 'Player' },
  
  // Environment (original)
  { id: 'footstep', name: 'Footstep (Stone)', prompt: 'single footstep wet stone cave dungeon echo drip', duration: 1, category: 'Environment' },
  { id: 'item-pickup', name: 'Item Discover', prompt: 'muted subtle chime low resonance ancient artifact pickup soft not bright understated', duration: 1.5, category: 'Environment' },
  { id: 'corpse-discover', name: 'Corpse Discover', prompt: 'silence then single mournful sustained tone somber discovery fading slowly dark ambient', duration: 3, category: 'Environment' },
  { id: 'door-creak', name: 'Door Creak', prompt: 'heavy stone door creak grind ancient dungeon ominous slow', duration: 2.5, category: 'Environment' },
  { id: 'water-drip', name: 'Water Drip', prompt: 'cave water drip echo underground pool splash ambient', duration: 2, category: 'Environment' },
  
  // Environment (new)
  { id: 'depth-descend', name: 'Depth Descend', prompt: 'Descending deeper underground, echoing footsteps, ominous atmosphere shift', duration: 2.5, category: 'Environment' },
  { id: 'water-splash', name: 'Water Splash', prompt: 'Wading through shallow water in dark cave, splashing footsteps', duration: 1.5, category: 'Environment' },
  { id: 'chains-rattle', name: 'Chains Rattle', prompt: 'Rusty chains rattling in dungeon, ghostly and metallic', duration: 2, category: 'Environment' },
  { id: 'eerie-whispers', name: 'Eerie Whispers', prompt: 'Creepy ghostly whispers in darkness, unintelligible voices', duration: 2.5, category: 'Environment' },
  { id: 'stone-grinding', name: 'Stone Grinding', prompt: 'Heavy stone door slowly grinding open, ancient mechanism', duration: 2, category: 'Environment' },
  { id: 'drip-echo', name: 'Drip Echo', prompt: 'Water dripping in vast underground cavern, echoing drops', duration: 2, category: 'Environment' },
  
  // Rewards
  { id: 'tip-chime', name: 'Tip Chime', prompt: 'Magical coin chime, cryptocurrency transfer sound, sparkle', duration: 1, category: 'Rewards' },
  { id: 'loot-discover', name: 'Loot Discover', prompt: 'Treasure discovery sound, gleaming reveal, valuable find', duration: 1.5, category: 'Rewards' },
  { id: 'victory-fanfare', name: 'Victory Fanfare', prompt: 'Epic victory fanfare, triumphant horns, heroic achievement', duration: 3, category: 'Rewards' },
  { id: 'share-click', name: 'Share Click', prompt: 'Camera shutter click, screenshot capture, share moment', duration: 0.5, category: 'Rewards' },
  
  // UI (original)
  { id: 'ui-click', name: 'UI Click', prompt: 'subtle click interface button press soft mechanical', duration: 0.5, category: 'UI' },
  { id: 'ui-hover', name: 'UI Hover', prompt: 'soft whoosh hover subtle mystical whisper interface', duration: 0.5, category: 'UI' },
  
  // UI (new)
  { id: 'menu-open', name: 'Menu Open', prompt: 'Soft UI menu opening sound, gentle whoosh reveal', duration: 0.5, category: 'UI' },
  { id: 'menu-close', name: 'Menu Close', prompt: 'Soft UI menu closing sound, gentle slide away', duration: 0.5, category: 'UI' },
  { id: 'confirm-action', name: 'Confirm Action', prompt: 'Positive confirmation click, action accepted, success tap', duration: 0.5, category: 'UI' },
  { id: 'error-buzz', name: 'Error Buzz', prompt: 'Error buzz sound, action denied, negative feedback', duration: 0.5, category: 'UI' },
];

interface GeneratedSound {
  id: string;
  name: string;
  path: string;
  size: number;
}

export default function AudioTestPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedSound[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDuration, setCustomDuration] = useState(2);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check for existing audio files on mount (parallel for speed)
  React.useEffect(() => {
    const checkExisting = async () => {
      const checks = presets.map(async (preset) => {
        try {
          const res = await fetch(`/audio/${preset.id}.mp3`, { method: 'HEAD' });
          if (res.ok) {
            const size = parseInt(res.headers.get('content-length') || '0');
            return {
              id: preset.id,
              name: preset.name,
              path: `/audio/${preset.id}.mp3`,
              size,
            };
          }
        } catch {
          // File doesn't exist
        }
        return null;
      });
      
      const results = await Promise.all(checks);
      const existing = results.filter((r): r is GeneratedSound => r !== null);
      if (existing.length > 0) {
        setGenerated(existing);
      }
    };
    checkExisting();
  }, []);

  // Check if a sound already exists (generated this session)
  const isGenerated = (id: string) => generated.some(s => s.id === id);

  const generateSound = async (preset: SoundPreset) => {
    setGenerating(preset.id);
    setError(null);

    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: preset.prompt,
          filename: preset.id,
          duration: preset.duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      setGenerated(prev => [...prev.filter(s => s.id !== preset.id), {
        id: preset.id,
        name: preset.name,
        path: data.path,
        size: data.size,
      }]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const generateCustom = async () => {
    if (!customPrompt.trim() || !customName.trim()) return;
    
    const id = customName.toLowerCase().replace(/\s+/g, '-');
    await generateSound({
      id,
      name: customName,
      prompt: customPrompt,
      duration: customDuration,
      category: 'Custom',
    });
    setCustomPrompt('');
    setCustomName('');
  };

  const playSound = (path: string, id: string, loop: boolean = false) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(path);
    audio.loop = loop;
    audioRef.current = audio;
    setPlaying(id);
    
    audio.play();
    audio.onended = () => !loop && setPlaying(null);
  };

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(null);
  };

  // Group presets by category
  const categories = [...new Set(presets.map(p => p.category))];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] font-mono p-4">
      
      {/* Header */}
      <header className="border-b border-[var(--border-dim)] pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)]">
              ← Back to Game
            </Link>
            <h1 className="text-[var(--amber-bright)] text-xl mt-2">🔊 Audio Test Lab</h1>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Generate and preview sound effects with ElevenLabs
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="text-[var(--text-muted)]">Generated</div>
            <div className="text-[var(--green-bright)] text-lg">{generated.length}</div>
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="bg-[var(--red-dim)]/20 border border-[var(--red-dim)] p-3 mb-4 text-[var(--red-bright)] text-sm">
          {error}
        </div>
      )}

      {/* Preset Sounds */}
      {categories.map(category => (
        <div key={category} className="mb-6">
          <h2 className="text-[var(--text-secondary)] text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-[var(--amber-dim)]">▸</span>
            {category}
          </h2>
          <div className="grid gap-2">
            {presets.filter(p => p.category === category).map(preset => {
              const sound = generated.find(s => s.id === preset.id);
              const isPlaying = playing === preset.id;
              const isGenerating = generating === preset.id;
              
              return (
                <div 
                  key={preset.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-3 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--text-primary)] text-sm flex items-center gap-2">
                      {preset.name}
                      <span className="text-[var(--text-dim)] text-[10px]">{preset.duration}s</span>
                      {sound && <span className="text-[var(--green)] text-[10px]">{Math.round(sound.size / 1024)}KB</span>}
                    </div>
                    <div className="text-[var(--text-dim)] text-[10px] mt-0.5 break-words">
                      {preset.prompt}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 shrink-0">
                    {/* Generate/Regenerate button */}
                    <button
                      onClick={() => generateSound(preset)}
                      disabled={isGenerating}
                      className="px-3 py-1.5 text-xs bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] disabled:opacity-50 w-20"
                    >
                      {isGenerating ? '◈ ...' : sound ? '⚡ Regen' : '⚡ Gen'}
                    </button>
                    
                    {/* Play/Stop if file exists */}
                    {sound && (
                      <button
                        onClick={() => isPlaying ? stopSound() : playSound(sound.path, sound.id, preset.category === 'Ambient')}
                        className={`px-3 py-1.5 text-xs border w-20 ${
                          isPlaying 
                            ? 'bg-[var(--red-dim)]/30 border-[var(--red)] text-[var(--red-bright)]' 
                            : 'bg-[var(--green-dim)]/30 border-[var(--green)] text-[var(--green-bright)]'
                        }`}
                      >
                        {isPlaying ? '■ Stop' : preset.category === 'Ambient' ? '🔁 Loop' : '▶ Play'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom Generation */}
      <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4 mt-8">
        <h2 className="text-[var(--text-secondary)] text-sm uppercase tracking-wider mb-3">
          ✨ Custom Sound
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Sound name (e.g., 'Boss Roar')"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-dim)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
          />
          <textarea
            placeholder="Describe the sound... (e.g., 'massive creature roar echoing through cavern deep bass rumble')"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-dim)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] h-20 resize-none"
          />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] text-xs">Duration:</span>
              <input
                type="number"
                min={0.5}
                max={5}
                step={0.5}
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-16 bg-[var(--bg-base)] border border-[var(--border-dim)] px-2 py-1 text-sm text-[var(--text-primary)] text-center"
              />
              <span className="text-[var(--text-muted)] text-xs">sec</span>
            </div>
            <button
              onClick={generateCustom}
              disabled={!customPrompt.trim() || !customName.trim() || generating !== null}
              className="px-4 py-2 text-xs bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] disabled:opacity-50"
            >
              ⚡ Generate Custom
            </button>
          </div>
        </div>
      </div>

      {/* Generated List */}
      {generated.length > 0 && (
        <div className="mt-8 border border-[var(--green-dim)] bg-[var(--green-dim)]/10 p-4">
          <h2 className="text-[var(--green-bright)] text-sm uppercase tracking-wider mb-3">
            ✓ Generated This Session
          </h2>
          <div className="text-xs text-[var(--text-muted)] space-y-1">
            {generated.map(s => (
              <div key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="text-[var(--text-dim)]">{s.path}</span>
              </div>
            ))}
          </div>
          <p className="text-[var(--text-dim)] text-[10px] mt-3">
            Files saved to <code className="text-[var(--amber)]">public/audio/</code> — persist across restarts
          </p>
        </div>
      )}

    </div>
  );
}

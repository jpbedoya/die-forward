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
  
  // Combat
  { id: 'sword-slash', name: 'Sword Slash', prompt: 'sharp sword slash swoosh metal blade cutting air fast attack', duration: 1.5, category: 'Combat' },
  { id: 'blunt-hit', name: 'Blunt Impact', prompt: 'heavy blunt impact thud flesh bone crushing hit meaty punch', duration: 1.5, category: 'Combat' },
  { id: 'damage-taken', name: 'Damage Taken', prompt: 'painful grunt impact wound flesh tear visceral hurt', duration: 1.5, category: 'Combat' },
  { id: 'enemy-death', name: 'Enemy Death', prompt: 'monster death gurgle creature dying last breath grotesque wet', duration: 2, category: 'Combat' },
  
  // Player
  { id: 'player-death', name: 'Player Death', prompt: 'dark dramatic death final breath soul leaving body haunting echo fade', duration: 3, category: 'Player' },
  { id: 'victory', name: 'Victory', prompt: 'eerie triumphant chime dark victory ancient bell reverb mystical success', duration: 3, category: 'Player' },
  { id: 'heal', name: 'Healing', prompt: 'magical healing restore shimmer warm glow mystical recovery gentle', duration: 2, category: 'Player' },
  
  // Environment
  { id: 'footstep', name: 'Footstep (Stone)', prompt: 'single footstep wet stone cave dungeon echo drip', duration: 1, category: 'Environment' },
  { id: 'item-pickup', name: 'Item Pickup', prompt: 'metallic clink pickup treasure coin pouch rustle ancient artifact', duration: 1.5, category: 'Environment' },
  { id: 'door-creak', name: 'Door Creak', prompt: 'heavy stone door creak grind ancient dungeon ominous slow', duration: 2.5, category: 'Environment' },
  { id: 'water-drip', name: 'Water Drip', prompt: 'cave water drip echo underground pool splash ambient', duration: 2, category: 'Environment' },
  
  // UI
  { id: 'ui-click', name: 'UI Click', prompt: 'subtle click interface button press soft mechanical', duration: 0.5, category: 'UI' },
  { id: 'ui-hover', name: 'UI Hover', prompt: 'soft whoosh hover subtle mystical whisper interface', duration: 0.5, category: 'UI' },
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

  // Check for existing audio files on mount
  React.useEffect(() => {
    const checkExisting = async () => {
      const existing: GeneratedSound[] = [];
      for (const preset of presets) {
        try {
          const res = await fetch(`/audio/${preset.id}.mp3`, { method: 'HEAD' });
          if (res.ok) {
            const size = parseInt(res.headers.get('content-length') || '0');
            existing.push({
              id: preset.id,
              name: preset.name,
              path: `/audio/${preset.id}.mp3`,
              size,
            });
          }
        } catch {
          // File doesn't exist
        }
      }
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
                  className="bg-[var(--bg-surface)] border border-[var(--border-dim)] p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="text-[var(--text-primary)] text-sm">{preset.name}</div>
                    <div className="text-[var(--text-dim)] text-[10px] mt-0.5 truncate max-w-[200px]">
                      {preset.prompt}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-[var(--text-dim)] text-[10px]">{preset.duration}s</span>
                    
                    {sound ? (
                      <>
                        <button
                          onClick={() => isPlaying ? stopSound() : playSound(sound.path, sound.id, preset.category === 'Ambient')}
                          className={`px-3 py-1.5 text-xs border ${
                            isPlaying 
                              ? 'bg-[var(--red-dim)]/30 border-[var(--red)] text-[var(--red-bright)]' 
                              : 'bg-[var(--green-dim)]/30 border-[var(--green)] text-[var(--green-bright)]'
                          }`}
                        >
                          {isPlaying ? '■ Stop' : preset.category === 'Ambient' ? '🔁 Loop' : '▶ Play'}
                        </button>
                        <span className="text-[var(--green)] text-[10px]">
                          {Math.round(sound.size / 1024)}KB
                        </span>
                      </>
                    ) : (
                      <button
                        onClick={() => generateSound(preset)}
                        disabled={isGenerating}
                        className="px-3 py-1.5 text-xs bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] disabled:opacity-50"
                      >
                        {isGenerating ? '◈ Generating...' : '⚡ Generate'}
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

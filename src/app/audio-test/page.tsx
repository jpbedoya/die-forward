'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

// Disable regen in production (set NEXT_PUBLIC_DISABLE_AUDIO_REGEN=true in Vercel)
const REGEN_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUDIO_REGEN === 'true';

interface SoundPreset {
  id: string;
  name: string;
  prompt: string;
  duration: number;
  category: string;
}

interface ZoneSoundPreset {
  id: string;
  name: string;
  prompt: string;
  duration: number;
}

interface ZoneData {
  id: string;
  name: string;
  emoji: string;
  accentColor: string;
  textColor: string;
  sounds: ZoneSoundPreset[];
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

// Zone audio presets
const zoneData: ZoneData[] = [
  {
    id: 'ashen-crypts',
    name: 'ASHEN CRYPTS',
    emoji: '🔥',
    accentColor: '#ff6b2b',
    textColor: '#ffb380',
    sounds: [
      {
        id: 'ambient-explore',
        name: 'Exploration Ambient',
        prompt: 'slow-burning dark ambient soundscape, crackling embers in the distance, fine ash drifting down onto hot stone, ancient subterranean city engulfed in eternal ritual flame, deep low drone and heat shimmer, no music',
        duration: 15,
      },
      {
        id: 'ambient-combat',
        name: 'Combat Ambient',
        prompt: 'intense heat pulse rising in a burning underground city, fire roar building, char and smoke tension escalating, rhythmic fire surge, ash storm, no music just environmental sound',
        duration: 15,
      },
      {
        id: 'footstep',
        name: 'Footstep on Ash',
        prompt: 'single footstep on thick dry ash and cinders, dry crunch, hot stone surface beneath, brief echo in ancient burned stone chamber',
        duration: 1,
      },
      {
        id: 'depth-descend',
        name: 'Depth Descend',
        prompt: 'descending deeper into heat underground, air thickening with smoke and ash, fire roaring louder below, ominous atmospheric shift as temperature rises',
        duration: 2.5,
      },
      {
        id: 'fire-crackle',
        name: 'Fire Crackle',
        prompt: 'slow ember crackle, ancient fire that has never gone out for centuries, steady slow rhythm, old stone and char, quiet persistent burn',
        duration: 3,
      },
      {
        id: 'ember-pop',
        name: 'Ember Pop',
        prompt: 'hot coal popping, heat release from ancient firepit, single ember burst, thermal crack, small explosion of compressed heat',
        duration: 1,
      },
      {
        id: 'ash-fall',
        name: 'Ash Fall',
        prompt: 'fine ash drifting down slowly, near-silent, soft dry settling on stone surface, barely audible whisper of particles, ancient ash shower',
        duration: 3,
      },
      {
        id: 'distant-roar',
        name: 'Distant Fire Roar',
        prompt: 'distant fire roar echoing through burnt stone passages underground, wind through scorched tunnels, far-off inferno breathing',
        duration: 3,
      },
      {
        id: 'stone-crack',
        name: 'Stone Crack',
        prompt: 'thermal expansion crack in hot stone, stone splitting under heat stress, sudden sharp fracture, deep resonant echo in stone chamber',
        duration: 1.5,
      },
      {
        id: 'boss-intro',
        name: 'Pyre Keeper Intro',
        prompt: 'ancient fire awakening in vast underground chamber, deep resonant flame roar building slowly, centuries of accumulated heat releasing, low subterranean rumble and ignition surge',
        duration: 4,
      },
      {
        id: 'boss-roar',
        name: 'Pyre Keeper Roar',
        prompt: 'pyre keeper attack, massive wave of flame released, enormous air displacement, fire shockwave blasting outward, intense heat blast with roar',
        duration: 2.5,
      },
    ],
  },
  {
    id: 'frozen-gallery',
    name: 'FROZEN GALLERY',
    emoji: '❄️',
    accentColor: '#7eceff',
    textColor: '#c8ecff',
    sounds: [
      {
        id: 'ambient-explore',
        name: 'Exploration Ambient',
        prompt: 'near-total silence in a vast frozen underground gallery, very subtle ice crystal resonance hum, oppressive cold emptiness, occasional crystalline shimmer, no music',
        duration: 15,
      },
      {
        id: 'ambient-combat',
        name: 'Combat Ambient',
        prompt: 'cracking ice tension rising in frozen underground hall, cold wind building, glacial stress sounds, ice fracturing under pressure, no music just environmental sound',
        duration: 15,
      },
      {
        id: 'footstep',
        name: 'Footstep on Ice',
        prompt: 'careful footstep on frozen ice surface, crisp hollow crunch, echo ringing through frozen hall, sound decaying slowly in cold still air',
        duration: 1,
      },
      {
        id: 'depth-descend',
        name: 'Depth Descend',
        prompt: 'descending deeper into cold underground frozen gallery, ice groaning under immense pressure, temperature dropping, cold air rushing through passage',
        duration: 2.5,
      },
      {
        id: 'ice-crack',
        name: 'Ice Crack',
        prompt: 'sharp ice crack, stress fracture in thick ice wall, sudden split, high resonant snap echoing through frozen space',
        duration: 1,
      },
      {
        id: 'wind-tunnel',
        name: 'Wind Tunnel',
        prompt: 'wind blowing through ice corridor, haunting hollow note, cold air whistling through frozen passage, eerie resonance and breath of cold',
        duration: 3,
      },
      {
        id: 'glacier-groan',
        name: 'Glacier Groan',
        prompt: 'massive glacier settling, deep low groan, ancient ice under immense geological pressure, slow structural sound, vast frozen mass shifting',
        duration: 3,
      },
      {
        id: 'deep-silence',
        name: 'Deep Silence',
        prompt: 'near-silence in frozen underground, barely audible subtle ice hum, oppressive stillness, vast cold emptiness pressing in, silence with texture',
        duration: 4,
      },
      {
        id: 'distant-crack',
        name: 'Distant Crack',
        prompt: 'distant ice fracture echoing through frozen gallery, sound traveling through ice and stone walls, far-off sharp snap with long echo trail',
        duration: 2,
      },
      {
        id: 'boss-intro',
        name: 'Glacial Sovereign Intro',
        prompt: 'glacial sovereign awakening, deep low rumble through ancient ice, temperature drop, ice cracking and splitting, vast frozen presence stirring for first time in centuries',
        duration: 4,
      },
      {
        id: 'boss-roar',
        name: 'Glacial Sovereign Roar',
        prompt: 'massive ice strike attack, cold shockwave radiating outward, shattering resonance, frozen air blast, glacial impact with cold air displacement',
        duration: 2.5,
      },
    ],
  },
  {
    id: 'living-tomb',
    name: 'LIVING TOMB',
    emoji: '🩸',
    accentColor: '#c0392b',
    textColor: '#e8a0a0',
    sounds: [
      {
        id: 'ambient-explore',
        name: 'Exploration Ambient',
        prompt: 'slow heartbeat pulsing in organic walls, wet organic ambience in living underground tomb, surfaces breathing slowly, warm bioluminescent darkness, iron smell translated to sound, no music',
        duration: 15,
      },
      {
        id: 'ambient-combat',
        name: 'Combat Ambient',
        prompt: 'rapid organic pulse in living tomb walls intensifying, wet organic sounds rising, tension of living space reacting to intruder, heartbeat accelerating, no music just environmental sound',
        duration: 15,
      },
      {
        id: 'footstep',
        name: 'Footstep on Organic',
        prompt: 'footstep on organic floor material, soft wet surface give underfoot, warm muffled step, slight suction sound as foot lifts',
        duration: 1,
      },
      {
        id: 'depth-descend',
        name: 'Depth Descend',
        prompt: 'descending into living organic tissue underground, heartbeat pulse getting louder and closer, warmth increasing, wet organic sounds intensifying',
        duration: 2.5,
      },
      {
        id: 'heartbeat',
        name: 'Wall Heartbeat',
        prompt: 'slow steady heartbeat pulse in organic wall, living underground pulse, thick wet rhythm, ancient organic heart beating in stone',
        duration: 3,
      },
      {
        id: 'wet-drip',
        name: 'Wet Drip',
        prompt: 'organic fluid drip, not water but something thicker and warm, slow viscous drops, biological fluid sound with low wet impact',
        duration: 2,
      },
      {
        id: 'membrane-breathe',
        name: 'Membrane Breathe',
        prompt: 'slow breathing membrane surface, organic expansion and contraction, living wall slowly breathing, low wet expansion sound',
        duration: 4,
      },
      {
        id: 'distant-pulse',
        name: 'Distant Pulse',
        prompt: 'distant heartbeat echo from deep below, something vast pulsing far underground, far-off organic rhythm slow and massive',
        duration: 3,
      },
      {
        id: 'growth-creak',
        name: 'Growth Creak',
        prompt: 'organic growth creaking sound, living material slowly expanding, biological structure under pressure, wet organic creak',
        duration: 2,
      },
      {
        id: 'boss-intro',
        name: 'The Root Intro',
        prompt: 'the root awakening in vast underground chamber, massive organic movement, room itself stirring and shifting, walls moving with wet sounds, deep organic rumble',
        duration: 4,
      },
      {
        id: 'boss-roar',
        name: 'The Root Roar',
        prompt: 'total organic assault, living room attacking, wet overwhelming biological sound, organic tendrils lashing, biological explosion of growth',
        duration: 2.5,
      },
    ],
  },
  {
    id: 'void-beyond',
    name: 'VOID BEYOND',
    emoji: '🌑',
    accentColor: '#9b59b6',
    textColor: '#d7aef5',
    sounds: [
      {
        id: 'ambient-explore',
        name: 'Exploration Ambient',
        prompt: 'reality static texture barely audible, distant echoes arriving from wrong directions, near-silence with wrong texture and weight, audio that should not exist here, spatial unreality, no music',
        duration: 15,
      },
      {
        id: 'ambient-combat',
        name: 'Combat Ambient',
        prompt: 'reality destabilizing audio rising, static bursts, sounds from other places bleeding in and layering, spatial confusion, multiple realities overlapping, no music just sound',
        duration: 15,
      },
      {
        id: 'footstep',
        name: 'Wrong Footstep',
        prompt: 'footstep that echoes impossibly wrong, delayed echo arriving too late, doubled sound, uncertain surface underfoot, spatial audio glitch',
        duration: 1,
      },
      {
        id: 'depth-descend',
        name: 'Depth Descend',
        prompt: 'descending into the void, reality thinning, static increasing, space becoming uncertain, audio texture degrading as coherence fails',
        duration: 2.5,
      },
      {
        id: 'static-burst',
        name: 'Static Burst',
        prompt: 'sharp reality static burst, audio interference explosion, brief white noise, reality disruption, electromagnetic impossibility',
        duration: 1,
      },
      {
        id: 'reality-glitch',
        name: 'Reality Glitch',
        prompt: 'audio glitch effect, brief loop stutter, reality hiccup sound, digital corruption in analog space, brief audio malfunction',
        duration: 1.5,
      },
      {
        id: 'wrong-echo',
        name: 'Wrong Echo',
        prompt: 'echo that does not match its source sound, delayed impossibly long, arriving from wrong direction, spatial audio impossibility',
        duration: 2,
      },
      {
        id: 'distant-voice',
        name: 'Distant Voice',
        prompt: 'voice from elsewhere bleeding through reality, unclear words, not in this space, distant indistinct speaking from impossible location',
        duration: 2.5,
      },
      {
        id: 'silence-wrong',
        name: 'Wrong Silence',
        prompt: 'silence that has texture and weight, not empty but full of something present, pressurized quiet, silence with wrongness and subtle interference',
        duration: 3,
      },
      {
        id: 'boss-intro',
        name: 'The Unwritten Intro',
        prompt: 'the unwritten manifesting, discordant layers of sound from multiple realities colliding, impossible audio, choices unmade becoming sonic, rising chaos of overlapping sounds',
        duration: 4,
      },
      {
        id: 'boss-roar',
        name: 'The Unwritten Roar',
        prompt: 'choices unmade colliding in massive audio assault, multiple simultaneous sounds from different realities, overwhelming uncertainty made sonic, void shockwave',
        duration: 2.5,
      },
    ],
  },
];

interface GeneratedSound {
  id: string;
  name: string;
  path: string;
  size: number;
}

// Build a unique id for zone sounds so they don't collide with library preset ids
function zoneCompositeId(zoneId: string, soundId: string): string {
  return `zones/${zoneId}/${soundId}`;
}

export default function AudioTestPage() {
  const [viewMode, setViewMode] = useState<'library' | 'zones'>('library');
  const [activeZoneId, setActiveZoneId] = useState<string>('ashen-crypts');
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
      // Check library presets
      const libraryChecks = presets.map(async (preset) => {
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

      // Check zone audio files
      const zoneChecks = zoneData.flatMap((zone) =>
        zone.sounds.map(async (sound) => {
          const filePath = `/audio/zones/${zone.id}/${sound.id}.mp3`;
          try {
            const res = await fetch(filePath, { method: 'HEAD' });
            if (res.ok) {
              const size = parseInt(res.headers.get('content-length') || '0');
              return {
                id: zoneCompositeId(zone.id, sound.id),
                name: `${zone.name} — ${sound.name}`,
                path: filePath,
                size,
              };
            }
          } catch {
            // File doesn't exist
          }
          return null;
        })
      );

      const results = await Promise.all([...libraryChecks, ...zoneChecks]);
      const existing = results.filter((r): r is GeneratedSound => r !== null);
      if (existing.length > 0) {
        setGenerated(existing);
      }
    };
    checkExisting();
  }, []);

  // Check if a sound already exists (generated this session or found on disk)
  const isGenerated = (id: string) => generated.some(s => s.id === id);
  const getGenerated = (id: string) => generated.find(s => s.id === id);

  // Generate a sound — accepts optional subdir for zone sounds
  const generateSound = async (
    preset: { id: string; name: string; prompt: string; duration: number },
    subdir?: string
  ) => {
    const uniqueId = subdir ? zoneCompositeId(subdir.replace('zones/', ''), preset.id) : preset.id;
    setGenerating(uniqueId);
    setError(null);

    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: preset.prompt,
          filename: preset.id,
          duration: preset.duration,
          ...(subdir && { subdir }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      setGenerated(prev => [
        ...prev.filter(s => s.id !== uniqueId),
        {
          id: uniqueId,
          name: preset.name,
          path: data.path,
          size: data.size,
        },
      ]);
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

  // Active zone data
  const activeZone = zoneData.find(z => z.id === activeZoneId) ?? zoneData[0];

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

      {/* View Mode Tabs */}
      <div className="flex gap-0 mb-6 border border-[var(--border-dim)]">
        <button
          onClick={() => setViewMode('library')}
          className={`px-5 py-2 text-xs uppercase tracking-wider transition-colors ${
            viewMode === 'library'
              ? 'bg-[var(--amber-dim)]/30 text-[var(--amber-bright)] border-r border-[var(--border-dim)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-r border-[var(--border-dim)]'
          }`}
        >
          📦 Library
        </button>
        <button
          onClick={() => setViewMode('zones')}
          className={`px-5 py-2 text-xs uppercase tracking-wider transition-colors ${
            viewMode === 'zones'
              ? 'bg-[var(--amber-dim)]/30 text-[var(--amber-bright)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          🗺 Zones
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[var(--red-dim)]/20 border border-[var(--red-dim)] p-3 mb-4 text-[var(--red-bright)] text-sm">
          {error}
        </div>
      )}

      {/* ─── LIBRARY VIEW ─── */}
      {viewMode === 'library' && (
        <>
          {/* Preset Sounds */}
          {categories.map(category => (
            <div key={category} className="mb-6">
              <h2 className="text-[var(--text-secondary)] text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="text-[var(--amber-dim)]">▸</span>
                {category}
              </h2>
              <div className="grid gap-2">
                {presets.filter(p => p.category === category).map(preset => {
                  const sound = getGenerated(preset.id);
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
                        {/* Generate/Regenerate button (hidden in prod) */}
                        {!REGEN_DISABLED && (
                          <button
                            onClick={() => generateSound(preset)}
                            disabled={isGenerating}
                            className="px-3 py-1.5 text-xs bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] disabled:opacity-50 whitespace-nowrap"
                          >
                            {isGenerating ? '◈ ...' : sound ? '⚡ Regen' : '⚡ Gen'}
                          </button>
                        )}
                        
                        {/* Play/Stop if file exists */}
                        {sound && (
                          <button
                            onClick={() => isPlaying ? stopSound() : playSound(sound.path, sound.id, preset.category === 'Ambient')}
                            className={`px-3 py-1.5 text-xs border whitespace-nowrap ${
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

          {/* Custom Generation (hidden in prod) */}
          {!REGEN_DISABLED && (
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
          )}
        </>
      )}

      {/* ─── ZONES VIEW ─── */}
      {viewMode === 'zones' && (
        <>
          {/* Zone Sub-Tabs */}
          <div className="flex gap-0 mb-6 border border-[var(--border-dim)] overflow-x-auto">
            {zoneData.map((zone) => {
              const isActive = zone.id === activeZoneId;
              const zoneGeneratedCount = zone.sounds.filter(s =>
                isGenerated(zoneCompositeId(zone.id, s.id))
              ).length;
              return (
                <button
                  key={zone.id}
                  onClick={() => setActiveZoneId(zone.id)}
                  style={isActive ? { borderBottomColor: zone.accentColor, color: zone.textColor } : {}}
                  className={`px-4 py-2.5 text-xs uppercase tracking-wider transition-colors whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'border-b-2'
                      : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <span className="mr-1">{zone.emoji}</span>
                  {zone.name}
                  {zoneGeneratedCount > 0 && (
                    <span className="ml-2 text-[10px] opacity-60">({zoneGeneratedCount}/{zone.sounds.length})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Zone Header */}
          <div
            className="mb-4 p-3 border"
            style={{ borderColor: activeZone.accentColor + '44', background: activeZone.accentColor + '11' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: activeZone.textColor }}>
                  {activeZone.emoji} {activeZone.name}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: activeZone.accentColor }}>
                  subdir: zones/{activeZone.id} → public/audio/zones/{activeZone.id}/
                </div>
              </div>
              {!REGEN_DISABLED && (
                <button
                  onClick={async () => {
                    for (const sound of activeZone.sounds) {
                      const uid = zoneCompositeId(activeZone.id, sound.id);
                      if (generating === uid) continue;
                      await generateSound(sound, `zones/${activeZone.id}`);
                    }
                  }}
                  disabled={generating !== null}
                  className="px-3 py-1.5 text-xs border disabled:opacity-50 whitespace-nowrap"
                  style={{ borderColor: activeZone.accentColor, color: activeZone.textColor }}
                >
                  ⚡ Gen All
                </button>
              )}
            </div>
          </div>

          {/* Zone Sound Presets */}
          <div className="grid gap-2">
            {activeZone.sounds.map((sound) => {
              const uid = zoneCompositeId(activeZone.id, sound.id);
              const generatedSound = getGenerated(uid);
              const isPlaying = playing === uid;
              const isGenerating = generating === uid;
              const isAmbient = sound.id.startsWith('ambient-');

              return (
                <div
                  key={sound.id}
                  className="bg-[var(--bg-surface)] p-3 flex items-start justify-between gap-3"
                  style={{ border: `1px solid ${activeZone.accentColor}22` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm flex items-center gap-2" style={{ color: activeZone.textColor }}>
                      {sound.name}
                      <span className="text-[var(--text-dim)] text-[10px]">{sound.duration}s</span>
                      <span className="text-[var(--text-dim)] text-[10px] font-mono">{sound.id}</span>
                      {generatedSound && (
                        <span className="text-[10px]" style={{ color: activeZone.accentColor }}>
                          {Math.round(generatedSound.size / 1024)}KB ✓
                        </span>
                      )}
                    </div>
                    <div className="text-[var(--text-dim)] text-[10px] mt-0.5 break-words leading-relaxed">
                      {sound.prompt}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {/* Generate/Regenerate (hidden in prod) */}
                    {!REGEN_DISABLED && (
                      <button
                        onClick={() => generateSound(sound, `zones/${activeZone.id}`)}
                        disabled={isGenerating || generating !== null}
                        className="px-3 py-1.5 text-xs disabled:opacity-40 whitespace-nowrap"
                        style={{
                          border: `1px solid ${activeZone.accentColor}`,
                          color: activeZone.textColor,
                          background: activeZone.accentColor + '22',
                        }}
                      >
                        {isGenerating ? '◈ ...' : generatedSound ? '⚡ Regen' : '⚡ Gen'}
                      </button>
                    )}

                    {/* Play/Stop if file exists */}
                    {generatedSound && (
                      <button
                        onClick={() =>
                          isPlaying
                            ? stopSound()
                            : playSound(generatedSound.path, uid, isAmbient)
                        }
                        className={`px-3 py-1.5 text-xs border whitespace-nowrap ${
                          isPlaying
                            ? 'bg-[var(--red-dim)]/30 border-[var(--red)] text-[var(--red-bright)]'
                            : 'bg-[var(--green-dim)]/30 border-[var(--green)] text-[var(--green-bright)]'
                        }`}
                      >
                        {isPlaying ? '■ Stop' : isAmbient ? '🔁 Loop' : '▶ Play'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

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

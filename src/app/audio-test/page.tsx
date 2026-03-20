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

  // Environment — Atmospheric Triggers (new, universal across all zones)
  { id: 'water-drop-single', name: 'Single Water Drop', prompt: 'Single water droplet falling into a perfectly still underground pool, long reverberant cave echo, silence before and after, vast subterranean space implied', duration: 1.5, category: 'Environment' },
  { id: 'distant-splash', name: 'Distant Splash', prompt: 'Something large dropping into deep water very far away in an underground cavern, muffled heavy splash, long echo trail fading, no voice', duration: 2.0, category: 'Environment' },
  { id: 'distant-growl-far', name: 'Distant Growl (Far)', prompt: 'A low threatening creature growl heard from very far away through stone corridors, barely audible, deep resonant, lingers then fades to silence, no voice', duration: 3.0, category: 'Environment' },
  { id: 'something-moves', name: 'Something Moves', prompt: 'Something large shifting in the dark nearby, wet stone scraping, heavy weight repositioning, then total silence. No voice no scream.', duration: 2.0, category: 'Environment' },
  { id: 'far-rumble', name: 'Far Rumble', prompt: 'Deep stone rumble from somewhere far below, brief structural groan, like a distant collapse or something enormous shifting, subsonic resonance, fades slowly', duration: 3.0, category: 'Environment' },
  { id: 'whispers-word', name: 'Almost a Word', prompt: 'Unintelligible whispers that almost resolve into a single word, echoing in a stone corridor, the shape of voices without meaning, then silence. No actual words spoken.', duration: 2.0, category: 'Environment' },
  { id: 'drip-pool-echo', name: 'Drip Pool Echo', prompt: 'Three irregular water drips falling into a still underground pool, each with distinct cave echo that overlaps, unhurried, subtle underground ambiance', duration: 2.5, category: 'Environment' },
  { id: 'distant-scream', name: 'Distant Scream', prompt: 'A human scream heard from very far away through stone corridors, heavily muffled by distance and stone, could almost be mistaken for wind, unsettling, no voice clearly recognizable', duration: 2.0, category: 'Environment' },
  
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
        id: 'bone-crumble',
        name: 'Bone Crumble',
        prompt: 'ancient bone crumbling to fine ash from centuries of heat, dry fragmentation, powder settling on stone, quiet and final',
        duration: 1.5,
      },
      {
        id: 'fire-whoosh',
        name: 'Fire Whoosh',
        prompt: 'fire surging briefly through a stone corridor, sudden heat displacement, roar then immediate recession, no ongoing burn, single pulse',
        duration: 1.5,
      },
      {
        id: 'burn-gain',
        name: 'Burn Stack Gained',
        prompt: 'fire catching on something, brief ignition sear, the burn settling in beneath skin, restrained sizzle with low heat hiss, no voice',
        duration: 0.8,
      },
      {
        id: 'burn-tick',
        name: 'Burn Tick (DoT)',
        prompt: 'fire burning persistently at low level, continuous searing damage, restrained ember crackle against flesh, sustained tick of pain, no voice',
        duration: 0.8,
      },
      {
        id: 'ember-flask',
        name: 'Ember Flask Used',
        prompt: 'fire extinguished suddenly by thrown liquid, sharp wet sizzle, steam hissing, flames going out quickly, relief in the sound, no voice',
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
        name: 'Cold Wind Tunnel',
        prompt: 'cold wind breathing through ice tunnels, not howling but low and long, no clear source, just cold air passing through frozen passage, eerie hollow note',
        duration: 5,
      },
      {
        id: 'glacier-groan',
        name: 'Glacier Groan',
        prompt: 'massive glacier settling, deep low groan, ancient ice under immense geological pressure, slow structural sound, vast frozen mass shifting, subsonic resonance',
        duration: 4,
      },
      {
        id: 'deep-silence',
        name: 'Deep Silence',
        prompt: 'near-silence in frozen underground, barely audible subtle ice hum, oppressive stillness, vast cold emptiness pressing in, silence with texture and weight',
        duration: 4,
      },
      {
        id: 'distant-crack',
        name: 'Distant Crack',
        prompt: 'distant ice fracture echoing through frozen gallery, sound traveling through ice and stone walls, far-off sharp snap with long echo trail',
        duration: 2,
      },
      {
        id: 'preserved-creak',
        name: 'Preserved Body Creak',
        prompt: 'frozen human joints cracking as a preserved body begins to slowly move, ice crystals in cartilage giving way, preservation releasing its grip, cold and precise sounds',
        duration: 1.5,
      },
      {
        id: 'preserved-arrest',
        name: 'Re-Freeze (Death)',
        prompt: 'a moving body suddenly re-freezing, rapid ice crystallization sound, motion arrested mid-action, stillness returning after movement, sharp crystalline snap',
        duration: 1.0,
      },
      {
        id: 'sentinel-move',
        name: 'Frost Sentinel Movement',
        prompt: 'massive armored figure moving slowly, ice compressed to stone hardness grinding against floor, enormous weight shifting, decades of accumulated ice creaking in joints',
        duration: 3,
      },
      {
        id: 'sentinel-death',
        name: 'Sentinel Death',
        prompt: 'centuries of compressed ice cracking apart in layers, long slow structural release, geological sound of ancient ice freeing itself, fractures propagating outward',
        duration: 3,
      },
      {
        id: 'shattered-scrape',
        name: 'Shattered (Movement)',
        prompt: 'multiple ice fragments scraping across stone floor in asymmetrical patterns, different sizes moving at different rhythms, continuous positional sound, never stops completely',
        duration: 3,
      },
      {
        id: 'shattered-split',
        name: 'Shattered (Splits)',
        prompt: 'an ice creature fracturing into more pieces on impact, sharp crack then multiple smaller fragments beginning separate movement, diverging scraping sounds',
        duration: 0.8,
      },
      {
        id: 'wraith-presence',
        name: 'Ice Wraith Presence',
        prompt: 'cold air displaced as something intangible passes through a room, soft hiss of temperature differential, the air going quiet as warmth is taken, room becoming colder',
        duration: 2,
      },
      {
        id: 'chill-gain',
        name: 'Chill Stack Gained',
        prompt: 'cold accumulating in the body, a contained sound like breath slowing, ice crystals forming in extremities, stamina ebbing, no voice, purely physical sensation sound',
        duration: 1,
      },
      {
        id: 'freeze-trigger',
        name: 'Freeze Triggered',
        prompt: 'something stopping mid-motion as ice crystallizes over it instantly, crystalline arrest sound, rapid freeze formation, motion locked, sharp and precise',
        duration: 1,
      },
      {
        id: 'thermal-flask',
        name: 'Thermal Flask Used',
        prompt: 'drinking something warm in extreme cold, heat spreading rapidly through a frozen body, chill stacks melting away, brief physical relief, warmth already fading',
        duration: 1.5,
      },
      {
        id: 'temperature-drop',
        name: 'Temperature Drop',
        prompt: 'ambient temperature dropping twenty degrees instantly after a massive cold strike, air contracting rapidly, cold rushing in to fill space, sharp gaseous release',
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
        name: 'Glacial Sovereign Strike',
        prompt: 'massive glacial strike, cold shockwave radiating outward, frozen air blast, temperature plummeting, shattering resonance, ice forming on everything in radius',
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
        prompt: 'footstep on organic floor material, soft wet surface give underfoot, warm muffled step, slight suction sound as foot lifts, no voice',
        duration: 1,
      },
      {
        id: 'depth-descend',
        name: 'Depth Descend',
        prompt: 'descending into living organic tissue underground, heartbeat pulse getting louder and closer, warmth increasing, wet organic sounds intensifying',
        duration: 2.5,
      },
      {
        id: 'tomb-heartbeat',
        name: 'Room Heartbeat',
        prompt: 'slow organic heartbeat in walls at approximately 55 BPM, biological and wet, like a heartbeat heard through thick flesh, irregular enough to feel alive not mechanical, low and intimate',
        duration: 3,
      },
      {
        id: 'tomb-breathing',
        name: 'Room Breathing',
        prompt: 'a room breathing, slow deep oscillation of air in an organic space, like being inside a living body, low wet expansion and contraction, not mechanical',
        duration: 4,
      },
      {
        id: 'wet-drip',
        name: 'Warm Fluid Drip',
        prompt: 'warm thick organic fluid dripping slowly, viscous, not water, biological fluid, slow drops with low wet impact, body temperature warmth implied in the sound',
        duration: 2,
      },
      {
        id: 'membrane-breathe',
        name: 'Membrane Breathe',
        prompt: 'slow breathing membrane surface, organic expansion and contraction, living wall slowly breathing, low wet expansion sound, warm and close',
        duration: 4,
      },
      {
        id: 'tomb-growth',
        name: 'Growth Sound',
        prompt: 'organic tissue slowly extending and growing on stone, wet cellular sound, very subtle, biological matter expanding almost imperceptibly, low and intimate',
        duration: 3,
      },
      {
        id: 'tomb-peristalsis',
        name: 'Peristalsis (Passage)',
        prompt: 'a passage contracting and relaxing rhythmically, organic muscular pressure sound, slow rhythmic squeeze and release, like a body digesting, warm and inevitable',
        duration: 4,
      },
      {
        id: 'distant-pulse',
        name: 'Distant Swallow',
        prompt: 'something massive swallowing far underground, deep organic gulping sound, muffled through layers of organic material, vast and slow, unsettling intimacy at distance',
        duration: 3,
      },
      {
        id: 'growth-creak',
        name: 'Growth Creak',
        prompt: 'organic growth creaking sound, living material slowly expanding under biological pressure, wet organic creak as tissue extends over stone',
        duration: 2,
      },
      {
        id: 'crawler-skitter',
        name: 'Crawler Skitter',
        prompt: 'many insect legs clicking rapidly on stone floor, erratic burst movement then stillness, wet clicking, close and fast, multiple limbs in irregular rhythm',
        duration: 1,
      },
      {
        id: 'crawler-inject',
        name: 'Crawler Inject (Attack)',
        prompt: 'sharp wet injection sound, spore puncture into flesh, brief hiss of release, close and precise, no voice',
        duration: 0.8,
      },
      {
        id: 'crawler-death',
        name: 'Crawler Death',
        prompt: 'rapid insect clicking that stops abruptly, one soft wet sound, small body collapsing, fluid spill, then silence',
        duration: 0.8,
      },
      {
        id: 'incorporated-reach',
        name: 'Incorporated (Idle/Attack)',
        prompt: 'something trying to speak but unable to, wet attempted vocalization from a body partially submerged in organic material, the shape of words without language, tragic and intimate, no intelligible words',
        duration: 2,
      },
      {
        id: 'incorporated-death',
        name: 'Incorporated (Death)',
        prompt: 'a sound of release, wet organic settling, something releasing long-held tension, the sound of being let go, mournful and soft, then silence',
        duration: 1.5,
      },
      {
        id: 'bloom-drift',
        name: 'Bloom Drift (Presence)',
        prompt: 'a low warm consistent tone following a slow drifting organic creature, bioluminescent warmth translated to sound, gentle radiating presence, no edge no threat just warmth',
        duration: 3,
      },
      {
        id: 'spore-burst',
        name: 'Spore Burst',
        prompt: 'soft organic explosion, spore cloud releasing from a rupturing fungal body, muffled wet pop then hiss of dispersal, small and contained',
        duration: 1.5,
      },
      {
        id: 'guardian-breathe',
        name: 'Guardian Breathing',
        prompt: 'a large organic structure breathing slowly, massive rhythmic contraction and expansion, low pressure sound through dense flesh, a doorway that is alive',
        duration: 3,
      },
      {
        id: 'guardian-seal',
        name: 'Guardian Seals Room',
        prompt: 'a fleshy passage sealing shut, muscular organic contraction, thick biological closure, pressure equalizing, room sealed by living tissue',
        duration: 1.5,
      },
      {
        id: 'infection-gain',
        name: 'Infection Stack Gained',
        prompt: 'a warm creeping sensation sound, subtle organic warmth spreading, biological acceptance beginning, not painful but deeply wrong, the tomb recognizing you',
        duration: 1,
      },
      {
        id: 'infection-purge',
        name: 'Infection Purged',
        prompt: 'painful purging of biological incorporation, burning biological rejection, sharp then release, the body fighting back, no voice',
        duration: 2,
      },
      {
        id: 'item-consumed',
        name: 'Item Consumed (3 Stacks)',
        prompt: 'an item being slowly dissolved and absorbed, organic consumption, warmth at point of contact, something disappearing into living tissue',
        duration: 1.5,
      },
      {
        id: 'boss-intro',
        name: 'The Root Intro',
        prompt: 'the root awakening in vast underground chamber, massive organic movement, room itself stirring and shifting, walls moving with wet sounds, deep organic rumble, a space becoming aware',
        duration: 4,
      },
      {
        id: 'boss-roar',
        name: 'The Root Attack',
        prompt: 'total organic assault, living room attacking, wet overwhelming biological sound, walls contracting, organic extrusion lashing outward, room itself as weapon',
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
        prompt: 'footstep that echoes impossibly wrong, delayed echo arriving far too late, doubled displaced sound, uncertain surface underfoot, spatial audio impossibility',
        duration: 1,
      },
      {
        id: 'depth-descend',
        name: 'Depth Descend',
        prompt: 'descending into the void, reality thinning, static increasing, space becoming uncertain, audio texture degrading as coherence fails around you',
        duration: 2.5,
      },
      {
        id: 'void-static',
        name: 'Void Static',
        prompt: 'soft static from reality dissolving at its edges, audio interference from an adjacent space, low textured white noise with depth, something bleeding through from elsewhere',
        duration: 4,
      },
      {
        id: 'bleed-through',
        name: 'Reality Bleed',
        prompt: 'sound from another place bleeding through into this space, a door closing somewhere else, water dripping elsewhere, then gone, brief audio from an adjacent reality',
        duration: 3,
      },
      {
        id: 'reality-shift',
        name: 'Reality Shift',
        prompt: 'reality momentarily failing, spatial audio distortion, a room changing its mind about what it is, brief audio impossibility, then settling',
        duration: 2,
      },
      {
        id: 'static-burst',
        name: 'Static Burst',
        prompt: 'sharp reality static burst, audio interference explosion, brief intense white noise, reality disruption event, electromagnetic impossibility in analog space',
        duration: 1,
      },
      {
        id: 'wrong-echo',
        name: 'Wrong Echo',
        prompt: 'an echo that does not match its source, delayed impossibly long, arriving from the wrong direction entirely, spatial audio impossibility, your footstep echoing from above',
        duration: 2,
      },
      {
        id: 'distant-voice',
        name: 'Bleed-Through Voice',
        prompt: 'a voice from elsewhere bleeding through reality, unclear and indistinct, not in this space at all, distant speaking from an impossible location, no words recognizable',
        duration: 2.5,
      },
      {
        id: 'silence-wrong',
        name: 'Wrong Silence',
        prompt: 'silence that has texture and weight, not empty but full of presence, pressurized quiet, silence with wrongness and subtle interference underneath, something there',
        duration: 3,
      },
      {
        id: 'your-voice-wrong',
        name: 'Your Voice (Wrong Dir)',
        prompt: 'a voice fragment heard from the wrong direction, just a syllable, brief, then gone, could be anyone, deeply disorienting spatial audio impossibility, no words',
        duration: 2,
      },
      {
        id: 'flux-trigger',
        name: 'FLUX Trigger',
        prompt: 'an intent changing mid-declaration, probability collapsing to a different outcome, brief audio glitch, reality hiccup, the sound of something choosing differently at the last moment',
        duration: 1,
      },
      {
        id: 'echo-double-appear',
        name: 'Echo Double Appears',
        prompt: 'an exact duplicate appearing, the sound of something that was already there becoming visible, uncanny resonance, two identical presences in one space, slightly wrong phase',
        duration: 2,
      },
      {
        id: 'void-creature-move',
        name: 'Probability Shade Move',
        prompt: 'a creature that exists in probability moving through uncertain space, phase shifting, between here and not-here, partial presence sounds, flickering audio',
        duration: 2,
      },
      {
        id: 'dimensional-tear',
        name: 'Dimensional Tear',
        prompt: 'the fabric of a space tearing briefly, a gap to somewhere else opening and closing, ozone and electrical crackle, brief glimpse of another acoustic space',
        duration: 2,
      },
      {
        id: 'clarity-restore',
        name: 'Clarity Restored',
        prompt: 'mental clarity returning after disorientation, the noise of uncertainty receding, reality asserting itself briefly, the static clearing, brief relief in sound',
        duration: 1.5,
      },
      {
        id: 'boss-intro',
        name: 'The Unwritten Intro',
        prompt: 'the unwritten manifesting, discordant layers from multiple realities colliding, impossible overlapping audio, choices unmade becoming sonic, rising chaos of simultaneous sounds from different spaces',
        duration: 4,
      },
      {
        id: 'boss-roar',
        name: 'The Unwritten Strike',
        prompt: 'choices unmade colliding in massive audio assault, multiple simultaneous sounds from different realities, overwhelming uncertainty made sonic, void shockwave of collapsed probability',
        duration: 2.5,
      },
    ],
  },

  // Universal Atmospheric Triggers (not zone-specific, used across all zones)
  {
    id: 'atmospheric',
    name: 'ATMOSPHERIC TRIGGERS',
    emoji: '🌫',
    accentColor: '#7f8c8d',
    textColor: '#bdc3c7',
    sounds: [
      {
        id: 'water-drop-single',
        name: 'Single Water Drop',
        prompt: 'single water droplet falling into a perfectly still underground pool, long reverberant cave echo, vast subterranean space implied, silence before and after',
        duration: 1.5,
      },
      {
        id: 'distant-splash',
        name: 'Distant Splash',
        prompt: 'something large dropping into deep water very far away in an underground cavern, muffled heavy splash, long echo trail fading, no voice',
        duration: 2.0,
      },
      {
        id: 'distant-growl-far',
        name: 'Distant Growl',
        prompt: 'a low threatening creature growl heard from very far away through stone corridors, barely audible, deep resonant, lingers then fades to silence, no voice no scream',
        duration: 3.0,
      },
      {
        id: 'something-moves',
        name: 'Something Moves',
        prompt: 'something large shifting in the dark nearby, wet stone scraping, heavy weight repositioning slowly, then total silence, no voice no scream',
        duration: 2.0,
      },
      {
        id: 'far-rumble',
        name: 'Far Rumble',
        prompt: 'deep stone rumble from somewhere far below, brief structural groan, like a distant collapse or something enormous moving, subsonic resonance, fades slowly',
        duration: 3.0,
      },
      {
        id: 'whispers-word',
        name: 'Almost a Word',
        prompt: 'unintelligible whispers that almost resolve into a single word, echoing in a stone corridor, the shape of voices without meaning, then silence, no actual words spoken',
        duration: 2.0,
      },
      {
        id: 'drip-pool-echo',
        name: 'Drip Pool Echo',
        prompt: 'three irregular water drips falling into a still underground pool, each with distinct cave echo that overlaps the previous, unhurried, vast underground space',
        duration: 2.5,
      },
      {
        id: 'distant-scream',
        name: 'Distant Scream',
        prompt: 'a human sound heard from very far away through stone corridors, heavily muffled by distance and stone, could almost be mistaken for wind, deeply unsettling',
        duration: 2.0,
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

// Generate all SFX using ElevenLabs API
const fs = require('fs');
const path = require('path');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY environment variable is required');
  process.exit(1);
}
const OUTPUT_DIR = path.join(__dirname, '../public/audio');

const SOUNDS = [
  // Combat
  { filename: 'boss-intro', prompt: 'Deep ominous rumble and low growl of an ancient creature awakening in a dark dungeon', duration: 3 },
  { filename: 'boss-roar', prompt: 'Terrifying monster roar attack sound in a cave, echoing', duration: 2 },
  { filename: 'dodge-whoosh', prompt: 'Quick swoosh of fast movement dodging an attack, cloth and air', duration: 1 },
  { filename: 'brace-impact', prompt: 'Shield blocking heavy impact, metal thud with grunt', duration: 1 },
  { filename: 'flee-run', prompt: 'Frantic running footsteps on stone, splashing through water', duration: 2 },
  { filename: 'flee-fail', prompt: 'Stumbling fall sound, person tripping with grunt of pain', duration: 1.5 },
  { filename: 'enemy-growl', prompt: 'Menacing creature growl, undead monster preparing to attack', duration: 1.5 },
  { filename: 'critical-hit', prompt: 'Powerful sword slash impact, bone crunch, devastating blow', duration: 1 },
  { filename: 'parry-clang', prompt: 'Metal sword parry clang, sparks flying, defensive block', duration: 1 },
  { filename: 'attack-miss', prompt: 'Sword swing through air missing target, whoosh', duration: 1 },
  
  // Environment
  { filename: 'depth-descend', prompt: 'Descending deeper underground, echoing footsteps, ominous atmosphere shift', duration: 2.5 },
  { filename: 'water-splash', prompt: 'Wading through shallow water in dark cave, splashing footsteps', duration: 1.5 },
  { filename: 'chains-rattle', prompt: 'Rusty chains rattling in dungeon, ghostly and metallic', duration: 2 },
  { filename: 'eerie-whispers', prompt: 'Creepy ghostly whispers in darkness, unintelligible voices', duration: 2.5 },
  { filename: 'stone-grinding', prompt: 'Heavy stone door slowly grinding open, ancient mechanism', duration: 2 },
  { filename: 'drip-echo', prompt: 'Water dripping in vast underground cavern, echoing drops', duration: 2 },
  
  // Player State
  { filename: 'heartbeat-low', prompt: 'Tense heartbeat pounding, low health warning, pulse racing', duration: 2 },
  { filename: 'stamina-depleted', prompt: 'Exhausted gasp for breath, out of energy, tired panting', duration: 1.5 },
  { filename: 'stamina-recover', prompt: 'Deep breath recovery, catching breath, energy returning', duration: 1.5 },
  { filename: 'poison-tick', prompt: 'Poison damage sound, sizzling pain, toxic effect', duration: 1 },
  
  // Rewards
  { filename: 'tip-chime', prompt: 'Magical coin chime, cryptocurrency transfer sound, sparkle', duration: 1 },
  { filename: 'loot-discover', prompt: 'Treasure discovery sound, gleaming reveal, valuable find', duration: 1.5 },
  { filename: 'victory-fanfare', prompt: 'Epic victory fanfare, triumphant horns, heroic achievement', duration: 3 },
  { filename: 'share-click', prompt: 'Camera shutter click, screenshot capture, share moment', duration: 0.5 },
  
  // UI
  { filename: 'menu-open', prompt: 'Soft UI menu opening sound, gentle whoosh reveal', duration: 0.5 },
  { filename: 'menu-close', prompt: 'Soft UI menu closing sound, gentle slide away', duration: 0.5 },
  { filename: 'confirm-action', prompt: 'Positive confirmation click, action accepted, success tap', duration: 0.5 },
  { filename: 'error-buzz', prompt: 'Error buzz sound, action denied, negative feedback', duration: 0.5 },
];

async function generateSound(sound) {
  console.log(`Generating: ${sound.filename}...`);
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: sound.prompt,
        duration_seconds: sound.duration,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed ${sound.filename}:`, error);
      return false;
    }

    const buffer = await response.arrayBuffer();
    const outputPath = path.join(OUTPUT_DIR, `${sound.filename}.mp3`);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`✓ Saved: ${sound.filename}.mp3`);
    return true;
  } catch (err) {
    console.error(`Error ${sound.filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`Generating ${SOUNDS.length} sounds...`);
  console.log(`Output: ${OUTPUT_DIR}\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const sound of SOUNDS) {
    const ok = await generateSound(sound);
    if (ok) success++;
    else failed++;
    
    // Rate limit: wait 1 second between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\nDone! ${success} succeeded, ${failed} failed.`);
}

main();

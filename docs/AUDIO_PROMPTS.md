# Die Forward — Audio Prompts

All sound effect and ambient prompts used to generate audio via ElevenLabs.
Source of truth: `src/app/audio-test/page.tsx`
Audio files served from: `public/audio/` and `public/audio/zones/<zone>/`

---

## Library Sounds

Root path: `public/audio/<id>.mp3`

### Ambient

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `ambient-explore` | Exploration Loop | 15s | dark cave ambient atmosphere water dripping echoes distant rumble underground dungeon mysterious low drone |
| `ambient-combat` | Combat Loop | 15s | tense combat music pulsing danger heartbeat drums aggressive dark battle tension rising stakes fight |
| `ambient-title` | Title Loop | 15s | mysterious title screen ambient dark fantasy dungeon crawler ominous anticipation ancient evil lurking ethereal choir low |
| `ambient-death` | Death Loop | 12s | somber death ambient dark mourning low drone despair fading hope final moments haunting ethereal sad |
| `ambient-victory` | Victory Loop | 12s | triumphant victory ambient relief success emerged from darkness hopeful yet eerie dungeon conquered mystical ascending |

### Combat

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `sword-slash` | Attack Impact | 1.5s | heavy blunt impact thud bone cracking wet flesh thump weapon hitting body cave echo |
| `blunt-hit` | Blunt Impact | 1.5s | heavy blunt impact thud flesh bone crushing hit meaty punch |
| `damage-taken` | Damage Taken | 1.5s | painful grunt impact wound flesh tear visceral hurt |
| `enemy-death` | Enemy Death | 2s | monster death gurgle creature dying last breath grotesque wet |
| `boss-intro` | Boss Intro | 3s | Deep ominous rumble and low growl of an ancient creature awakening in a dark dungeon |
| `boss-roar` | Boss Roar | 2s | Terrifying monster roar attack sound in a cave, echoing |
| `dodge-whoosh` | Dodge Whoosh | 1s | Quick swoosh of fast movement dodging an attack, cloth and air |
| `brace-impact` | Brace Impact | 1s | Shield blocking heavy impact, metal thud with grunt |
| `flee-run` | Flee Run | 2s | Frantic running footsteps on stone, splashing through water |
| `flee-fail` | Flee Fail | 1.5s | Body stumbling and falling on stone floor, impact thud, no voice no scream, physical fall sound only |
| `enemy-growl` | Enemy Growl | 1.5s | Menacing creature growl, undead monster preparing to attack |
| `critical-hit` | Critical Hit | 1s | Powerful sword slash impact, bone crunch, devastating blow |
| `parry-clang` | Parry Clang | 1s | Metal sword parry clang, sparks flying, defensive block |
| `attack-miss` | Attack Miss | 1s | Sword swing through air missing target, whoosh |

### Player

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `player-death` | Player Death | 3s | dark dramatic death final breath soul leaving body haunting echo fade |
| `victory` | Victory Resolve | 4s | silence then single deep resolution tone low drone relief tension release fading echo solemn |
| `heal` | Heal | 2s | soft magical shimmer gentle restoration subtle glow followed by relieved exhale breath out calm recovery |
| `heartbeat-low` | Low Health Heartbeat | 2s | Tense heartbeat pounding, low health warning, pulse racing |
| `stamina-depleted` | Stamina Depleted | 1.5s | Exhausted gasp for breath, out of energy, tired panting |
| `stamina-recover` | Stamina Recover | 1.5s | Deep breath recovery, catching breath, energy returning |
| `poison-tick` | Poison Tick | 1s | Poison damage sound, sizzling pain, toxic effect |

### Environment

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `footstep` | Footstep (Stone) | 1s | single footstep wet stone cave dungeon echo drip |
| `item-pickup` | Item Discover | 1.5s | muted subtle chime low resonance ancient artifact pickup soft not bright understated |
| `corpse-discover` | Corpse Discover | 3s | silence then single mournful sustained tone somber discovery fading slowly dark ambient |
| `door-creak` | Door Creak | 2.5s | heavy stone door creak grind ancient dungeon ominous slow |
| `water-drip` | Water Drip | 2s | cave water drip echo underground pool splash ambient |
| `depth-descend` | Depth Descend | 2.5s | Descending deeper underground, echoing footsteps, ominous atmosphere shift |
| `water-splash` | Water Splash | 1.5s | Wading through shallow water in dark cave, splashing footsteps |
| `chains-rattle` | Chains Rattle | 2s | Rusty chains rattling in dungeon, ghostly and metallic |
| `eerie-whispers` | Eerie Whispers | 2.5s | Creepy ghostly whispers in darkness, unintelligible voices |
| `stone-grinding` | Stone Grinding | 2s | Heavy stone door slowly grinding open, ancient mechanism |
| `drip-echo` | Drip Echo | 2s | Water dripping in vast underground cavern, echoing drops |
| `water-drop-single` | Single Water Drop | 1.5s | Single water droplet falling into a perfectly still underground pool, long reverberant cave echo, silence before and after, vast subterranean space implied |
| `distant-splash` | Distant Splash | 2s | Something large dropping into deep water very far away in an underground cavern, muffled heavy splash, long echo trail fading, no voice |
| `distant-growl-far` | Distant Growl (Far) | 3s | A low threatening creature growl heard from very far away through stone corridors, barely audible, deep resonant, lingers then fades to silence, no voice |
| `something-moves` | Something Moves | 2s | Something large shifting in the dark nearby, wet stone scraping, heavy weight repositioning, then total silence. No voice no scream. |
| `far-rumble` | Far Rumble | 3s | Deep stone rumble from somewhere far below, brief structural groan, like a distant collapse or something enormous shifting, subsonic resonance, fades slowly |
| `whispers-word` | Almost a Word | 2s | Unintelligible whispers that almost resolve into a single word, echoing in a stone corridor, the shape of voices without meaning, then silence. No actual words spoken. |
| `drip-pool-echo` | Drip Pool Echo | 2.5s | Three irregular water drips falling into a still underground pool, each with distinct cave echo that overlaps, unhurried, subtle underground ambiance |
| `distant-scream` | Distant Scream | 2s | A human scream heard from very far away through stone corridors, heavily muffled by distance and stone, could almost be mistaken for wind, unsettling, no voice clearly recognizable |

### Rewards

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `tip-chime` | Tip Chime | 1s | Magical coin chime, cryptocurrency transfer sound, sparkle |
| `loot-discover` | Loot Discover | 1.5s | Treasure discovery sound, gleaming reveal, valuable find |
| `victory-fanfare` | Victory Fanfare | 3s | Epic victory fanfare, triumphant horns, heroic achievement |
| `share-click` | Share Click | 0.5s | Camera shutter click, screenshot capture, share moment |

### UI

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `ui-click` | UI Click | 0.5s | subtle click interface button press soft mechanical |
| `ui-hover` | UI Hover | 0.5s | soft whoosh hover subtle mystical whisper interface |
| `menu-open` | Menu Open | 0.5s | Soft UI menu opening sound, gentle whoosh reveal |
| `menu-close` | Menu Close | 0.5s | Soft UI menu closing sound, gentle slide away |
| `confirm-action` | Confirm Action | 0.5s | Positive confirmation click, action accepted, success tap |
| `error-buzz` | Error Buzz | 0.5s | Error buzz sound, action denied, negative feedback |

---

## Zone Sounds

Path pattern: `public/audio/zones/<zone-id>/<sound-id>.mp3`

### 🔥 ASHEN CRYPTS (`ashen-crypts`)

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `ambient-explore` | Exploration Ambient | 15s | slow-burning dark ambient soundscape, crackling embers in the distance, fine ash drifting down onto hot stone, ancient subterranean city engulfed in eternal ritual flame, deep low drone and heat shimmer, no music |
| `ambient-combat` | Combat Ambient | 15s | intense heat pulse rising in a burning underground city, fire roar building, char and smoke tension escalating, rhythmic fire surge, ash storm, no music just environmental sound |
| `footstep` | Footstep on Ash | 1s | single footstep on thick dry ash and cinders, dry crunch, hot stone surface beneath, brief echo in ancient burned stone chamber |
| `depth-descend` | Depth Descend | 2.5s | descending deeper into heat underground, air thickening with smoke and ash, fire roaring louder below, ominous atmospheric shift as temperature rises |
| `fire-crackle` | Fire Crackle | 3s | slow ember crackle, ancient fire that has never gone out for centuries, steady slow rhythm, old stone and char, quiet persistent burn |
| `ember-pop` | Ember Pop | 1s | hot coal popping, heat release from ancient firepit, single ember burst, thermal crack, small explosion of compressed heat |
| `ash-fall` | Ash Fall | 3s | fine ash drifting down slowly, near-silent, soft dry settling on stone surface, barely audible whisper of particles, ancient ash shower |
| `distant-roar` | Distant Fire Roar | 3s | distant fire roar echoing through burnt stone passages underground, wind through scorched tunnels, far-off inferno breathing |
| `stone-crack` | Stone Crack | 1.5s | thermal expansion crack in hot stone, stone splitting under heat stress, sudden sharp fracture, deep resonant echo in stone chamber |
| `bone-crumble` | Bone Crumble | 1.5s | ancient bone crumbling to fine ash from centuries of heat, dry fragmentation, powder settling on stone, quiet and final |
| `fire-whoosh` | Fire Whoosh | 1.5s | fire surging briefly through a stone corridor, sudden heat displacement, roar then immediate recession, no ongoing burn, single pulse |
| `burn-gain` | Burn Stack Gained | 0.8s | fire catching on something, brief ignition sear, the burn settling in beneath skin, restrained sizzle with low heat hiss, no voice |
| `burn-tick` | Burn Tick (DoT) | 0.8s | fire burning persistently at low level, continuous searing damage, restrained ember crackle against flesh, sustained tick of pain, no voice |
| `ember-flask` | Ember Flask Used | 1.5s | fire extinguished suddenly by thrown liquid, sharp wet sizzle, steam hissing, flames going out quickly, relief in the sound, no voice |
| `boss-intro` | Pyre Keeper Intro | 4s | ancient fire awakening in vast underground chamber, deep resonant flame roar building slowly, centuries of accumulated heat releasing, low subterranean rumble and ignition surge |
| `boss-roar` | Pyre Keeper Roar | 2.5s | pyre keeper attack, massive wave of flame released, enormous air displacement, fire shockwave blasting outward, intense heat blast with roar |

### ❄️ FROZEN GALLERY (`frozen-gallery`)

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `ambient-explore` | Exploration Ambient | 15s | near-total silence in a vast frozen underground gallery, very subtle ice crystal resonance hum, oppressive cold emptiness, occasional crystalline shimmer, no music |
| `ambient-combat` | Combat Ambient | 15s | cracking ice tension rising in frozen underground hall, cold wind building, glacial stress sounds, ice fracturing under pressure, no music just environmental sound |
| `footstep` | Footstep on Ice | 1s | careful footstep on frozen ice surface, crisp hollow crunch, echo ringing through frozen hall, sound decaying slowly in cold still air |
| `depth-descend` | Depth Descend | 2.5s | descending deeper into cold underground frozen gallery, ice groaning under immense pressure, temperature dropping, cold air rushing through passage |
| `ice-crack` | Ice Crack | 1s | sharp ice crack, stress fracture in thick ice wall, sudden split, high resonant snap echoing through frozen space |
| `wind-tunnel` | Cold Wind Tunnel | 5s | cold wind breathing through ice tunnels, not howling but low and long, no clear source, just cold air passing through frozen passage, eerie hollow note |
| `glacier-groan` | Glacier Groan | 4s | massive glacier settling, deep low groan, ancient ice under immense geological pressure, slow structural sound, vast frozen mass shifting, subsonic resonance |
| `deep-silence` | Deep Silence | 4s | near-silence in frozen underground, barely audible subtle ice hum, oppressive stillness, vast cold emptiness pressing in, silence with texture and weight |
| `distant-crack` | Distant Crack | 2s | distant ice fracture echoing through frozen gallery, sound traveling through ice and stone walls, far-off sharp snap with long echo trail |
| `preserved-creak` | Preserved Body Creak | 1.5s | frozen human joints cracking as a preserved body begins to slowly move, ice crystals in cartilage giving way, preservation releasing its grip, cold and precise sounds |
| `preserved-arrest` | Re-Freeze (Death) | 1s | a moving body suddenly re-freezing, rapid ice crystallization sound, motion arrested mid-action, stillness returning after movement, sharp crystalline snap |
| `sentinel-move` | Frost Sentinel Movement | 3s | massive armored figure moving slowly, ice compressed to stone hardness grinding against floor, enormous weight shifting, decades of accumulated ice creaking in joints |
| `sentinel-death` | Sentinel Death | 3s | centuries of compressed ice cracking apart in layers, long slow structural release, geological sound of ancient ice freeing itself, fractures propagating outward |
| `shattered-scrape` | Shattered (Movement) | 3s | multiple ice fragments scraping across stone floor in asymmetrical patterns, different sizes moving at different rhythms, continuous positional sound, never stops completely |
| `shattered-split` | Shattered (Splits) | 0.8s | an ice creature fracturing into more pieces on impact, sharp crack then multiple smaller fragments beginning separate movement, diverging scraping sounds |
| `wraith-presence` | Ice Wraith Presence | 2s | cold air displaced as something intangible passes through a room, soft hiss of temperature differential, the air going quiet as warmth is taken, room becoming colder |
| `chill-gain` | Chill Stack Gained | 1s | cold accumulating in the body, a contained sound like breath slowing, ice crystals forming in extremities, stamina ebbing, no voice, purely physical sensation sound |
| `freeze-trigger` | Freeze Triggered | 1s | something stopping mid-motion as ice crystallizes over it instantly, crystalline arrest sound, rapid freeze formation, motion locked, sharp and precise |
| `thermal-flask` | Thermal Flask Used | 1.5s | drinking something warm in extreme cold, heat spreading rapidly through a frozen body, chill stacks melting away, brief physical relief, warmth already fading |
| `temperature-drop` | Temperature Drop | 2s | ambient temperature dropping twenty degrees instantly after a massive cold strike, air contracting rapidly, cold rushing in to fill space, sharp gaseous release |
| `boss-intro` | Glacial Sovereign Intro | 4s | glacial sovereign awakening, deep low rumble through ancient ice, temperature drop, ice cracking and splitting, vast frozen presence stirring for first time in centuries |
| `boss-roar` | Glacial Sovereign Strike | 2.5s | massive glacial strike, cold shockwave radiating outward, frozen air blast, temperature plummeting, shattering resonance, ice forming on everything in radius |

### 🩸 LIVING TOMB (`living-tomb`)

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `ambient-explore` | Exploration Ambient | 15s | slow heartbeat pulsing in organic walls, wet organic ambience in living underground tomb, surfaces breathing slowly, warm bioluminescent darkness, iron smell translated to sound, no music |
| `ambient-combat` | Combat Ambient | 15s | rapid organic pulse in living tomb walls intensifying, wet organic sounds rising, tension of living space reacting to intruder, heartbeat accelerating, no music just environmental sound |
| `footstep` | Footstep on Organic | 1s | footstep on organic floor material, soft wet surface give underfoot, warm muffled step, slight suction sound as foot lifts, no voice |
| `depth-descend` | Depth Descend | 2.5s | descending into living organic tissue underground, heartbeat pulse getting louder and closer, warmth increasing, wet organic sounds intensifying |
| `tomb-heartbeat` | Room Heartbeat | 3s | slow organic heartbeat in walls at approximately 55 BPM, biological and wet, like a heartbeat heard through thick flesh, irregular enough to feel alive not mechanical, low and intimate |
| `tomb-breathing` | Room Breathing | 4s | a room breathing, slow deep oscillation of air in an organic space, like being inside a living body, low wet expansion and contraction, not mechanical |
| `wet-drip` | Warm Fluid Drip | 2s | warm thick organic fluid dripping slowly, viscous, not water, biological fluid, slow drops with low wet impact, body temperature warmth implied in the sound |
| `membrane-breathe` | Membrane Breathe | 4s | slow breathing membrane surface, organic expansion and contraction, living wall slowly breathing, low wet expansion sound, warm and close |
| `tomb-growth` | Growth Sound | 3s | organic tissue slowly extending and growing on stone, wet cellular sound, very subtle, biological matter expanding almost imperceptibly, low and intimate |
| `tomb-peristalsis` | Peristalsis (Passage) | 4s | a passage contracting and relaxing rhythmically, organic muscular pressure sound, slow rhythmic squeeze and release, like a body digesting, warm and inevitable |
| `distant-pulse` | Distant Swallow | 3s | something massive swallowing far underground, deep organic gulping sound, muffled through layers of organic material, vast and slow, unsettling intimacy at distance |
| `growth-creak` | Growth Creak | 2s | organic growth creaking sound, living material slowly expanding under biological pressure, wet organic creak as tissue extends over stone |
| `crawler-skitter` | Crawler Skitter | 1s | many insect legs clicking rapidly on stone floor, erratic burst movement then stillness, wet clicking, close and fast, multiple limbs in irregular rhythm |
| `crawler-inject` | Crawler Inject (Attack) | 0.8s | sharp wet injection sound, spore puncture into flesh, brief hiss of release, close and precise, no voice |
| `crawler-death` | Crawler Death | 0.8s | rapid insect clicking that stops abruptly, one soft wet sound, small body collapsing, fluid spill, then silence |
| `incorporated-reach` | Incorporated (Idle/Attack) | 2s | something trying to speak but unable to, wet attempted vocalization from a body partially submerged in organic material, the shape of words without language, tragic and intimate, no intelligible words |
| `incorporated-death` | Incorporated (Death) | 1.5s | a sound of release, wet organic settling, something releasing long-held tension, the sound of being let go, mournful and soft, then silence |
| `bloom-drift` | Bloom Drift (Presence) | 3s | a low warm consistent tone following a slow drifting organic creature, bioluminescent warmth translated to sound, gentle radiating presence, no edge no threat just warmth |
| `spore-burst` | Spore Burst | 1.5s | soft organic explosion, spore cloud releasing from a rupturing fungal body, muffled wet pop then hiss of dispersal, small and contained |
| `guardian-breathe` | Guardian Breathing | 3s | a large organic structure breathing slowly, massive rhythmic contraction and expansion, low pressure sound through dense flesh, a doorway that is alive |
| `guardian-seal` | Guardian Seals Room | 1.5s | a fleshy passage sealing shut, muscular organic contraction, thick biological closure, pressure equalizing, room sealed by living tissue |
| `infection-gain` | Infection Stack Gained | 1s | a warm creeping sensation sound, subtle organic warmth spreading, biological acceptance beginning, not painful but deeply wrong, the tomb recognizing you |
| `infection-purge` | Infection Purged | 2s | painful purging of biological incorporation, burning biological rejection, sharp then release, the body fighting back, no voice |
| `item-consumed` | Item Consumed (3 Stacks) | 1.5s | an item being slowly dissolved and absorbed, organic consumption, warmth at point of contact, something disappearing into living tissue |
| `boss-intro` | The Root Intro | 4s | the root awakening in vast underground chamber, massive organic movement, room itself stirring and shifting, walls moving with wet sounds, deep organic rumble, a space becoming aware |
| `boss-roar` | The Root Attack | 2.5s | total organic assault, living room attacking, wet overwhelming biological sound, walls contracting, organic extrusion lashing outward, room itself as weapon |

### 🌑 VOID BEYOND (`void-beyond`)

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `ambient-explore` | Exploration Ambient | 15s | reality static texture barely audible, distant echoes arriving from wrong directions, near-silence with wrong texture and weight, audio that should not exist here, spatial unreality, no music |
| `ambient-combat` | Combat Ambient | 15s | reality destabilizing audio rising, static bursts, sounds from other places bleeding in and layering, spatial confusion, multiple realities overlapping, no music just sound |
| `footstep` | Wrong Footstep | 1s | footstep that echoes impossibly wrong, delayed echo arriving far too late, doubled displaced sound, uncertain surface underfoot, spatial audio impossibility |
| `depth-descend` | Depth Descend | 2.5s | descending into the void, reality thinning, static increasing, space becoming uncertain, audio texture degrading as coherence fails around you |
| `void-static` | Void Static | 4s | soft static from reality dissolving at its edges, audio interference from an adjacent space, low textured white noise with depth, something bleeding through from elsewhere |
| `bleed-through` | Reality Bleed | 3s | sound from another place bleeding through into this space, a door closing somewhere else, water dripping elsewhere, then gone, brief audio from an adjacent reality |
| `reality-shift` | Reality Shift | 2s | reality momentarily failing, spatial audio distortion, a room changing its mind about what it is, brief audio impossibility, then settling |
| `static-burst` | Static Burst | 1s | sharp reality static burst, audio interference explosion, brief intense white noise, reality disruption event, electromagnetic impossibility in analog space |
| `wrong-echo` | Wrong Echo | 2s | an echo that does not match its source, delayed impossibly long, arriving from the wrong direction entirely, spatial audio impossibility, your footstep echoing from above |
| `distant-voice` | Bleed-Through Voice | 2.5s | a voice from elsewhere bleeding through reality, unclear and indistinct, not in this space at all, distant speaking from an impossible location, no words recognizable |
| `silence-wrong` | Wrong Silence | 3s | silence that has texture and weight, not empty but full of presence, pressurized quiet, silence with wrongness and subtle interference underneath, something there |
| `your-voice-wrong` | Your Voice (Wrong Dir) | 2s | a voice fragment heard from the wrong direction, just a syllable, brief, then gone, could be anyone, deeply disorienting spatial audio impossibility, no words |
| `flux-trigger` | FLUX Trigger | 1s | an intent changing mid-declaration, probability collapsing to a different outcome, brief audio glitch, reality hiccup, the sound of something choosing differently at the last moment |
| `echo-double-appear` | Echo Double Appears | 2s | an exact duplicate appearing, the sound of something that was already there becoming visible, uncanny resonance, two identical presences in one space, slightly wrong phase |
| `void-creature-move` | Probability Shade Move | 2s | a creature that exists in probability moving through uncertain space, phase shifting, between here and not-here, partial presence sounds, flickering audio |
| `dimensional-tear` | Dimensional Tear | 2s | the fabric of a space tearing briefly, a gap to somewhere else opening and closing, ozone and electrical crackle, brief glimpse of another acoustic space |
| `clarity-restore` | Clarity Restored | 1.5s | mental clarity returning after disorientation, the noise of uncertainty receding, reality asserting itself briefly, the static clearing, brief relief in sound |
| `boss-intro` | The Unwritten Intro | 4s | the unwritten manifesting, discordant layers from multiple realities colliding, impossible overlapping audio, choices unmade becoming sonic, rising chaos of simultaneous sounds from different spaces |
| `boss-roar` | The Unwritten Strike | 2.5s | choices unmade colliding in massive audio assault, multiple simultaneous sounds from different realities, overwhelming uncertainty made sonic, void shockwave of collapsed probability |

### 🌫 ATMOSPHERIC TRIGGERS (`atmospheric`)

| ID | Name | Duration | Prompt |
|---|---|---|---|
| `water-drop-single` | Single Water Drop | 1.5s | single water droplet falling into a perfectly still underground pool, long reverberant cave echo, vast subterranean space implied, silence before and after |
| `distant-splash` | Distant Splash | 2s | something large dropping into deep water very far away in an underground cavern, muffled heavy splash, long echo trail fading, no voice |
| `distant-growl-far` | Distant Growl | 3s | a low threatening creature growl heard from very far away through stone corridors, barely audible, deep resonant, lingers then fades to silence, no voice no scream |
| `something-moves` | Something Moves | 2s | something large shifting in the dark nearby, wet stone scraping, heavy weight repositioning slowly, then total silence, no voice no scream |
| `far-rumble` | Far Rumble | 3s | deep stone rumble from somewhere far below, brief structural groan, like a distant collapse or something enormous moving, subsonic resonance, fades slowly |
| `whispers-word` | Almost a Word | 2s | unintelligible whispers that almost resolve into a single word, echoing in a stone corridor, the shape of voices without meaning, then silence, no actual words spoken |
| `drip-pool-echo` | Drip Pool Echo | 2.5s | three irregular water drips falling into a still underground pool, each with distinct cave echo that overlaps the previous, unhurried, vast underground space |
| `distant-scream` | Distant Scream | 2s | a human sound heard from very far away through stone corridors, heavily muffled by distance and stone, could almost be mistaken for wind, deeply unsettling |

---

_Last updated: 2026-03-19 — 55 library sounds, 91 zone sounds_
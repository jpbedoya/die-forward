# Die Forward — Content Bible

## Core Concept
A text-based roguelite where death is not the end — it's content. When you die, your corpse, inventory, and final words become part of the world for future players to discover.

---

## Setting: The Eternal Descent

The world exists above a vast underworld — not hell, not heaven, but something older. A place that existed before the gods named it. Mortals who seek fortune descend into its depths, staking their souls (and SOL) for a chance at glory.

**The truth no one speaks:** The underworld *wants* visitors. It feeds on their memories, their final words, their despair. Every death makes it stronger. Every corpse becomes part of its architecture.

---

## Tone & Voice

### Writing Style
- **Second person, present tense** — "You descend. The air grows cold."
- **Sparse, evocative** — Short sentences. Fragments welcome.
- **Sensory-first** — Describe what you feel, hear, smell before what you see
- **Dread through understatement** — Horror implied, not explicit

### Vocabulary Bank

**Use freely:**
- Ancient, forgotten, nameless, hollow, pale
- Descend, sink, drift, seep, crawl
- Whisper, murmur, echo, silence
- Stone, water, shadow, bone, ash
- Cold, damp, still, heavy, wrong

**Avoid:**
- Modern words (computer, digital, cyber)
- Clichés (suddenly, very, really)
- Excessive adjectives
- Exclamation marks

### Sample Tone
> The stairs end. Below, water stretches into darkness — black and still as glass. Something moves beneath the surface. Something patient.

---

## The Five Zones

The underworld is not one place. It is five, so far — five wounds in the world, each with its own element, its own dead, its own way of ending you. The Sunken Crypt is the first descent. The others open to those who survive it.

Canonical zone data (names, taglines, lore, depth tiers) lives in `mobile/lib/zones/*.json` — those files are the source of truth for what ships.

---

### THE SUNKEN CRYPT
*The first descent. Nothing here is alive.*

- **Element:** Water and stone
- **Palette:** Deep blue, black water, pale drowned light
- **Sounds:** Dripping water, distant echoes, wet footsteps, silence
- **Temperature:** Cold. Always cold.

Ancient stairs carved by forgotten hands lead down into flooded halls where the boundary between life and death grows thin. This was a temple once — or a tomb. The distinction no longer matters. The water remembers everyone who drowned.

**Depths:** THE UPPER CRYPT → THE FLOODED HALLS → THE ABYSS

---

### THE ASHEN CRYPTS
*A civilization that chose fire over surrender.*

- **Element:** Fire
- **Palette:** Charred black, ember orange, ash gray
- **Sounds:** Crackling, settling cinders, heat ticking in stone
- **Temperature:** Heat that rises with every stair

The stairs descend into heat. Below, a city burns — not in catastrophe, but in ritual, in deliberate continuation. They looked at what climbed from below and made a choice: burn all of it. The fire worked. The fire never stopped.

**Depths:** THE OUTER RUINS → THE BURNING HEART → THE PYRE

---

### THE FROZEN GALLERY
*Time stopped here. The dead are preserved perfectly.*

- **Element:** Ice
- **Palette:** Midnight blue, pale glacier light, white frost
- **Sounds:** Creaking ice, held breath, a stillness that presses on the ears
- **Temperature:** Cold beyond weather. Cold as a held moment.

Something exhaled once, deep beneath the named places, and everything stopped. The flames are still burning inside the walls. The dead are still wearing their expressions. Whatever exhaled has not inhaled yet.

**Depths:** THE OUTER GALLERY → THE COLLECTION → THE VAULT

---

### THE LIVING TOMB
*Something grew in the dark. Now everything is part of it.*

- **Element:** Flesh and growth
- **Palette:** Dark red, raw tissue, wet shadow
- **Sounds:** Slow pulse, wet shifting, breathing that is not yours
- **Temperature:** Warm. That is the worst part.

The tomb has no beginning anyone can trace. It grew while no one was watching, and by the time anyone understood what it was growing toward, the growth had become the answer to that question. Every body here became part of what keeps it warm.

**Depths:** THE OUTER GROWTH → THE DEEP FLESH → THE CORE

---

### THE VOID BEYOND
*Where the underworld forgot to finish building.*

- **Element:** Void
- **Palette:** Near-black, bruised violet, static
- **Sounds:** Shaped static, sounds that arrive before their source, silence with edges
- **Temperature:** None. The absence of the question.

Past the last passage the underworld bothered to finish, something waits that was assembled from everything you chose not to be. The static here is shaped — almost a pattern. Nothing confirms what it is trying to say.

**Depths:** THE EDGE → THE UNFINISHED → THE NOTHING

---

### Zone Structure

Every zone is a branching node graph: two parallel lanes joined by cross-links, roughly twenty nodes deep. A run traverses about thirteen to sixteen of them — the path chosen decides which rooms are ever seen. Side chambers, gated by offerings, are coming. Each zone's three depth tiers scale the danger: the deeper the tier, the harder the creatures, the fewer who return.

---

## Room Types

### EXPLORE
Traversal rooms. Atmosphere and choice.
- Describe the environment
- Build tension
- Offer meaningful choices (different paths, risk/reward)

### COMBAT
Encounter hostile entities.
- Describe the creature before the fight
- Convey threat through behavior, not stats
- Make enemy "intent" feel organic, not gamey

### CORPSE
Discover fallen players.
- Somber, respectful tone
- The corpse is a real person who failed
- Their final words should feel heavy

### CACHE
Rest and resupply.
- Brief moment of safety
- Describe relief, but tinged with unease
- Nothing is truly safe here

### EXIT
Escape to victory.
- Earned triumph
- Light after darkness
- But hint that you'll return...

> **Structure note (phase 2a):** zones no longer render as a flat 12-room corridor — each zone defines a branching node graph (two parallel lanes with cross-links; sunken-crypt ships 21 nodes / 26 edges as the reference layout, identical across all locale packs). Branch choices surface a **dual-signal hint**: one sensory line in bible voice plus one legible risk/reward tag the player can read cold, so a choice trades a known reward against a known risk rather than being a coin flip. The room-type templates and prose pools above are unchanged — the graph decides which templates connect to which, not what's in them.

---

## Bestiary

Ten of the creatures below now carry a mechanical signature rule (rupture, reform, multiply, blink, pounce, absorb, honor, dormant, drain, chant) that telegraphs at the start of combat — the writing below is the flavor the mechanic is built to justify, not a separate layer.

---

### Tier 1 — Common Horrors

Encountered frequently. Individually manageable, but draining over time.

#### The Drowned
Once human. Now waterlogged husks animated by the underworld's hunger. They move wrong — joints bending backward, mouths open in silent screams.

**Behavior:** AGGRESSIVE (lunging), DEFENSIVE (circling), ERRATIC (twitching)

> It rises from the water. Bloated. Pale. Its eyes are gone but it sees you anyway.

#### Pale Crawler
Things that skitter in the dark. Too many limbs. They cling to walls and ceilings, dropping when you pass beneath. Were they ever human? You can't tell anymore.

**Behavior:** STALKING (following from shadows), AMBUSH (dropping from above), SWARMING (they're never alone)

> You hear it before you see it — wet clicks on stone. Then another. Then more.

#### The Hollow
Empty shells. No face, no features — just the outline of a person carved from shadow. They mimic your movements a half-second late.

**Behavior:** MIRRORING (copying your stance), ADVANCING (slow, inevitable), REACHING (arms too long)

> It stands where you stood a moment ago. Facing where you faced. It has no eyes but you feel it watching.

#### Bloated One
Corpses swollen with dark water. They burst when struck, releasing something worse — a cloud of choking memory, visions of how they died.

**Behavior:** SHAMBLING (slow approach), RUPTURING (explosive death), LEAKING (trail of corruption)

> The body blocks the passage. Distended. Taut. Something moves beneath its skin.

#### Flickering Shade
Afterimages of the dead. They exist in stutters — here, then there, then gone. They don't attack so much as *coincide* with you.

**Behavior:** BLINKING (teleporting short distances), PHASING (passing through walls), OVERLAPPING (occupying your space)

> For a moment, you have two shadows. One of them moves on its own.

#### Bone Weavers
Skeletal hands that emerge from walls and floors, grasping. There is no body — just hands, endless hands, reaching from the stone itself.

**Behavior:** GRASPING (grabbing ankles), PULLING (toward walls), MULTIPLYING (more appear when you linger)

> The wall has fingers. They're reaching for you.

#### Throat Singers *(not yet in game)*
Mouths without bodies. They float in the dark, humming frequencies that loosen your grip on reality. The sound is almost beautiful.

**Behavior:** DRONING (disorienting hum), SCREAMING (sonic burst), HARMONIZING (calling others)

> A sound in the dark. A note held too long. Your vision blurs at the edges.

#### Ash Children
Small. Gray. They look like children made of cinders. They don't attack — they just watch. But where they gather, the air grows thin and cold.

**Behavior:** WATCHING (unnerving stillness), GATHERING (more appear), SUFFOCATING (draining presence)

> A child stands in the water. Gray. Still. More join it. They don't blink.

#### The Hunched
Bent figures that move on all fours, sniffing the air. They were seekers once — treasure hunters, grave robbers. Now they seek only warmth.

**Behavior:** SNIFFING (tracking), POUNCING (sudden burst), FEEDING (draining warmth)

> It smells you before it sees you. Its head snaps toward you. It smiles.

#### Tideborn
Creatures of living water. They rise from puddles, take vaguely human shape, and collapse back into liquid when struck. But water is everywhere down here.

**Behavior:** FORMING (rising from water), CRASHING (wave attack), REFORMING (reconstituting after "death")

> The puddle at your feet isn't a puddle. It's standing up.

#### Echo Husks
They repeat the last words of the dead. Over and over. The same plea, the same scream, the same prayer. They stumble toward sound, seeking new words to learn.

**Behavior:** REPEATING (looping phrases), LISTENING (drawn to noise), COLLECTING (touching to absorb final words)

> "Help me," it says. "Help me. Help me. Help me." The voice isn't its own.

#### The Unfinished *(not yet in game)*
Bodies that stopped mid-transformation. Half-formed. Asymmetrical. One arm too long, one eye too many. They move like they're still learning how.

**Behavior:** LURCHING (unbalanced movement), ADAPTING (learning from damage), GROWING (adding mass from surroundings)

> It has too many parts. None of them fit together. It's still trying to become something.

---

### Tier 2 — Uncommon Threats

Dangerous encounters. Require strategy or resource expenditure.

#### Hollow Clergy
The priests who once tended this place. They still perform their rituals, but the god they serve has no name. Their prayers are static. Their blessings are curses.

**Behavior:** CHANTING (building power), CONDEMNING (cursing), BECKONING (don't approach)

> It kneels before an altar of black stone, speaking words that hurt to hear.

#### The Bound
Souls that refused to pass on, now wrapped in chains of their own regret. They drag their burdens through the halls, seeking others to share the weight.

**Behavior:** PURSUING (relentless), BINDING (grasping chains), PLEADING (asking for help)

> Chains rattle in the dark. Something whispers your name. How does it know your name?

#### Forgotten Guardian
Stone sentinels animated by old magic. They protected something once — a tomb, a treasure, a secret. They no longer remember what, but they remember *how*.

**Behavior:** DORMANT (statue-still until triggered), AWAKENING (slow, grinding), RELENTLESS (feels no pain)

> You thought it was a statue. Then it turned its head.

#### The Weeping
Spirits of grief given form. They drift, wailing silently, and their touch brings sorrow so deep it wounds the body.

**Behavior:** DRIFTING (floating aimlessly), MOURNING (drawn to pain), EMBRACING (cold, draining touch)

> Tears run down a face with no eyes. It reaches for you like a lost child.

#### Undertow Wyrms *(not yet in game)*
Serpentine things that swim through stone as easily as water. They surface only to feed, pulling victims down into the floor itself.

**Behavior:** CIRCLING (ripples in solid stone), BREACHING (sudden emergence), DRAGGING (pulling under)

> The floor ripples. Something vast moves beneath. A fin of black stone breaks the surface.

#### The Congregation
They were pilgrims once. Now they move as one — a crowd of bodies fused at the edges, shambling together, praying in unison. Join them, they whisper. Join.

**Behavior:** PROCESSING (slow march), ABSORBING (pulling victims into the mass), CHANTING (unified drone)

> They move together. Speak together. They want you to be together too.

#### Pale Oracle
Eyeless seers who float above the water. They speak truths you don't want to hear — when you'll die, how you'll fail, what you've already lost.

**Behavior:** PROPHESYING (demoralizing truths), REVEALING (showing hidden things), CURSING (words that wound)

> "You will die here," it says. It sounds like a fact, not a threat.

#### Carrion Knight
Warriors who fell in some ancient battle and refused to stop fighting. Their armor is rusted, their weapons notched, but their skill remains. They salute before they kill you.

**Behavior:** CHALLENGING (honorable combat), STRIKING (precise attacks), SALUTING (respecting worthy foes)

> It raises a rusted blade in salute. It expects you to fight well. It will be disappointed.

#### Pale Crawler Swarm
One wouldn't be a threat. But there isn't one. They pour from cracks in the walls, gaps in the floor, moving as a single hunger with many mouths.

**Behavior:** POURING (emerging from everywhere), ENGULFING (surrounding), CONSUMING (many small wounds)

> The clicking becomes a roar. The walls themselves seem to move. They were never hiding. They were waiting.

---

### Tier 3 — Rare Terrors / Bosses

Major encounters. Zone-defining threats.

#### The Unnamed
You cannot see it clearly. Your mind refuses. It exists in the corner of your vision, in the space between thoughts. It has always been here. It will always be here.

**Behavior:** WATCHING (unmoving attention), REACHING (reality bends), SPEAKING (not in words)

> Something is here. You can't see it. You can't describe it. But you know. You *know*.

#### The Keeper
Guardian of the exit. It has stood before the final door since before the door had anything behind it. None have passed. It does not hate you. It simply does not move.

**Behavior:** BLOCKING (it is the door now), CHARGING (building to overwhelm), RELENTLESS (it does not tire)

> It fills the passage. It was waiting before you arrived. It will be waiting after.

#### The Throne Keeper *(not yet in game)*
It sits where no throne exists, in a hall you can't remember entering. It was a king once, or a god. Now it is just *waiting*. It has been waiting for you specifically. It knew you would come.

**Behavior:** JUDGING (weighing your worth), COMMANDING (compelling obedience), RISING (when judgment is passed)

> "Approach." You don't want to. Your legs move anyway.

#### The Memory *(not yet in game)*
Not a creature — an event. A moment that keeps happening. You see yourself dying, over and over, in ways that haven't happened yet. Is it a warning? A threat? A promise?

**Behavior:** SHOWING (visions of death), LOOPING (time stutters), BECOMING (it starts to look like you)

> You see yourself fall. You see yourself drown. You see yourself standing exactly where you stand now. The other you waves.

#### The Choir of Endings *(not yet in game)*
A mass of voices given form. Every death cry ever uttered in the underworld, woven into a single screaming entity. It doesn't attack — it *remembers* you to death.

**Behavior:** RESONATING (building sonic pressure), REMEMBERING (speaking your fears), CRESCENDO (overwhelming release)

> A thousand voices speak at once. One of them is yours. It's saying something you haven't said yet.

#### The First Pilgrim *(not yet in game)*
The very first to descend. They found what lies at the bottom. It changed them. Now they guard the path, not to keep others out — but to keep something in.

**Behavior:** WARNING (trying to make you leave), BLOCKING (reluctant combat), SACRIFICING (letting you pass at a cost)

> "Turn back," they say. Their voice is tired. Ancient. "I cannot let you see what I saw."

#### Mother of Tides
The water itself, given will. She was here before the temple, before the prayers, before the name was forgotten. Everything that drowns belongs to her.

**Behavior:** RISING (flood surges), EMBRACING (pulling into depths), CLAIMING (you are already hers)

> The water rises. Not flowing — *reaching*. It wants you. It has always wanted you.

---

### Tier 4 — Apex / Super Boss

**Appears randomly. Extremely rare. Not meant to be defeated — meant to be survived.**

#### The Architect *(not yet in game)*
It built this place. Not the temple — the underworld itself. It is still building. It looks at you and sees raw material. Rooms shift when it moves. Walls become doors. Doors become mouths.

**Behavior:** 
- RESHAPING (environment transforms around it)
- INCORPORATING (absorbing the fallen into the structure)
- DESIGNING (you are part of its plan now)

**Special rules:**
- Can appear in any room after the third
- Escape is the only victory
- If it kills you, your corpse becomes part of the architecture
- Finding a corpse "built into the walls" means The Architect has visited

> The walls are breathing. No — *building*. Stone flows like water. The room is smaller than it was. It sees you. It has ideas.

**Audio cue:** Reality groaning. Stone singing. The sound of geometry being wrong.

**Why it exists:** The ultimate "oh shit" moment. Players who encounter it and survive have a story. Players who die to it become legend — their corpses literally embedded in the dungeon for others to find.

---

### Creature Design Principles

1. **Imply, don't explain** — What *was* it? Players should wonder.
2. **Movement matters** — How they move tells their story.
3. **Sound defines presence** — You hear them before you see them.
4. **Behavior over stats** — "It's circling" is scarier than "10 damage."
5. **Death isn't victory** — Killing them should feel necessary, not triumphant.

---

## Combat System

### Enemy Intents

Enemies telegraph their next action through visible intent. Players read the intent and choose their response.

| Intent | Description | Best Counter |
|--------|-------------|--------------|
| **AGGRESSIVE** | Lunging, attacking, fully committed | Dodge or Strike |
| **DEFENSIVE** | Circling, guarding, watching for weakness | Strike or wait |
| **CHARGING** | Building power for a big attack | Strike now or prepare to dodge |
| **ERRATIC** | Twitching, unpredictable, broken patterns | Brace (safest option) |
| **HUNTING** | Stalking, patient, waiting for mistakes | Don't give openings |
| **STALKING** | Matching movements, learning patterns | Force engagement |
| **RETREATING** | Backing away, possibly baiting | Pursue carefully or heal |

### Player Actions

| Action | Description | Outcomes |
|--------|-------------|----------|
| **Strike** | Attack the enemy | Success (damage), Mutual (trade), Weak (miss/glance) |
| **Dodge** | Evade the attack | Success (clean), Close (grazed), Fail (hit) |
| **Brace** | Reduce incoming damage | Success (reduced), Broken (partial), Fail (full hit) |
| **Use Item** | Consume an item mid-fight (herbs, flasks, shards) | Effect applies; the enemy may strike while you're occupied |
| **Flee** | Escape the fight | Success (clean), Hurt (escape + damage), Fail (trapped) |

**Signature rules:** creatures that carry a mechanical signature (rupture, reform, multiply, blink, pounce, absorb, honor, dormant, drain, chant) telegraph it at the start of combat — one line, in voice, that states the rule without naming it. `mobile/lib/locales/en.json` holds the canonical telegraph lines (`rule.*.telegraph`). Some signatures constrain your options — a woken Forgotten Guardian will not let you leave, and The Hunched punishes the moment you reach for your pack.

### Combat Narration Philosophy

- **Visceral, not clinical** — "Steel meets corruption" not "You deal 25 damage"
- **Consequences feel real** — Pain, exhaustion, fear
- **No guaranteed outcomes** — Sometimes you miss, sometimes you get hit
- **Mutual destruction** — Trading blows should feel costly for both sides

---

## Items

`mobile/lib/content.ts` (`ITEM_DETAILS`) is canonical for item names, effects, and rarities. The entries below mirror it; items marked *(not yet in game)* are future content.

### Consumables

#### Herbs
> Bitter leaves that numb pain and slow bleeding. They taste like regret.
**Effect:** Restores health when used. Common.

#### Pale Rations
> Food from below. It sustains, but you try not to think about what it was.
**Effect:** Restores stamina. Common.

#### Bone Dust
> Ground remains of something old. Inhale it to see what it saw.
**Effect:** Reveals hidden paths. Common.

#### Void Salt
> Black crystals that burn on contact. Creatures of water fear it.
**Effect:** +40% damage vs aquatic enemies. Uncommon.

#### Poison Vial
> Something extracted from something else. The smell alone is a weapon.
**Effect:** +40% damage bonus. Rare.

#### Ember Flask
> A vial of black water from before the fires. It drinks heat.
**Effect:** Clears all burn stacks. Uncommon.

#### Thermal Flask
> Still warm, somehow, after all this time. Warmth is mercy down here.
**Effect:** Clears all chill stacks. Uncommon.

#### Frost Shard
> A splinter of eternal ice. Hurl it, and the cold does the rest.
**Effect:** Freezes an enemy — it skips its next turn. Uncommon.

#### Cleansing Salts
> Coarse white grains that draw the rot out through the skin. It is not painless.
**Effect:** Clears all infection stacks. Uncommon.

#### Clarity Shard
> A fragment that remembers what is real. Hold it, and so do you.
**Effect:** Restores 1 clarity. Uncommon.

#### Tears of the Drowned *(not yet in game)*
> Collected grief, bottled. Drinking it lets you breathe underwater — but the sadness lingers.
**Effect:** Water breathing for one room.

#### Pilgrim's Last Breath *(not yet in game)*
> A vial of air from the surface. Precious beyond measure down here.
**Effect:** Full heal.

---

### Weapons

#### Rusty Blade
> Pitted with age and old blood. Still sharp enough.
**Effect:** +20% damage bonus. Common.

#### Dagger
> Small, ceremonial. It was meant for offerings, not combat. It works anyway.
**Effect:** +35% damage bonus. Uncommon.

#### Bone Hook
> Carved from a rib. Meant for pulling things closer. Or keeping them away.
**Effect:** Creates distance in combat. Uncommon.

#### Shield
> Dented, scarred, still standing. Like whoever carried it.
**Effect:** +25% defense bonus. Uncommon.

#### Tattered Shield
> More holes than metal. But it still catches blows that would kill you.
**Effect:** +25% defense bonus. Common.

#### Cloak
> Wrapped around your shoulders, things have trouble finding you.
**Effect:** +15% flee, +10% defense. Uncommon.

#### Voidblade
> A blade that hungers. It cuts through anything — including you.
**Effect:** +50% damage, take 5 damage per turn. Legendary.

#### Drowned Man's Anchor *(not yet in game)*
> Heavy. Brutal. Slow. When it hits, things stay down.
**Type:** Heavy melee. High damage, costs stamina.

#### Tooth of the Deep *(not yet in game)*
> A fang from something vast. It pulses in your hand like a heartbeat.
**Type:** Rare melee. Heals on hit.

#### Chain of the Bound *(not yet in game)*
> Taken from one of them. It still tries to wrap around things.
**Type:** Whip/chain. Area control.

---

### Artifacts (Passive Effects)

#### Torch
> A flickering flame. It pushes back the dark, but the dark pushes back.
**Effect:** +25% damage, light source. Uncommon.

#### Bone Charm
> Carved from something's finger. It hums when danger is near. It never stops humming.
**Effect:** +15% defense bonus. Uncommon.

#### Ancient Scroll
> Waterlogged pages in a language you almost understand. Reading it feels like remembering something you never knew.
**Effect:** +20% defense, +10% flee. Rare.

#### Eye of the Hollow
> It blinks when you're not looking. But it shows you things you'd otherwise miss.
**Effect:** Reveals hidden corpses and caches. Rare.

#### Heartstone
> Cold to the touch. Warm when death is near. Yours or someone else's.
**Effect:** Shows when you're near death. Legendary.

#### Pale Coin
> Currency of the dead. Worth nothing above. Worth everything below.
**Effect:** Can be offered for passage. Common.

#### Soulstone
> Crystallized from the residue of a hundred deaths. It pulses faintly — something is still inside.
**Effect:** +10% to all stats. Rare.

#### Death's Mantle
> Woven from shadow and last breaths. It remembers what it means to die.
**Effect:** Survive one lethal hit with 1 HP (consumed). Legendary.

#### Ash Veil
> Cloth woven from cooled cinders. The flames hesitate to touch their own.
**Effect:** Incoming burn is capped to 1 stack per hit. Rare.

#### Choir Fragment *(not yet in game)*
> A sliver of crystallized sound. Holding it, you hear whispers of the recently dead.
**Effect:** Can hear echoes of player deaths in the area.

#### Veil of Forgetting *(not yet in game)*
> Wrapped around your face, things have trouble remembering you exist.
**Effect:** Reduced enemy aggression.

#### First Pilgrim's Mark *(not yet in game)*
> A brand that never healed. It burns when you stray from the path.
**Effect:** Guidance toward the exit.

#### Architect's Nail *(not yet in game)*
> Black iron, impossibly heavy for its size. The walls lean away from it.
**Effect:** Prevents room-shifting when The Architect appears.

---

### Synergies

Item and tag combinations that click into place mid-run — a quiet confirmation that two things were always meant to be carried together. Eight pacts are live:

- **Ossuary Pact** — *"The charm hums against the hook. The bones answer."*
- **Grave Tide** — *"Salt and frost. The water remembers what it drowned."*
- **Last Breath Pact** — *"The mantle drinks from the stone. Death loosens its grip."*
- **Hungering Edge** — *"The blade feeds elsewhere now."*
- **Ashen Ward** — *"Ash coats the ember. Fire forgets your name."*
- **Pilgrim's Clarity** — *"The scroll reads itself. The way ahead thins."*
- **Twin Fangs** — *"One cut to open. One to finish."*
- **Beggar's Grace** — *"Nothing worth taking. Nothing worth chasing."*

`mobile/lib/locales/en.json` is canonical for these names and flavor lines — update there first if they ever change.

---

### Loot Tiers

| Tier | Drop Rate | Examples |
|------|-----------|----------|
| Common | 55% | Herbs, Pale Rations, Rusty Blade, Bone Dust |
| Uncommon | 30% | Void Salt, Bone Hook, Frost Shard |
| Rare | 12% | Soulstone, Eye of the Hollow, Ancient Scroll |
| Legendary | 3% | Heartstone, Death's Mantle, Voidblade |

Rates live in `rollRandomItem` (`mobile/lib/content.ts`). In mechanic zones, the zone's cure item is biased to drop locally so mitigation stays reachable.

---

## NPCs & Allies

Not all who wander the depths are enemies. Some are trapped. Some are guides. Some are something else.

---

### The Ferryman
Appears at water crossings. Will carry you across — for a price. The price is never SOL.

**Dialogue style:** Patient, transactional, unsettling courtesy.

> "A crossing, then? I accept what you value most. You'd be surprised what people offer."

**Function:** Safe passage past certain obstacles. Cost = item sacrifice.

---

### Whisper Keeper
A figure made of collected final words. It hoards the messages of the dead, trading them for memories.

**Dialogue style:** Speaks in fragments. Other people's sentences.

> "They said — 'should have dodged' — and before that — 'tell my family' — you have words too. I can smell them."

**Function:** Can reveal other players' final messages. Gives hints about what killed them.

---

### The Cartographer
Blind, but knows every inch of the underworld. They've been mapping it for centuries. The map is never finished because the place keeps changing.

**Dialogue style:** Obsessive, helpful, slightly mad.

> "Room seven connects to room three now. It didn't yesterday. Nothing is where it should be. Isn't that wonderful?"

**Function:** Can reveal room layouts, warn of dangers ahead.

---

### Echo of a Victor
A projection of someone who made it out. Not really here — just a memory the underworld couldn't digest.

**Dialogue style:** Confident, encouraging, slightly faded.

> "I made it. You can too. Don't trust the water. Don't answer the whispers. And whatever you do — keep moving."

**Function:** Gives gameplay tips. Reminds players escape is possible.

---

### The Collector
A figure draped in relics. They trade items — but only items taken from corpses. The economy of the dead.

**Dialogue style:** Businesslike, amoral, pragmatic.

> "That blade belonged to someone. Now it belongs to you. Soon it will belong to someone else. I can expedite that."

**Function:** Item trading. Can upgrade weapons for a cost.

---

### The Mourner
Sits beside corpses. Weeps for them. Knows their names somehow. Will tell you who they were if you ask.

**Dialogue style:** Sorrowful, gentle, uncomfortably knowing.

> "This one was brave. They made it further than most. Their family will never know what happened. But I will remember."

**Function:** Gives backstory to discovered corpses. Adds emotional weight.

---

### Child of the Architect
Small, curious, wrong. Claims to be the Architect's creation — or child — or mistake. Follows you sometimes. Doesn't understand why you're afraid.

**Dialogue style:** Innocent questions that reveal horrible truths.

> "Father is building something new. Do you want to see? You'll be part of it. Everyone becomes part of it eventually."

**Function:** Warns of Architect's presence. Sometimes helpful, sometimes leads you to danger.

---

## Lore & History

### The Three Descents

**The First Descent — The Naming**
Long ago, priests came to name the underworld. To give it boundaries. To make it known. They failed. It has no name. It refuses names. The Hollow Clergy are what remains of them.

**The Second Descent — The Claiming**
A king led an army below, intending to conquer death itself. They found the Throne Keeper instead. The army became the first Drowned. The king... became something else.

**The Third Descent — The Opening**
Someone opened a path that was never meant to be opened. Now mortals descend freely. The underworld allows this. It is hungry, and the dead are delicious.

---

### The Underworld's Nature

The underworld is not a place — it's a process. It digests. Everything that enters becomes part of it eventually. The walls are compressed corpses. The water is liquefied memory. The darkness is forgotten thoughts.

**It wants you here.**

Not to kill you — that's just a side effect. It wants your stories, your final words, your despair. Death is how it feeds. Every corpse makes it larger. Every message etched in stone is a new tooth in its countless mouths.

---

### The Staking Ritual

The SOL you stake is not just currency — it's a binding. By offering something of value, you become visible to the underworld. Without the stake, you'd simply pass through unseen, unchanged.

The stake makes you real down there.

It also makes you *edible*.

---

### Why People Descend

**The Desperate:** Nothing left to lose. The underworld offers a chance.

**The Grieving:** Seeking lost loved ones. They never find them. They usually join them.

**The Greedy:** Rumors of treasure. Ancient relics. Wealth beyond measure. Mostly rumors.

**The Curious:** Scholars, seekers, fools. They want to understand. Understanding is not rewarded.

**The Compelled:** Some hear a call. A whisper. An invitation. They have no choice.

---

### The Truth About Corpses

When you find another player's corpse, you're not just finding a body. You're finding a *story that ended*. The underworld keeps them visible on purpose — to show you what happens, to make you afraid, to feed on your reaction.

Their final words are prayers the underworld answered wrong.

---

### The Exit

The exit is real. You can leave. Some do.

But the underworld lets you leave. That's the disturbing part. It opens the door. It watches you climb toward the light.

It knows you'll come back.

They always come back.

---

## Room Description Templates

Use these as starting points for generating room content.

---

### EXPLORE Room Templates

**Corridor/Passage:**
> [Sensory detail]. The passage [direction] stretches [distance/visibility]. [Environmental detail]. [Subtle tension].

Example:
> Water drips from somewhere above. The passage ahead bends into darkness, the stone walls slick with moisture. Something scraped against this wall recently. The marks are fresh.

**Chamber/Hall:**
> [Size impression]. [Architectural detail]. [What's wrong here]. [What draws attention].

Example:
> A vast chamber opens before you, pillars rising into shadow. This was built for gatherings. Now it gathers only silence. At the far end, something glints.

**Threshold/Transition:**
> [Boundary description]. [What changes]. [Warning sign]. [Choice implication].

Example:
> The doorway ahead is older than the walls around it. Beyond, the air tastes different — copper and salt. The scratches on the frame point backward. Someone tried to claw their way out.

**Descent:**
> [Downward path]. [How far]. [What changes as you go]. [Point of no return].

Example:
> The stairs spiral down. And down. And down. The walls grow wetter, the air heavier. At some point, you realize you can't remember how many steps you've taken.

**Flooded Passage:**
> [Water level]. [What's beneath]. [Movement difficulty]. [What's floating].

Example:
> Water to your waist. Black, still, cold. Your feet find steps you can't see. Something brushes your leg. It might be debris. It might not.

**Collapse/Unstable:**
> [Structural damage]. [Danger signs]. [Time pressure]. [Path through].

Example:
> Cracks web the ceiling. Dust falls in streams. This place wants to come down. You can hear it groaning, debating. Move quickly.

**Shrine/Altar:**
> [Religious remnant]. [What was worshipped]. [Current state]. [Lingering presence].

Example:
> An altar to something forgotten. Offerings rot at its base — flowers, coins, teeth. The idol's face has been scratched away, but you feel it watching.

**Graveyard/Ossuary:**
> [Scale of death]. [How arranged]. [What's disturbed]. [The weight of it].

Example:
> Bones. Sorted by type — skulls here, femurs there, ribs stacked like kindling. Someone organized this. Recently. There are gaps in the arrangement. Spaces waiting to be filled.

**Crossroads:**
> [Multiple paths]. [How they differ]. [Hints about each]. [Choice pressure].

Example:
> Three passages. Left breathes cold air. Right echoes with distant water. Center shows scratch marks, claw marks, drag marks. All leading in. None leading out.

**Witness Room:**
> [Something happened here]. [Evidence remains]. [Can't identify what]. [Unsettling].

Example:
> The walls are scorched in a pattern. Circular. Precise. At the center, the stone has melted and reformed. Whatever was here is gone. You hope it's gone.

---

### COMBAT Room Templates

**Ambush:**
> [False calm]. [Sudden awareness]. [Creature reveal]. [Threat established].

Example:
> The room seems empty. Still water, still air. Then you see it — the surface rippling where nothing moved. Rising.

**Confrontation:**
> [Creature already present]. [Its behavior]. [Its attention on you]. [The moment before violence].

Example:
> It stands in your path. Waiting. Its head tracks your movement with patient hunger. There is no way around. Only through.

**Territorial:**
> [Creature's space]. [Why it's here]. [Your intrusion]. [Its response].

Example:
> Bones are stacked here. Arranged. This is a nest. And you've just woken what lives in it.

**Pursuit:**
> [Already being followed]. [It's catching up]. [Nowhere to hide]. [Must face it].

Example:
> You hear it behind you. Closer each time you look. Running isn't working. It knows these passages better than you ever will. Time to stop running.

**Swarm:**
> [Many of them]. [Individually weak]. [Together dangerous]. [Overwhelming].

Example:
> One wouldn't be a threat. But there isn't one. They pour from cracks in the walls, gaps in the floor. Dozens. More coming.

**Feeding:**
> [Creature occupied]. [Disturbing meal]. [Hasn't noticed you yet]. [Your choice].

Example:
> It's eating something. The sounds are wet, methodical. It hasn't seen you. You could sneak past. You could strike first. It will finish soon.

**Guardian:**
> [Protecting something]. [Won't move]. [Must be defeated]. [What it guards].

Example:
> It stands before the door. It has always stood before this door. It will die before this door. So will you, if you want what's behind it.

**Arena:**
> [Space designed for combat]. [Something watching]. [Spectators unseen]. [Performance expected].

Example:
> The chamber is round. Smooth. Designed for this. You feel eyes on you — from where? The thing across from you doesn't care about the audience. Only about you.

**Wounded Creature:**
> [Already hurt]. [Desperate]. [Unpredictable]. [Mercy is a choice].

Example:
> It's bleeding. Dragging itself. The wounds aren't yours — someone else tried. Someone else failed. It sees you. Teeth bared. Fear and fury in equal measure.

---

### CORPSE Room Templates

**Fresh Death:**
> [Recent signs]. [Body position]. [What they were doing]. [Their final words frame].

Example:
> The blood hasn't dried. They fell here moments ago — or years. Time lies down here. Their hand still reaches toward the wall, where words are scratched: [FINAL MESSAGE].

**Old Death:**
> [Decay state]. [Integration with environment]. [What remains]. [Their message endures].

Example:
> Almost part of the wall now. The water has claimed most of them. But the words carved in stone remain, patient as grief: [FINAL MESSAGE].

**Disturbing Death:**
> [Something wrong]. [Death wasn't natural]. [Implication]. [Their warning].

Example:
> They didn't die fighting. They died waiting. Sitting against the wall, hands folded, patient. As if they knew. The message beside them: [FINAL MESSAGE].

**Peaceful Death:**
> [Acceptance]. [Preparation]. [Final arrangements]. [Grace in ending].

Example:
> They made themselves comfortable. Arranged their belongings neatly. Faced the direction of the exit they'd never reach. Their message is careful, considered: [FINAL MESSAGE].

**Group Death:**
> [Multiple bodies]. [What happened]. [Died together]. [One message speaks for all].

Example:
> Three of them. Huddled together at the end. Whatever came, they faced it as one. Only one had time to write. The words are for everyone: [FINAL MESSAGE].

**Heroic Death:**
> [Died fighting]. [Took something with them]. [Last stand]. [Victory in defeat].

Example:
> The creature lies beside them. They killed it. It killed them. A fair trade? Their blade is still in its skull. Their message is short, satisfied: [FINAL MESSAGE].

**Trapped Death:**
> [Couldn't escape]. [Slow realization]. [Desperation visible]. [Final acceptance].

Example:
> The collapse sealed them in. Scratch marks cover the debris. They tried for a long time. Then they stopped. Their message, written in the dark: [FINAL MESSAGE].

**Posed Death:**
> [Arranged by something else]. [Unnatural position]. [Message for you]. [Warning].

Example:
> Someone arranged this body. Propped it up. Turned its face toward the entrance. Toward you. The message isn't theirs — something else wrote it: [FINAL MESSAGE].

**Legendary Death:**
> [Famous player]. [Many have seen this corpse]. [Known throughout]. [Their words echo].

Example:
> You've heard of this one. Everyone has. They made it further than anyone before. Their corpse has become a landmark. A pilgrimage site. Their words, copied and shared: [FINAL MESSAGE].

---

### CACHE Room Templates

**Alcove:**
> [Hidden space]. [Safety implication]. [What's here]. [Brief respite].

Example:
> A gap in the wall, above the waterline. Dry. Almost warm. Someone left supplies here. Maybe they made it out. Maybe they just left these behind.

**Offering Site:**
> [Religious remnant]. [What was worshipped]. [What's left for you]. [Unease despite gift].

Example:
> An altar to something nameless. Offerings rot at its base — but among them, something useful. Taking it feels like accepting a contract.

**Survivor's Stash:**
> [Signs of habitation]. [Someone lived here]. [They're gone now]. [Their legacy].

Example:
> Marks on the wall. Counting days? There are hundreds. Whoever was here survived longer than seems possible. They left everything behind. Did they escape, or simply give up?

**Natural Spring:**
> [Clean water]. [Life exists here]. [Anomaly in the dark]. [Healing but wrong].

Example:
> Water trickles from the stone. Clear, not black. Something green grows at its edges — the only living thing you've seen. Drinking feels like hope. The aftertaste lingers.

**Abandoned Camp:**
> [Recent occupation]. [Left in hurry]. [Supplies scattered]. [What scared them].

Example:
> A bedroll. Cold ashes. Food half-eaten. They left fast. The supplies remain, but so does the question: what made someone abandon their only safe place?

**Forgotten Armory:**
> [Weapons stored]. [Ancient purpose]. [Still functional]. [War never ended here].

Example:
> Racks of weapons, pitted with age. An army was equipped here once. For what war? Against what enemy? Some blades still hold an edge. Help yourself.

**Merchant Hollow:**
> [NPC present]. [Trading possible]. [Prices steep]. [Economy of desperation].

Example:
> A figure in the dark. They have supplies. They have prices. Both are non-negotiable. In the underworld, commerce continues. The dead still deal.

**Trophy Room:**
> [Creature remains]. [Someone's victories]. [Warnings]. [Loot among the dead].

Example:
> Skulls mounted on the walls. Claws displayed. Someone hunted here, successfully. Their trophies tell you what's ahead. Their supplies might help you survive it.

**Hermit's Cell:**
> [Long-term survival]. [Madness or wisdom]. [Knowledge shared]. [Supplies offered].

Example:
> They've been here years. Decades? Alone. Surviving. They don't want company, but they'll share what they know. And what they no longer need.

---

### EXIT Room Templates

**The Threshold:**
> [Light]. [The world above]. [Escape real]. [Bittersweet].

Example:
> Light. Actual light, not torchlight — daylight, filtering through a crack above. Stone stairs lead upward. The air smells like the world you remember. You made it. This time.

**The Release:**
> [Underworld letting go]. [Feeling of transition]. [What you're leaving]. [What you're taking with you].

Example:
> The darkness recedes behind you. The water doesn't follow past this point. The underworld releases you — not defeated, just... satisfied. For now. You carry something out with you. You're not sure what.

**The Earned Exit:**
> [Trial completed]. [Proved worthy]. [Door opens]. [Respect from the deep].

Example:
> The final door. It was sealed. Now it opens. You earned this. Whatever judges in the dark has weighed you and found you sufficient. Step through, survivor.

**The Reluctant Exit:**
> [Leaving something behind]. [Unfinished business]. [Partial victory]. [You'll return].

Example:
> The exit is here. Safety is here. But something remains undone. Someone remains unfound. You leave, but not completely. Part of you stays. You'll be back for it.

**The Changed Exit:**
> [You're different now]. [Can you go back]. [The world hasn't changed]. [You have].

Example:
> The surface waits above. But can you return to it? You've seen what lies beneath. You've become someone who knows. The world above seems smaller now. Less real.

**The Invitation:**
> [Exit offered freely]. [Suspiciously easy]. [The underworld wants you back]. [See you soon].

Example:
> The door stands open. Sunlight spills through. No guardian, no trial, no price. Just... permission. It wants you to leave. It knows you'll return. They always return.

**The False Exit:**
> [Looks like escape]. [Something wrong]. [Trap revealed]. [Deeper instead of out].

Example:
> Light ahead. Stairs leading up. Relief floods through you. Then you notice — the stairs are going down. They were always going down. The "light" grins with too many teeth.

---

## Death & Corpses

### Finding a Corpse

When discovering another player's body, convey:
- They were real. They tried.
- What remains is just an echo
- Their final words carry weight

**Sample discoveries:**
> A body against the wall. Still fresh. Their hand clutches something — a note? A prayer? Their final words are scratched into the stone beside them.

> You almost step on them. Half-submerged. Face down. How long have they been here? The water keeps no record.

### Dying

Death should feel:
- Inevitable but earned
- Somber, not punishing
- Like the end of a story, not a failure

**Sample death moments:**
> The cold reaches your chest. Your legs stop working. The water rises, or maybe you sink. It's hard to tell the difference now.

> You fall. The stone is cold against your cheek. Somewhere above, light flickers. You won't reach it.

### Final Words

Players write their own, but the surrounding text should frame it:
> Your last thought crystallizes. Something for those who follow. A warning? A joke? A prayer?

---

## Audio Direction

The soundscape is as important as the words. Audio should feel **ancient, wet, and wrong** — like being somewhere you shouldn't be.

---

### Philosophy

- **Less is more** — Silence builds tension. Don't fill every moment.
- **Diegetic first** — Sounds that exist in the world (drips, echoes) over "soundtrack"
- **Unease over shock** — No jump scares. Slow creeping dread.
- **The zone's element is ever-present** — In the Sunken Crypt, water. You should always sense it. Other zones lead with fire, ice, flesh, or static.

---

### Ambient Layers

**Base layer (constant, low):**
- Slow, irregular water drips — never rhythmic, unpredictable
- Deep room tone — cavernous emptiness, almost subsonic
- Distant echoes — unclear source, could be footsteps, could be nothing

**Mid layer (occasional):**
- Water movement — something displaced it. What?
- Stone settling — groans, cracks, the place is old
- Wind from nowhere — there shouldn't be wind down here

**Unsettling layer (rare, triggered):**
- Whispers at edge of hearing — not words, just the shape of voices
- Breathing that isn't yours — or is it?
- A sound that stops exactly when you notice it

---

### Music

**Style:** Dark ambient / drone
- **Instruments:** Low strings, bowed metal, waterphone, processed voices
- **No melody** — Texture and atmosphere only
- **Key:** Minor, but often atonal or microtonal
- **Tempo:** None. Timeless.

**Layers by game state:**

| State | Music Feel |
|-------|-----------|
| Exploring | Near-silence, occasional deep tones, room tone |
| Approaching combat | Low drone builds, dissonance creeps in |
| In combat | Rhythmic pulse (heartbeat), tension, still minimal |
| Victory | Drone fades, brief moment of silence, then resolution tone |
| Death | Music drops out. Just water. Then nothing. |
| Finding corpse | Single sustained note, mournful, fades slowly |

**Reference artists:**
- Lustmord (dark ambient)
- Atrium Carceri (dungeon atmosphere)
- Ben Frost (tension, dread)
- Akira Yamaoka (Silent Hill — emotional horror)

---

### Sound Effects

**Movement:**
- Footsteps on wet stone — squelch, echo, weight
- Wading through water — resistance, cold implied
- Climbing/scrambling — scraping, effort

**Combat:**
- Player attacks — thuds, impacts, bone cracking (not slashing)
- Enemy attacks — wet sounds, grasping, unnatural movement
- Damage taken — gasp, stumble, visceral but not gory
- Dodge — water splash, quick movement, relief
- Brace — held breath, impact absorbed
- Healing — liquid, bitter swallow, exhale

**Environment:**
- Doors/passages — stone grinding, ancient mechanisms
- Discovering items — small chime, but muted (not "video gamey")
- Discovering corpse — silence falls, then a single tone

**UI (minimal):**
- Menu select — soft stone tap
- Confirm — deeper tap
- Error/invalid — dull, blocked sound (not harsh)
- Text appearing — subtle, like water drops (or nothing)

---

### Creature Audio

**The Drowned:**
- Movement: Wet dragging, joints popping wrong
- Idle: Gurgling, water in lungs, almost-moaning
- Attack: Sudden splash, grasping, desperate
- Death: Collapse into water, bubbling, then still

**Hollow Clergy:**
- Movement: Robes dragging on wet stone
- Idle: Chanting — monotone, language unknown, unsettling rhythm
- Attack: Chant peaks, discordant, painful to hear
- Death: Chant cuts off mid-word. Silence.

**The Unnamed:**
- Movement: You don't hear it move. It's just... closer.
- Presence: Static, pressure, your own heartbeat loud
- Attack: Reality distortion — sounds stretch, reverse, layer
- "Death": Sound returns to normal. Was it ever there?

---

### Room-Specific Audio

**EXPLORE rooms:**
- Full ambient layers
- Music minimal, almost absent
- Emphasize isolation

**COMBAT rooms:**
- Ambient pulls back
- Music tension builds
- Creature sounds dominate

**CORPSE rooms:**
- Ambient softens
- Single mournful tone
- Respectful silence for reading final words

**CACHE rooms:**
- Brief safety — ambient lightens slightly
- Almost warm (but not quite)
- Don't let them relax fully

**EXIT room:**
- Distant light sound? Wind from above?
- Music resolves (rare moment of harmony)
- Ambient fades as you ascend

---

### Technical Notes

- **Format:** .mp3 for music, .wav for SFX (or .ogg for web)
- **Looping:** Ambient layers should loop seamlessly
- **Ducking:** Music should duck under SFX, especially combat
- **Randomization:** Multiple variants for common sounds (footsteps, drips)
- **Silence:** Literal silence is a tool. Use it at death, corpse discovery.

---

### Audio Asset List (to source/create)

**Ambient:**
- [ ] Water drip variations (5-10)
- [ ] Deep room tone loop
- [ ] Distant echo variations (3-5)
- [ ] Water movement (3-5)
- [ ] Stone settling (3-5)
- [ ] Whisper layer (1-2, subtle)

**Music:**
- [ ] Exploration drone (loopable, 2-3 min)
- [ ] Combat tension (loopable, 1-2 min)
- [ ] Death sting (5-10 sec)
- [ ] Victory resolution (10-15 sec)
- [ ] Corpse discovery tone (5 sec)

**SFX:**
- [ ] Footsteps wet stone (5+ variations)
- [ ] Combat impacts (5+ variations)
- [ ] Player damage (3 variations)
- [ ] Heal sound
- [ ] Dodge/splash
- [ ] UI clicks (2-3)

**Creatures:**
- [ ] Drowned ambient/attack/death
- [ ] Clergy chant loop/attack/death
- [ ] Unnamed presence (abstract, unsettling)

---

## Content Generation Guidelines

When generating room descriptions, combat narration, or death text:

1. **Stay in second person, present tense**
2. **Keep it under 50 words for room descriptions**
3. **Lead with sensation, not sight**
4. **End on tension or unease**
5. **Never break the fourth wall**
6. **Vary sentence length — short punchy mixed with longer flow**
7. **The underworld is patient, not aggressive**

---

## Sample Descent (Sunken Crypt)

One walk down the real graph (`mobile/lib/zones/sunken-crypt.json`, 21 nodes, two lanes). Forks show both hints; the player reads them and chooses. This run leans left.

1. **EXPLORE** (n01, descent) — The stairs end at black water. Two passages. Left: "You hear breathing that is not your own" `[DANGER]`. Right: "The path continues, plain and unlit" `[PASSAGE]`. *The player chooses left.*
2. **COMBAT** (n02, ambush) — The still water was never still. The Drowned rise.
3. **CORPSE** (n04, fresh) — A fallen player. The blood hasn't dried. Their final words remain.
4. **COMBAT** (n06, confrontation) — Something waits in the path. Beyond it, a fork: a flooded passage `[PASSAGE]`, or a nest that smells of old kills `[DANGER]`. *Left again.*
5. **EXPLORE** (n08, flooded) — Water to your waist. Something brushes your leg.
6. **COMBAT** (n10, guardian) — It stands before the way down. It has always stood here. Past it, the lanes split: an alcove above the waterline `[RESPITE]`, or a heroic corpse `[THE FALLEN]`.
7. **CACHE** (n11, alcove) — Dry stone. Supplies someone left behind. Brief rest.
8. **COMBAT** (n13, territorial) — You've woken what nests here. Then the fork: an empty chamber `[PASSAGE]` or pursuit in the dark `[DANGER]`.
9. **EXPLORE** (n15, chamber) — Pillars rising into shadow. At the far end, something glints.
10. **CORPSE** (n17, heroic) — They killed it. It killed them. Their blade is still in its skull.
11. **COMBAT** (n19, pursuit) — It has been behind you for three rooms. Time to stop running.
12. **COMBAT** (n20, arena, boss) — The chamber is round. Smooth. Designed for this. The Keeper fills it.
13. **EXIT** (n21) — Light. Actual light. Escape. For now.

Thirteen nodes walked of twenty-one. The right-hand lane — the ambush at n18, the second cache, the other corpses — stays dark. Someone else will walk it.

---

*This bible is the source of truth for all generated content. When in doubt, return here.*

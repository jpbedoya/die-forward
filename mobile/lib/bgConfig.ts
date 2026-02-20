/**
 * Per-screen background image toggle.
 * Set any screen to `true` to show the crypt background, `false` for solid dark.
 */
export const BG_ENABLED: Record<string, boolean> = {
  splash:  true,   // index.tsx — "tap to enable sound" cinematic
  home:    false,  // index.tsx — main title/DESCEND screen
  stake:   false,  // stake.tsx — The Toll
  play:    false,  // play.tsx  — dungeon rooms
  combat:  false,  // combat.tsx — fight screen
  death:   false,  // death.tsx — death screen
  victory: false,  // victory.tsx — victory screen
  feed:    false,  // feed.tsx  — echoes feed
};

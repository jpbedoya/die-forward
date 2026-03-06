// Static asset map for creature art — Expo requires static require() calls
// WebP at 512x512 — ~15x smaller than original PNGs

const CREATURE_ASSETS: Record<string, any> = {
  'ash-children':       require('../assets/creatures/ash-children.webp'),
  'bone-weavers':       require('../assets/creatures/bone-weavers.webp'),
  'carrion-knight':     require('../assets/creatures/carrion-knight.webp'),
  'flickering-shade':   require('../assets/creatures/flickering-shade.webp'),
  'forgotten-guardian': require('../assets/creatures/forgotten-guardian.webp'),
  'hollow-clergy':      require('../assets/creatures/hollow-clergy.webp'),
  'pale-crawler-swarm': require('../assets/creatures/pale-crawler-swarm.webp'),
  'pale-crawler':       require('../assets/creatures/pale-crawler.webp'),
  'pale-oracle':        require('../assets/creatures/pale-oracle.webp'),
  'the-bloated':        require('../assets/creatures/the-bloated.webp'),
  'the-bound':          require('../assets/creatures/the-bound.webp'),
  'the-congregation':   require('../assets/creatures/the-congregation.webp'),
  'the-drowned':        require('../assets/creatures/the-drowned.webp'),
  'the-hollow':         require('../assets/creatures/the-hollow.webp'),
  'the-hunched':        require('../assets/creatures/the-hunched.webp'),
  'the-keeper':         require('../assets/creatures/the-keeper.webp'),
  'the-unnamed':        require('../assets/creatures/the-unnamed.webp'),
  'tideborn':           require('../assets/creatures/tideborn.webp'),
};

/**
 * Given an artUrl like "/creatures/the-drowned.png" or a bare key like "the-drowned",
 * returns the bundled require() source, or null if not found.
 */
export function getCreatureAsset(artUrl: string): any {
  const key = artUrl.replace(/^.*\//, '').replace(/\.(png|webp|jpg)$/i, '');
  return CREATURE_ASSETS[key] ?? null;
}

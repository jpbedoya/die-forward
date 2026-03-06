// Static asset map for creature art — Expo requires static require() calls
// Add new entries here as art is added for other zones

const CREATURE_ASSETS: Record<string, any> = {
  'ash-children':      require('../assets/creatures/ash-children.png'),
  'bone-weavers':      require('../assets/creatures/bone-weavers.png'),
  'carrion-knight':    require('../assets/creatures/carrion-knight.png'),
  'flickering-shade':  require('../assets/creatures/flickering-shade.png'),
  'forgotten-guardian':require('../assets/creatures/forgotten-guardian.png'),
  'hollow-clergy':     require('../assets/creatures/hollow-clergy.png'),
  'pale-crawler-swarm':require('../assets/creatures/pale-crawler-swarm.png'),
  'pale-crawler':      require('../assets/creatures/pale-crawler.png'),
  'pale-oracle':       require('../assets/creatures/pale-oracle.png'),
  'the-bloated':       require('../assets/creatures/the-bloated.png'),
  'the-bound':         require('../assets/creatures/the-bound.png'),
  'the-congregation':  require('../assets/creatures/the-congregation.png'),
  'the-drowned':       require('../assets/creatures/the-drowned.png'),
  'the-hollow':        require('../assets/creatures/the-hollow.png'),
  'the-hunched':       require('../assets/creatures/the-hunched.png'),
  'the-keeper':        require('../assets/creatures/the-keeper.png'),
  'the-unnamed':       require('../assets/creatures/the-unnamed.png'),
  'tideborn':          require('../assets/creatures/tideborn.png'),
};

/**
 * Given an artUrl like "/creatures/the-drowned.png" or a bare key like "the-drowned",
 * returns the bundled require() source, or null if not found.
 */
export function getCreatureAsset(artUrl: string): any {
  // Extract key from path: "/creatures/the-drowned.png" → "the-drowned"
  const key = artUrl.replace(/^.*\//, '').replace(/\.png$/i, '');
  return CREATURE_ASSETS[key] ?? null;
}

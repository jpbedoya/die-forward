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
  'mother-of-tides':    require('../assets/creatures/mother-of-tides.webp'),
};

/**
 * Given an artUrl like "/creatures/the-drowned.png" or a bare key like "the-drowned",
 * returns the bundled require() source, or null if not found.
 */
export function getCreatureAsset(artUrl: string): any {
  const key = artUrl.replace(/^.*\//, '').replace(/\.(png|webp|jpg)$/i, '');
  return CREATURE_ASSETS[key] ?? null;
}

// Maps creature names → asset keys for direct name-based lookup
const NAME_TO_KEY: Record<string, string> = {
  'The Drowned':       'the-drowned',
  'Pale Crawler':      'pale-crawler',
  'The Hollow':        'the-hollow',
  'Bloated One':       'the-bloated',
  'Flickering Shade':  'flickering-shade',
  'The Hunched':       'the-hunched',
  'Tideborn':          'tideborn',
  'Bone Weavers':      'bone-weavers',
  'Ash Children':      'ash-children',
  'Hollow Clergy':     'hollow-clergy',
  'The Bound':         'the-bound',
  'Forgotten Guardian':'forgotten-guardian',
  'Carrion Knight':    'carrion-knight',
  'Pale Oracle':       'pale-oracle',
  'The Congregation':  'the-congregation',
  'Pale Crawler Swarm':'pale-crawler-swarm',
  'The Unnamed':       'the-unnamed',
  'The Keeper':        'the-keeper',
  'Mother of Tides':   'mother-of-tides',
};

/**
 * Look up asset by creature name directly — bypasses artUrl entirely.
 * Use as fallback when artUrl is missing or undefined.
 */
export function getCreatureAssetByName(name: string): any {
  const key = NAME_TO_KEY[name];
  return key ? (CREATURE_ASSETS[key] ?? null) : null;
}

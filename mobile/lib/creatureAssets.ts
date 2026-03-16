// Static asset map for creature art — Expo requires static require() calls
// WebP format — all creatures at 1024x1536

const CREATURE_ASSETS: Record<string, any> = {
  // Sunken Crypt (original)
  'ash-children':           require('../assets/creatures/ash-children.webp'),
  'bone-weavers':           require('../assets/creatures/bone-weavers.webp'),
  'echo-husks':             require('../assets/creatures/echo-husks.webp'),
  'carrion-knight':         require('../assets/creatures/carrion-knight.webp'),
  'flickering-shade':       require('../assets/creatures/flickering-shade.webp'),
  'forgotten-guardian':     require('../assets/creatures/forgotten-guardian.webp'),
  'hollow-clergy':          require('../assets/creatures/hollow-clergy.webp'),
  'pale-crawler-swarm':     require('../assets/creatures/pale-crawler-swarm.webp'),
  'pale-crawler':           require('../assets/creatures/pale-crawler.webp'),
  'pale-oracle':            require('../assets/creatures/pale-oracle.webp'),
  'the-bloated':            require('../assets/creatures/the-bloated.webp'),
  'the-bound':              require('../assets/creatures/the-bound.webp'),
  'the-weeping':            require('../assets/creatures/the-weeping.webp'),
  'the-congregation':       require('../assets/creatures/the-congregation.webp'),
  'the-drowned':            require('../assets/creatures/the-drowned.webp'),
  'the-hollow':             require('../assets/creatures/the-hollow.webp'),
  'the-hunched':            require('../assets/creatures/the-hunched.webp'),
  'the-keeper':             require('../assets/creatures/the-keeper.webp'),
  'the-unnamed':            require('../assets/creatures/the-unnamed.webp'),
  'tideborn':               require('../assets/creatures/tideborn.webp'),
  'mother-of-tides':        require('../assets/creatures/mother-of-tides.webp'),
  // Ashen Crypts
  'ember-husks':            require('../assets/creatures/ember-husks.webp'),
  'cinder-priests':         require('../assets/creatures/cinder-priests.webp'),
  'the-scorched':           require('../assets/creatures/the-scorched.webp'),
  'flame-weavers':          require('../assets/creatures/flame-weavers.webp'),
  'ashen-congregation':     require('../assets/creatures/ashen-congregation.webp'),
  'the-pyre-keeper':        require('../assets/creatures/the-pyre-keeper.webp'),
  // Frozen Gallery
  'the-preserved':          require('../assets/creatures/the-preserved.webp'),
  'ice-wraiths':            require('../assets/creatures/ice-wraiths.webp'),
  'frost-sentinels':        require('../assets/creatures/frost-sentinels.webp'),
  'the-shattered':          require('../assets/creatures/the-shattered.webp'),
  'the-glacial-sovereign':  require('../assets/creatures/the-glacial-sovereign.webp'),
  // Living Tomb
  'mycelium-crawlers':      require('../assets/creatures/mycelium-crawlers.webp'),
  'the-incorporated':       require('../assets/creatures/the-incorporated.webp'),
  'membrane-guardian':      require('../assets/creatures/membrane-guardian.webp'),
  'the-bloom':              require('../assets/creatures/the-bloom.webp'),
  'the-root':               require('../assets/creatures/the-root.webp'),
  // Void Beyond
  'probability-shade':      require('../assets/creatures/probability-shade.webp'),
  'echo-double':            require('../assets/creatures/echo-double.webp'),
  'void-architects':        require('../assets/creatures/void-architects.webp'),
  'the-unanchored':         require('../assets/creatures/the-unanchored.webp'),
  'the-unwritten':          require('../assets/creatures/the-unwritten.webp'),
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
  // Sunken Crypt
  'The Drowned':          'the-drowned',
  'Pale Crawler':         'pale-crawler',
  'The Hollow':           'the-hollow',
  'Bloated One':          'the-bloated',
  'Flickering Shade':     'flickering-shade',
  'The Hunched':          'the-hunched',
  'Tideborn':             'tideborn',
  'Bone Weavers':         'bone-weavers',
  'Ash Children':         'ash-children',
  'Hollow Clergy':        'hollow-clergy',
  'The Bound':            'the-bound',
  'Forgotten Guardian':   'forgotten-guardian',
  'Carrion Knight':       'carrion-knight',
  'Pale Oracle':          'pale-oracle',
  'The Congregation':     'the-congregation',
  'Pale Crawler Swarm':   'pale-crawler-swarm',
  'The Unnamed':          'the-unnamed',
  'The Keeper':           'the-keeper',
  'Mother of Tides':      'mother-of-tides',
  // Ashen Crypts
  'Ember Husks':          'ember-husks',
  'Cinder Priests':       'cinder-priests',
  'The Scorched':         'the-scorched',
  'Flame Weavers':        'flame-weavers',
  'Ashen Congregation':   'ashen-congregation',
  'The Pyre Keeper':      'the-pyre-keeper',
  // Frozen Gallery
  'The Preserved':        'the-preserved',
  'Ice Wraiths':          'ice-wraiths',
  'Frost Sentinels':      'frost-sentinels',
  'The Shattered':        'the-shattered',
  'The Glacial Sovereign':'the-glacial-sovereign',
  // Living Tomb
  'Mycelium Crawlers':    'mycelium-crawlers',
  'The Incorporated':     'the-incorporated',
  'Membrane Guardian':    'membrane-guardian',
  'The Bloom':            'the-bloom',
  'The Root':             'the-root',
  // Void Beyond
  'Probability Shade':    'probability-shade',
  'Echo Double':          'echo-double',
  'Void Architects':      'void-architects',
  'The Unanchored':       'the-unanchored',
  'The Unwritten':        'the-unwritten',
};

/**
 * Look up asset by creature name directly — bypasses artUrl entirely.
 * Use as fallback when artUrl is missing or undefined.
 */
export function getCreatureAssetByName(name: string): any {
  const key = NAME_TO_KEY[name];
  return key ? (CREATURE_ASSETS[key] ?? null) : null;
}

// Static asset map for item art — Expo requires static require() calls
// WebP — same pipeline as creature art

const ITEM_ASSETS: Record<string, any> = {
  'ancient-scroll':   require('../assets/items/ancient-scroll.webp'),
  'bone-charm':       require('../assets/items/bone-charm.webp'),
  'bone-dust':        require('../assets/items/bone-dust.webp'),
  'bone-hook':        require('../assets/items/bone-hook.webp'),
  'cloak':            require('../assets/items/cloak.webp'),
  'dagger':           require('../assets/items/dagger.webp'),
  'eye-of-the-hollow':require('../assets/items/eye-of-the-hollow.webp'),
  'heartstone':       require('../assets/items/heartstone.webp'),
  'herbs':            require('../assets/items/herbs.webp'),
  'pale-coin':        require('../assets/items/pale-coin.webp'),
  'pale-rations':     require('../assets/items/pale-rations.webp'),
  'poison-vial':      require('../assets/items/poison-vial.webp'),
  'rusty-blade':      require('../assets/items/rusty-blade.webp'),
  'shield':           require('../assets/items/shield.webp'),
  'tattered-shield':  require('../assets/items/tattered-shield.webp'),
  'torch':            require('../assets/items/torch.webp'),
  'void-salt':        require('../assets/items/void-salt.webp'),
};

/**
 * Given an artUrl like "/items/rusty-blade.webp" or a bare key like "rusty-blade",
 * returns the bundled require() source, or null if not found.
 */
export function getItemAsset(artUrl: string): any {
  const key = artUrl.replace(/^.*\//, '').replace(/\.(png|webp|jpg)$/i, '');
  return ITEM_ASSETS[key] ?? null;
}

// Maps item names → asset keys for direct name-based lookup
const NAME_TO_KEY: Record<string, string> = {
  'Ancient Scroll':    'ancient-scroll',
  'Bone Charm':        'bone-charm',
  'Bone Dust':         'bone-dust',
  'Bone Hook':         'bone-hook',
  'Cloak':             'cloak',
  'Dagger':            'dagger',
  'Eye of the Hollow': 'eye-of-the-hollow',
  'Heartstone':        'heartstone',
  'Herbs':             'herbs',
  'Pale Coin':         'pale-coin',
  'Pale Rations':      'pale-rations',
  'Poison Vial':       'poison-vial',
  'Rusty Blade':       'rusty-blade',
  'Shield':            'shield',
  'Tattered Shield':   'tattered-shield',
  'Torch':             'torch',
  'Void Salt':         'void-salt',
};

/**
 * Look up asset by item name directly — bypasses artUrl entirely.
 * Use as fallback when artUrl is missing or undefined.
 */
export function getItemAssetByName(name: string): any {
  const key = NAME_TO_KEY[name];
  return key ? (ITEM_ASSETS[key] ?? null) : null;
}

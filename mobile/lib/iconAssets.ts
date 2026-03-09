// Static asset map for UI icons — Expo requires static require() calls
// WebP with alpha transparency

export const Icons = {
  strike:   require('../assets/icons/strike.webp'),
  dodge:    require('../assets/icons/dodge.webp'),
  brace:    require('../assets/icons/brace.webp'),
  flee:     require('../assets/icons/flee.webp'),
  stamina:  require('../assets/icons/stamina.webp'),
  heart:    require('../assets/icons/heart.webp'),
  backpack: require('../assets/icons/backpack.webp'),
} as const;

export type IconName = keyof typeof Icons;

/** Map combat action id → icon */
export const COMBAT_ACTION_ICONS: Record<string, any> = {
  strike: Icons.strike,
  dodge:  Icons.dodge,
  brace:  Icons.brace,
  flee:   Icons.flee,
};

/**
 * Per-screen background configuration.
 * - enabled: show the crypt background image
 * - overlay: opacity of dark overlay (0 = none, 1 = full black)
 */
export interface BgConfig {
  enabled: boolean;
  overlay: number; // 0-1
}

export const BG_CONFIG: Record<string, BgConfig> = {
  splash:  { enabled: true,  overlay: 0    },  // No overlay — raw cinematic
  home:    { enabled: true,  overlay: 0.5  },  // Slight dim for readability, smooth from splash
  stake:   { enabled: false, overlay: 0.6  },
  play:    { enabled: false, overlay: 0.6  },
  combat:  { enabled: false, overlay: 0.6  },
  death:   { enabled: false, overlay: 0.6  },
  victory: { enabled: false, overlay: 0.6  },
  feed:    { enabled: false, overlay: 0.6  },
};

// Legacy export for backwards compatibility
export const BG_ENABLED: Record<string, boolean> = Object.fromEntries(
  Object.entries(BG_CONFIG).map(([k, v]) => [k, v.enabled])
);

// Audio timings for each VO clip - CLEANED UP v13
// Format: { file, startFrame } - startFrame is relative to video start

export interface VOClip {
  file: string;
  startFrame: number;
}

// 30 fps
const FPS = 30;

// Scene timings (in seconds from video start)
const SCENES = {
  hook: 0,      // 0-8s
  title: 8,     // 8-13s
  game: 13,     // 13-23s (tightened)
  corpse: 23,   // 23-33s (moved earlier, was 26)
  agents: 33,   // 33-46s (moved earlier, was 36)
  together: 46, // 46-54s (moved earlier, was 52)
  build: 54,    // 54-62s (tightened)
  close: 62,    // 62-78s (moved earlier)
};

// VO clip durations (from fresh generation):
// vo-01: 1.07s, vo-02: 2.93s, vo-03: 3.48s
// vo-04: 2.23s, vo-05: 2.04s, vo-06: 2.55s
// vo-07: 2.46s, vo-08: 1.90s, vo-09: 2.55s
// vo-10: 1.72s, vo-11: 1.39s, vo-12: 3.30s, vo-13: 3.07s
// vo-14: 2.51s, vo-15: 2.04s
// vo-16: 2.79s, vo-17: 2.23s, vo-18: 3.02s
// vo-19: 1.81s, vo-20: 2.79s

export const VO_CLIPS: VOClip[] = [
  // Scene 1: Hook (0-8s) - tighter pacing
  { file: "vo-01-hook.mp3", startFrame: (SCENES.hook + 0.3) * FPS },         // 0.3s, ends 1.4s
  { file: "vo-02-hook-2.mp3", startFrame: (SCENES.hook + 1.8) * FPS },       // 1.8s, ends 4.7s
  { file: "vo-02b-hook-dare.mp3", startFrame: (SCENES.hook + 5.2) * FPS },   // 5.2s, ends 7.3s

  // Scene 2: Title (8-13s)
  { file: "vo-03-title.mp3", startFrame: (SCENES.title + 0.5) * FPS },       // 8.5s, ends 12s

  // Scene 3: Game (13-26s)
  { file: "vo-04-game-1.mp3", startFrame: (SCENES.game + 0.5) * FPS },       // 13.5s, ends 15.7s
  { file: "vo-05-game-2.mp3", startFrame: (SCENES.game + 3.5) * FPS },       // 16.5s, ends 18.5s
  { file: "vo-06-game-3.mp3", startFrame: (SCENES.game + 6.5) * FPS },       // 19.5s, ends 22s

  // Scene 4: Corpse (26-36s)
  { file: "vo-07-corpse-1.mp3", startFrame: (SCENES.corpse + 0.5) * FPS },   // 26.5s, ends 29s
  { file: "vo-08-corpse-2.mp3", startFrame: (SCENES.corpse + 3.5) * FPS },   // 29.5s, ends 31.4s
  { file: "vo-09-corpse-3.mp3", startFrame: (SCENES.corpse + 6) * FPS },     // 32s, ends 34.6s

  // Scene 5: Agents (36-52s)
  { file: "vo-10-agents-1.mp3", startFrame: (SCENES.agents + 0.5) * FPS },   // 36.5s, ends 38.2s
  { file: "vo-11-agents-2.mp3", startFrame: (SCENES.agents + 3) * FPS },     // 39s, ends 40.4s
  { file: "vo-12-agents-skill.mp3", startFrame: (SCENES.agents + 5) * FPS }, // 41s, ends 44.3s
  { file: "vo-13-agents-wallet.mp3", startFrame: (SCENES.agents + 9) * FPS }, // 45s, ends 48.1s

  // Scene 6: Together (52-60s)
  { file: "vo-14-together-1.mp3", startFrame: (SCENES.together + 0.5) * FPS }, // 52.5s, ends 55s
  { file: "vo-15-together-2.mp3", startFrame: (SCENES.together + 4) * FPS },   // 56s, ends 58s

  // Scene 7: Build (60-72s) - bullets animate silently after VO
  { file: "vo-16-build-1.mp3", startFrame: (SCENES.build + 0.5) * FPS },     // 60.5s, ends 62.2s
  { file: "vo-17-build-2.mp3", startFrame: (SCENES.build + 3) * FPS },       // 63s, ends 65.2s
  // vo-18 removed - bullets animate without VO

  // Scene 8: Close (76-86s)
  { file: "vo-19-close-1.mp3", startFrame: (SCENES.close + 0.5) * FPS },     // 76.5s, ends 78.3s
  { file: "vo-20-close-2.mp3", startFrame: (SCENES.close + 3) * FPS },       // 79s, ends 81.8s
];

// Export scene timings for use in components
export const SCENE_TIMINGS = SCENES;

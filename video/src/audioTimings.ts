// Audio timings for each VO clip
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
  game: 13,     // 13-23s
  corpse: 23,   // 23-33s
  agents: 33,   // 33-50s (expanded for longer VO!)
  together: 50, // 50-60s (expanded for VO!)
  build: 60,    // 60-72s
  close: 72,    // 72-82s
};

export const VO_CLIPS: VOClip[] = [
  // Scene 1: Hook (0-8s)
  // vo-01-hook: 1.78s, vo-02-hook-2: 4.2s
  { file: "vo-01-hook.mp3", startFrame: (SCENES.hook + 0.5) * FPS },
  { file: "vo-02-hook-2.mp3", startFrame: (SCENES.hook + 3) * FPS },

  // Scene 2: Title (8-13s)
  // vo-03-title: 5.23s
  { file: "vo-03-title.mp3", startFrame: (SCENES.title + 0.5) * FPS },

  // Scene 3: Game (13-23s)
  // vo-04-game-1: 4.08s ends at ~18s, vo-05 starts at 18.5s ✓
  { file: "vo-04-game-1.mp3", startFrame: (SCENES.game + 0.5) * FPS },
  { file: "vo-05-game-2.mp3", startFrame: (SCENES.game + 5) * FPS },      // was 3.5, add gap
  { file: "vo-06-game-3.mp3", startFrame: (SCENES.game + 9) * FPS },      // was 6.5, add gap

  // Scene 4: Corpse (23-33s)
  // vo-07: 3.38s, vo-08: 2.69s, vo-09: 3.62s
  { file: "vo-07-corpse-1.mp3", startFrame: (SCENES.corpse + 0.5) * FPS },
  { file: "vo-08-corpse-2.mp3", startFrame: (SCENES.corpse + 4.5) * FPS }, // was 4
  { file: "vo-09-corpse-3.mp3", startFrame: (SCENES.corpse + 7.5) * FPS }, // was 6.5

  // Scene 5: Agents (33-50s) - needs more room!
  // vo-10: 2.59s, vo-11: 2.26s, vo-12: ~6s, vo-13: ~5s
  { file: "vo-10-agents-1.mp3", startFrame: (SCENES.agents + 0.5) * FPS },
  { file: "vo-11-agents-2.mp3", startFrame: (SCENES.agents + 3.5) * FPS }, // was 3
  { file: "vo-12-agents-skill.mp3", startFrame: (SCENES.agents + 6.5) * FPS }, // was 5.5
  { file: "vo-13-agents-wallet.mp3", startFrame: (SCENES.agents + 13) * FPS }, // was 9.5, BIG gap

  // Scene 6: Together (50-56s)
  // vo-14: 5.74s, vo-15: 3.24s - total ~9s, need 6s scene
  { file: "vo-14-together-1.mp3", startFrame: (SCENES.together + 0.3) * FPS },
  { file: "vo-15-together-2.mp3", startFrame: (SCENES.together + 6.5) * FPS }, // was 3.5, after vo-14 ends

  // Scene 7: Build (56-68s)
  // vo-16: 4s, vo-17: 5.83s, vo-18: 4.85s
  { file: "vo-16-build-1.mp3", startFrame: (SCENES.build + 0.5) * FPS },
  { file: "vo-17-build-2.mp3", startFrame: (SCENES.build + 5) * FPS },    // was 4
  { file: "vo-18-build-3.mp3", startFrame: (SCENES.build + 11) * FPS },   // was 7, after vo-17 ends

  // Scene 8: Close (68-78s)
  // vo-19: 2.57s, vo-20: 5.23s
  { file: "vo-19-close-1.mp3", startFrame: (SCENES.close + 0.5) * FPS },
  { file: "vo-20-close-2.mp3", startFrame: (SCENES.close + 3.5) * FPS },  // was 3
];

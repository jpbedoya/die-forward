# Die Forward — Video Creation

Pitch video built with [Remotion](https://remotion.dev/) — a React-based video framework.

## How Remotion Works

1. **Write React components** — each component renders a frame
2. **Use `useCurrentFrame()`** — get current frame number for animations
3. **Define compositions** — set duration, fps, dimensions in `Root.tsx`
4. **Render** — Remotion captures each frame and stitches into video

## Quick Start

```bash
cd video
npm install

# Open Remotion Studio (visual preview + timeline)
npm run start

# Render final video
npm run build
# → outputs to out/pitch.mp4
```

## Project Structure

```
video/
├── src/
│   ├── Root.tsx           # Composition registration (fps, duration, size)
│   ├── PitchVideo.tsx     # Main video component (scene sequencing)
│   ├── scenes/            # Individual scene components
│   │   ├── SceneHook.tsx
│   │   ├── SceneTitle.tsx
│   │   ├── SceneGame.tsx
│   │   ├── SceneCorpse.tsx
│   │   ├── SceneAgents.tsx
│   │   ├── SceneTogether.tsx
│   │   ├── SceneBuild.tsx
│   │   └── SceneClose.tsx
│   ├── audioTimings.ts    # VO clip timing definitions
│   ├── animations.ts      # Shared animation helpers
│   └── styles.ts          # Shared styles
├── public/
│   └── audio/             # Music + voiceover clips
├── remotion.config.ts     # Remotion configuration
└── out/                   # Rendered output (gitignored)
```

## Video Settings

Defined in `src/Root.tsx`:

| Setting | Value |
|---------|-------|
| Resolution | 1080 × 1920 (vertical/mobile) |
| FPS | 30 |
| Duration | ~78 seconds |

## Scene Timing

Scenes are defined in `PitchVideo.tsx` with start time and duration (in seconds):

| Scene | Start | Duration | Description |
|-------|-------|----------|-------------|
| hook | 0s | 8s | Opening hook |
| title | 8s | 5s | Title card |
| game | 13s | 10s | Gameplay intro |
| corpse | 23s | 10s | Corpse mechanic |
| agents | 33s | 13s | AI agents concept |
| together | 46s | 8s | "Play together" |
| build | 54s | 8s | Building/roadmap |
| close | 62s | 16s | Closing CTA |

## Adding a New Scene

1. Create component in `src/scenes/SceneNewName.tsx`:
   ```tsx
   import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

   export const SceneNewName: React.FC = () => {
     const frame = useCurrentFrame();
     const { fps } = useVideoConfig();
     
     // Animation based on frame
     const opacity = Math.min(1, frame / (fps * 0.5)); // fade in over 0.5s
     
     return (
       <AbsoluteFill style={{ opacity }}>
         {/* Your scene content */}
       </AbsoluteFill>
     );
   };
   ```

2. Import in `PitchVideo.tsx` and add to `SCENES` array:
   ```tsx
   import { SceneNewName } from "./scenes/SceneNewName";
   
   const SCENES = [
     // ... existing scenes
     { id: "newname", component: SceneNewName, start: 70, duration: 8 },
   ];
   ```

3. Update total duration in `Root.tsx` if needed.

## Audio

- **Background music:** `public/audio/music-elevenlabs.mp3` (plays at 15% volume)
- **Voiceover clips:** Defined in `src/audioTimings.ts` with frame-accurate timing
- Audio files go in `public/` folder, referenced via `staticFile()`

## Useful Remotion Hooks

```tsx
import { 
  useCurrentFrame,     // Current frame number
  useVideoConfig,      // { fps, width, height, durationInFrames }
  interpolate,         // Map frame ranges to values
  spring,              // Physics-based animations
  Sequence,            // Time-offset container
  AbsoluteFill,        // Full-frame positioned div
  Audio,               // Audio playback
  Img,                 // Image with loading handling
  staticFile,          // Reference public/ files
} from "remotion";
```

## Rendering Options

```bash
# Default render (PitchVideo composition)
npm run build

# Custom output path
npx remotion render PitchVideo custom-name.mp4

# Different quality
npx remotion render PitchVideo out.mp4 --crf 18  # lower = better quality

# Specific frame range (for testing)
npx remotion render PitchVideo out.mp4 --frames=0-90  # first 3 seconds
```

## Notes

- This folder is excluded from Metro (mobile) and TypeScript (Next.js) builds
- `node_modules/` and `out/` are gitignored
- Rendered `.mp4` files are gitignored — re-render locally as needed

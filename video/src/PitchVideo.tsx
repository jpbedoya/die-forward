import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";

// Import scene components
import { SceneHook } from "./scenes/SceneHook";
import { SceneTitle } from "./scenes/SceneTitle";
import { SceneGame } from "./scenes/SceneGame";
import { SceneCorpse } from "./scenes/SceneCorpse";
import { SceneAgents } from "./scenes/SceneAgents";
import { SceneTogether } from "./scenes/SceneTogether";
import { SceneBuild } from "./scenes/SceneBuild";
import { SceneClose } from "./scenes/SceneClose";
import { VO_CLIPS } from "./audioTimings";

// Scene timing (in seconds) - v19 tightened gaps
const SCENES = [
  { id: "hook", component: SceneHook, start: 0, duration: 8 },
  { id: "title", component: SceneTitle, start: 8, duration: 5 },
  { id: "game", component: SceneGame, start: 13, duration: 10 },      // tightened
  { id: "corpse", component: SceneCorpse, start: 23, duration: 10 },  // earlier
  { id: "agents", component: SceneAgents, start: 33, duration: 13 },  // earlier
  { id: "together", component: SceneTogether, start: 46, duration: 8 }, // earlier
  { id: "build", component: SceneBuild, start: 54, duration: 8 },     // tightened (was 16)
  { id: "close", component: SceneClose, start: 62, duration: 16 },    // moved earlier (was 70)
];

export const PitchVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {/* Background Music - low volume to not overpower VO */}
      <Sequence from={0} name="background-music">
        <Audio src={staticFile("audio/music-elevenlabs.mp3")} volume={0.15} />
      </Sequence>

      {/* VO Audio tracks */}
      {VO_CLIPS.map((clip, i) => (
        <Sequence key={`vo-${i}`} from={clip.startFrame} name={`vo-${clip.file}`}>
          <Audio src={staticFile(`audio/${clip.file}`)} volume={1} />
        </Sequence>
      ))}

      {/* Render each scene as a sequence */}
      {SCENES.map((scene) => {
        const SceneComponent = scene.component;
        return (
          <Sequence
            key={scene.id}
            from={scene.start * fps}
            durationInFrames={scene.duration * fps}
            name={scene.id}
          >
            <SceneComponent />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

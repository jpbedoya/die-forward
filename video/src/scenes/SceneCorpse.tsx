import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { colors, centerFlex, phoneFrame, glowText } from "../styles";
import { slideUp, kenBurns, fadeIn, typewriter } from "../animations";
import { Captions } from "../components/Caption";
import { Logo } from "../components/Logo";

// Matches vo-script.md Scene 4
const VO_LINES = [
  { text: "When you die, you become part of the world.", start: 0.5, end: 3.5 },
  { text: "Other players find your corpse.", start: 4, end: 6.5 },
  { text: "They can loot you, or pay respects with SOL.", start: 7, end: 10 },
];

export const SceneCorpse: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const phase = frame < 4 * fps ? 1 : frame < 7 * fps ? 2 : 3;

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      <Logo delay={0.3} />

      {/* Purple/red glow for death theme */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at center, ${colors.purpleDim}30 0%, transparent 60%),
            radial-gradient(ellipse at bottom, ${colors.red}20 0%, transparent 40%)
          `,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Phone mockup with corpse screen */}
      <div
        style={{
          ...phoneFrame,
          marginTop: -100,
          marginBottom: 30,
          ...slideUp(frame, fps, 0.2),
        }}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <Img
            src={staticFile("images/05-corpse.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: kenBurns(frame, durationInFrames, 1.05, 1),
            }}
          />
        </div>
      </div>

      {/* Text - matches VO */}
      <div style={{ textAlign: "center", padding: "0 40px" }}>
        {phase >= 1 && (
          <div
            style={{
              fontSize: 40,
              color: colors.purple,
              fontWeight: "bold",
              marginBottom: 20,
              ...glowText(colors.purpleDim),
              ...slideUp(frame, fps, 0.4),
            }}
          >
            {typewriter(frame, fps, "When you die, you become part of the world.", 30, 0.5)}
          </div>
        )}
        
        {phase >= 2 && (
          <div
            style={{
              fontSize: 36,
              color: colors.textDim,
              marginBottom: 15,
              ...slideUp(frame - 4 * fps, fps, 0.3),
            }}
          >
            {typewriter(frame, fps, "Other players find your corpse.", 30, 4)}
          </div>
        )}
        
        {phase >= 3 && (
          <div
            style={{
              fontSize: 36,
              color: colors.amber,
              ...slideUp(frame - 7 * fps, fps, 0.3),
            }}
          >
            {typewriter(frame, fps, "Loot you. Or pay respects with SOL.", 30, 7)}
          </div>
        )}
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { colors, centerFlex, phoneFrame } from "../styles";
import { slideUp, kenBurns, fadeIn, typewriter } from "../animations";
import { Captions } from "../components/Caption";
import { Logo } from "../components/Logo";

// Matches vo-script.md Scene 3
const VO_LINES = [
  { text: "Stake SOL. Descend into the crypt.", start: 0.5, end: 3.5 },
  { text: "Fight creatures. Probably die.", start: 4, end: 6.5 },
  { text: "Every death is hashed and verified on Solana.", start: 7, end: 10 },
];

export const SceneGame: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Three phases matching VO
  const phase = frame < 3.5 * fps ? 1 : frame < 7 * fps ? 2 : 3;

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      <Logo delay={0.3} />

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse at center, ${colors.amberDim}30 0%, transparent 60%)`,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Phone mockup */}
      <div
        style={{
          ...phoneFrame,
          marginTop: -100,
          marginBottom: 40,
          ...slideUp(frame, fps, 0.2),
        }}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <Img
            src={staticFile("images/02-title.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: kenBurns(frame, durationInFrames, 1, 1.08),
            }}
          />
        </div>
      </div>

      {/* Text - matches VO exactly */}
      <div style={{ textAlign: "center", padding: "0 40px" }}>
        {phase >= 1 && (
          <>
            <div
              style={{
                fontSize: 44,
                color: colors.text,
                marginBottom: 8,
                ...slideUp(frame, fps, 0.5),
              }}
            >
              {typewriter(frame, fps, "Stake SOL.", 30, 0.5)}
            </div>
            <div
              style={{
                fontSize: 44,
                color: colors.text,
                marginBottom: 20,
                ...slideUp(frame, fps, 0.8),
              }}
            >
              {typewriter(frame, fps, "Descend into the crypt.", 30, 1.5)}
            </div>
          </>
        )}
        
        {phase >= 2 && (
          <div
            style={{
              fontSize: 44,
              color: colors.redBright,
              fontWeight: "bold",
              marginBottom: 20,
              ...slideUp(frame - 3.5 * fps, fps, 0.3),
            }}
          >
            {typewriter(frame, fps, "Fight creatures. Probably die.", 30, 4)}
          </div>
        )}

        {phase >= 3 && (
          <div
            style={{
              fontSize: 32,
              color: colors.purple,
              fontStyle: "italic",
              ...slideUp(frame - 7 * fps, fps, 0.3),
            }}
          >
            {typewriter(frame, fps, "Every death — verified on Solana.", 35, 7.2)}
          </div>
        )}
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

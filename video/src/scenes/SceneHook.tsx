import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, centerFlex, glowText } from "../styles";
import { fadeIn, slideUp, typewriter, scaleIn } from "../animations";
import { Captions } from "../components/Caption";

// VO script for this scene
const VO_LINES = [
  { text: "In a world...", start: 0.5, end: 2.5 },
  { text: "where every AI hackathon builds tools for agents.", start: 3, end: 7 },
];

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      {/* Dramatic background glow */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at center, ${colors.red}20 0%, transparent 50%),
            radial-gradient(ellipse at center bottom, ${colors.amberDim}30 0%, transparent 60%)
          `,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Main text */}
      <div
        style={{
          ...centerFlex,
          padding: "60px",
          textAlign: "center",
        }}
      >
        {/* "In a world..." - dramatic trailer opening */}
        <div
          style={{
            fontSize: 72,
            color: colors.text,
            fontWeight: "bold",
            marginBottom: 60,
            fontStyle: "italic",
            ...glowText(colors.textDim),
            ...scaleIn(frame, fps, 0.3),
          }}
        >
          {typewriter(frame, fps, "In a world...", 15, 0.5)}
        </div>

        {/* "where every AI hackathon builds tools for agents" */}
        <div
          style={{
            fontSize: 48,
            color: colors.textDim,
            marginBottom: 20,
            ...slideUp(frame, fps, 2.5),
          }}
        >
          {typewriter(frame, fps, "where every AI hackathon", 30, 3)}
        </div>
        <div
          style={{
            fontSize: 48,
            color: colors.amber,
            fontWeight: "bold",
            ...slideUp(frame, fps, 3),
          }}
        >
          {typewriter(frame, fps, "builds tools for agents.", 30, 4.5)}
        </div>
      </div>

      {/* Captions */}
      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

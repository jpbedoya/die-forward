import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, centerFlex, glowText } from "../styles";
import { fadeIn, slideUp, typewriter, scaleIn } from "../animations";
import { Captions } from "../components/Caption";

// VO script for this scene - tighter pacing
const VO_LINES = [
  { text: "In a world...", start: 0.3, end: 1.4 },
  { text: "where every AI hackathon builds tools for agents.", start: 1.8, end: 4.7 },
  { text: "One game dared to make dying the point.", start: 5.2, end: 7.3 },
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
            marginBottom: 40,
            fontStyle: "italic",
            ...glowText(colors.textDim),
            ...scaleIn(frame, fps, 0.2),
          }}
        >
          {typewriter(frame, fps, "In a world...", 20, 0.3)}
        </div>

        {/* "where every AI hackathon builds tools for agents" */}
        <div
          style={{
            fontSize: 44,
            color: colors.textDim,
            marginBottom: 15,
            ...slideUp(frame, fps, 1.5),
          }}
        >
          {typewriter(frame, fps, "where every AI hackathon", 35, 1.8)}
        </div>
        <div
          style={{
            fontSize: 44,
            color: colors.textDim,
            marginBottom: 50,
            ...slideUp(frame, fps, 2),
          }}
        >
          {typewriter(frame, fps, "builds tools for agents.", 35, 3)}
        </div>

        {/* "One game dared to make dying the point." */}
        <div
          style={{
            fontSize: 52,
            color: colors.redBright,
            fontWeight: "bold",
            fontStyle: "italic",
            ...glowText(colors.red),
            ...scaleIn(frame, fps, 5),
          }}
        >
          {typewriter(frame, fps, "One game dared to make dying the point.", 30, 5.2)}
        </div>
      </div>

      {/* Captions */}
      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

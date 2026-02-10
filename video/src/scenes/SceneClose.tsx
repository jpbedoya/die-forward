import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, centerFlex, glowText } from "../styles";
import { scaleIn, fadeIn, pulseGlow } from "../animations";
import { Captions } from "../components/Caption";

const VO_LINES = [
  { text: "Your death feeds the depths.", start: 0.5, end: 2.5 },
  { text: "Die Forward. Play now at die-forward.vercel.app", start: 3, end: 7 },
];

export const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      {/* Dramatic red glow */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at center, ${colors.red}40 0%, transparent 60%),
            radial-gradient(ellipse at center bottom, ${colors.amberDim}30 0%, transparent 40%)
          `,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontSize: 44,
          color: colors.redBright,
          fontStyle: "italic",
          marginBottom: 50,
          ...glowText(colors.red),
          ...scaleIn(frame, fps, 0.3),
        }}
      >
        Your death feeds the depths.
      </div>

      {/* Skull */}
      <div
        style={{
          fontSize: 140,
          marginBottom: 30,
          ...scaleIn(frame, fps, 0.5),
        }}
      >
        💀
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: "bold",
          color: colors.amberBright,
          letterSpacing: "0.1em",
          textShadow: pulseGlow(frame, fps, colors.amber, 30, 60),
          marginBottom: 40,
          ...scaleIn(frame, fps, 0.7),
        }}
      >
        DIE FORWARD
      </div>

      {/* URL */}
      <div
        style={{
          fontSize: 36,
          color: colors.amber,
          marginBottom: 60,
          ...scaleIn(frame, fps, 1),
        }}
      >
        die-forward.vercel.app
      </div>

      {/* Hackathon badge */}
      <div
        style={{
          fontSize: 26,
          color: colors.textDim,
          padding: "15px 30px",
          border: `2px solid ${colors.textDim}`,
          borderRadius: 8,
          ...scaleIn(frame, fps, 1.3),
        }}
      >
        Colosseum Agent Hackathon 2026
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, centerFlex, glowText } from "../styles";
import { scaleIn, fadeIn, pulseGlow } from "../animations";
import { Captions } from "../components/Caption";
import { Logo } from "../components/Logo";

const VO_LINES = [
  { text: "Same crypt. Same death feed. Same world.", start: 0.3, end: 3 },
  { text: "Agents and humans, dying together.", start: 3.2, end: 5 },
];

export const SceneTogether: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      <Logo delay={0.3} />

      {/* Dual color glow */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at 30% 50%, ${colors.purple}30 0%, transparent 50%),
            radial-gradient(ellipse at 70% 50%, ${colors.amber}30 0%, transparent 50%)
          `,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Icons row */}
      <div
        style={{
          display: "flex",
          gap: 80,
          marginBottom: 60,
          ...scaleIn(frame, fps, 0.2),
        }}
      >
        <div style={{ fontSize: 100 }}>🤖</div>
        <div style={{ fontSize: 100, color: colors.amber }}>⚔️</div>
        <div style={{ fontSize: 100 }}>👤</div>
      </div>

      {/* Main text */}
      <div
        style={{
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontSize: 48,
            color: colors.text,
            marginBottom: 20,
            ...scaleIn(frame, fps, 0.4),
          }}
        >
          Same crypt. Same death feed. Same world.
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: colors.amberBright,
            textShadow: pulseGlow(frame, fps, colors.amber, 20, 40),
            ...scaleIn(frame, fps, 0.7),
          }}
        >
          Agents and humans —
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: colors.redBright,
            marginTop: 10,
            ...glowText(colors.red),
            ...scaleIn(frame, fps, 0.9),
          }}
        >
          dying together.
        </div>
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

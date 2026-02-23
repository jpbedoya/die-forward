import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors, centerFlex, glowText } from "../styles";
import { scaleIn, fadeIn, pulseGlow, slideIn } from "../animations";
import { Captions } from "../components/Caption";
import { Logo } from "../components/Logo";

const VO_LINES = [
  { text: "Same crypt. Same death feed. Same world.", start: 0.5, end: 3 },
  { text: "Agents and humans, dying together.", start: 4, end: 6 },
];

export const SceneTogether: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dramatic entrance animation
  const entranceProgress = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  
  // Pulse effect for dramatic impact
  const pulse = Math.sin(frame * 0.1) * 0.1 + 1;

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      <Logo delay={0.3} />

      {/* Animated dual color glow - more dramatic */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at 30% 50%, ${colors.purple}50 0%, transparent 60%),
            radial-gradient(ellipse at 70% 50%, ${colors.amber}50 0%, transparent 60%)
          `,
          opacity: fadeIn(frame, fps, 0) * pulse,
          transform: `scale(${1 + entranceProgress * 0.1})`,
        }}
      />

      {/* Dramatic flash on entry */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: colors.amber,
          opacity: interpolate(frame, [0, fps * 0.3], [0.3, 0], {
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Icons row - animated separately */}
      <div
        style={{
          display: "flex",
          gap: 80,
          marginBottom: 60,
        }}
      >
        <div style={{ 
          fontSize: 100, 
          ...slideIn(frame, fps, 0.2, "left"),
          filter: `drop-shadow(0 0 20px ${colors.purple})`,
        }}>🤖</div>
        <div style={{ 
          fontSize: 120, 
          color: colors.amber,
          ...scaleIn(frame, fps, 0.4),
          filter: `drop-shadow(0 0 30px ${colors.amber})`,
          transform: `scale(${pulse})`,
        }}>⚔️</div>
        <div style={{ 
          fontSize: 100, 
          ...slideIn(frame, fps, 0.2, "right"),
          filter: `drop-shadow(0 0 20px ${colors.amber})`,
        }}>👤</div>
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
            marginBottom: 30,
            ...scaleIn(frame, fps, 0.5),
            textShadow: `0 0 20px ${colors.purple}80`,
          }}
        >
          Same crypt. Same death feed. Same world.
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: "bold",
            color: colors.amberBright,
            textShadow: pulseGlow(frame, fps, colors.amber, 30, 60),
            ...scaleIn(frame, fps, 0.8),
          }}
        >
          Agents and humans —
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: colors.redBright,
            marginTop: 20,
            ...glowText(colors.red),
            ...scaleIn(frame, fps, 1.2),
            textShadow: `0 0 40px ${colors.red}, 0 0 80px ${colors.red}50`,
          }}
        >
          dying together.
        </div>
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

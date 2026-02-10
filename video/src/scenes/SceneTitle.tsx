import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, centerFlex, glowText } from "../styles";
import { scaleIn, fadeIn, pulseGlow } from "../animations";
import { Captions } from "../components/Caption";

const VO_LINES = [
  { text: "One game dared to make dying... the point.", start: 0.5, end: 3.5 },
  { text: "Die Forward.", start: 4, end: 5 },
];

// ASCII logo from the game
const ASCII_LOGO = ` ██████╗ ██╗███████╗    ███████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██║██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██║    ██║██╔══██╗██╔══██╗██╔══██╗
 ██║  ██║██║█████╗      █████╗  ██║   ██║██████╔╝██║ █╗ ██║███████║██████╔╝██║  ██║
 ██║  ██║██║██╔══╝      ██╔══╝  ██║   ██║██╔══██╗██║███╗██║██╔══██║██╔══██╗██║  ██║
 ██████╔╝██║███████╗    ██║     ╚██████╔╝██║  ██║╚███╔███╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚═╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝`;

export const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      {/* Dramatic red/amber glow background */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at center top, ${colors.red}30 0%, transparent 50%),
            radial-gradient(ellipse at center bottom, ${colors.amberDim}40 0%, transparent 50%)
          `,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Skull emoji */}
      <div
        style={{
          fontSize: 100,
          marginBottom: 20,
          ...scaleIn(frame, fps, 0.2),
        }}
      >
        💀
      </div>

      {/* ASCII Logo from game */}
      <pre
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          lineHeight: 1.1,
          color: colors.amberBright,
          textShadow: pulseGlow(frame, fps, colors.amber, 20, 40),
          whiteSpace: "pre",
          textAlign: "center",
          ...scaleIn(frame, fps, 0.4),
        }}
      >
        {ASCII_LOGO}
      </pre>

      {/* Tagline */}
      <div
        style={{
          fontSize: 36,
          color: colors.red,
          marginTop: 40,
          fontStyle: "italic",
          ...glowText(colors.red),
          ...scaleIn(frame, fps, 0.6),
        }}
      >
        Your death feeds the depths
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 28,
          color: colors.textDim,
          marginTop: 30,
          ...scaleIn(frame, fps, 0.8),
        }}
      >
        A social roguelite for agents and humans
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

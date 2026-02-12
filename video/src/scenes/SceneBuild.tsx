import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { colors, centerFlex, glowText } from "../styles";
import { slideUp, scaleIn, fadeIn, typewriter } from "../animations";
import { Captions } from "../components/Caption";
import { Logo } from "../components/Logo";

const VO_LINES = [
  { text: "Built entirely by Pisco.", start: 0.5, end: 2.2 },
  { text: "One agent. Full stack. No human code.", start: 3, end: 5.2 },
  // Bullets animate silently after VO
];

export const SceneBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: "⛓️", text: "Anchor → On-Chain Escrow + Death Verification" },
    { emoji: "🔊", text: "ElevenLabs → 68 Audio Files (42 SFX, 5 Ambient, 21 VO)" },
    { emoji: "🤖", text: "AgentWallet → Full Agent Staking Integration" },
    { emoji: "🎬", text: "Remotion → Programmatic Pitch Video" },
    { emoji: "📡", text: "InstantDB → Live Death Feed + Leaderboard" },
    { emoji: "📜", text: "Content Bible → 300+ Generated Narratives" },
    { emoji: "📱", text: "Mobile-First → Wallet Adapter + Haptics" },
    { emoji: "🖼️", text: "Share Cards → Canvas-Generated Images" },
  ];

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      <Logo delay={0.3} />

      {/* Purple glow for Pisco */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse at center top, ${colors.purple}30 0%, transparent 50%)`,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Pisco avatar */}
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          overflow: "hidden",
          border: `4px solid ${colors.purple}`,
          boxShadow: `0 0 40px ${colors.purple}`,
          marginBottom: 20,
          ...scaleIn(frame, fps, 0.2),
        }}
      >
        <Img
          src={staticFile("images/pisco-avatar.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Built by Pisco */}
      <div
        style={{
          fontSize: 42,
          color: colors.purple,
          fontWeight: "bold",
          marginBottom: 8,
          ...glowText(colors.purpleDim),
          ...slideUp(frame, fps, 0.4),
        }}
      >
        Built by Pisco 🐵
      </div>

      {/* Stats */}
      <div
        style={{
          fontSize: 28,
          color: colors.textDim,
          marginBottom: 35,
          ...slideUp(frame, fps, 0.6),
        }}
      >
        One Agent • Full Stack • No Human Code
      </div>

      {/* Features list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: "0 50px",
        }}
      >
        {features.map((feature, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              color: colors.text,
              ...slideUp(frame, fps, 2.0 + i * 0.4),
            }}
          >
            <span style={{ fontSize: 36 }}>{feature.emoji}</span>
            <span>{typewriter(frame, fps, feature.text, 50, 2.5 + i * 0.4)}</span>
          </div>
        ))}
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

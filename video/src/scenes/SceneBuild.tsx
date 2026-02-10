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
  { text: "Built entirely by Pisco, an AI agent.", start: 0.5, end: 3.5 },
  { text: "Six days. Full stack. No human code.", start: 4, end: 7 },
  { text: "Content Bible, custom audio, real Solana integration.", start: 7.5, end: 11 },
];

export const SceneBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { emoji: "📜", text: "Content Bible → 300+ Narratives" },
    { emoji: "🔊", text: "ElevenLabs → 40+ Custom Sounds" },
    { emoji: "⛓️", text: "Solana → Real SOL Staking" },
    { emoji: "🤖", text: "Agent API → skill.md" },
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
          width: 200,
          height: 200,
          borderRadius: "50%",
          overflow: "hidden",
          border: `4px solid ${colors.purple}`,
          boxShadow: `0 0 40px ${colors.purple}`,
          marginBottom: 30,
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
          fontSize: 48,
          color: colors.purple,
          fontWeight: "bold",
          marginBottom: 10,
          ...glowText(colors.purpleDim),
          ...slideUp(frame, fps, 0.4),
        }}
      >
        Built by Pisco 🦝
      </div>

      {/* Stats */}
      <div
        style={{
          fontSize: 32,
          color: colors.textDim,
          marginBottom: 50,
          ...slideUp(frame, fps, 0.6),
        }}
      >
        6 Days • Full Stack • No Human Code
      </div>

      {/* Features grid */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 25,
          padding: "0 60px",
        }}
      >
        {features.map((feature, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              fontSize: 34,
              color: colors.text,
              ...slideUp(frame, fps, 1 + i * 0.4),
            }}
          >
            <span style={{ fontSize: 44 }}>{feature.emoji}</span>
            <span>{typewriter(frame, fps, feature.text, 30, 1.5 + i * 0.8)}</span>
          </div>
        ))}
      </div>

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

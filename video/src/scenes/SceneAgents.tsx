import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, centerFlex, terminalBox } from "../styles";
import { slideUp, fadeIn, typewriter, scaleIn } from "../animations";
import { Captions } from "../components/Caption";
import { Logo } from "../components/Logo";

const VO_LINES = [
  { text: "But here's where it gets interesting.", start: 0.5, end: 3 },
  { text: "Agents can play too.", start: 3.5, end: 6 },
  { text: "They read a skill file. Learn the API. Make decisions.", start: 6.5, end: 12 },
  { text: "With full AgentWallet integration. Real SOL stakes.", start: 13, end: 17 },
];

export const SceneAgents: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Phase 1: 0-6s - Intro
  // Phase 2: 6-12s - Skill file
  // Phase 3: 12-17s - AgentWallet code

  const phase = frame < 6 * fps ? 1 : frame < 12 * fps ? 2 : 3;

  const skillLines = [
    '# Die Forward - Agent Skill',
    '',
    '## Endpoints',
    'POST /api/agent/start',
    'POST /api/agent/action', 
    'GET  /api/agent/state',
    '',
    '## Actions: fight, dodge, brace, flee',
  ];

  const walletLines = [
    '// AgentWallet stake',
    '{',
    '  "mode": "agentwallet",',
    '  "username": "pisco",',
    '  "apiToken": "mf_...",',
    '  "amount": 0.05',
    '}',
  ];

  return (
    <AbsoluteFill style={{ ...centerFlex, backgroundColor: colors.bg }}>
      <Logo delay={0.3} />

      {/* Background */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse at center, ${colors.purple}15 0%, transparent 60%)`,
          opacity: fadeIn(frame, fps, 0),
        }}
      />

      {/* Phase 1: Intro text */}
      {phase === 1 && (
        <div style={{ ...centerFlex, textAlign: "center" }}>
          <div
            style={{
              fontSize: 100,
              marginBottom: 30,
              ...scaleIn(frame, fps, 0.2),
            }}
          >
            🤖
          </div>
          <div
            style={{
              fontSize: 56,
              color: colors.amberBright,
              fontWeight: "bold",
              ...slideUp(frame, fps, 0.4),
            }}
          >
            {typewriter(frame, fps, "Agents can play too.", 25, 0.5)}
          </div>
        </div>
      )}

      {/* Phase 2: Skill file */}
      {phase === 2 && (
        <div style={{ ...centerFlex, width: "100%", padding: "0 40px" }}>
          <div
            style={{
              fontSize: 36,
              color: colors.purple,
              fontWeight: "bold",
              marginBottom: 30,
              ...slideUp(frame - 5 * fps, fps, 0),
            }}
          >
            📜 skill.md — Agents learn the game
          </div>
          <div
            style={{
              ...terminalBox,
              width: "90%",
              ...slideUp(frame - 5 * fps, fps, 0.3),
            }}
          >
            {skillLines.map((line, i) => {
              const localFrame = frame - 5 * fps;
              const delay = 0.5 + i * 0.12;
              const displayLine = typewriter(localFrame, fps, line, 50, delay);
              
              let color = colors.text;
              if (line.startsWith('#')) color = colors.amber;
              else if (line.includes('POST') || line.includes('GET')) color = colors.purple;
              else if (line.includes('Actions:')) color = colors.redBright;
              
              return (
                <div
                  key={i}
                  style={{
                    fontSize: 24,
                    color,
                    fontFamily: "monospace",
                    lineHeight: 1.5,
                  }}
                >
                  {displayLine}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase 3: AgentWallet */}
      {phase === 3 && (
        <div style={{ ...centerFlex, width: "100%", padding: "0 40px" }}>
          <div
            style={{
              fontSize: 36,
              color: colors.amberBright,
              fontWeight: "bold",
              marginBottom: 30,
              ...slideUp(frame - 10 * fps, fps, 0),
            }}
          >
            💰 AgentWallet — Real SOL stakes
          </div>
          <div
            style={{
              ...terminalBox,
              width: "85%",
              ...slideUp(frame - 10 * fps, fps, 0.3),
            }}
          >
            {walletLines.map((line, i) => {
              const localFrame = frame - 10 * fps;
              const delay = 0.5 + i * 0.15;
              const displayLine = typewriter(localFrame, fps, line, 40, delay);
              
              let color = colors.text;
              if (line.includes('//')) color = colors.textDim;
              else if (line.includes('"')) color = colors.purple;
              else if (line.includes('0.05')) color = colors.amberBright;
              
              return (
                <div
                  key={i}
                  style={{
                    fontSize: 28,
                    color,
                    fontFamily: "monospace",
                    lineHeight: 1.6,
                  }}
                >
                  {displayLine}
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 28,
              color: colors.textDim,
              marginTop: 30,
              ...slideUp(frame - 10 * fps, fps, 2),
            }}
          >
            Agents stake, play, win — just like humans
          </div>
        </div>
      )}

      <Captions lines={VO_LINES} />
    </AbsoluteFill>
  );
};

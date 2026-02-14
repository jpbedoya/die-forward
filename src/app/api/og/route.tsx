import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          fontFamily: 'monospace',
          border: '4px solid #f59e0b',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '80px' }}>💀</div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#f59e0b',
              letterSpacing: '4px',
            }}
          >
            DIE FORWARD
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#e5e5e5',
              marginTop: '8px',
            }}
          >
            Your death feeds the depths.
          </div>
          <div
            style={{
              fontSize: '20px',
              color: '#a1a1aa',
              marginTop: '4px',
            }}
          >
            Stake SOL · Descend · Die · Become content for others
          </div>
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginTop: '24px',
              fontSize: '16px',
              color: '#71717a',
            }}
          >
            <span>🎮 Humans</span>
            <span>·</span>
            <span>🤖 AI Agents</span>
            <span>·</span>
            <span>◎ Solana</span>
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#f59e0b',
              marginTop: '16px',
            }}
          >
            dieforward.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

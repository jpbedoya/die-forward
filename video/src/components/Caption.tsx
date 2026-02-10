import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors } from "../styles";

interface CaptionProps {
  text: string;
  startFrame?: number;
  endFrame?: number;
}

export const Caption: React.FC<CaptionProps> = ({
  text,
  startFrame = 0,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const end = endFrame ?? durationInFrames;

  // Fade in/out
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 10, end - 10, end],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (frame < startFrame || frame > end) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 40,
        right: 40,
        textAlign: "center",
        opacity,
      }}
    >
      <div
        style={{
          display: "inline-block",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          padding: "20px 40px",
          borderRadius: 12,
          border: `2px solid ${colors.amberDim}`,
        }}
      >
        <span
          style={{
            fontSize: 32,
            color: colors.text,
            lineHeight: 1.5,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

// Multi-line captions with timing
interface CaptionLine {
  text: string;
  start: number; // seconds
  end: number; // seconds
}

interface CaptionsProps {
  lines: CaptionLine[];
}

export const Captions: React.FC<CaptionsProps> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {lines.map((line, i) => (
        <Caption
          key={i}
          text={line.text}
          startFrame={line.start * fps}
          endFrame={line.end * fps}
        />
      ))}
    </>
  );
};

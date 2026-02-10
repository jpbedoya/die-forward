import { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../styles";
import { fadeIn } from "../animations";

interface LogoProps {
  delay?: number;
  size?: "small" | "medium" | "large";
}

export const Logo: React.FC<LogoProps> = ({ delay = 0, size = "small" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fontSize = size === "small" ? 24 : size === "medium" ? 36 : 48;
  
  const containerStyle: CSSProperties = {
    position: "absolute",
    top: 30,
    right: 30,
    display: "flex",
    alignItems: "center",
    gap: 10,
    opacity: fadeIn(frame, fps, delay).opacity,
  };

  const skullStyle: CSSProperties = {
    fontSize: fontSize * 1.2,
  };

  const textStyle: CSSProperties = {
    fontFamily: "monospace",
    fontSize,
    fontWeight: "bold",
    color: colors.amberBright,
    textShadow: `0 0 10px ${colors.amber}, 0 0 20px ${colors.amber}`,
    letterSpacing: "0.05em",
  };

  return (
    <div style={containerStyle}>
      <span style={skullStyle}>💀</span>
      <span style={textStyle}>DIE FORWARD</span>
    </div>
  );
};

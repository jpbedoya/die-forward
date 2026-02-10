import { spring, interpolate, SpringConfig } from "remotion";

// Standard spring configs
export const springConfig: SpringConfig = {
  damping: 12,
  mass: 0.5,
  stiffness: 100,
};

export const slowSpring: SpringConfig = {
  damping: 20,
  mass: 1,
  stiffness: 80,
};

// Fade in animation
export const fadeIn = (frame: number, fps: number, delay = 0): number => {
  return interpolate(frame - delay * fps, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// Slide up animation
export const slideUp = (
  frame: number,
  fps: number,
  delay = 0
): { opacity: number; transform: string } => {
  const progress = spring({
    frame: frame - delay * fps,
    fps,
    config: springConfig,
  });
  const y = interpolate(progress, [0, 1], [50, 0]);
  return {
    opacity: progress,
    transform: `translateY(${y}px)`,
  };
};

// Scale in animation
export const scaleIn = (
  frame: number,
  fps: number,
  delay = 0
): { opacity: number; transform: string } => {
  const progress = spring({
    frame: frame - delay * fps,
    fps,
    config: springConfig,
  });
  const scale = interpolate(progress, [0, 1], [0.8, 1]);
  return {
    opacity: progress,
    transform: `scale(${scale})`,
  };
};

// Typewriter effect - returns how many characters to show
export const typewriter = (
  frame: number,
  fps: number,
  text: string,
  charsPerSecond = 30,
  delay = 0
): string => {
  const startFrame = delay * fps;
  if (frame < startFrame) return "";
  const elapsed = (frame - startFrame) / fps;
  const chars = Math.floor(elapsed * charsPerSecond);
  return text.slice(0, chars);
};

// Ken Burns zoom effect
export const kenBurns = (
  frame: number,
  totalFrames: number,
  startScale = 1,
  endScale = 1.1
): string => {
  const scale = interpolate(frame, [0, totalFrames], [startScale, endScale]);
  return `scale(${scale})`;
};

// Pulse glow animation
export const pulseGlow = (
  frame: number,
  fps: number,
  color: string,
  minIntensity = 20,
  maxIntensity = 40
): string => {
  const cycle = Math.sin((frame / fps) * Math.PI * 2);
  const intensity = interpolate(cycle, [-1, 1], [minIntensity, maxIntensity]);
  return `0 0 ${intensity}px ${color}`;
};

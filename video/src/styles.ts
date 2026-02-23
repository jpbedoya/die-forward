import { CSSProperties } from "react";

// Die Forward color palette
export const colors = {
  bg: "#0a0a0a",
  amber: "#f59e0b",
  amberBright: "#fbbf24",
  amberDim: "#78350f",
  red: "#dc2626",
  redBright: "#f87171",
  purple: "#a855f7",
  purpleDim: "#581c87",
  text: "#e5e5e5",
  textDim: "#a3a3a3",
};

// Reusable styles
export const centerFlex: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
};

export const glowText = (color: string): CSSProperties => ({
  textShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}`,
});

export const terminalBox: CSSProperties = {
  border: `2px solid ${colors.amber}`,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  padding: "40px",
  borderRadius: "4px",
};

export const phoneFrame: CSSProperties = {
  width: 500,
  height: 1080,
  borderRadius: 50,
  border: `4px solid ${colors.textDim}`,
  overflow: "hidden",
  boxShadow: `0 0 60px rgba(245, 158, 11, 0.3)`,
};

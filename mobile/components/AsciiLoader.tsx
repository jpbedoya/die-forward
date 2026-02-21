/**
 * AsciiLoader — on-brand loading indicator
 *
 * Two variants:
 *
 *   "sweep"  (default) — single ▓ peak travels left→right over ░░░░░░░░
 *                         Same style as AnimatedDescendButton on title screen.
 *                         Good for full-width placeholders and skeleton states.
 *
 *   "pulse"             — single character cycles ░ → ▒ → ▓ → ▒ → ░
 *                         Compact, fits inside buttons and tight spaces.
 *
 * Usage:
 *   <AsciiLoader />                              // sweep, 8 chars, grey
 *   <AsciiLoader variant="pulse" />              // single pulsing char
 *   <AsciiLoader variant="pulse" color="#fff" /> // white pulse for dark buttons
 *   <AsciiLoader width={12} speed={80} />        // wider sweep, faster
 *   <AsciiLoader color="#f59e0b" />              // amber sweep
 */

import { useState, useEffect } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface AsciiLoaderProps {
  /** "sweep" — moving peak across chars | "pulse" — single char in place */
  variant?: 'sweep' | 'pulse';
  /** Number of block characters for sweep variant (default 8) */
  width?: number;
  /** Tick interval in ms — lower = faster (default 90) */
  speed?: number;
  /** Text color (default subtle crypt grey) */
  color?: string;
  /** Extra styles passed to the Text element */
  style?: TextStyle;
}

const PULSE_FRAMES = ['░', '▒', '▓', '▒', '░'];

export function AsciiLoader({
  variant = 'sweep',
  width = 8,
  speed = 90,
  color = '#3a3530',
  style,
}: AsciiLoaderProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), speed);
    return () => clearInterval(id);
  }, [speed]);

  let content: string;

  if (variant === 'pulse') {
    content = PULSE_FRAMES[tick % PULSE_FRAMES.length];
  } else {
    // Peak sweeps left→right, +2 so it enters and exits cleanly
    const pos = tick % (width + 2);
    content = Array.from({ length: width }, (_, i) => {
      const dist = Math.abs(i - pos);
      if (dist === 0) return '▓';
      if (dist === 1) return '▒';
      return '░';
    }).join('');
  }

  return (
    <Text style={[styles.base, { color }, style]}>
      {content}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'monospace',
    fontSize: 14,
    letterSpacing: 1,
  },
});

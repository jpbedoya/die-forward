/**
 * AsciiLoader — sweeping ░▒▓ block animation
 *
 * A single ▓ peak travels left→right over a ░ field with ▒ fade edges.
 * Matches the AnimatedDescendButton style from the title screen.
 *
 * Usage:
 *   <AsciiLoader />                        // defaults
 *   <AsciiLoader width={12} speed={80} />  // wider, faster
 *   <AsciiLoader color="#f59e0b" />        // amber for in-progress actions
 */

import { useState, useEffect } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface AsciiLoaderProps {
  /** Number of block characters (default 8) */
  width?: number;
  /** Tick interval in ms — lower = faster (default 90) */
  speed?: number;
  /** Text color (default subtle crypt grey) */
  color?: string;
  /** Extra styles passed to the Text element */
  style?: TextStyle;
}

export function AsciiLoader({
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

  // Peak sweeps left→right, +2 so it enters and exits cleanly
  const pos = tick % (width + 2);
  const chars = Array.from({ length: width }, (_, i) => {
    const dist = Math.abs(i - pos);
    if (dist === 0) return '▓';
    if (dist === 1) return '▒';
    return '░';
  }).join('');

  return (
    <Text style={[styles.base, { color }, style]}>
      {chars}
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

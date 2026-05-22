/**
 * TypewriterText — reveals text character-by-character for a storytelling feel.
 *
 * Used for dungeon room narrative when the `enableRoomTextStreaming` admin flag is on.
 * Pacing varies per character: longer pauses after punctuation. Fires a light haptic
 * on word boundaries (native only). The `skip` prop jumps straight to the full text.
 *
 * Modeled on the timer-driven pattern in AsciiLoader.tsx, but uses a chained setTimeout
 * so each character can have its own delay.
 */

import { useState, useEffect, useRef } from 'react';
import { Text, Platform, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface TypewriterTextProps {
  /** Full text to reveal */
  text: string;
  /** Base delay per character, in ms */
  speedMs: number;
  /** When true, immediately reveal the entire text */
  skip?: boolean;
  /** className passed through to the inner <Text> (NativeWind) */
  className?: string;
  /** Extra style passed to the inner <Text> */
  style?: TextStyle;
  /** Called once — when the full text is revealed (or on skip) */
  onComplete?: () => void;
}

// Per-character delay multipliers for dramatic pacing.
const SENTENCE_END = new Set(['.', '!', '?', '…']);
const CLAUSE_BREAK = new Set([',', ';', ':', '—']);

export function TypewriterText({
  text,
  speedMs,
  skip = false,
  className,
  style,
  onComplete,
}: TypewriterTextProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  // Keep the latest onComplete in a ref so a parent re-render mid-stream
  // doesn't change the streaming effect's dependencies.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Reduced-motion (web only): reveal instantly.
  const reducedMotion =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Restart whenever the text changes.
  useEffect(() => {
    completedRef.current = false;
    setVisibleCount(0);
  }, [text]);

  useEffect(() => {
    const fireComplete = () => {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    if (skip || reducedMotion) {
      setVisibleCount(text.length);
      fireComplete();
      return;
    }
    if (visibleCount >= text.length) {
      fireComplete();
      return;
    }

    // Delay is based on the character we just revealed.
    const justRevealed = text[visibleCount - 1] ?? '';
    let delay = speedMs;
    if (SENTENCE_END.has(justRevealed)) delay = speedMs * 8;
    else if (CLAUSE_BREAK.has(justRevealed)) delay = speedMs * 4;

    timerRef.current = setTimeout(() => {
      // Light haptic on word boundaries (native only).
      if (Platform.OS !== 'web' && text[visibleCount] === ' ') {
        Haptics.selectionAsync().catch(() => {});
      }
      setVisibleCount((c) => c + 1);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visibleCount, text, speedMs, skip, reducedMotion]);

  // The not-yet-revealed text is rendered transparent so the block occupies
  // its full final size from the first frame — no layout jump as it streams,
  // and the parent's tap-to-skip target covers the whole text area immediately.
  return (
    <Text className={className} style={style}>
      {text.slice(0, visibleCount)}
      {visibleCount < text.length && (
        <Text style={{ opacity: 0 }}>{text.slice(visibleCount)}</Text>
      )}
    </Text>
  );
}

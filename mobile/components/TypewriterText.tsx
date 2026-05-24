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
import { Text, View, Platform, TextStyle } from 'react-native';
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
      // Light haptic on word boundaries (native only). Wrapped in try/catch
      // because the haptic native module can throw synchronously in some
      // release builds (Hermes + R8 hide the binding) — and a thrown error
      // here would abort the setTimeout callback BEFORE setVisibleCount runs,
      // halting streaming at the first space character. Belt-and-braces:
      // the .catch handles async rejections; the try/catch handles sync ones.
      if (Platform.OS !== 'web' && text[visibleCount] === ' ') {
        try {
          Haptics.selectionAsync().catch(() => {});
        } catch {
          /* haptic unavailable — streaming continues */
        }
      }
      setVisibleCount((c) => c + 1);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visibleCount, text, speedMs, skip, reducedMotion]);

  // Render the streamed substring + an invisible full-text placeholder layered
  // underneath. The placeholder reserves the final layout from the first frame
  // (no jump as the streamed text grows), while the visible Text only contains
  // what's been revealed so far.
  //
  // Previous attempt — a nested <Text style={{ opacity: 0 }}> tail inside the
  // same parent Text — produced the right pixels on Web (React DOM honours
  // span styles) but broke on Android. Android's native TextView flattens
  // nested <Text> into a single SpannableString, and once that string's
  // content is materialised, mid-update style changes on inner spans appear
  // not to invalidate the rendered view. Even color: 'transparent' on the
  // inner span didn't suppress the tail. Lifting the placeholder OUT of the
  // streaming Text — into a sibling absolute-positioned View — sidesteps the
  // span-flattening entirely.
  return (
    <View style={{ position: 'relative' }}>
      {/* Invisible placeholder — reserves the final size. */}
      <Text className={className} style={[style, { color: 'transparent' }]}>
        {text}
      </Text>
      {/* Streaming text — same className/style, layered on top. */}
      <Text
        className={className}
        style={[style, { position: 'absolute', left: 0, top: 0, right: 0 }]}
      >
        {text.slice(0, visibleCount)}
      </Text>
    </View>
  );
}

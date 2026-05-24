/**
 * TypewriterText — reveals text character-by-character.
 *
 * Platform-branched implementation because the two surfaces have very different
 * cost models for animating text content:
 *
 *   Native (iOS/Android)  → Reanimated worklet drives a TextInput's `text` prop
 *                           on the UI thread. No React re-render per character,
 *                           no bridge crossing — text reveal runs at native
 *                           frame rate regardless of how busy the JS thread is.
 *
 *   Web                   → Plain useState + setTimeout. DOM updates are cheap
 *                           and the Reanimated TextInput.text trick is a
 *                           native-only hack (no equivalent on react-native-web).
 *
 * Same public API for both, same speedMs feel. See the git log around
 * 12bd590 → d116ef0 for the journey.
 *
 * Punctuation pauses (the previous 8×/4× multipliers on .,;:—…) are gone by
 * design — the streaming is linear. Layer in withSequence on the native side
 * and a custom delay table on the web side if we want them back.
 */

import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, Platform, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface TypewriterTextProps {
  /** Full text to reveal */
  text: string;
  /** Base delay per character, in ms */
  speedMs: number;
  /** When true, immediately reveal the entire text */
  skip?: boolean;
  /** className passed through (NativeWind) */
  className?: string;
  /** Extra style passed through */
  style?: TextStyle;
  /** Called once when fully revealed (or on skip) */
  onComplete?: () => void;
}

export function TypewriterText(props: TypewriterTextProps) {
  // Branch at the top so the worklet hook + the state hook never co-exist
  // in the same component instance (would violate the rules of hooks if a
  // single component conditionally invoked one or the other based on
  // Platform).
  if (Platform.OS === 'web') return <TypewriterTextWeb {...props} />;
  return <TypewriterTextNative {...props} />;
}

// ── Native ──────────────────────────────────────────────────────────────────
function TypewriterTextNative({
  text,
  speedMs,
  skip = false,
  className,
  style,
  onComplete,
}: TypewriterTextProps) {
  const progress = useSharedValue(0);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    const fireComplete = () => onCompleteRef.current?.();

    if (skip || text.length === 0) {
      progress.value = text.length;
      fireComplete();
      return;
    }

    progress.value = 0;
    progress.value = withTiming(
      text.length,
      { duration: text.length * speedMs },
      (finished) => {
        if (finished) runOnJS(fireComplete)();
      },
    );

    // Per-word haptic on native — scheduled JS-side at i*speedMs for each
    // space character. Drift vs. the UI-thread animation is fine; haptics
    // are tactile flavour, not synchronised cues.
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        timers.push(
          setTimeout(() => {
            try {
              Haptics.selectionAsync().catch(() => {});
            } catch {
              /* haptic unavailable — ignore */
            }
          }, i * speedMs),
        );
      }
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [text, speedMs, skip, progress]);

  // Worklet — runs on the UI thread every frame. text is closed over from JS;
  // Reanimated copies the new value into the worklet closure when text changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const animatedProps = useAnimatedProps(() => ({
    text: text.slice(0, Math.floor(progress.value)),
  } as any), [text]);

  return (
    <AnimatedTextInput
      editable={false}
      multiline
      scrollEnabled={false}
      caretHidden
      selectTextOnFocus={false}
      underlineColorAndroid="transparent"
      defaultValue={skip ? text : ''}
      animatedProps={animatedProps}
      className={className}
      style={[
        // Neutralise TextInput's default chrome so it visually matches <Text>.
        { padding: 0, margin: 0, borderWidth: 0 },
        Platform.OS === 'android' ? { includeFontPadding: false } : null,
        style as TextStyle,
      ]}
    />
  );
}

// ── Web ─────────────────────────────────────────────────────────────────────
function TypewriterTextWeb({
  text,
  speedMs,
  skip = false,
  className,
  style,
  onComplete,
}: TypewriterTextProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  const completedRef = useRef(false);

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

    if (skip || text.length === 0) {
      setVisibleCount(text.length);
      fireComplete();
      return;
    }
    if (visibleCount >= text.length) {
      fireComplete();
      return;
    }
    const t = setTimeout(() => setVisibleCount((c) => c + 1), speedMs);
    return () => clearTimeout(t);
  }, [visibleCount, text, speedMs, skip]);

  // On web the nested-opacity placeholder works fine (React DOM honours span
  // styles on inline children) — it's the Android-only Text-flattening that
  // broke this approach on native. Keeps layout from jumping as the streamed
  // text grows.
  return (
    <Text className={className} style={style}>
      {text.slice(0, visibleCount)}
      {visibleCount < text.length && (
        <Text style={{ opacity: 0 }}>{text.slice(visibleCount)}</Text>
      )}
    </Text>
  );
}

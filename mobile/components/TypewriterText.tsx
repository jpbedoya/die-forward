/**
 * TypewriterText — reveals text character-by-character on the UI thread.
 *
 * Uses react-native-reanimated to animate a sharedValue 0 → text.length over
 * text.length * speedMs ms, and an animated TextInput whose `text` prop is
 * driven by the shared value sliced into the source string. The slice runs
 * inside a worklet on the UI thread — no React re-renders, no bridge crossing
 * per character — so per-character cost is essentially free on native and the
 * web/native speeds match for the same speedMs.
 *
 * Why TextInput rather than Text: Reanimated can animate TextInput.text via
 * useAnimatedProps without React re-rendering. <Animated.Text> doesn't have
 * an animatable text-content prop. The TextInput is non-editable + caret-
 * hidden, styled to look identical to Text.
 *
 * The previous implementation used setState + setTimeout per character. It
 * worked on web but stretched per-tick on native because every increment
 * crossed RN's bridge to update a native TextView, plus Android's <Text>
 * flattens nested <Text> children into one SpannableString which broke the
 * placeholder/streaming split. See git log around 425cc4a + f81c08e for the
 * journey to this rewrite.
 *
 * Punctuation pauses (the previous 8×/4× multipliers on `.,;:—…`) are gone
 * by design — withTiming runs linearly. The slider in admin controls the
 * one global per-character rate. If we want dramatic pauses back, layer them
 * in with withSequence per text segment.
 */

import { useEffect, useRef } from 'react';
import { TextInput, Platform, TextStyle } from 'react-native';
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
  /** className passed through to the underlying TextInput (NativeWind) */
  className?: string;
  /** Extra style passed through */
  style?: TextStyle;
  /** Called once when the text is fully revealed (or on skip) */
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speedMs,
  skip = false,
  className,
  style,
  onComplete,
}: TypewriterTextProps) {
  const progress = useSharedValue(0);

  // Keep the latest onComplete in a ref so a parent re-render mid-stream
  // doesn't change the effect's deps and restart the animation.
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

    // Per-word haptic on native. Lives on the JS thread — haptic native
    // calls don't make sense from a worklet. Each timer fires once at the
    // expected reveal time for that space; small drift is fine.
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (Platform.OS !== 'web') {
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
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [text, speedMs, skip, progress]);

  // Worklet — runs on the UI thread every animation frame. `text` is closed
  // over from the JS side via the deps array; Reanimated copies the new
  // value into the worklet closure when text changes.
  // `text` isn't in Reanimated's typed animatedProps for TextInput, but the
  // runtime path accepts it — cast to bypass the typing. This is the canonical
  // pattern from the Reanimated docs for animating text content.
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
      // defaultValue paints something on first frame before the worklet has
      // a chance to apply; without it, Android can show a brief flash.
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

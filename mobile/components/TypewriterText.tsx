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
 * Punctuation pacing: a small dramatic pause after sentence-end (4× speedMs)
 * and clause-break (2× speedMs) punctuation. Both surfaces compute the same
 * pause table — native chains them via withSequence on the UI thread, web
 * picks the right delay per char in JS. Earlier 8×/4× felt theatrical; the
 * softer 4×/2× still reads as deliberate without dragging.
 */

import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, Platform, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Punctuation pacing — multipliers applied to speedMs as a *pause* after the
// character is revealed. Order matters: sentence-end checked first so '?' /
// '!' / '.' don't fall through to clause-break.
const SENTENCE_END = new Set(['.', '!', '?', '…']);
const CLAUSE_BREAK = new Set([',', ';', ':', '—']);
const SENTENCE_PAUSE_MULT = 4;
const CLAUSE_PAUSE_MULT = 2;

function pauseMultiplierFor(ch: string): number {
  if (SENTENCE_END.has(ch)) return SENTENCE_PAUSE_MULT;
  if (CLAUSE_BREAK.has(ch)) return CLAUSE_PAUSE_MULT;
  return 0;
}

/**
 * Cumulative reveal time per character index, accounting for the pauses
 * added after each punctuation character. Used by both surfaces — native
 * needs it for haptic scheduling (UI-thread animation handles its own
 * pacing); web uses it directly for the per-char setTimeout delays.
 */
function buildRevealTimeline(text: string, speedMs: number): number[] {
  const times = new Array<number>(text.length + 1);
  times[0] = 0;
  for (let i = 0; i < text.length; i++) {
    const pause = pauseMultiplierFor(text[i]) * speedMs;
    times[i + 1] = times[i] + speedMs + pause;
  }
  return times;
}

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

    // Build a sequence of (advance segment) + (pause after punctuation) pairs.
    // Each segment animates progress linearly through the next stretch of
    // non-punctuated characters; the pause holds progress steady at the
    // segment's end value for the multiplied delay.
    const animations: ReturnType<typeof withTiming>[] = [];
    let segStart = 0;
    for (let i = 0; i < text.length; i++) {
      const mult = pauseMultiplierFor(text[i]);
      if (mult === 0) continue;
      const segEnd = i + 1; // inclusive of the punctuation char
      const segLen = segEnd - segStart;
      if (segLen > 0) {
        animations.push(withTiming(segEnd, { duration: segLen * speedMs }));
      }
      // Hold at segEnd for the pause. withDelay around a zero-duration timing
      // is the Reanimated idiom for a pure pause inside a sequence.
      animations.push(withDelay(mult * speedMs, withTiming(segEnd, { duration: 0 })));
      segStart = segEnd;
    }
    if (segStart < text.length) {
      animations.push(withTiming(text.length, { duration: (text.length - segStart) * speedMs }));
    }

    if (animations.length === 1) {
      // No punctuation at all — single withTiming with callback.
      progress.value = withTiming(text.length, { duration: text.length * speedMs }, (finished) => {
        if (finished) runOnJS(fireComplete)();
      });
    } else {
      // withSequence returns AnimatableValue (a descriptor) but the sharedValue
      // assignment is typed as `number`; in practice Reanimated assigns the
      // descriptor at runtime. Cast to bypass the strict typing.
      progress.value = withSequence(...animations) as unknown as number;
      // The final-animation callback path on withSequence isn't reliable
      // across Reanimated versions; schedule completion via the same
      // timeline we computed for haptics.
    }

    // Reveal-time table — drives haptics on word boundaries AND the
    // completion fire-time (so it stays aligned with the actual animation
    // even when punctuation pauses stretch the total).
    const timeline = buildRevealTimeline(text, speedMs);
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
          }, timeline[i]),
        );
      }
    }
    timers.push(setTimeout(fireComplete, timeline[text.length]));

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

    // Delay for the next reveal is base speedMs + any pause owed to the
    // character we just revealed (text[visibleCount - 1]).
    const justRevealed = visibleCount > 0 ? text[visibleCount - 1] : '';
    const delay = speedMs * (1 + pauseMultiplierFor(justRevealed));
    const t = setTimeout(() => setVisibleCount((c) => c + 1), delay);
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

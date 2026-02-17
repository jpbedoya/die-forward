# Feedback Patterns

Coordinated sensory feedback for game events. Every significant action should have **audio + visual + haptic** feedback working together.

## Core Principles

1. **Layer feedback** — Audio, screen shake, and haptics fire together
2. **Match intensity** — Light damage = light shake, heavy damage = heavy shake
3. **Platform-aware** — Haptics only on native (skip on web)
4. **Immediate response** — Feedback triggers instantly, before any delays

## Feedback Matrix

| Event | Audio (SFX) | Screen Shake | Haptic |
|-------|-------------|--------------|--------|
| **Combat** |
| Strike (hit enemy) | `sword-slash` / `critical-hit` | — | — |
| Take damage (light) | — | Light | Impact Light |
| Take damage (medium) | — | Medium | Impact Medium |
| Take damage (heavy) | — | Heavy | Impact Heavy |
| Dodge success | `dodge-whoosh` | — | — |
| Dodge fail | — | Light | Impact Light |
| Brace | `brace-impact` | — | — |
| **Flee** |
| Flee attempt | `flee-run` | — | — |
| Flee success (clean) | `footstep` | — | — |
| Flee hurt (escaped but clipped) | — | Light | Impact Light |
| Flee fail (caught) | `flee-fail` | Medium | Warning |
| **Outcomes** |
| Enemy defeated | `enemy-death` | — | Success |
| Player death | `player-death` | Heavy | Error |
| Victory/Escape | `victory-fanfare` | — | Success + Heavy (double tap) |
| **Exploration** |
| Loot found | `item-pickup` | — | Success |
| Corpse empty | — | — | Error |
| Room advance | `footstep` | — | — |

## Implementation

### Screen Shake (combat.tsx)

```tsx
const triggerShake = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
  const magnitude = intensity === 'heavy' ? 12 : intensity === 'medium' ? 6 : 3;
  // Animated sequence: right → left → right → left → center
  Animated.sequence([
    Animated.timing(shakeAnim, { toValue: magnitude, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -magnitude, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: magnitude * 0.6, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -magnitude * 0.6, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]).start();
};
```

### Haptics (Platform-Safe)

```tsx
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Impact feedback (for damage, collisions)
if (Platform.OS !== 'web') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);   // Light damage
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);  // Medium damage
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);   // Heavy damage
}

// Notification feedback (for outcomes)
if (Platform.OS !== 'web') {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);  // Victory, loot
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);  // Flee fail
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);    // Death, empty
}
```

### Audio (useAudio hook)

```tsx
const { playSFX, playAmbient } = useAudio();

// One-shot sound effects
playSFX('sword-slash');

// Ambient loops (auto-crossfade)
playAmbient('ambient-combat');
```

## CRT Overlay

All screens include the CRT scanline overlay for retro aesthetic:

```tsx
import { CRTOverlay } from '../components/CRTOverlay';

// Add as last child in the outer View (after SafeAreaView)
<View className="flex-1 bg-crypt-bg">
  <SafeAreaView>
    {/* screen content */}
  </SafeAreaView>
  <CRTOverlay />
</View>
```

The overlay is `pointerEvents="none"` so it doesn't block touch.

## Adding New Events

When adding a new game event:

1. **Identify intensity** — Is it minor, notable, or major?
2. **Pick audio** — Check `/public/audio/` for existing SFX or generate new
3. **Add shake** — If it involves impact/damage
4. **Add haptic** — Match intensity (Impact for physical, Notification for outcomes)
5. **Test together** — All feedback should feel synchronized

## Audio Files

See [AUDIO.md](./AUDIO.md) for the full audio file list and generation workflow.

import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Platform, ViewStyle, Image } from 'react-native';
import { getCreatureAsset, getCreatureAssetByName } from '../lib/creatureAssets';
import { Icons, COMBAT_ACTION_ICONS } from '../lib/iconAssets';
import { AsciiLoader } from '../components/AsciiLoader';
import { TypewriterText } from '../components/TypewriterText';
import { CryptBackground } from '../components/CryptBackground';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../lib/GameContext';
import { updatePlayerClearedZone, useCurrentPlayer, recordCreatureUpdate } from '../lib/instant';
import { API_BASE } from '../lib/api';
import { ProgressBar } from '../components/ProgressBar';
import { GameMenu, MenuButton } from '../components/GameMenu';
import { MiniPlayer } from '../components/MiniPlayer';
import { AudioToggle } from '../components/AudioToggle';
import { CRTOverlay } from '../components/CRTOverlay';
import { CreatureModal, ItemModal } from '../components/CryptModal';
import { useAudio, getZoneAmbient, getZoneBossSFX, getCreatureSFX } from '../lib/audio';
import { useGameSettings, DEFAULT_GAME_SETTINGS } from '../lib/instant';
import {
  BESTIARY,
  getCreatureForRoom,
  getCreatureInfo,
  getCreatureHealth,
  getCreatureHealthSeeded,
  getCreatureIntent,
  getCreatureIntentSeeded,
  getIntentEffects,
  getItemEffects,
  getTagDamageBonus,
  getItemDetails,
  getStrikeNarration,
  getDodgeNarration,
  getBraceNarration,
  getFleeNarration,
  IntentType,
  IntentEffects,
  CreatureInfo,
} from '../lib/content';
import { getZoneDepth, loadZone } from '../lib/zone-loader';
import { calculateCombatDamage, heartstoneWarning } from '../lib/combat-math';
import {
  getZoneMechanic,
  resolveTurnStart,
  applyStatusOnHit,
  isStaminaRegenBlocked,
  infectionDamageMultiplier,
  infectionShouldDropItem,
  isFreezeImmune,
  rollFlux,
  clarityDepleted,
  clearStatus,
  restoreClarity,
} from '../lib/zone-mechanics';
import {
  initialRuleState,
  onPlayerStrike,
  onEnemyHitLanded,
  onDeathBlow,
  onTurnEnd,
  fleeBlocked,
  itemUseTriggersAttack,
  honorFilteredIntent,
  CombatRuleState,
} from '../lib/creature-rules';
import { t } from '../lib/i18n';

type CombatPhase = 'choose' | 'resolve' | 'victory' | 'death';

// Costs are settings-driven — getCombatOptions() builds this at render time
const BASE_COMBAT_OPTIONS = [
  { id: 'strike', text: 'Strike', emoji: '⚔️', desc: 'Attack the enemy' },
  { id: 'dodge',  text: 'Dodge',  emoji: '💨', desc: 'Evade the attack' },
  { id: 'brace',  text: 'Brace',  emoji: '🛡️', desc: 'Reduce damage' },
  { id: 'flee',   text: 'Flee',   emoji: '🏃', desc: 'Try to escape' },
];

function HealthBar({ current, max, color = 'red' }: { current: number; max: number; color?: string }) {
  const pct = Math.max(0, current / max);
  const filled = Math.round(pct * 10);
  const empty = 10 - filled;
  const filledClass = color === 'red' ? 'text-blood' : 'text-ethereal';
  const emptyClass = color === 'red' ? 'text-blood-dark' : 'text-purple-900';
  return (
    <Text className="font-mono tracking-tighter">
      <Text className={filledClass}>{'█'.repeat(filled)}</Text>
      <Text className={emptyClass}>{'█'.repeat(empty)}</Text>
    </Text>
  );
}

// All creature names — the universe the aggregate mastery % is computed
// against. Static at module load; no need to recompute per render.
const ALL_CREATURE_NAMES = Object.keys(BESTIARY);

export default function CombatScreen() {
  const insets = useSafeAreaInsets();
  const game = useGame();
  const { playSFX, playAmbient } = useAudio();
  const { settings } = useGameSettings();
  const { player } = useCurrentPlayer();
  const params = useLocalSearchParams<{ enemy?: string; roomNum?: string; nodeId?: string }>();
  
  const [phase, setPhase] = useState<CombatPhase>('choose');
  const [creature, setCreature] = useState<CreatureInfo | null>(null);
  const [enemyHealth, setEnemyHealth] = useState(65);
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(65);
  const [enemyIntent, setEnemyIntent] = useState<{ type: IntentType; description: string }>({ 
    type: 'AGGRESSIVE', 
    description: 'Preparing to attack' 
  });
  const [intentEffects, setIntentEffects] = useState<IntentEffects>(getIntentEffects('AGGRESSIVE'));
  const [wasCharging, setWasCharging] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [playerDmgTaken, setPlayerDmgTaken] = useState(0);
  const [enemyDmgTaken, setEnemyDmgTaken] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creatureModalOpen, setCreatureModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [artLoadFailed, setArtLoadFailed] = useState(false);
  const [isFirstTurn, setIsFirstTurn] = useState(true);
  const [enemyFrozen, setEnemyFrozen] = useState(false);
  // Heartstone — "Warm when death is near." Set true for the turn the
  // player's counter-hit crosses below 20% max HP while carrying one.
  const [heartstoneActive, setHeartstoneActive] = useState(false);
  
  // Signature-rule engine state (Task 8) — one CombatRuleState per fight,
  // reset whenever a new creature enters combat. `pendingChantBonusRef` is
  // separate from CombatRuleState because it's consumed on the FOLLOWING
  // turn's enemy base damage, not the turn it was computed on.
  const ruleStateRef = useRef<CombatRuleState>(initialRuleState());
  const pendingChantBonusRef = useRef(0);
  const fleeAttemptedRef = useRef(false);
  // multiply — the "another hand joins" line only fires the FIRST time an
  // extra attacker is added; every recurring turn after uses a shorter line.
  const multiplyAnnouncedRef = useRef(false);

  // Screen shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  const triggerShake = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    const magnitude = intensity === 'heavy' ? 15 : intensity === 'medium' ? 8 : 4;
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      const hapticType = intensity === 'heavy' 
        ? Haptics.ImpactFeedbackStyle.Heavy 
        : intensity === 'medium' 
          ? Haptics.ImpactFeedbackStyle.Medium 
          : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(hapticType);
    }
    
    // Screen shake
    const nativeDriver = Platform.OS !== 'web';
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: magnitude, duration: 50, useNativeDriver: nativeDriver }),
      Animated.timing(shakeAnim, { toValue: -magnitude, duration: 50, useNativeDriver: nativeDriver }),
      Animated.timing(shakeAnim, { toValue: magnitude * 0.6, duration: 50, useNativeDriver: nativeDriver }),
      Animated.timing(shakeAnim, { toValue: -magnitude * 0.6, duration: 50, useNativeDriver: nativeDriver }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: nativeDriver }),
    ]).start();
  };

  const roomNumber = parseInt(params.roomNum || '1', 10);
  const depth = getZoneDepth(loadZone(game.zoneId), roomNumber);
  const mechanic = getZoneMechanic(game.zoneId);

  // Initialize combat
  useEffect(() => {
    // Zone-specific combat ambient
    playAmbient(getZoneAmbient(game.zoneId, 'combat'));

    // Use the enemy passed from play screen, or fallback to random
    const enemyName = params.enemy;
    let roomCreature: CreatureInfo | null = null;
    
    if (enemyName) {
      // Look up creature by name from BESTIARY
      roomCreature = getCreatureInfo(enemyName);
    }
    
    // Fallback to random creature for this tier if not found
    if (!roomCreature) {
      roomCreature = getCreatureForRoom(roomNumber);
    }
    
    setCreature(roomCreature);
    setArtLoadFailed(false);

    // Signature-rule engine — fresh state for this fight.
    ruleStateRef.current = initialRuleState();
    pendingChantBonusRef.current = 0;
    fleeAttemptedRef.current = false;
    multiplyAnnouncedRef.current = false;
    // Reset per-fight combat state too, so dormant's turn-1 skip (gated on
    // isFirstTurn) and Frost Shard's freeze status can't leak in from a
    // previous creature if this screen instance is ever reused.
    setIsFirstTurn(true);
    setEnemyFrozen(false);

    // Bestiary mastery — encounter telemetry. Fire-and-forget; mastery
    // updates the player record off the main flow and surfaces any newly
    // crossed cosmetic unlocks via the same path death milestones use.
    // `player` may briefly be undefined on the very first render before
    // useCurrentPlayer resolves; in that case we skip — the next combat
    // will catch up.
    if (player) {
      recordCreatureUpdate(player, roomCreature.name, 'encounter', ALL_CREATURE_NAMES)
        .catch(err => console.warn('[combat] mastery encounter write failed:', err));
    }
    
    // Fix 1 (Revy): use seeded RNG for deterministic creature HP per seed
    const hp = game.rng ? getCreatureHealthSeeded(roomCreature.name, game.rng) : getCreatureHealth(roomCreature.name);
    setEnemyHealth(hp);
    setEnemyMaxHealth(hp);
    
    // Fix 1 (Revy): use seeded RNG for deterministic initial intent per seed
    // Honor creatures never roll ERRATIC — reroll once if that's what came up.
    const rawIntent = game.rng ? getCreatureIntentSeeded(roomCreature.name, game.rng) : getCreatureIntent(roomCreature.name);
    const intent = honorFilteredIntent(roomCreature.signature, rawIntent, () =>
      game.rng ? getCreatureIntentSeeded(roomCreature.name, game.rng) : getCreatureIntent(roomCreature.name)
    );
    setEnemyIntent(intent);
    setIntentEffects(getIntentEffects(intent.type));

    // Signature-rule telegraph — shown as the combat intro line.
    if (roomCreature.signature) {
      setNarrative(t(`rule.${roomCreature.signature.id}.telegraph`));
    } else {
      setNarrative('');
    }

    // Zone-specific boss intro or generic growl
    const isBoss = roomCreature.tier === 3;
    const bossSFX = getZoneBossSFX(game.zoneId);
    playSFX(isBoss ? bossSFX.intro : 'enemy-growl');
  }, [roomNumber, params.enemy]);

  // Build combat options with settings-driven costs
  const fleeGated = fleeBlocked(creature?.signature, ruleStateRef.current);
  const COMBAT_OPTIONS = BASE_COMBAT_OPTIONS.map(o => ({
    ...o,
    cost: o.id === 'strike' ? settings.strikeCost : o.id === 'brace' ? game.getModifiedBraceCost(0) : 1,
    disabled: o.id === 'flee' && fleeGated,
  }));
  // Void Beyond — at zero clarity, an option that isn't real slips into the list.
  if (clarityDepleted(mechanic, game.zoneStatus)) {
    COMBAT_OPTIONS.push({ id: 'void-fake', text: 'Step toward the light', emoji: '✨', desc: 'A way out', cost: 0, disabled: false });
  }

  // Calculate damage using admin settings — pure math lives in combat-math.ts
  // extraDefenseBonus: one-turn-only bonus (e.g. Heartstone's +0.10 the hit it warns on).
  const calculateDamage = (base: number, isPlayerAttacking: boolean, extraDefenseBonus: number = 0) => {
    const itemEffects = getItemEffects(game.inventory);
    const creatureTags = creature?.tags ?? [];
    return calculateCombatDamage({
      base,
      isPlayerAttacking,
      tier: depth.tier,
      enemyIsErratic: enemyIntent.type === 'ERRATIC',
      intentDamageDealtMod: intentEffects.damageDealtMod,
      intentDamageTakenMod: intentEffects.damageTakenMod,
      itemDamageBonus: itemEffects.damageBonus,
      itemDefenseBonus: itemEffects.defenseBonus + extraDefenseBonus,
      modifierDamageBonus: game.getModifiedDamageBonus(),
      tagDamageBonus: isPlayerAttacking ? getTagDamageBonus(itemEffects, creatureTags) : 0,
      wasCharging,
      settings,
    });
  };
  
  // Get base damage range from settings (uses seeded RNG for verifiable randomness)
  const getBaseDamage = () => {
    const min = settings.baseDamageMin;
    const max = settings.baseDamageMax;
    // Use seeded RNG if available, fallback to Math.random for edge cases
    if (game.rng) {
      return game.rng.range(min, max);
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // Handle combat action
  const handleAction = (action: string) => {
    // Void Beyond — a fake option injected at zero clarity; it resolves to nothing.
    if (action === 'void-fake') {
      setNarrative('You reach for it — but it was never there. Or it was. You are no longer sure.');
      return;
    }

    const option = COMBAT_OPTIONS.find(o => o.id === action);
    if (!option) return;

    // Signature rule: flee gate (e.g. dormant Forgotten Guardian from turn 2 on).
    if (action === 'flee' && fleeBlocked(creature?.signature, ruleStateRef.current)) {
      playSFX('error-buzz');
      setNarrative(t('rule.flee.blocked'));
      return;
    }
    if (action === 'flee') {
      fleeAttemptedRef.current = true;
    }

    // Check stamina
    if (option.cost > game.stamina) {
      playSFX('error-buzz');
      return;
    }

    // Spend stamina. Tracked in a local var (not just via game.setStamina) so
    // a same-tick signature-rule stamina drain (see `drain`) below can chain
    // off the post-cost value instead of the stale `game.stamina` closure.
    let staminaAfterCost = game.stamina;
    if (option.cost > 0) {
      staminaAfterCost -= option.cost;
      game.setStamina(staminaAfterCost);
    }

    // Zone status — start-of-turn tick (burn damage, chill decay).
    let status = game.zoneStatus;
    const tick = resolveTurnStart(mechanic, status);
    status = tick.state;
    const tickDamage = tick.damage;

    let playerDmg = 0;
    let enemyDmg = 0;
    let heartstoneTriggered = false;
    // Heartstone — "Warm when death is near." The warning must reflect the
    // damage that will ACTUALLY be applied on this path, so each path passes
    // its post-mitigation transform (`post`: brace reduction, flee halving)
    // via which the final number is derived. We compute the final hit WITHOUT
    // the stone first, test the threshold crossing against THAT, and only if
    // it triggers do we recompute the same hit with the one-turn +0.10
    // defense and re-run it through the same post-processing.
    // Note: the flat chant addend (Fix 5) and the frozen/dormant zeroing are
    // applied outside this helper — see the post-switch block below.
    const applyHeartstone = (baseHit: number, post: (raw: number) => number = (d) => d) => {
      const finalNoStone = post(calculateDamage(baseHit, false));
      const triggered = heartstoneWarning(game.health, finalNoStone, game.getMaxHp(), game.inventory);
      return { dmg: triggered ? post(calculateDamage(baseHit, false, 0.10)) : finalNoStone, triggered };
    };
    let fleeSuccess = false;
    let actionNarrative = '';
    // Signature rule: `dodge`-into-counter is the one death-blow finish that
    // rupture doesn't punish (see onDeathBlow's lastActionWasDodgeCounter).
    let dodgeCounterLanded = false;
    // Signature rule: chant's bonus was computed by the PREVIOUS turn's
    // onTurnEnd and feeds this turn's enemy base damage, before calculateDamage.
    const chantBonus = pendingChantBonusRef.current;

    switch (action) {
      case 'strike': {
        // Player damage uses settings range; enemy counter scales by enemyCounterMultiplier
        const basePlayerHit = getBaseDamage();
        const baseEnemyHit = Math.floor(getBaseDamage() * settings.enemyCounterMultiplier);
        const strikeHeartstone = applyHeartstone(baseEnemyHit);
        heartstoneTriggered = strikeHeartstone.triggered;
        playerDmg = strikeHeartstone.dmg;
        // Bonus damage for striking AGGRESSIVE/HUNTING correctly
        const strikeIntentBonus = (enemyIntent.type === 'AGGRESSIVE' || enemyIntent.type === 'HUNTING')
          ? settings.intentCounterBonus : 1.0;
        enemyDmg = Math.round(calculateDamage(basePlayerHit, true) * strikeIntentBonus);

        // Critical hit chance from settings — twin-fangs synergy adds critBonus
        const strikeItemEffects = getItemEffects(game.inventory);
        const criticalChance = settings.criticalChance + (strikeItemEffects.critBonus ?? 0);
        const isCritical = game.rng ? game.rng.chance(criticalChance) : Math.random() < criticalChance;
        if (isCritical) {
          enemyDmg = Math.round(enemyDmg * settings.criticalMultiplier);
          actionNarrative = getStrikeNarration('success');
          playSFX('critical-hit');
        } else {
          actionNarrative = getStrikeNarration('mutual');
          playSFX(enemyDmg >= 25 ? 'critical-hit' : 'sword-slash');
        }

        // Signature rule: blink evades the creature's first strike taken —
        // the player's blow passes through empty air, dealing no damage.
        const strikeResult = onPlayerStrike(creature?.signature, ruleStateRef.current);
        ruleStateRef.current = strikeResult.state;
        if (strikeResult.evaded) {
          enemyDmg = 0;
          actionNarrative = t('rule.blink.evade');
        }
        break;
      }
      case 'dodge': {
        playSFX('dodge-whoosh');
        const success = game.rng ? game.rng.chance(settings.dodgeSuccessRate) : Math.random() < settings.dodgeSuccessRate;
        if (success) {
          playerDmg = 0;
          // Counter-attack bonus when dodging a CHARGING enemy
          if (wasCharging) {
            const counterBase = game.rng ? game.rng.range(8, 14) : 8 + Math.floor(Math.random() * 7);
            enemyDmg = Math.round(counterBase * settings.intentCounterBonus);
            actionNarrative = getDodgeNarration('counter');
            dodgeCounterLanded = true;
          } else {
            actionNarrative = getDodgeNarration('success');
          }
        } else {
          const dodgeDmgBase = (game.rng ? game.rng.range(5, 9) : 5 + Math.floor(Math.random() * 5));
          const dodgeHeartstone = applyHeartstone(dodgeDmgBase);
          heartstoneTriggered = dodgeHeartstone.triggered;
          playerDmg = dodgeHeartstone.dmg;
          actionNarrative = getDodgeNarration('close');
        }
        break;
      }
      case 'brace': {
        playSFX('brace-impact');
        const brMin = settings.braceBaseDamageMin;
        const brMax = settings.braceBaseDamageMax;
        const baseDmg = (game.rng ? game.rng.range(brMin, brMax) : brMin + Math.floor(Math.random() * (brMax - brMin + 1)));
        if (game.modifierBraceNegatesAll()) {
          playerDmg = 0;
        } else {
          // Heartstone evaluates the POST-reduction hit — that's what lands.
          const braceHeartstone = applyHeartstone(baseDmg, (d) => Math.round(d * (1 - settings.braceReduction)));
          heartstoneTriggered = braceHeartstone.triggered;
          playerDmg = braceHeartstone.dmg;
        }
        actionNarrative = getBraceNarration('success');
        break;
      }
      case 'flee': {
        playSFX('flee-run');
        const itemEffects = getItemEffects(game.inventory);
        const fleeChance = Math.min(0.9, Math.max(0.1, settings.fleeChanceBase + intentEffects.fleeMod + itemEffects.fleeBonus));
        const cleanRatio = settings.fleeCleanRatio;
        const roll = game.rng ? game.rng.random() : Math.random();

        if (roll < fleeChance * cleanRatio) {
          // Clean escape
          fleeSuccess = true;
          actionNarrative = getFleeNarration('success');
        } else if (roll < fleeChance) {
          // Escaped but took damage
          fleeSuccess = true;
          const fleeDmgBase = (game.rng ? game.rng.range(5, 12) : 5 + Math.floor(Math.random() * 8));
          // Heartstone evaluates the POST-halving hit (beggar's-grace flee).
          const fleeHalve = (d: number) => itemEffects.fleeDamageHalved ? Math.ceil(d / 2) : d;
          const fleeHeartstone = applyHeartstone(fleeDmgBase, fleeHalve);
          heartstoneTriggered = fleeHeartstone.triggered;
          playerDmg = fleeHeartstone.dmg;
          actionNarrative = getFleeNarration('hurt');
          triggerShake('light');
          // Light haptic for getting clipped while fleeing
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } else {
          // Failed to escape
          fleeSuccess = false;
          const failDmgBase = (game.rng ? game.rng.range(8, 19) : 8 + Math.floor(Math.random() * 12));
          // Heartstone evaluates the POST-halving hit (beggar's-grace flee).
          const failHalve = (d: number) => itemEffects.fleeDamageHalved ? Math.ceil(d / 2) : d;
          const failHeartstone = applyHeartstone(failDmgBase, failHalve);
          heartstoneTriggered = failHeartstone.triggered;
          playerDmg = failHeartstone.dmg;
          actionNarrative = getFleeNarration('fail');
          playSFX('flee-fail');
          triggerShake('medium');
          // Haptic for failed escape
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
        break;
      }
    }

    // Signature rule: dormant (Forgotten Guardian) skips turn 1 entirely —
    // not modeled in the engine itself (it has no combat-damage inputs), so
    // it's gated here: on turn 1 the creature lands no counter/attack damage.
    // The telegraph shown at combat start already explains why.
    if (creature?.signature?.id === 'dormant' && isFirstTurn) {
      playerDmg = 0;
    }

    // ── Zone status — infection damage penalty, freeze, on-hit application ──
    enemyDmg = Math.round(enemyDmg * infectionDamageMultiplier(status));
    if (enemyFrozen && playerDmg > 0) {
      playerDmg = 0;
      actionNarrative += ' The frozen creature strains against the ice — it cannot strike.';
    }
    if (enemyFrozen) setEnemyFrozen(false);

    // Heartstone's warning is scoped to a blow that actually lands — if the
    // hit was zeroed above (dormant turn-1 skip, frozen creature), the stone
    // never warmed, so clear the trigger flag.
    if (playerDmg <= 0) heartstoneTriggered = false;
    // Chant (Fix 5): a FLAT post-multiplier addend — applied after every
    // tier/charge multiplier and after mitigation, and only when the
    // creature's blow actually lands damage on the player this turn. (The
    // banked bonus is computed by the previous turn's onTurnEnd.)
    if (playerDmg > 0 && chantBonus > 0) playerDmg += chantBonus;

    if (playerDmg > 0) {
      const hitItemEffects = getItemEffects(game.inventory);
      const ashVeil = hitItemEffects.ashVeil ?? false;
      const burnImmune = mechanic === 'BURN' && (hitItemEffects.burnImmune ?? false);
      if (!burnImmune) {
        status = applyStatusOnHit(mechanic, status, creature?.tier === 3, false, ashVeil);
      }
      // INFECTION — crossing 3 stacks costs a random inventory item, once.
      if (infectionShouldDropItem(status) && game.inventory.length > 0) {
        const victim = game.inventory[Math.floor((game.rng ? game.rng.random() : Math.random()) * game.inventory.length)];
        game.removeFromInventory(victim.id);
        status = { ...status, infectionItemDropped: true };
        actionNarrative += ` The infection spreads — your ${victim.name} rots away.`;
      }
    }
    game.setZoneStatus(status);

    // Signature rule: onEnemyHitLanded — the enemy's attack landing on the
    // player (playerDmg > 0, post zone-effects) heals it (absorb) and/or
    // drains player stamina (drain).
    let ruleEnemyHeal = 0;
    if (playerDmg > 0 && creature?.signature) {
      const hit = onEnemyHitLanded(creature.signature, ruleStateRef.current, enemyMaxHealth);
      ruleEnemyHeal = hit.healEnemy;
      if (hit.staminaDrain > 0) {
        staminaAfterCost = Math.max(0, staminaAfterCost - hit.staminaDrain);
        game.setStamina(staminaAfterCost);
      }
    }

    // Signature rule: onTurnEnd — call AFTER onPlayerStrike (already invoked
    // above in the 'strike' case, per the engine's chant-stacking contract)
    // so `struckLastTurn` reflects this turn's action before we roll forward.
    // `addAttacker` (multiply) contributes one extra enemy strike THIS turn;
    // `chantBonusDamage` is banked for the NEXT turn's enemy base damage.
    const turnEnd = onTurnEnd(creature?.signature, ruleStateRef.current);
    ruleStateRef.current = turnEnd.state;
    pendingChantBonusRef.current = turnEnd.chantBonusDamage;
    let extraAttackerDmg = 0;
    // multiply — the extra attacker joins from turn N on. A SUCCESSFUL flee
    // clears the room before the extra hand can strike, so it deals no damage
    // (and gets no line). The "another hand joins" line shows only the FIRST
    // time; every recurring turn after uses the shorter reminder line.
    if (turnEnd.addAttacker && !fleeSuccess) {
      const extraBase = getBaseDamage();
      extraAttackerDmg = calculateDamage(extraBase, false);
      const joinLine = multiplyAnnouncedRef.current ? t('rule.multiply.strike') : t('rule.multiply.join');
      multiplyAnnouncedRef.current = true;
      actionNarrative = `${actionNarrative} ${joinLine}`.trim();
    }

    const totalPlayerDmgPreDeathBlow = playerDmg + tickDamage + extraAttackerDmg;

    // Apply damage (action damage + start-of-turn burn tick + any extra attacker)
    let newEnemyHealth = Math.max(0, enemyHealth - enemyDmg);
    if (ruleEnemyHeal > 0) {
      newEnemyHealth = Math.min(enemyMaxHealth, newEnemyHealth + ruleEnemyHeal);
    }

    // Signature rule: onDeathBlow — checked the instant the enemy would hit
    // 0 HP, before the outcome branches below. Reform overrides the death
    // (enemy rises back to reformToHp and the fight continues); rupture adds
    // a burst of damage to the player on top of this turn's damage, unless
    // the killing blow was a dodge-counter.
    let extraPlayerDmgFromDeathBlow = 0;
    if (newEnemyHealth <= 0 && creature?.signature) {
      const blow = onDeathBlow(creature.signature, ruleStateRef.current, {
        lastActionWasDodgeCounter: dodgeCounterLanded,
        playerHasVoidOrAsh: game.inventory.some(item => {
          const tags = getItemDetails(item.name)?.elementTags ?? [];
          return tags.includes('VOID') || tags.includes('ASH');
        }),
        enemyMaxHp: enemyMaxHealth,
      });
      if (blow.reformToHp > 0) {
        newEnemyHealth = blow.reformToHp;
        // The engine can't flip reformUsed itself (Task 8 contract) — Task 10
        // owns setting it once a nonzero reformToHp has actually been applied.
        ruleStateRef.current = { ...ruleStateRef.current, reformUsed: true };
        actionNarrative = `${actionNarrative} ${t('rule.reform.rise')}`.trim();
      } else if (blow.ruptureDamage > 0) {
        extraPlayerDmgFromDeathBlow = blow.ruptureDamage;
        actionNarrative = `${actionNarrative} ${t('rule.rupture.burst')}`.trim();
      }
    }

    const totalPlayerDmg = totalPlayerDmgPreDeathBlow + extraPlayerDmgFromDeathBlow;
    const newPlayerHealth = Math.max(0, game.health - totalPlayerDmg);

    setEnemyHealth(newEnemyHealth);
    setEnemyDmgTaken(enemyDmg);
    game.setHealth(newPlayerHealth);
    setPlayerDmgTaken(totalPlayerDmg);
    setHeartstoneActive(heartstoneTriggered);
    setNarrative(tick.narrative ? `${tick.narrative} ${actionNarrative}` : actionNarrative);

    // Creature attack sound when player takes damage
    if (playerDmg > 0) {
      const creatureSFX = getCreatureSFX(creature?.name || '');
      playSFX(creatureSFX.attack);
    }

    // Screen shake + haptics on damage
    if (playerDmg > 0) {
      const intensity = playerDmg >= 20 ? 'heavy' : playerDmg >= 10 ? 'medium' : 'light';
      triggerShake(intensity);
      // Haptic feedback for taking damage
      if (Platform.OS !== 'web') {
        const hapticStyle = playerDmg >= 20 
          ? Haptics.ImpactFeedbackStyle.Heavy 
          : playerDmg >= 10 
            ? Haptics.ImpactFeedbackStyle.Medium 
            : Haptics.ImpactFeedbackStyle.Light;
        Haptics.impactAsync(hapticStyle);
      }
    }
    
    // Check outcomes
    // IMPORTANT: death check must come before flee success.
    // Edge case: player can "successfully flee" but still die from flee damage.
    if (newPlayerHealth <= 0) {
      const save = game.checkDeathSave(newPlayerHealth);
      if (save.saved) {
        // Death's Mantle triggered — show save message and let combat continue
        setNarrative(save.message ?? t('item.mantle.save'));
      } else {
        playSFX('player-death');
        triggerShake('heavy');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setPhase('death');
        setTimeout(() => {
          router.replace({ pathname: '/death', params: { killedBy: creature?.name } });
        }, 2000);
        return;
      }
    }

    if (fleeSuccess) {
      playSFX('footstep');
      setPhase('resolve');
      setTimeout(() => {
        // Forking nodes: don't silently take next[0] — let play.tsx offer the
        // branch choice. Single-edge nodes advance as before.
        const node = game.currentNodeId ? game.graph?.nodes[game.currentNodeId] : undefined;
        if (node && node.next.length > 1) {
          game.markNodeResolved();
        } else {
          game.advance();
        }
        router.replace('/play');
      }, 1500);
      return;
    }
    
    if (newEnemyHealth <= 0) {
      const creatureSFX = getCreatureSFX(creature?.name || '');
      playSFX(creatureSFX.death);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Fix 6 (Revy): record zone clear when boss is defeated
      const node = params.nodeId ? game.graph?.nodes[params.nodeId] : undefined;
      if (node?.boss && game.authId && game.zoneId) {
        updatePlayerClearedZone(game.authId, game.zoneId).catch(err =>
          console.warn('[combat] Failed to record zone clear:', err)
        );
      }
      // Bestiary mastery — defeat telemetry. Same fire-and-forget pattern as
      // the encounter write at mount time.
      //
      // Signature rule: honor (Carrion Knight) grants bonus mastery on a win
      // with no flee attempt anywhere in the fight. Passed as
      // `defeatIncrement: 2` on the single transactional write so
      // recordCreatureUpdate diffs unlocks against the TRUE stored prev
      // (not a caller-side pre-bumped snapshot, which would silently drop
      // any threshold crossed by the pre-bump itself).
      if (player && creature) {
        const honorBonus = creature.signature?.id === 'honor' && !fleeAttemptedRef.current;
        recordCreatureUpdate(player, creature.name, 'defeat', ALL_CREATURE_NAMES, honorBonus ? 2 : 1)
          .catch(err => console.warn('[combat] mastery defeat write failed:', err));
      }
      setPhase('victory');
      setTimeout(() => {
        // Forking nodes: don't silently take next[0] — let play.tsx offer the
        // branch choice. Single-edge nodes advance as before.
        const resolvedNode = game.currentNodeId ? game.graph?.nodes[game.currentNodeId] : undefined;
        if (resolvedNode && resolvedNode.next.length > 1) {
          game.markNodeResolved();
        } else {
          game.advance();
        }
        router.replace('/play');
      }, 2000);
      return;
    }
    
    // Continue combat - new enemy intent
    setPhase('resolve');
    setWasCharging(intentEffects.isCharging);
    
    setTimeout(() => {
      // Voidblade per-turn damage — fires after each turn resolves
      const voidDmg = game.applyVoidbladeEffect();
      if (voidDmg > 0) {
        // newPlayerHealth is captured from closure (reflects post-action health)
        if (newPlayerHealth - voidDmg <= 0) {
          const save = game.checkDeathSave(newPlayerHealth - voidDmg);
          if (!save.saved) {
            playSFX('player-death');
            setPhase('death');
            setTimeout(() => {
              router.replace({ pathname: '/death', params: { killedBy: 'Voidblade' } });
            }, 2000);
            return;
          }
          setNarrative(save.message ?? t('item.mantle.save'));
        } else {
          setNarrative(`Voidblade burns — ${voidDmg} damage!`);
        }
      }

      // Fix 1 (Revy): use seeded RNG for deterministic intent sequence per seed
      // Honor creatures (Carrion Knight) never roll ERRATIC — reroll once.
      const rollIntent = () =>
        game.rng
          ? getCreatureIntentSeeded(creature?.name || 'The Drowned', game.rng)
          : getCreatureIntent(creature?.name || 'The Drowned');
      let newIntent = honorFilteredIntent(creature?.signature, rollIntent(), rollIntent);
      // Void Beyond FLUX — the intent can shift again before the next turn.
      if (mechanic === 'FLUX' && rollFlux(game.rng)) {
        newIntent = honorFilteredIntent(creature?.signature, rollIntent(), rollIntent);
        setNarrative(prev => `${prev} The creature's intent flickers — unreadable.`);
      }
      setEnemyIntent(newIntent);
      setIntentEffects(getIntentEffects(newIntent.type));
      setPhase('choose');
      setIsFirstTurn(false);
      const regen = isStaminaRegenBlocked(mechanic, status) ? 0 : game.getModifiedStaminaRegen(settings.staminaRegen);
      // Functional update — the drain (-cost, and any signature stamina drain)
      // applied earlier this tick lives in state, not this stale closure's
      // `game.stamina`. Adding regen relative to the current value composes
      // with it instead of clobbering it. Cap/floor handled inside.
      game.adjustStamina(regen);

      // Creature idle sound on new intent (enemy is "doing something")
      const creatureSFX = getCreatureSFX(creature?.name || '');
      playSFX(creatureSFX.idle);
    }, 1500);
  };

  if (!creature) {
    return (
      <View className="flex-1 bg-crypt-bg justify-center items-center">
        <AsciiLoader width={16} color="#f59e0b" style={{ fontSize: 16 }} />
      </View>
    );
  }

  // Use dvh for mobile web, fallback to 100% for native
  const containerStyle = (Platform.OS === 'web'
    ? { height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' as const }
    : { flex: 1 }) as ViewStyle;

  return (
    <CryptBackground screen="combat" style={containerStyle}>
      <SafeAreaView style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }} edges={['bottom']}>
        <Animated.View 
          style={{ transform: [{ translateX: shakeAnim }], flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-3 border-b border-amber/30" style={{ flexShrink: 0, paddingTop: insets.top + 8, paddingBottom: 8 }}>
            <View className="flex-row items-center gap-2">
              <MenuButton onPress={() => setMenuOpen(true)} />
              <Text className="text-amber text-xs font-mono">◈ {depth.name}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <AudioToggle ambientTrack="ambient-combat" inline />
              <ProgressBar current={roomNumber} total={game.graph?.maxDepth ?? 13} />
            </View>
          </View>

          {/* Game Menu */}
          <GameMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Enemy Card — tap header to inspect creature */}
        <View className="bg-crypt-surface border border-crypt-border p-4 mb-4">
          <Pressable
            className="flex-row items-center gap-3 mb-3 active:opacity-70"
            onPress={() => setCreatureModalOpen(true)}
          >
            {!artLoadFailed && (creature.artUrl ? getCreatureAsset(creature.artUrl) : getCreatureAssetByName(creature.name)) ? (
              <Image
                source={creature.artUrl ? getCreatureAsset(creature.artUrl) : getCreatureAssetByName(creature.name)}
                style={{ width: 80, height: 100, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(180,30,30,0.35)' }}
                resizeMode="cover"
                onError={() => setArtLoadFailed(true)}
              />
            ) : (
              <Text className="text-4xl">{creature.emoji}</Text>
            )}
            <View className="flex-1">
              <Text className="text-bone text-lg font-mono font-bold">{creature.name}</Text>
              <Text className="text-bone-dark text-xs font-mono">Tier {creature.tier}</Text>
              <View className="flex-row items-center gap-2 mt-2">
                <Image source={Icons.heart} style={{ width: 22, height: 22, alignSelf: "center" }} resizeMode="contain" />
                <HealthBar current={enemyHealth} max={enemyMaxHealth} />
                <Text className="text-blood-light text-sm font-mono font-bold">{enemyHealth}/{enemyMaxHealth}</Text>
              </View>
            </View>
            <Text className="text-bone-dark text-xs font-mono">[?]</Text>
          </Pressable>
          
          {/* Enemy Intent — hidden on first turn with Blind Descent modifier */}
          {!(game.modifierHidesFirstIntent() && isFirstTurn) && (
            <View className={`p-2 border-l-2 ${intentEffects.isCharging ? 'border-amber bg-amber/10' : 'border-ethereal bg-ethereal/10'}`}>
              <Text className={`text-xs font-mono ${intentEffects.isCharging ? 'text-amber' : 'text-ethereal'}`}>
                {intentEffects.description}
              </Text>
            </View>
          )}
        </View>

        {/* Combat Narrative */}
        {narrative && (
          <View className="bg-amber/10 border-2 border-amber mb-4">
            {/* Narrative text */}
            <View className="p-4 pb-3">
              {settings.enableRoomTextStreaming ? (
                <TypewriterText
                  key={narrative}
                  text={narrative}
                  speedMs={settings.roomTextStreamSpeedMs}
                  className="text-amber-light text-sm font-mono"
                />
              ) : (
                <Text className="text-amber-light text-sm font-mono">{narrative}</Text>
              )}
            </View>
            
            {/* Damage summary - separated, bigger, centered */}
            {(playerDmgTaken > 0 || enemyDmgTaken > 0) && (
              <View className="border-t border-amber/30 py-4">
                {enemyDmgTaken > 0 && (
                  <Text className="text-victory text-lg font-mono font-bold text-center">
                    {`YOU DEALT ${enemyDmgTaken}`}
                  </Text>
                )}
                {playerDmgTaken > 0 && (
                  <Text className="text-blood text-lg font-mono font-bold text-center mt-1">
                    {`YOU TOOK ${playerDmgTaken}`}
                  </Text>
                )}
              </View>
            )}
            {heartstoneActive && (
              <View className="border-t border-amber/30 py-3">
                <Text className="text-blood text-sm font-mono font-bold text-center">
                  {t('item.heartstone.warning')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Victory/Death Messages */}
        {phase === 'victory' && (
          <View className="bg-victory/20 border-2 border-victory p-4 mb-4">
            <Text className="text-victory text-lg font-mono font-bold text-center">VICTORY!</Text>
            <Text className="text-victory-light text-sm font-mono text-center mt-2">
              {creature.name} has fallen.
            </Text>
          </View>
        )}
        
        {phase === 'death' && (
          <View className="bg-blood/20 border-2 border-blood p-4 mb-4">
            <Text className="text-blood text-lg font-mono font-bold text-center">DEFEATED</Text>
            <Text className="text-blood-light text-sm font-mono text-center mt-2">
              You have fallen to {creature.name}.
            </Text>
          </View>
        )}

        {/* Combat Options - 2x2 Grid */}
        {phase === 'choose' && (
          <View className="mt-4">
            <Text className="text-bone-dark text-xs font-mono tracking-widest mb-3">▼ CHOOSE ACTION</Text>
            <View className="flex-row flex-wrap justify-between">
              {COMBAT_OPTIONS.map((option) => {
                const canUse = game.stamina >= option.cost && !option.disabled;
                return (
                  <Pressable
                    key={option.id}
                    className={`bg-crypt-surface border py-3 px-3 mb-2 ${
                      canUse ? 'border-amber active:bg-amber/10' : 'border-crypt-border opacity-50'
                    }`}
                    style={{ width: '48%' }}
                    onPress={() => canUse && handleAction(option.id)}
                    disabled={!canUse}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        {COMBAT_ACTION_ICONS[option.id] ? (
                          <Image
                            source={COMBAT_ACTION_ICONS[option.id]}
                            style={{ width: 28, height: 28, marginRight: 8, opacity: canUse ? 1 : 0.4 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={{ fontSize: 22, marginRight: 8 }}>{option.emoji}</Text>
                        )}
                        <Text className={`font-mono font-bold ${canUse ? 'text-bone' : 'text-bone-dark'}`}>
                          {option.text}
                        </Text>
                      </View>
                      {option.cost > 0 && (
                        <View className="flex-row items-center">
                          <Image source={Icons.stamina} style={{ width: 20, height: 20, marginRight: 2, alignSelf: "center" }} resizeMode="contain" />
                          <Text className="text-stamina-light text-xs font-mono">{option.cost}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

          {/* Footer - Player Stats (sticky bottom) */}
          <View className="border-t border-crypt-border p-3 bg-crypt-bg" style={{ flexShrink: 0, flexGrow: 0 }}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Image source={Icons.heart} style={{ width: 26, height: 26, alignSelf: "center" }} resizeMode="contain" />
                <HealthBar current={game.health} max={100} />
                <Text className={`text-sm font-mono font-bold ${game.health < 30 ? 'text-blood' : 'text-blood-light'}`}>
                  {game.health}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Image source={Icons.stamina} style={{ width: 24, height: 24, alignSelf: "center" }} resizeMode="contain" />
                <Text className="text-stamina-light font-mono">
                  {'◆'.repeat(game.stamina)}{'◇'.repeat(Math.max(0, settings.staminaPool - game.stamina))}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-amber">◎</Text>
                <Text className="text-amber font-mono font-bold">
                  {game.stakeAmount > 0 ? `${game.stakeAmount}` : 'FREE'}
                </Text>
              </View>
            </View>

            {/* Zone status badges */}
            {mechanic !== 'NONE' && (
              <View className="flex-row items-center gap-3 mb-2">
                {game.zoneStatus.burn > 0 && (
                  <Text className="text-amber text-xs font-mono">🔥 Burn {game.zoneStatus.burn}</Text>
                )}
                {game.zoneStatus.chill > 0 && (
                  <Text className="text-stamina-light text-xs font-mono">❄️ Chill {game.zoneStatus.chill}</Text>
                )}
                {game.zoneStatus.infection > 0 && (
                  <Text className="text-victory text-xs font-mono">☣️ Infection {game.zoneStatus.infection}</Text>
                )}
                {mechanic === 'FLUX' && (
                  <Text className="text-ethereal text-xs font-mono">👁️ Clarity {game.zoneStatus.clarity}</Text>
                )}
              </View>
            )}

            {/* Inventory */}
            <View className="flex-row items-center">
              <Text className="text-bone-dark text-xs font-mono mr-2">ITEMS</Text>
              <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false}>
                {game.inventory.length > 0 ? (
                  game.inventory.map((item) => (
                    <Pressable
                      key={item.id}
                      className="bg-crypt-surface border border-crypt-border py-1 px-2 mr-2 active:border-amber"
                      onPress={() => { playSFX('ui-click'); setSelectedItem(item); }}
                    >
                      <Text className="text-bone-muted text-xs font-mono">{item.emoji} {item.name}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text className="text-stone-600 text-xs font-mono italic">None</Text>
                )}
              </ScrollView>
            </View>

            <MiniPlayer />
          </View>

          <CreatureModal
            visible={creatureModalOpen}
            onClose={() => setCreatureModalOpen(false)}
            creature={creature}
          />

          <ItemModal
            visible={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            item={selectedItem ? {
              ...selectedItem,
              description: getItemDetails(selectedItem.name)?.description,
              effect: getItemDetails(selectedItem.name)?.effect,
              type: getItemDetails(selectedItem.name)?.type,
              artUrl: getItemDetails(selectedItem.name)?.artUrl,
            } : null}
            onUse={() => {
              if (!selectedItem) return;
              // Heartstone's warning is scoped to the hit that triggered it —
              // using an item ends that turn's warning display.
              setHeartstoneActive(false);
              const name = selectedItem.name;
              if (name === 'Herbs') {
                const baseHeal = game.rng ? game.rng.range(25, 40) : Math.floor(Math.random() * 15) + 25; // 25-40 HP
                // Fix 2 (Revy): use applyHealing so modifier penalty and HP cap apply consistently
                const healed = game.applyHealing(baseHeal);
                setNarrative(`You quickly apply the herbs. Wounds close. +${healed} HP.`);
                playSFX('heal');
              } else if (name === 'Pale Rations') {
                game.adjustStamina(settings.staminaRegen);
                setNarrative('You eat quickly. Strength returns to your legs.');
                playSFX('loot-discover');
              } else if (name === 'Bone Dust') {
                // Passive item (Task 3): Bone Dust's reveal fires automatically
                // at a branching node on the play screen and is consumed
                // there — it has no combat effect, so decline the manual use
                // (no consumption, no pounce-punish opening) rather than
                // silently discard it here.
                setSelectedItem(null);
                return;
              } else if (name === 'Ember Flask') {
                game.setZoneStatus(clearStatus(game.zoneStatus, 'burn'));
                setNarrative('The flask drinks the heat. The burning stops.');
                playSFX('heal');
              } else if (name === 'Thermal Flask') {
                game.setZoneStatus(clearStatus(game.zoneStatus, 'chill'));
                setNarrative('Warmth floods back. The cold retreats.');
                playSFX('heal');
              } else if (name === 'Cleansing Salts') {
                game.setZoneStatus(clearStatus(game.zoneStatus, 'infection'));
                setNarrative('The salts draw the rot out through the skin. It is not painless.');
                playSFX('heal');
              } else if (name === 'Clarity Shard') {
                game.setZoneStatus(restoreClarity(game.zoneStatus));
                setNarrative('The shard steadies your mind. Reality settles, briefly.');
                playSFX('ui-click');
              } else if (name === 'Frost Shard') {
                if (creature && isFreezeImmune(creature.name)) {
                  setNarrative(`The cold finds no purchase — ${creature.name} does not feel it.`);
                } else {
                  setEnemyFrozen(true);
                  setNarrative('The shard shatters against the enemy. It seizes, locked in ice.');
                }
                playSFX('ui-click');
              }

              // Signature rule: pounce (The Hunched) — using any item in
              // combat is an opening the creature takes immediately.
              if (creature?.signature && itemUseTriggersAttack(creature.signature)) {
                const pounceBase = game.rng ? game.rng.range(8, 14) : 8 + Math.floor(Math.random() * 7);
                const pounceDmg = calculateDamage(pounceBase, false);
                if (pounceDmg > 0) {
                  // Apply relative to CURRENT health (functional update), not
                  // the stale `game.health` render closure — Herbs' applyHealing
                  // may have already landed a functional update earlier in this
                  // same handler, and an absolute write here would silently
                  // discard it.
                  const healthAfterPounce = game.applyDamage(pounceDmg);
                  setPlayerDmgTaken(pounceDmg);
                  setNarrative(prev => `${prev} ${t('rule.pounce.strike')}`.trim());
                  triggerShake(pounceDmg >= 20 ? 'heavy' : pounceDmg >= 10 ? 'medium' : 'light');
                  if (healthAfterPounce <= 0) {
                    const save = game.checkDeathSave(healthAfterPounce);
                    if (save.saved) {
                      setNarrative(save.message ?? t('item.mantle.save'));
                    } else {
                      playSFX('player-death');
                      triggerShake('heavy');
                      if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      }
                      setPhase('death');
                      setTimeout(() => {
                        router.replace({ pathname: '/death', params: { killedBy: creature.name } });
                      }, 2000);
                    }
                  }
                }
              }

              game.removeFromInventory(selectedItem.id);
            }}
          />
        </Animated.View>
      </SafeAreaView>
      <CRTOverlay />
    </CryptBackground>
  );
}

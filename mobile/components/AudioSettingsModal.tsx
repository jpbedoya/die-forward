// AudioSettingsModal — lightweight music settings overlay for non-game screens
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CryptModal } from './CryptModal';
import { AudioSettingsSection } from './AudioSettingsSection';
import { useCurrentPlayer, saveNotifRegistration, setNotifOptIn } from '../lib/instant';
import { requestPushPermission, getExpoPushToken, getDeviceTimezone, getDeviceLocale } from '../lib/notifications';
import { t } from '../lib/i18n';

interface AudioSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AudioSettingsModal({ visible, onClose }: AudioSettingsModalProps) {
  const { player } = useCurrentPlayer();
  const [busy, setBusy] = useState(false);

  const optedIn = !!player?.notifOptIn;

  // Dispatches toggle. Turning ON without a stored token runs the native
  // request→token→register flow; a native failure leaves the toggle OFF and
  // never throws. Turning OFF just clears the opt-in flag.
  const handleToggleDispatches = async () => {
    if (!player || busy) return;
    setBusy(true);
    try {
      if (optedIn) {
        await setNotifOptIn(player, false);
      } else if (player.pushToken) {
        await setNotifOptIn(player, true);
      } else {
        const granted = await requestPushPermission();
        if (granted) {
          const token = await getExpoPushToken();
          if (token) {
            await saveNotifRegistration(player, {
              pushToken: token,
              timezone: getDeviceTimezone(),
              notifLocale: getDeviceLocale(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('[Notif] settings toggle failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <CryptModal visible={visible} onClose={onClose} showCloseButton={false} maxWidth={360}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text selectable={false} className="text-bone-muted font-mono text-sm tracking-widest flex-1 mr-2" numberOfLines={1}>AUDIO</Text>
        <Pressable onPress={onClose} className="p-1">
          <Text selectable={false} className="text-bone-muted font-mono">[×]</Text>
        </Pressable>
      </View>

      <AudioSettingsSection />

      {/* Dispatches (notification) opt-in */}
      {player && (
        <View className="bg-crypt-bg border border-crypt-border mt-4">
          <Text selectable={false} className="text-bone-dark text-[10px] font-mono tracking-wider px-3 pt-3 pb-2">
            {t('notif.settings.label')}
          </Text>
          <Pressable
            className="flex-row items-center justify-between px-3 py-2 border-t border-crypt-border"
            onPress={handleToggleDispatches}
            disabled={busy}
          >
            <Text selectable={false} className="text-bone-muted text-sm font-mono flex-1 mr-2">
              {t('notif.settings.hint')}
            </Text>
            <Text selectable={false} className={`text-sm font-mono ${optedIn ? 'text-victory' : 'text-blood'}`}>
              {optedIn ? '✦ ON' : '× OFF'}
            </Text>
          </Pressable>
        </View>
      )}
    </CryptModal>
  );
}

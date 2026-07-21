// SettingsModal — general settings overlay: language, audio, notifications
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CryptModal } from './CryptModal';
import { AudioSettingsSection } from './AudioSettingsSection';
import { useCurrentPlayer, saveNotifRegistration, setNotifOptIn } from '../lib/instant';
import { requestPushPermission, getExpoPushToken, getDeviceTimezone, getDeviceLocale } from '../lib/notifications';
import { useLocale } from '../lib/LocaleContext';
import { t } from '../lib/i18n';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt-BR', label: 'Português (BR)' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh-TW', label: '繁體中文' },
];

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { player } = useCurrentPlayer();
  const [busy, setBusy] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { locale, setLocale } = useLocale();

  const optedIn = !!player?.notifOptIn;
  const activeLanguage = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const handlePickLocale = (code: string) => {
    setLocale(code);
    setLangOpen(false);
  };

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
        <Text selectable={false} className="text-bone-muted font-mono text-sm tracking-widest flex-1 mr-2" numberOfLines={1}>{t('settings.title')}</Text>
        <Pressable onPress={onClose} className="p-1">
          <Text selectable={false} className="text-bone-muted font-mono">[×]</Text>
        </Pressable>
      </View>

      {/* Language — collapsible dropdown */}
      <View className="bg-crypt-bg border border-crypt-border mb-4">
        <Text selectable={false} className="text-bone-dark text-[10px] font-mono tracking-wider px-3 pt-3 pb-2">
          {t('settings.language')}
        </Text>
        <Pressable
          onPress={() => setLangOpen((v) => !v)}
          className="flex-row items-center justify-between px-3 py-2 border-t border-crypt-border"
        >
          <Text selectable={false} className="text-amber text-sm font-mono">
            {activeLanguage.label}
          </Text>
          <Text selectable={false} className="text-bone-muted text-sm font-mono">{langOpen ? '▴' : '▾'}</Text>
        </Pressable>
        {langOpen && LANGUAGES.map(({ code, label }) => {
          const isActive = locale === code;
          return (
            <Pressable
              key={code}
              onPress={() => handlePickLocale(code)}
              className="flex-row items-center justify-between px-3 py-2 border-t border-crypt-border"
            >
              <Text selectable={false} className={`text-sm font-mono ${isActive ? 'text-amber' : 'text-bone-muted'}`}>
                {label}
              </Text>
              {isActive && <Text selectable={false} className="text-victory text-sm font-mono">✦</Text>}
            </Pressable>
          );
        })}
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

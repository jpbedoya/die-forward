import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLocale as i18nSetLocale, getLocale, subscribeLocale, resolveSupportedLocale, SUPPORTED_LOCALES } from './i18n';
import { getDeviceLocale } from './notifications';

const LOCALE_STORAGE_KEY = 'die-forward-locale';

interface LocaleContextValue {
  locale: string;
  setLocale: (l: string) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => subscribeLocale(() => setLocaleState(getLocale())), []);

  // Resolve the starting locale once on mount: use the stored preference if
  // one exists, otherwise detect from the device and persist that so future
  // launches stay stable even if the device locale changes later.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && SUPPORTED_LOCALES.includes(stored)) {
          i18nSetLocale(stored);
        } else {
          const detected = resolveSupportedLocale(getDeviceLocale());
          i18nSetLocale(detected);
          await AsyncStorage.setItem(LOCALE_STORAGE_KEY, detected);
        }
      } catch (e) {
        console.warn('[Locale] init failed, staying on default:', e);
      }
    })();
  }, []);

  const setLocale = useCallback((l: string) => {
    i18nSetLocale(l);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, l).catch((e) => console.warn('[Locale] persist failed:', e));
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

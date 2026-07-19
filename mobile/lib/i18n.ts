import en from './locales/en.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ptBR from './locales/pt-BR.json';
import zhTW from './locales/zh-TW.json';
import vi from './locales/vi.json';

type Catalog = Record<string, string>;
const catalogs: Record<string, Catalog> = { en, es, ja, ko, 'pt-BR': ptBR, 'zh-TW': zhTW, vi };
let locale = 'en';

const listeners = new Set<() => void>();

export function setLocale(l: string) {
  if (!catalogs[l] || l === locale) return;
  locale = l;
  listeners.forEach((fn) => fn());
}

export function getLocale(): string { return locale; }

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function subscribeLocale(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const SUPPORTED_LOCALES = Object.keys(catalogs);

/** Maps a BCP-47 device locale tag (e.g. from expo-localization) to one of the
 * supported catalogs, or 'en' if nothing matches. Case-insensitive. */
export function resolveSupportedLocale(tag: string): string {
  const t = (tag || '').toLowerCase();
  if (!t) return 'en';
  // Only Traditional Chinese is supported — Simplified variants must fall back
  // to 'en', not zh-TW.
  if (t.startsWith('zh')) return /hant|-tw|-hk|-mo/.test(t) ? 'zh-TW' : 'en';
  // Only the pt-BR catalog exists — both bare "pt" and pt-PT map to it.
  if (t.startsWith('pt')) return 'pt-BR';
  const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === t);
  if (exact) return exact;
  const primary = t.split('-')[0];
  return SUPPORTED_LOCALES.find((l) => l.toLowerCase().split('-')[0] === primary) ?? 'en';
}

/** Lookup with {name}-style placeholder substitution. Missing keys return the key (fail-visible). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = catalogs[locale][key] ?? catalogs.en[key];
  if (template === undefined) return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] !== undefined ? String(vars[name]) : m,
  );
}

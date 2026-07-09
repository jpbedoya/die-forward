import en from './locales/en.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ptBR from './locales/pt-BR.json';
import zhTW from './locales/zh-TW.json';

type Catalog = Record<string, string>;
const catalogs: Record<string, Catalog> = { en, es, ja, ko, 'pt-BR': ptBR, 'zh-TW': zhTW };
let locale = 'en';

export function setLocale(l: string) { if (catalogs[l]) locale = l; }

export function getLocale(): string { return locale; }

/** Lookup with {name}-style placeholder substitution. Missing keys return the key (fail-visible). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = catalogs[locale][key] ?? catalogs.en[key];
  if (template === undefined) return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] !== undefined ? String(vars[name]) : m,
  );
}

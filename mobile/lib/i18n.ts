import en from './locales/en.json';

type Catalog = Record<string, string>;
const catalogs: Record<string, Catalog> = { en };
let locale = 'en';

export function setLocale(l: string) { if (catalogs[l]) locale = l; }

/** Lookup with {name}-style placeholder substitution. Missing keys return the key (fail-visible). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = catalogs[locale][key] ?? catalogs.en[key];
  if (template === undefined) return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] !== undefined ? String(vars[name]) : m,
  );
}

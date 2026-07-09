import { loadZone } from '../zone-loader';
import { setLocale, getLocale } from '../i18n';

afterEach(() => {
  setLocale('en');
});

describe('loadZone locale selection', () => {
  it('returns localized pack when locale set, English otherwise', () => {
    setLocale('ja');
    const ja = loadZone('sunken-crypt');
    setLocale('en');
    const en = loadZone('sunken-crypt');
    expect(ja.lore).not.toEqual(en.lore);
    expect(ja.graph).toEqual(en.graph);           // structure identical (Task 2 parity)
    expect(ja.dungeonLayout).toEqual(en.dungeonLayout);
  });

  it('missing locale file falls back to English per zone', () => {
    setLocale('vi');
    expect(getLocale()).toBe('vi');

    const viVoidBeyond = loadZone('void-beyond').lore;
    setLocale('en');
    const enVoidBeyond = loadZone('void-beyond').lore;
    // vi has no void-beyond pack — falls back to English.
    expect(viVoidBeyond).toEqual(enVoidBeyond);

    setLocale('vi');
    const viSunkenCrypt = loadZone('sunken-crypt').lore;
    setLocale('en');
    const enSunkenCrypt = loadZone('sunken-crypt').lore;
    // vi has a sunken-crypt pack — should NOT fall back to English.
    expect(viSunkenCrypt).not.toEqual(enSunkenCrypt);
  });

  it('ja graph/dungeonLayout stay structurally identical to English through the loader', () => {
    setLocale('ja');
    const ja = loadZone('void-beyond');
    setLocale('en');
    const en = loadZone('void-beyond');
    expect(ja.graph).toEqual(en.graph);
    expect(ja.dungeonLayout).toEqual(en.dungeonLayout);
  });
});

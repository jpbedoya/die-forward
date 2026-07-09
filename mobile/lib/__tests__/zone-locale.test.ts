import { loadZone } from '../zone-loader';
import { setLocale } from '../i18n';

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
    const vi = loadZone('void-beyond').lore;
    setLocale('en');
    const en = loadZone('void-beyond').lore;
    expect(vi).toEqual(en);
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

import { t } from '../i18n';

describe('t()', () => {
  it('returns the catalog string for a known key with substitution', () => {
    expect(t('combat.synergy.discovered', { name: 'Ossuary Pact' })).toBe('An Ossuary Pact is struck.');
  });
  it('substitutes named placeholders', () => {
    expect(t('test.greeting', { name: 'Wanderer' })).toBe('The depths watch, Wanderer.');
  });
  it('returns the key itself when missing (fail-visible)', () => {
    expect(t('nope.missing')).toBe('nope.missing');
  });
});

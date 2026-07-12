import { normalizeForFilter, containsBlockedContent } from '../moderation';

describe('containsBlockedContent', () => {
  it('blocks a URL / domain / handle', () => {
    expect(containsBlockedContent('visit evil.xyz now')).toBe(true);
    expect(containsBlockedContent('http://x.co')).toBe(true);
    expect(containsBlockedContent('dm @scammerbot')).toBe(true);
  });

  it('blocks obfuscated profanity via normalization', () => {
    expect(containsBlockedContent('f.u.c.k')).toBe(true);
    expect(containsBlockedContent('sh1t')).toBe(true);
  });

  it('blocks cross-script homoglyph profanity (Cyrillic/Greek → Latin fold)', () => {
    // Greek upsilon (υ) + kappa (κ) spelling "fuck"
    expect(containsBlockedContent('fυcκ')).toBe(true);
  });

  it('passes clean bible-voice final words', () => {
    expect(containsBlockedContent('the water took me at last')).toBe(false);
    expect(normalizeForFilter('the water took me at last')).toBe('thewatertookmeatlast');
  });

  it('does NOT falsely block legit non-Latin (CJK/Korean) final words — i18n safety', () => {
    expect(containsBlockedContent('水が私を連れ去った')).toBe(false); // Japanese
    expect(containsBlockedContent('깊은 물이 나를 데려갔다')).toBe(false); // Korean
  });
});

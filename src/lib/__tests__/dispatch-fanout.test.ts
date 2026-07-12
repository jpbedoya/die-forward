import { selectFanoutRecipients, renderPushText, type FanoutUser } from '@/lib/dispatch-fanout';

const NOW = 1_000_000_000_000;
// fake timezone map: tz -> {hour, dayKey}
const clock = (map: Record<string, { hour: number; dayKey: string }>) =>
  (tz: string) => map[tz] ?? { hour: -1, dayKey: '' };

function user(over: Partial<FanoutUser> = {}): FanoutUser {
  return { playerId: 'p1', pushToken: 'ExpoTok[p1]', timezone: 'America/New_York', notifOptIn: true, lastDispatchDayKey: null, ...over };
}

describe('selectFanoutRecipients', () => {
  const opts = (localTimeOf: any) => ({ nowUtcMs: NOW, targetLocalHour: 8, localTimeOf });
  it('selects an opted-in user whose local hour is the target and not yet sent today', () => {
    const r = selectFanoutRecipients([user()], opts(clock({ 'America/New_York': { hour: 8, dayKey: '2026-07-11' } })));
    expect(r).toEqual([{ playerId: 'p1', pushToken: 'ExpoTok[p1]', localDayKey: '2026-07-11' }]);
  });
  it('excludes users at a non-target local hour', () => {
    const r = selectFanoutRecipients([user()], opts(clock({ 'America/New_York': { hour: 9, dayKey: '2026-07-11' } })));
    expect(r).toEqual([]);
  });
  it('excludes opted-out users and users without a token', () => {
    const tl = clock({ 'America/New_York': { hour: 8, dayKey: '2026-07-11' } });
    expect(selectFanoutRecipients([user({ notifOptIn: false })], opts(tl))).toEqual([]);
    expect(selectFanoutRecipients([user({ pushToken: null })], opts(tl))).toEqual([]);
  });
  it('dedupes: skips a user already sent today (lastDispatchDayKey === localDayKey)', () => {
    const r = selectFanoutRecipients([user({ lastDispatchDayKey: '2026-07-11' })], opts(clock({ 'America/New_York': { hour: 8, dayKey: '2026-07-11' } })));
    expect(r).toEqual([]);
  });
  it('null timezone is treated as no-match (never spammed at a wrong hour)', () => {
    const r = selectFanoutRecipients([user({ timezone: null })], opts(clock({})));
    expect(r).toEqual([]);
  });
});

describe('renderPushText', () => {
  it('leads with the apex when present', () => {
    const s = renderPushText({ apexCreatureId: 'Bog Lurker', curseNodes: ['n-3'], hasMask: true });
    expect(s).toContain('Bog Lurker');
    expect(s.length).toBeLessThanOrEqual(140);
  });
  it('falls back to a mask/quiet line when no apex', () => {
    expect(renderPushText({ apexCreatureId: null, curseNodes: [], hasMask: true }).length).toBeGreaterThan(0);
    expect(renderPushText({ apexCreatureId: null, curseNodes: [], hasMask: false }).length).toBeGreaterThan(0);
  });
});

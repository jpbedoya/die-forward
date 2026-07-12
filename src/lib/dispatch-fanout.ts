export interface FanoutUser {
  playerId: string;
  pushToken: string | null;
  timezone: string | null;
  notifOptIn: boolean;
  lastDispatchDayKey: string | null;
}
export interface FanoutRecipient { playerId: string; pushToken: string; localDayKey: string; }
export interface FanoutOptions {
  nowUtcMs: number;
  targetLocalHour: number;
  localTimeOf: (tz: string, utcMs: number) => { hour: number; dayKey: string };
}

/** Pure. Selects opted-in users whose LOCAL hour equals targetLocalHour and who
 *  have not been sent a dispatch on their local day yet (≤1/day). */
export function selectFanoutRecipients(users: FanoutUser[], opts: FanoutOptions): FanoutRecipient[] {
  const out: FanoutRecipient[] = [];
  for (const u of users) {
    if (!u.notifOptIn || !u.pushToken || !u.timezone) continue;
    const { hour, dayKey } = opts.localTimeOf(u.timezone, opts.nowUtcMs);
    if (hour !== opts.targetLocalHour) continue;
    if (!dayKey) continue;
    if (u.lastDispatchDayKey === dayKey) continue; // already sent today
    out.push({ playerId: u.playerId, pushToken: u.pushToken, localDayKey: dayKey });
  }
  return out;
}

export interface PushTextInput { apexCreatureId: string | null; curseNodes: string[]; hasMask: boolean; }

/** Concise English dispatch line for the push body (≤140 chars). Bible voice.
 *  Per-locale push is deferred (see plan); the in-app panel is fully localized. */
export function renderPushText(input: PushTextInput): string {
  if (input.apexCreatureId) return `The depths stir. Something grows fat on wanderers: the ${input.apexCreatureId}.`;
  if (input.curseNodes.length > 0) return `The depths keep their dead close. There are places below where many ended.`;
  if (input.hasMask) return `The passages are not as you left them.`;
  return `The depths are still. For now.`;
}

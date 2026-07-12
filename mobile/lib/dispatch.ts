import type { WorldShift } from './world-shift';

export type DispatchRegister = 'warning' | 'lament' | 'invitation';
export type DispatchLevel = 'banner' | 'ambient' | 'silent';
export interface DispatchLine { key: string; params?: Record<string, string | number>; }
export interface DispatchContext { diedInZoneRecently?: boolean; }
export interface Dispatch { level: DispatchLevel; register: DispatchRegister; lines: DispatchLine[]; }

const REGISTERS: DispatchRegister[] = ['warning', 'lament', 'invitation'];

/** Deterministic per-day register — stable within a day, rotates across days. No RNG. */
export function selectRegister(dayKey: string): DispatchRegister {
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return REGISTERS[h % REGISTERS.length];
}

/**
 * Pure. Turns a WorldShift (+ optional personal context) into Cartographer-voice
 * i18n line descriptors and a scarcity level. Surfaces map lines through t().
 * F7: banner only on consequential days; ambient on mild change; silent otherwise
 * (silent still yields one panel line — the home panel is always present).
 */
export function renderDispatch(shift: WorldShift, ctx: DispatchContext = {}): Dispatch {
  const register = selectRegister(shift.dayKey);
  const community = shift.community;
  const apex = community?.apexCreatureId ?? null;
  const cursed = (community?.curseNodes?.length ?? 0) > 0;
  const doorsMoved = shift.closedEdges.length + shift.sealedSideNodes.length > 0;
  const personal = !!ctx.diedInZoneRecently;

  let level: DispatchLevel;
  if (apex || personal) level = 'banner';
  else if (doorsMoved || cursed) level = 'ambient';
  else level = 'silent';

  const lines: DispatchLine[] = [{ key: `dispatch.register.${register}` }];
  if (apex) lines.push({ key: 'dispatch.apex', params: { creature: apex } });
  if (cursed) lines.push({ key: 'dispatch.cursed' });
  if (doorsMoved) lines.push({ key: 'dispatch.doors', params: { n: shift.closedEdges.length + shift.sealedSideNodes.length } });
  if (level === 'silent') lines.push({ key: 'dispatch.quiet' });

  return { level, register, lines: lines.slice(0, 3) };
}

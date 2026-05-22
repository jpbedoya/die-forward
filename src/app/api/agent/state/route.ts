import { NextRequest, NextResponse } from 'next/server';
import { init } from '@instantdb/admin';
import { getCreatureTier } from '@/lib/content';
import { getZoneMechanic } from '@/lib/zone-mechanics';
import {
  readSessionSettings,
  readSessionModifier,
  readSessionZoneStatus,
  statusSummary,
  buildCombatOptions,
} from '@/lib/agent-combat';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_KEY!,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get session
    const { sessions } = await db.query({
      sessions: {
        $: { where: { id: sessionId }, limit: 1 },
      },
    });

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessions[0] as any;
    const dungeon = JSON.parse(session.dungeon || '[]');
    const inventory = JSON.parse(session.inventory || '[]') as { name: string }[];
    const room = dungeon[session.currentRoom - 1];

    const zoneId: string = session.zoneId || 'sunken-crypt';
    const mechanic = getZoneMechanic(zoneId);
    const settings = readSessionSettings(session);
    const modifier = readSessionModifier(session);
    const zoneStatus = readSessionZoneStatus(session);

    // Determine phase
    let phase = 'explore';
    if (session.status === 'dead' || session.status === 'dying') phase = 'death';
    else if (session.status === 'victory') phase = 'victory';
    else if (room?.type === 'combat' && session.enemyHealth > 0) phase = 'combat';

    const state: any = {
      phase,
      room: session.currentRoom,
      totalRooms: session.totalRooms,
      health: session.health,
      maxHealth: session.maxHealth,
      stamina: session.stamina,
      inventory: inventory.map(i => i.name),
      narrative: room?.content?.narrative || '',
      status: statusSummary(zoneStatus),
      modifier: modifier
        ? { id: modifier.id, name: modifier.name, emoji: modifier.emoji, description: modifier.description }
        : null,
      sessionStatus: session.status,
    };

    // Add options based on phase
    if (phase === 'combat') {
      state.options = buildCombatOptions(inventory, settings, modifier, mechanic, zoneStatus);
      const enemyName: string = room?.enemy?.name || 'Unknown Horror';
      state.enemy = {
        name: enemyName,
        health: session.enemyHealth,
        maxHealth: room?.enemy?.maxHealth || 100,
        intent: session.enemyIntent || 'AGGRESSIVE',
        tier: getCreatureTier(enemyName, zoneId),
        wasCharging: session.wasCharging || false,
      };
    } else if (phase === 'explore') {
      state.options = room?.content?.options?.map((opt: string, i: number) => ({
        id: String(i + 1),
        text: opt,
      })) || [{ id: '1', text: 'Continue' }];
    } else if (phase === 'death') {
      state.options = [{ id: 'submit_death', text: 'Leave your final words' }];
    }

    return NextResponse.json({ state });

  } catch (error) {
    console.error('Agent state error:', error);
    return NextResponse.json({ error: 'Failed to get state' }, { status: 500 });
  }
}

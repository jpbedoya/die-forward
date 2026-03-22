import { NextResponse } from 'next/server';
import { tx } from '@instantdb/admin';
import { db } from '@/lib/db';
import { Connection, PublicKey } from '@solana/web3.js';
import { BorshAccountsCoder } from '@coral-xyz/anchor';
import RunRecordIdl from '@/idl/run_record.json';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function statusKey(status: any): number {
  if (typeof status === 'number') return status;
  if (status?.active !== undefined) return 0;
  if (status?.dead !== undefined) return 1;
  if (status?.cleared !== undefined) return 2;
  return 0;
}

export async function POST() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const coder = new BorshAccountsCoder(RunRecordIdl as never);
    const now = Date.now();

    const { sessions } = await db.query({
      sessions: {
        $: {
          where: { status: 'active' },
        },
      },
    });

    const active = (sessions || []) as Record<string, any>[];
    const withEr = active.filter((s) => typeof s.erRunId === 'string' && s.erRunId.length > 20);

    let checked = 0;
    let updatedDead = 0;
    let updatedCompleted = 0;
    const ops: any[] = [];

    for (const s of withEr) {
      checked += 1;
      try {
        const pda = new PublicKey(s.erRunId as string);
        const info = await connection.getAccountInfo(pda, 'confirmed');
        if (!info?.data) continue;

        const decoded = coder.decode('RunRecord', info.data as Buffer) as Record<string, any>;
        const k = statusKey(decoded.status);

        if (k === 1) {
          ops.push(tx.sessions[s.id].update({
            status: 'dead',
            endedAt: s.endedAt || now,
            finalRoom: s.finalRoom || s.currentRoom || 1,
          }));
          updatedDead += 1;
        } else if (k === 2) {
          const stakeAmount = Number(s.stakeAmount || 0);
          const bonus = stakeAmount * 0.5;
          const reward = stakeAmount + bonus;
          const freeMode = s.demoMode || stakeAmount === 0;
          ops.push(tx.sessions[s.id].update({
            status: 'completed',
            endedAt: s.endedAt || now,
            reward: freeMode ? 0 : reward,
            payoutStatus: s.payoutStatus || (freeMode ? 'free_mode' : 'abandoned_pending_claim'),
            finalRoom: s.finalRoom || s.currentRoom || s.maxRooms || 7,
          }));
          updatedCompleted += 1;
        }
      } catch {
        // skip bad/missing accounts
      }
    }

    if (ops.length > 0) {
      await db.transact(ops);
    }

    return NextResponse.json({
      success: true,
      activeSessions: active.length,
      checkedWithErRunId: checked,
      updatedDead,
      updatedCompleted,
      totalUpdated: ops.length,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[backfill-status] failed:', error);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Verify a specific run PDA on L1 and check visibility on /onchain-runs page.
 *
 * Usage:
 *   npx tsx scripts/verify-onchain-run.ts --pda <PDA>
 *   npx tsx scripts/verify-onchain-run.ts --pda <PDA> --session <sessionId>
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { BorshAccountsCoder } from '@coral-xyz/anchor';
import RunRecordIdl from '../src/idl/run_record.json';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const RUNS_URL = process.env.ONCHAIN_RUNS_URL || 'https://dieforward.com/onchain-runs';

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function statusLabel(status: any): string {
  if (status?.active !== undefined || status?.Active !== undefined) return 'active';
  if (status?.dead !== undefined || status?.Dead !== undefined) return 'dead';
  if (status?.cleared !== undefined || status?.Cleared !== undefined) return 'cleared';
  return JSON.stringify(status);
}

async function main() {
  const pdaArg = getArg('--pda');
  const sessionArg = getArg('--session');
  if (!pdaArg) {
    throw new Error('Missing --pda <PDA>');
  }

  const pda = new PublicKey(pdaArg);
  const connection = new Connection(RPC_URL, 'confirmed');
  const coder = new BorshAccountsCoder(RunRecordIdl as never);

  console.log('=== Verify On-Chain Run ===');
  console.log('PDA:', pda.toBase58());
  console.log('RPC:', RPC_URL);

  const ai = await connection.getAccountInfo(pda);
  if (!ai) {
    console.log('L1 account: NOT FOUND');
    process.exit(1);
  }

  console.log('L1 owner:', ai.owner.toBase58());
  const decoded: any = coder.decode('RunRecord', ai.data);

  const row = {
    player: decoded.player?.toBase58?.() ?? decoded.player,
    sessionId: Buffer.from(decoded.session_id ?? decoded.sessionId).toString('utf8').replace(/\0/g, ''),
    room: Number(decoded.current_room ?? decoded.currentRoom),
    events: Number(decoded.event_count ?? decoded.eventCount),
    status: statusLabel(decoded.status),
    stakeLamports: Number(decoded.stake_amount ?? decoded.stakeAmount),
  };

  console.log('L1 decoded:', row);

  // Basic visibility check on public page
  const res = await fetch(RUNS_URL);
  const html = await res.text();

  const pdaVisible = html.includes(pda.toBase58());
  const sessionVisible = sessionArg ? html.includes(sessionArg) : html.includes(row.sessionId);

  console.log('Page URL:', RUNS_URL);
  console.log('Visible on page (PDA):', pdaVisible ? 'yes' : 'no');
  console.log('Visible on page (session):', sessionVisible ? 'yes' : 'no');

  console.log('\nTip: if not visible yet, wait 30-120s and retry (RPC/index cache).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

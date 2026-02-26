import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk';
import bs58 from 'bs58';
import RunRecordIdl from '../src/idl/run_record.json';

const ER_ENDPOINT = process.env.MAGICBLOCK_ER_ENDPOINT || 'https://devnet-us.magicblock.app';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

function authority() {
  const sk = process.env.SOLANA_AUTHORITY_SECRET_KEY;
  if (!sk) throw new Error('missing key');
  return Keypair.fromSecretKey(bs58.decode(sk));
}

async function main() {
  const a = authority();
  const erConn = new ConnectionMagicRouter(ER_ENDPOINT);
  const wallet = {
    publicKey: a.publicKey,
    signTransaction: async <T extends Transaction>(tx: T) => { tx.partialSign(a); return tx; },
    signAllTransactions: async <T extends Transaction>(txs: T[]) => { txs.forEach(t=>t.partialSign(a)); return txs; },
  };
  const provider = new AnchorProvider(erConn as unknown as Connection, wallet as never, { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(RunRecordIdl as never, provider) as any;

  const pda = new PublicKey(process.argv[2]);
  if (!pda) throw new Error('usage: pda arg');

  console.log('Trying commitRun via Anchor on ER for', pda.toBase58());
  try {
    const sig = await program.methods
      .commitRun({ dead: {} })
      .accounts({ runRecord: pda, authority: a.publicKey })
      .signers([a])
      .rpc({ skipPreflight: true });
    console.log('commitRun sig:', sig);
  } catch (e) {
    console.error('commitRun failed:', e);
  }

  const l1 = new Connection(RPC_URL, 'confirmed');
  const acc = await l1.getAccountInfo(pda);
  console.log('L1 owner:', acc?.owner?.toBase58());
}

main().catch(console.error);

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  Transaction, 
  SystemProgram 
} from '@solana/web3.js';
import { resetGameState, getGameState, saveGameState } from '@/lib/gameState';
import { usePoolStats } from '@/lib/instant';

const stakeOptions = [
  { amount: 0.01, label: 'Timid', desc: 'Dip your toes' },
  { amount: 0.05, label: 'Bold', desc: 'Standard fare' },
  { amount: 0.1, label: 'Reckless', desc: 'Fortune favors...' },
  { amount: 0.25, label: 'Degenerate', desc: 'All or nothing' },
];

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Pool wallet address
const POOL_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_POOL_WALLET || 'D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL'
);

export default function StakeScreen() {
  const router = useRouter();
  const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real pool stats from InstantDB
  const { totalDeaths, totalStaked, isLoading: statsLoading } = usePoolStats();

  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  // Fetch balance
  useEffect(() => {
    if (publicKey && connection) {
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / LAMPORTS_PER_SOL);
      }).catch(console.error);
    }
  }, [publicKey, connection]);

  const handleEnter = async () => {
    if (!selectedStake || !publicKey) return;
    
    // Need either signTransaction or sendTransaction
    if (!signTransaction && !sendTransaction) {
      setError('Wallet does not support transactions');
      return;
    }
    
    // Check balance (need extra for fees)
    if (balance !== null && selectedStake + 0.001 > balance) {
      setError('Insufficient balance (need extra for fees)');
      return;
    }

    setConfirming(true);
    setError(null);
    
    let signature: string;
    
    try {
      setError('Creating transaction...');
      
      // 1. Create transaction to transfer SOL to pool
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: POOL_WALLET,
          lamports: Math.floor(selectedStake * LAMPORTS_PER_SOL),
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      setError(`Wallet caps: send=${!!sendTransaction}, sign=${!!signTransaction}`);

      // 2. Try sendTransaction first (works better with Mobile Wallet Adapter)
      if (sendTransaction) {
        try {
          setError('Requesting signature via sendTransaction...');
          signature = await sendTransaction(transaction, connection);
          setError(`Got signature: ${signature.slice(0, 20)}...`);
        } catch (sendErr: unknown) {
          const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
          setError(`sendTransaction failed: ${errMsg.slice(0, 100)}`);
          
          // Fall back to sign + send raw if sendTransaction fails
          if (signTransaction) {
            setError('Trying signTransaction fallback...');
            const signedTx = await signTransaction(transaction);
            setError('Got signed tx, sending raw...');
            signature = await connection.sendRawTransaction(signedTx.serialize());
          } else {
            throw sendErr;
          }
        }
      } else if (signTransaction) {
        // Fallback: sign then send raw
        setError('Using signTransaction...');
        const signedTx = await signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      } else {
        throw new Error('No signing method available');
      }
      
      setError('Waiting for confirmation...');
      
      // 3. Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');
      
      setError(null); // Clear debug messages on success

      // 4. Start game session via API (with tx signature as proof)
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          stakeAmount: selectedStake,
          txSignature: signature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start session');
      }

      const { sessionToken } = await response.json();
      
      // 5. Initialize game state with session token
      resetGameState(selectedStake);
      const state = getGameState();
      saveGameState({
        ...state,
        sessionToken,
        walletAddress: publicKey.toBase58(),
      });
      
      // 6. Navigate to game
      router.push('/play');
    } catch (err) {
      console.error('Failed to start game:', err);
      setError(err instanceof Error ? err.message : 'Failed to start game. Please try again.');
      setConfirming(false);
    }
  };

  // Loading state while checking connection
  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--amber)] animate-pulse">◈ Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      {/* Header */}
      <header className="border-b border-[var(--border-dim)] px-4 py-3">
        <Link href="/" className="text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)]">
          ← Back
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Zone preview */}
        <div className="text-center mb-8">
          <pre className="text-[var(--amber)] text-[10px] leading-tight mb-2" style={{ fontFamily: 'Courier New, Courier, monospace' }}>
{`    _____
   /     \\
  / ENTER \\
 /   THE   \\
/___________\\`}
          </pre>
          <h1 className="text-[var(--amber-bright)] text-xl tracking-wider mb-1">THE SUNKEN CRYPT</h1>
          <p className="text-[var(--text-muted)] text-xs">5-7 rooms • Water-themed horrors</p>
        </div>

        {/* Pool stats */}
        <div className="flex gap-6 text-xs text-[var(--text-muted)] mb-8">
          <div className="text-center">
            <div className="text-[var(--amber-bright)] text-lg">
              {statsLoading ? '...' : totalStaked.toFixed(2)}
            </div>
            <div>SOL in pool</div>
          </div>
          <div className="text-center">
            <div className="text-[var(--red-bright)] text-lg">
              {statsLoading ? '...' : totalDeaths}
            </div>
            <div>deaths</div>
          </div>
          <div className="text-center">
            <div className="text-[var(--green-bright)] text-lg">
              {statsLoading || totalDeaths === 0 ? '--' : (Number(totalStaked) / Math.max(Number(totalDeaths), 1) * 1.5).toFixed(2)}
            </div>
            <div>avg reward</div>
          </div>
        </div>

        {/* Stake selection */}
        <div className="w-full max-w-xs mb-6">
          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-3">
            Choose Your Stake
          </div>
          <div className="space-y-2">
            {stakeOptions.map((option) => {
              const canAfford = balance !== null && option.amount <= balance;
              return (
                <button
                  key={option.amount}
                  onClick={() => canAfford && setSelectedStake(option.amount)}
                  disabled={!canAfford}
                  className={`w-full text-left px-4 py-3 transition-all ${
                    selectedStake === option.amount
                      ? 'bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)]'
                      : canAfford
                      ? 'bg-[var(--bg-surface)] border border-[var(--border-dim)] text-[var(--text-secondary)]'
                      : 'bg-[var(--bg-base)] border border-[var(--border-dim)] text-[var(--text-dim)] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[var(--amber)]">◎</span>
                      <span className="ml-2 font-bold">{option.amount} SOL</span>
                      {!canAfford && <span className="text-[var(--red)] text-[10px] ml-2">(insufficient)</span>}
                    </div>
                    <span className={selectedStake === option.amount ? 'text-[var(--amber)]' : 'text-[var(--text-muted)]'}>
                      {option.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">{option.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-[var(--red-bright)] text-xs mb-4 px-4 py-2 border border-[var(--red-dim)] bg-[var(--red-dim)]/20">
            {error}
          </div>
        )}

        {/* Enter button */}
        <button
          onClick={handleEnter}
          disabled={!selectedStake || confirming}
          className="w-full max-w-xs px-6 py-4 bg-[var(--amber-dim)]/30 border border-[var(--amber)] text-[var(--amber-bright)] hover:bg-[var(--amber-dim)]/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {confirming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-pulse">◈</span>
              Confirming transaction...
            </span>
          ) : selectedStake ? (
            <span>▶ Stake {selectedStake} SOL & Enter</span>
          ) : (
            <span>Select a stake amount</span>
          )}
        </button>

        {/* Warning */}
        <p className="text-[var(--text-dim)] text-[10px] text-center mt-4 max-w-xs">
          Your stake will be added to the Memorial Pool if you die. 
          Clear the crypt to claim a share of the pool.
        </p>

      </main>

      {/* Wallet display */}
      <footer className="border-t border-[var(--border-dim)] px-4 py-3 text-center">
        <div className="text-xs text-[var(--text-muted)]">
          Connected: <span className="text-[var(--text-secondary)]">{shortenAddress(publicKey.toBase58())}</span>
          <span className="text-[var(--text-dim)] mx-2">•</span>
          Balance: <span className="text-[var(--amber)]">{balance !== null ? `${balance.toFixed(4)} SOL` : '...'}</span>
        </div>
      </footer>

    </div>
  );
}

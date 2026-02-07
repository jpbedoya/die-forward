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
import { signAndSendWithMWA } from '@/lib/mobileWallet';
import { resetGameState, getGameState, saveGameState, DungeonRoomState } from '@/lib/gameState';
import { generateRandomDungeon } from '@/lib/content';
import { usePoolStats } from '@/lib/instant';
import { useAudio } from '@/lib/audio';

const stakeOptions = [
  { amount: 0.01, label: 'Timid' },
  { amount: 0.05, label: 'Bold' },
  { amount: 0.1, label: 'Reckless' },
  { amount: 0.25, label: 'Degenerate' },
];

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Pool wallet address
const POOL_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_POOL_WALLET || 'D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL'
);

// Demo mode - bypass SOL staking for testing
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function StakeScreen() {
  const router = useRouter();
  const { publicKey, connected, signTransaction, sendTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load nickname from localStorage (set on title screen)
  useEffect(() => {
    const saved = localStorage.getItem('die-forward-nickname');
    if (saved) setNickname(saved);
  }, []);
  
  // Audio - continue title ambient on stake screen
  const { enabled: audioEnabled, toggle: toggleAudio, playAmbient, playSFX } = useAudio();
  
  useEffect(() => {
    playAmbient('ambient-title');
  }, [playAmbient]);
  
  // Debug logging - set to false for production
  const DEBUG = false;
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const log = (msg: string) => {
    if (DEBUG) setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(`[stake] ${msg}`);
  };
  
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
    
    // In demo mode, skip wallet validation
    if (!DEMO_MODE) {
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
    }

    setConfirming(true);
    setError(null);
    
    let signature: string = 'demo-mode-no-tx';
    
    setDebugLog([]); // Clear previous logs
    
    try {
      // DEMO MODE: Skip actual SOL transfer
      if (DEMO_MODE) {
        log('🎮 DEMO MODE - skipping SOL transfer');
        signature = `demo-${Date.now()}`;
      } else {
        log('Creating transaction...');
        
        // 1. Create transaction to transfer SOL to pool
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: POOL_WALLET,
            lamports: Math.floor(selectedStake * LAMPORTS_PER_SOL),
          })
        );

        log('Getting blockhash...');
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        log(`Wallet caps: send=${!!sendTransaction}, sign=${!!signTransaction}`);
        const walletName = wallet?.adapter?.name || 'unknown';
        log(`Wallet name: ${walletName}`);
        log(`Wallet readyState: ${wallet?.adapter?.readyState || 'unknown'}`);

        // 2. Check if using Mobile Wallet Adapter - use native MWA protocol
        if (walletName === 'Mobile Wallet Adapter') {
          log('Detected MWA - using native protocol...');
          try {
            signature = await signAndSendWithMWA(transaction, connection, log);
          } catch (mwaErr: unknown) {
            const errMsg = mwaErr instanceof Error ? mwaErr.message : String(mwaErr);
            log(`MWA FAILED: ${errMsg}`);
            throw mwaErr;
          }
        }
        // Standard wallet adapter flow for desktop/in-app browsers
        else if (sendTransaction) {
          try {
            log('Calling sendTransaction...');
            signature = await sendTransaction(transaction, connection);
            log(`Got signature: ${signature.slice(0, 20)}...`);
          } catch (sendErr: unknown) {
            const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
            log(`sendTransaction FAILED: ${errMsg.slice(0, 150)}`);
            
            // Fall back to sign + send raw if sendTransaction fails
            if (signTransaction) {
              log('Trying signTransaction fallback...');
              const signedTx = await signTransaction(transaction);
              
              // Check if transaction was actually signed
              const sigCount = signedTx.signatures.filter(s => s.signature !== null).length;
              log(`Signatures on tx: ${sigCount}/${signedTx.signatures.length}`);
              
              if (sigCount === 0) {
                throw new Error('Transaction was not signed by wallet');
              }
              
              log('Got signed tx, sending raw...');
              signature = await connection.sendRawTransaction(signedTx.serialize());
              log(`Raw tx sent: ${signature.slice(0, 20)}...`);
            } else {
              throw sendErr;
            }
          }
        } else if (signTransaction) {
          log('Using signTransaction (no sendTransaction)...');
          const signedTx = await signTransaction(transaction);
          log('Signed, sending raw...');
          signature = await connection.sendRawTransaction(signedTx.serialize());
        } else {
          throw new Error('No signing method available');
        }
        
        log('Waiting for confirmation...');
        
        // 3. Wait for confirmation
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');
        
        log('✓ Confirmed!');
      }

      // 4. Start game session via API (with tx signature as proof)
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          stakeAmount: selectedStake,
          txSignature: signature,
          demoMode: DEMO_MODE,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start session');
      }

      const { sessionToken } = await response.json();
      
      // 5. Generate dungeon and initialize game state
      const dungeonLayout = generateRandomDungeon();
      const dungeonState: DungeonRoomState[] = dungeonLayout.map(room => ({
        type: room.type,
        template: room.template,
        narrative: room.content.narrative,
        enemy: room.content.enemy,
      }));
      
      resetGameState(selectedStake, dungeonState);
      const state = getGameState();
      // Use nickname if set, otherwise use shortened wallet address
      const playerName = nickname.trim() || shortenAddress(publicKey.toBase58());
      saveGameState({
        ...state,
        sessionToken,
        walletAddress: publicKey.toBase58(),
        nickname: playerName,
      });
      
      // 6. Navigate to game
      router.push('/play');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log(`ERROR: ${errMsg}`);
      setError(errMsg.slice(0, 200));
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
      <header className="border-b border-[var(--border-dim)] px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)]">
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          {DEMO_MODE && (
            <span className="text-[10px] px-2 py-0.5 bg-[var(--amber-dim)]/30 border border-[var(--amber-dim)] text-[var(--amber)] tracking-wider">
              DEMO
            </span>
          )}
          <button
            onClick={toggleAudio}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--amber)] transition-colors"
            title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Zone preview */}
        <div className="text-center mb-6">
          <div className="text-[var(--text-muted)] text-xs tracking-widest mb-1 flex items-center justify-center gap-2">
            <span className="text-[var(--amber-dim)]">═══╣</span>
            <span>ENTER</span>
            <span className="text-[var(--amber-dim)]">╠═══</span>
          </div>
          <h1 className="text-[var(--amber-bright)] text-xl tracking-wider mb-1">THE SUNKEN CRYPT</h1>
          <p className="text-[var(--text-muted)] text-xs">5-7 rooms • Water-themed horrors</p>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-xs text-[var(--text-muted)] mb-6">
          <div className="text-center">
            <div className="text-[var(--green-bright)] text-lg">
              {selectedStake ? (selectedStake * 1.5).toFixed(3) : '--'}
            </div>
            <div>potential win</div>
          </div>
          <div className="text-center">
            <div className="text-[var(--red-bright)] text-lg">
              {statsLoading ? '...' : totalDeaths}
            </div>
            <div>deaths</div>
          </div>
          <div className="text-center">
            <div className="text-[var(--amber-bright)] text-lg">
              {selectedStake ? `${((1.5 - 1) * 100).toFixed(0)}%` : '--'}
            </div>
            <div>bonus</div>
          </div>
        </div>

        {/* Stake selection */}
        <div className="w-full max-w-xs mb-4">
          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-2">
            Choose Your Stake
          </div>
          <div className="space-y-2">
            {stakeOptions.map((option) => {
              const canAfford = balance !== null && option.amount <= balance;
              return (
                <button
                  key={option.amount}
                  onClick={() => {
                    if (canAfford) {
                      playSFX('ui-click');
                      setSelectedStake(option.amount);
                    }
                  }}
                  disabled={!canAfford}
                  className={`w-full text-left px-4 py-2.5 transition-all ${
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Debug log - only shown when DEBUG=true */}
        {DEBUG && debugLog.length > 0 && (
          <div className="w-full max-w-xs mb-4 px-3 py-2 border border-[var(--border-dim)] bg-[var(--bg-surface)] text-[10px] font-mono max-h-40 overflow-y-auto">
            {debugLog.map((msg, i) => (
              <div key={i} className={msg.includes('ERROR') || msg.includes('FAILED') ? 'text-[var(--red-bright)]' : 'text-[var(--text-muted)]'}>
                {msg}
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="w-full max-w-xs text-[var(--red-bright)] text-xs mb-4 px-4 py-2 border border-[var(--red-dim)] bg-[var(--red-dim)]/20">
            {error}
          </div>
        )}

        {/* Enter button */}
        <button
          onClick={() => {
            playSFX('ui-hover');
            handleEnter();
          }}
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

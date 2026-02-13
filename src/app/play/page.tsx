'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getGameState, saveGameState, DungeonRoomState } from '@/lib/gameState';
import { useCorpseForRoom, discoverCorpse, recordTip, Corpse } from '@/lib/instant';
import { getExploreRoom, getCombatRoom, getCacheRoom, getExitRoom, getDepthForRoom } from '@/lib/content';
import { useAudio } from '@/lib/audio';
import GameFrame from '@/components/GameFrame';

// Tip amount in SOL
const TIP_AMOUNT = 0.001;

// Demo mode flag
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Menu overlay component
function Menu({ 
  isOpen, 
  onClose,
  walletAddress,
  audioEnabled,
  onToggleAudio,
  stakeAmount,
}: { 
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  stakeAmount: number;
}) {
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={() => {
          setConfirmingAbandon(false);
          onClose();
        }}
      />
      <div className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] w-[90%] max-w-xs p-4">
        <div className="text-[var(--amber)] text-xs mb-4 flex items-center justify-between">
          <span className="tracking-wider">◈ DIE FORWARD</span>
          <button 
            onClick={() => {
              setConfirmingAbandon(false);
              onClose();
            }} 
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            [X]
          </button>
        </div>
        <div className="mb-4 text-xs">
          <div className="text-[var(--text-muted)] mb-1">CONNECTED</div>
          <div className="text-[var(--text-secondary)] font-mono truncate">
            {walletAddress}
          </div>
        </div>
        <button 
          onClick={onToggleAudio}
          className="w-full text-left px-3 py-2 text-sm bg-[var(--bg-base)] border border-[var(--border-dim)] mb-2 flex items-center justify-between"
        >
          <span className="text-[var(--text-secondary)]">Audio</span>
          <span className={audioEnabled ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
            {audioEnabled ? '♪ ON' : '♪ OFF'}
          </span>
        </button>
        
        {!confirmingAbandon ? (
          <button 
            onClick={() => setConfirmingAbandon(true)}
            className="w-full text-left px-3 py-2 text-sm bg-[var(--bg-base)] border border-[var(--red-dim)] text-[var(--red-bright)] hover:bg-[var(--red-dim)]/20"
          >
            ☠ Abandon Run
          </button>
        ) : (
          <div className="border border-[var(--red-dim)] bg-[var(--red-dim)]/10 p-3">
            <p className="text-[var(--text-secondary)] text-xs mb-3">
              Abandon run? Your {stakeAmount} SOL stake will be lost.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingAbandon(false)}
                className="flex-1 px-3 py-2 text-xs bg-[var(--bg-base)] border border-[var(--border-dim)] text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-3 py-2 text-xs bg-[var(--red-dim)]/30 border border-[var(--red)] text-[var(--red-bright)]"
              >
                Abandon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type RoomType = 'explore' | 'combat' | 'corpse' | 'cache' | 'exit';

interface RoomOption {
  id: string;
  text: string;
  action: string;
}

interface Room {
  type: RoomType;
  narrative: string;
  options: RoomOption[];
  corpse?: { player: string; message: string; loot: string };
  enemy?: string;
}

// Generate options based on room type
function getOptionsForRoom(type: RoomType): RoomOption[] {
  switch (type) {
    case 'explore':
      return [
        { id: '1', text: 'Press forward', action: 'next' },
        { id: '2', text: 'Proceed carefully', action: 'next' },
      ];
    case 'combat':
      return [
        { id: '1', text: 'Ready your weapon', action: 'combat' },
        { id: '2', text: 'Try to flee', action: 'flee' },
      ];
    case 'corpse':
      return [
        { id: '1', text: 'Search the corpse', action: 'loot' },
        { id: '2', text: 'Pay respects and move on', action: 'next' },
      ];
    case 'cache':
      return [
        { id: '1', text: 'Take the supplies', action: 'heal' },
        { id: '2', text: 'Continue deeper', action: 'next' },
      ];
    case 'exit':
      return [
        { id: '1', text: 'Ascend to victory', action: 'victory' },
      ];
    default:
      return [{ id: '1', text: 'Continue', action: 'next' }];
  }
}

// Convert dungeon state to Room format
function dungeonToRooms(dungeon: DungeonRoomState[] | null): Room[] {
  if (!dungeon || dungeon.length === 0) {
    // Fallback to a simple dungeon if none exists
    return [
      { type: 'explore', narrative: 'You descend into darkness. The air grows cold.', options: getOptionsForRoom('explore') },
      { type: 'combat', narrative: 'Something stirs ahead. Prepare yourself.', options: getOptionsForRoom('combat'), enemy: 'The Drowned' },
      { type: 'cache', narrative: 'A moment of respite. Supplies rest on a shelf.', options: getOptionsForRoom('cache') },
      { type: 'combat', narrative: 'Another creature blocks your path.', options: getOptionsForRoom('combat'), enemy: 'Pale Crawler' },
      { type: 'exit', narrative: 'Light breaks through. The exit awaits.', options: getOptionsForRoom('exit') },
    ];
  }
  
  return dungeon.map(room => ({
    type: room.type,
    narrative: room.narrative,
    options: getOptionsForRoom(room.type),
    enemy: room.enemy,
  }));
}

const mockWallet = "8xH4...k9Qz";

// Format timestamp as relative time
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function HealthBar({ current, max }: { current: number; max: number }) {
  const filled = Math.round((current / max) * 8);
  const empty = 8 - filled;
  return (
    <span className="font-mono tracking-tighter">
      <span className="text-[var(--red)]">{'█'.repeat(filled)}</span>
      <span className="text-[var(--red-dim)]">{'█'.repeat(empty)}</span>
    </span>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  return (
    <span className="font-mono">
      <span className="text-[var(--blue-bright)]">{'◆'.repeat(current)}</span>
      <span className="text-[var(--blue-dim)]">{'◇'.repeat(max - current)}</span>
    </span>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const filled = Math.round((current / total) * 12);
  const empty = 12 - filled;
  return (
    <span className="font-mono text-xs">
      <span className="text-[var(--amber)]">{'▓'.repeat(filled)}</span>
      <span className="text-[var(--text-muted)]">{'░'.repeat(empty)}</span>
    </span>
  );
}

export default function GameScreen() {
  const router = useRouter();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [currentRoom, setCurrentRoom] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { enabled: audioEnabled, toggle: toggleAudio, playAmbient, playSFX } = useAudio();
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(3);
  const [stakeAmount, setStakeAmount] = useState(0.05);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [inventory, setInventory] = useState([
    { id: '1', name: 'Torch', emoji: '🔦' },
    { id: '2', name: 'Herbs', emoji: '🌿' },
  ]);
  const [showCorpse, setShowCorpse] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tipping, setTipping] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [lootedCorpse, setLootedCorpse] = useState<Corpse | null>(null);

  // Fetch real corpses from DB for the current room
  const { corpses: realCorpses } = useCorpseForRoom('THE SUNKEN CRYPT', currentRoom + 1);
  const realCorpse = realCorpses[0] as Corpse | undefined; // Get first undiscovered corpse

  // Handle tipping a corpse (uses lootedCorpse since card is showing)
  const handleTip = async () => {
    if (!lootedCorpse || !publicKey || !lootedCorpse.walletAddress || tipping || tipped) return;
    
    // Don't tip yourself
    if (lootedCorpse.walletAddress === publicKey.toBase58()) {
      setMessage("You can't tip yourself!");
      return;
    }
    
    setTipping(true);
    try {
      const recipientPubkey = new PublicKey(lootedCorpse.walletAddress);
      const lamports = TIP_AMOUNT * LAMPORTS_PER_SOL;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Record tip in DB
      await recordTip(lootedCorpse.id, TIP_AMOUNT, publicKey.toBase58());
      
      setTipped(true);
      playSFX('tip-chime');
      setMessage(`Sent ${TIP_AMOUNT} SOL to @${lootedCorpse.playerName}. They'll appreciate it from beyond.`);
    } catch (err) {
      console.error('Tip failed:', err);
      setMessage('Tip failed. Try again?');
    } finally {
      setTipping(false);
    }
  };

  // Play exploration ambient on mount
  useEffect(() => {
    playAmbient('ambient-explore');
  }, [playAmbient]);

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    setCurrentRoom(state.currentRoom);
    setHealth(state.health);
    setStamina(state.stamina);
    setInventory(state.inventory);
    setStakeAmount(state.stakeAmount);
    setWalletAddress(state.walletAddress);
    setSessionToken(state.sessionToken);
    // Convert dungeon to rooms
    const dungeonRooms = dungeonToRooms(state.dungeon);
    setRooms(dungeonRooms);
    setLoaded(true);
  }, []);

  // Save state when it changes
  useEffect(() => {
    if (loaded) {
      saveGameState({ currentRoom, health, stamina, inventory });
    }
  }, [currentRoom, health, stamina, inventory, loaded]);

  const room = rooms.length > 0 ? (rooms[currentRoom] || rooms[rooms.length - 1]) : null;

  // Advance room via server API (anti-cheat)
  const advanceRoom = async (): Promise<boolean> => {
    // Skip server sync in demo mode or if no session token
    if (DEMO_MODE || !sessionToken) {
      console.warn('Demo mode or no session token, skipping server advance');
      return true; // Allow offline/test play
    }
    
    setAdvancing(true);
    try {
      const response = await fetch('/api/session/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          fromRoom: currentRoom + 1, // Server uses 1-indexed
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to advance:', data);
        // Show more specific error in demo for debugging
        const errorDetail = data.error || 'Unknown error';
        const roomInfo = data.expected ? ` (expected room ${data.expected}, got ${data.received})` : '';
        setMessage(`Server sync failed: ${errorDetail}${roomInfo}`);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Advance API error:', err);
      setMessage('Connection error. Please try again.');
      return false;
    } finally {
      setAdvancing(false);
    }
  };

  // Show loading until state is loaded
  if (!loaded || !room) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--amber)] animate-pulse">◈ Loading...</div>
      </div>
    );
  }

  const handleAction = async (action: string) => {
    setMessage(null);
    
    switch (action) {
      case 'next':
        if (currentRoom < rooms.length - 1) {
          const ok = await advanceRoom();
          if (!ok) return;
          
          // Play contextual sound based on room transition
          const nextRoomNum = currentRoom + 2; // Next room (1-indexed)
          
          // Play depth transition sound at depth boundaries (rooms 5 and 9)
          if (nextRoomNum === 5 || nextRoomNum === 9) {
            playSFX('depth-descend');
          } else if (nextRoomNum >= 5 && nextRoomNum <= 8 && Math.random() < 0.3) {
            // 30% chance for water splash in Flooded Halls depth
            playSFX('water-splash');
          } else {
            playSFX('footstep');
          }
          
          setCurrentRoom(currentRoom + 1);
          setSelectedOption(null);
          setShowCorpse(false);
          setTipped(false); // Reset tip state for next corpse
          setLootedCorpse(null); // Clear looted corpse data
          setStamina(Math.min(3, stamina + 1)); // Regen stamina between rooms
        }
        break;
      case 'combat':
        playAmbient('ambient-combat');
        router.push('/combat');
        break;
      case 'flee': {
        // Take some damage but skip combat
        const fleeDamage = 15;
        const newHealth = health - fleeDamage;
        playSFX('damage-taken');
        setMessage(`You take a hit while fleeing! -${fleeDamage} HP`);
        
        if (newHealth <= 0) {
          // Die - navigate immediately without state update to avoid re-render issues
          setHealth(0);
          router.push('/death');
          return; // Exit early to prevent further processing
        }
        
        // Survived - update health and advance
        setHealth(newHealth);
        const ok = await advanceRoom();
        if (!ok) return;
        setCurrentRoom(currentRoom + 1);
        setSelectedOption(null);
        break;
      }
      case 'loot':
        // Store corpse data BEFORE marking as discovered (so card can render)
        if (realCorpse) {
          setLootedCorpse(realCorpse);
        }
        setShowCorpse(true);
        playSFX('corpse-discover');
        // Use real corpse if available, otherwise fall back to room's mock corpse
        const corpseToLoot = realCorpse || room.corpse;
        if (corpseToLoot) {
          const lootName = realCorpse ? realCorpse.loot : corpseToLoot.loot;
          const lootEmoji = realCorpse ? realCorpse.lootEmoji : '🗡️';
          
          let newInventory = [...inventory];
          let foundItems: string[] = [];
          
          // Don't add "Nothing" to inventory
          if (lootName && lootName !== 'Nothing' && !inventory.find(i => i.name === lootName)) {
            newInventory.push({ id: Date.now().toString(), name: lootName, emoji: lootEmoji });
            foundItems.push(lootName);
          }
          
          // Bonus loot chance - scales with depth
          // Upper Crypt (1-4): 50%, Flooded Halls (5-8): 65%, The Abyss (9-12): 80%
          const roomNum = currentRoom + 1;
          const bonusChance = roomNum <= 4 ? 0.5 : roomNum <= 8 ? 0.65 : 0.8;
          
          // Bonus loot pool - deeper = better items possible
          const bonusLootPool = [
            { name: 'Herbs', emoji: '🌿', minDepth: 1 },
            { name: 'Bone Charm', emoji: '💀', minDepth: 3 },
            { name: 'Rusty Blade', emoji: '🗡️', minDepth: 5 },
            { name: 'Poison Vial', emoji: '🧪', minDepth: 7 },
            { name: 'Ancient Scroll', emoji: '📜', minDepth: 9 },
          ];
          
          // Filter by depth and items player doesn't have
          const availableBonus = bonusLootPool.filter(item => 
            roomNum >= item.minDepth && !newInventory.some(i => i.name === item.name)
          );
          
          if (availableBonus.length > 0 && Math.random() < bonusChance) {
            const bonus = availableBonus[Math.floor(Math.random() * availableBonus.length)];
            newInventory.push({ id: (Date.now() + 1).toString(), name: bonus.name, emoji: bonus.emoji });
            foundItems.push(bonus.name);
          }
          
          if (foundItems.length > 0) {
            setInventory(newInventory);
            // Delay item-pickup SFX to avoid overlap with corpse-discover
            setTimeout(() => playSFX('item-pickup'), 600);
            setMessage(`Found: ${foundItems.join(', ')}`);
          } else if (lootName === 'Nothing') {
            setMessage('The corpse has nothing of value.');
          }
          
          // Mark real corpse as discovered
          if (realCorpse && walletAddress) {
            discoverCorpse(realCorpse.id, walletAddress).catch(console.error);
          }
        }
        break;
      case 'heal':
        {
          // Cache rooms give a random item OR restore health
          const cacheItems = [
            { name: 'Herbs', emoji: '🌿', effect: 'Restore 30-40 HP in combat' },
            { name: 'Poison Vial', emoji: '🧪', effect: '+40% damage' },
            { name: 'Ancient Scroll', emoji: '📜', effect: '+20% defense, +10% flee' },
            { name: 'Bone Charm', emoji: '💀', effect: '+15% defense' },
            { name: 'Rusty Blade', emoji: '🗡️', effect: '+20% damage' },
            { name: 'Tattered Shield', emoji: '🛡️', effect: '-25% damage taken' },
          ];
          
          // 50% chance for item, 50% chance for healing
          if (Math.random() < 0.5) {
            // Try to give an item the player doesn't have
            const availableItems = cacheItems.filter(item => !inventory.some(i => i.name === item.name));
            if (availableItems.length > 0) {
              const item = availableItems[Math.floor(Math.random() * availableItems.length)];
              const newInventory = [...inventory, { id: Date.now().toString(), name: item.name, emoji: item.emoji }];
              setInventory(newInventory);
              playSFX('loot-discover');
              setMessage(`Found ${item.emoji} ${item.name}! ${item.effect}`);
            } else {
              // Player has all items, give health instead
              playSFX('heal');
              setHealth(Math.min(100, health + 30));
              setMessage('Nothing new here. Rested briefly. +30 HP');
            }
          } else {
            playSFX('heal');
            setHealth(Math.min(100, health + 30));
            setMessage('Found medical supplies. +30 HP');
          }
          
          const ok = await advanceRoom();
          if (!ok) return;
          setCurrentRoom(currentRoom + 1);
          setSelectedOption(null);
        }
        break;
      case 'victory':
        router.push('/victory');
        break;
    }
  };

  return (
    <GameFrame>
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      <Menu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        walletAddress={mockWallet}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        stakeAmount={stakeAmount}
      />

      {/* Header */}
      <header className="bg-[var(--bg-base)] border-b border-[var(--amber-dim)] px-3 py-2 sticky top-0 z-10">
        {(() => {
          const depth = getDepthForRoom(currentRoom + 1);
          const tierColor = depth.tier === 3 ? 'purple' : depth.tier === 2 ? 'amber' : 'text';
          return (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMenuOpen(true)}
                  className="text-[var(--text-muted)] hover:text-[var(--amber)] transition-colors"
                >
                  [≡]
                </button>
                <span className={`text-[var(--${tierColor === 'text' ? 'amber' : tierColor})]`}>◈</span>
                <span className={`uppercase tracking-wide ${
                  depth.tier === 3 ? 'text-[var(--purple-bright)]' : 
                  depth.tier === 2 ? 'text-[var(--amber-bright)]' : 
                  'text-[var(--text-primary)]'
                }`}>
                  {depth.name}
                </span>
                {DEMO_MODE && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[var(--amber-dim)]/30 border border-[var(--amber-dim)] text-[var(--amber)] tracking-wider">
                    FREE PLAY
                  </span>
                )}
              </div>
              <ProgressBar current={currentRoom + 1} total={rooms.length} />
            </div>
          );
        })()}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-3 pt-4 pb-20">
        
        {/* Narrative */}
        <div className="text-[var(--text-primary)] text-sm leading-relaxed mb-4 whitespace-pre-line">
          {room.narrative}
          {/* For corpse rooms, show the final message inline if available */}
          {room.type === 'corpse' && !showCorpse && (
            <span className="text-[var(--purple-bright)] italic">
              {realCorpse 
                ? `\n\n"${realCorpse.finalMessage}"\n\n— @${realCorpse.playerName}`
                : '\n\n"...the darkness took me before I could finish..."'
              }
            </span>
          )}
        </div>

        {/* Message - made prominent so players notice loot/heal feedback */}
        {message && (
          <div className="bg-[var(--amber-dim)]/40 border-2 border-[var(--amber-bright)] p-4 mb-4 text-[var(--amber-bright)] text-base font-medium animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-xl">✦</span>
              <span>{message}</span>
            </div>
          </div>
        )}

        {/* Real corpse discovery prompt - dramatic entrance */}
        {realCorpse && !showCorpse && room.type !== 'corpse' && (
          <div className="relative mb-4 animate-pulse">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[var(--purple)]/10 blur-xl rounded-lg" />
            
            <div className="relative bg-gradient-to-r from-[var(--purple-dim)]/30 via-[var(--bg-surface)] to-[var(--purple-dim)]/30 border border-[var(--purple-dim)] p-4">
              {/* Header with skull */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">💀</span>
                <div>
                  <div className="text-[var(--purple-bright)] text-sm font-bold tracking-wide">
                    A body lies in the shadows...
                  </div>
                  <div className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider">
                    Someone fell here before you
                  </div>
                </div>
              </div>
              
              {/* Teaser of final words */}
              <div className="text-[var(--text-muted)] text-xs italic mb-3 pl-9 border-l border-[var(--purple-dim)]/50">
                You can almost make out words scratched into the stone beside them...
              </div>
              
              <button
                onClick={() => handleAction('loot')}
                className="ml-9 text-sm text-[var(--purple)] hover:text-[var(--purple-bright)] transition-colors flex items-center gap-2 group"
              >
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                <span>Investigate the remains</span>
              </button>
            </div>
          </div>
        )}

        {/* Corpse callout - dramatic reveal of the fallen */}
        {showCorpse && (room.type === 'corpse' || lootedCorpse) && (
          <div className="relative mb-4">
            {/* Outer glow */}
            <div className="absolute inset-0 bg-[var(--purple)]/5 blur-lg rounded-lg" />
            
            <div className="relative bg-gradient-to-b from-[var(--bg-surface)] to-[var(--purple-dim)]/20 border border-[var(--purple)] p-4">
              {/* Header - the fallen one */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[var(--purple-dim)]/30 rounded border border-[var(--purple-dim)]">
                  <span className="text-xl">💀</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[var(--purple-bright)] font-bold text-base">
                      @{lootedCorpse ? lootedCorpse.playerName : 'Unknown Wanderer'}
                    </span>
                    <span className="text-[var(--text-dim)] text-[10px]">•</span>
                    <span className="text-[var(--red-dim)] text-xs">FALLEN</span>
                  </div>
                  {lootedCorpse && lootedCorpse.createdAt && (
                    <div className="text-[var(--text-dim)] text-[10px] mt-0.5">
                      Died {formatTimeAgo(lootedCorpse.createdAt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Final words - the centerpiece */}
              <div className="bg-[var(--bg-base)]/50 border-l-2 border-[var(--purple)] px-4 py-3 mb-3">
                <div className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider mb-1">
                  Final Words
                </div>
                <div className="text-[var(--text-primary)] text-base italic leading-relaxed">
                  "{lootedCorpse ? lootedCorpse.finalMessage : '...the darkness took me before I could finish...'}"
                </div>
              </div>

              {/* Loot section */}
              <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">They carried:</span>
                  <span className="px-2 py-1 bg-[var(--amber-dim)]/20 border border-[var(--amber-dim)] text-[var(--amber)]">
                    {lootedCorpse ? lootedCorpse.lootEmoji : '💀'} {lootedCorpse ? lootedCorpse.loot : 'Nothing'}
                  </span>
                </div>
                <div className="text-[var(--text-muted)] text-[10px] italic">
                  {lootedCorpse ? 'Their loss, your gain.' : 'The underworld claimed everything.'}
                </div>
              </div>

              {/* Tip the Dead - only show for real corpses with wallet addresses */}
              {lootedCorpse && lootedCorpse.walletAddress && publicKey && (
                <div className="border-t border-[var(--purple-dim)]/30 pt-3">
                  {tipped ? (
                    <div className="flex items-center gap-2 text-[var(--green-bright)] text-xs">
                      <span>💸</span>
                      <span>Tip sent! They'll appreciate it from beyond.</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleTip}
                      disabled={tipping}
                      className="w-full py-2 px-3 bg-[var(--amber-dim)]/20 border border-[var(--amber)] text-[var(--amber-bright)] text-sm hover:bg-[var(--amber-dim)]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {tipping ? (
                        <>
                          <span className="animate-pulse">◈</span>
                          <span>Sending tip...</span>
                        </>
                      ) : (
                        <>
                          <span>💸</span>
                          <span>Tip {TIP_AMOUNT} SOL to @{lootedCorpse.playerName}</span>
                        </>
                      )}
                    </button>
                  )}
                  <div className="text-[var(--text-dim)] text-[10px] text-center mt-1">
                    Micro-payments — only possible on Solana
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="text-[var(--border-default)] text-xs mb-4">
          ────────────────────────
        </div>

        {/* Options */}
        <div className="space-y-2 pb-4">
          <div className="text-[var(--text-muted)] text-xs mb-2">▼ WHAT DO YOU DO?</div>
          {!showCorpse && room.options.map((option, i) => (
            <button
              key={option.id}
              onClick={() => {
                setSelectedOption(option.id);
                handleAction(option.action);
              }}
              className={`w-full text-left px-3 py-3 text-sm transition-all active:scale-[0.98] ${
                selectedOption === option.id
                  ? 'bg-[var(--amber-dim)]/30 text-[var(--amber-bright)] border-l-2 border-[var(--amber)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-l-2 border-[var(--border-dim)] active:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className="text-[var(--text-muted)] mr-2">{i + 1}.</span>
              {option.text}
            </button>
          ))}
          
          {/* Continue after looting */}
          {showCorpse && (
            <button
              onClick={() => handleAction('next')}
              className="w-full text-left px-3 py-3 text-sm bg-[var(--bg-surface)] text-[var(--text-secondary)] border-l-2 border-[var(--border-dim)]"
            >
              <span className="text-[var(--text-muted)] mr-2">→</span>
              Continue onward
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--bg-base)] border-t border-[var(--border-dim)] px-3 py-3 sticky bottom-0">
        {/* Top row: Stats */}
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-4">
            {/* Health */}
            <div className="flex items-center gap-2">
              <span className="text-[var(--red)] text-base">♥</span>
              <HealthBar current={health} max={100} />
              <span className={`text-sm font-bold ${health < 30 ? 'text-[var(--red-bright)] animate-pulse' : 'text-[var(--red-bright)]'}`}>
                {health}
              </span>
            </div>
            {/* Stamina */}
            <div className="flex items-center gap-2">
              <span className="text-[var(--blue)] text-base">⚡</span>
              <StaminaBar current={stamina} max={3} />
            </div>
          </div>
          {/* Stake */}
          <div className="flex items-center gap-1">
            <span className="text-[var(--amber)] text-base">◎</span>
            <span className="text-[var(--amber-bright)] font-bold">{stakeAmount} SOL</span>
          </div>
        </div>
        
        {/* Bottom row: Inventory */}
        <div className="flex items-center gap-2 text-sm overflow-x-auto pb-1">
          <span className="text-[var(--text-muted)]">🎒</span>
          {inventory.map((item) => (
            <span 
              key={item.id} 
              className="text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-1 whitespace-nowrap border border-[var(--border-dim)]"
            >
              {item.emoji} {item.name}
            </span>
          ))}
        </div>
      </footer>
    </div>
    </GameFrame>
  );
}

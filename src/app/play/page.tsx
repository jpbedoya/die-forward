'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGameState, saveGameState } from '@/lib/gameState';
import { useCorpseForRoom, discoverCorpse } from '@/lib/instant';

// Menu overlay component
function Menu({ 
  isOpen, 
  onClose,
  walletAddress,
  audioEnabled,
  onToggleAudio,
}: { 
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  audioEnabled: boolean;
  onToggleAudio: () => void;
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
              Abandon run? Your stake will be lost.
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

interface Room {
  type: RoomType;
  narrative: string;
  options: { id: string; text: string; action: string }[];
  corpse?: { player: string; message: string; loot: string };
}

const rooms: Room[] = [
  {
    type: 'explore',
    narrative: `You descend stone steps into darkness. The air grows cold and damp. Water drips somewhere ahead.

The Sunken Crypt awaits.`,
    options: [
      { id: '1', text: 'Light your torch and proceed', action: 'next' },
      { id: '2', text: 'Move carefully in darkness', action: 'next' },
    ],
  },
  {
    type: 'corpse',
    narrative: `A flooded chamber stretches before you. In the corner, a body slumps against the wall.

Someone who came before you. They didn't make it.`,
    options: [
      { id: '1', text: 'Search the corpse', action: 'loot' },
      { id: '2', text: 'Pay respects and move on', action: 'next' },
    ],
    corpse: { player: 'hollowknight', message: 'should have dodged...', loot: 'Rusty Sword' },
  },
  {
    type: 'combat',
    narrative: `Something stirs in the water. A shape rises — bloated, dripping, hungry.

The Drowned One blocks your path.`,
    options: [
      { id: '1', text: 'Ready your weapon', action: 'combat' },
      { id: '2', text: 'Try to flee past it', action: 'flee' },
    ],
  },
  {
    type: 'cache',
    narrative: `A small alcove, untouched by water. Old supplies rest on a stone shelf.

A moment of respite in the darkness.`,
    options: [
      { id: '1', text: 'Take the supplies', action: 'heal' },
      { id: '2', text: 'Continue deeper', action: 'next' },
    ],
  },
  {
    type: 'explore',
    narrative: `The passage narrows. Water rises to your waist now. The cold seeps into your bones.

Ahead, you see a faint light.`,
    options: [
      { id: '1', text: 'Wade toward the light', action: 'next' },
      { id: '2', text: 'Search for another path', action: 'next' },
    ],
  },
  {
    type: 'combat',
    narrative: `Two more creatures emerge from the depths. Smaller than before, but faster.

Drowned Wretches surround you.`,
    options: [
      { id: '1', text: 'Stand and fight', action: 'combat' },
      { id: '2', text: 'Push through them', action: 'flee' },
    ],
  },
  {
    type: 'exit',
    narrative: `Light breaks through the darkness. Stone steps lead upward.

You've found the exit. The surface awaits.`,
    options: [
      { id: '1', text: 'Ascend to victory', action: 'victory' },
    ],
  },
];

const mockWallet = "8xH4...k9Qz";

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
  const [currentRoom, setCurrentRoom] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
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

  // Fetch real corpses from DB for the current room
  const { corpses: realCorpses } = useCorpseForRoom('THE SUNKEN CRYPT', currentRoom + 1);
  const realCorpse = realCorpses[0]; // Get first undiscovered corpse

  // Load game state on mount
  useEffect(() => {
    const state = getGameState();
    setCurrentRoom(state.currentRoom);
    setHealth(state.health);
    setStamina(state.stamina);
    setInventory(state.inventory);
    setStakeAmount(state.stakeAmount);
    setWalletAddress(state.walletAddress);
    setLoaded(true);
  }, []);

  // Save state when it changes
  useEffect(() => {
    if (loaded) {
      saveGameState({ currentRoom, health, stamina, inventory });
    }
  }, [currentRoom, health, stamina, inventory, loaded]);

  const room = rooms[currentRoom] || rooms[rooms.length - 1];

  // Show loading until state is loaded
  if (!loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center font-mono">
        <div className="text-[var(--amber)] animate-pulse">◈ Loading...</div>
      </div>
    );
  }

  const handleAction = (action: string) => {
    setMessage(null);
    
    switch (action) {
      case 'next':
        if (currentRoom < rooms.length - 1) {
          setCurrentRoom(currentRoom + 1);
          setSelectedOption(null);
          setShowCorpse(false);
          setStamina(Math.min(3, stamina + 1)); // Regen stamina between rooms
        }
        break;
      case 'combat':
        router.push('/combat');
        break;
      case 'flee':
        // Take some damage but skip combat
        setHealth(health - 15);
        setMessage('You take a hit while fleeing!');
        if (health - 15 <= 0) {
          router.push('/death');
        } else {
          setCurrentRoom(currentRoom + 1);
          setSelectedOption(null);
        }
        break;
      case 'loot':
        setShowCorpse(true);
        // Use real corpse if available, otherwise fall back to room's mock corpse
        const corpseToLoot = realCorpse || room.corpse;
        if (corpseToLoot) {
          const lootName = realCorpse ? realCorpse.loot : corpseToLoot.loot;
          const lootEmoji = realCorpse ? realCorpse.lootEmoji : '🗡️';
          
          if (!inventory.find(i => i.name === lootName)) {
            setInventory([...inventory, { id: Date.now().toString(), name: lootName, emoji: lootEmoji }]);
            setMessage(`Found: ${lootName}`);
          }
          
          // Mark real corpse as discovered
          if (realCorpse && walletAddress) {
            discoverCorpse(realCorpse.id, walletAddress).catch(console.error);
          }
        }
        break;
      case 'heal':
        setHealth(Math.min(100, health + 30));
        setMessage('You feel restored. +30 HP');
        setCurrentRoom(currentRoom + 1);
        setSelectedOption(null);
        break;
      case 'victory':
        router.push('/victory');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-mono">
      
      <Menu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        walletAddress={mockWallet}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
      />

      {/* Header */}
      <header className="bg-[var(--bg-base)] border-b border-[var(--amber-dim)] px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMenuOpen(true)}
              className="text-[var(--text-muted)] hover:text-[var(--amber)] transition-colors"
            >
              [≡]
            </button>
            <span className="text-[var(--amber)]">◈</span>
            <span className="text-[var(--amber-bright)] uppercase tracking-wide">
              THE SUNKEN CRYPT
            </span>
          </div>
          <ProgressBar current={currentRoom + 1} total={rooms.length} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-3 pt-4 pb-20">
        
        {/* Narrative */}
        <div className="text-[var(--text-primary)] text-sm leading-relaxed mb-4 whitespace-pre-line">
          {room.narrative}
        </div>

        {/* Message */}
        {message && (
          <div className="bg-[var(--amber-dim)]/20 border border-[var(--amber-dim)] p-3 mb-4 text-[var(--amber-bright)] text-sm">
            {message}
          </div>
        )}

        {/* Real corpse discovery prompt */}
        {realCorpse && !showCorpse && room.type !== 'corpse' && (
          <div className="bg-[var(--purple-dim)]/20 border border-[var(--purple-dim)] p-3 mb-4">
            <div className="text-[var(--purple-bright)] text-sm mb-2">
              ☠ You notice a body in the shadows...
            </div>
            <button
              onClick={() => handleAction('loot')}
              className="text-xs text-[var(--purple)] hover:text-[var(--purple-bright)] transition-colors"
            >
              → Investigate the corpse
            </button>
          </div>
        )}

        {/* Corpse callout - use real corpse if available */}
        {showCorpse && (realCorpse || room.corpse) && (
          <div className="bg-[var(--purple-dim)]/20 border border-[var(--purple-dim)] p-3 mb-4">
            <div className="flex items-center gap-2 text-sm mb-1">
              <span className="text-[var(--purple)]">☠</span>
              <span className="text-[var(--purple-bright)] font-bold">
                @{realCorpse ? realCorpse.playerName : room.corpse?.player}
              </span>
              {realCorpse && (
                <span className="text-[var(--text-dim)] text-xs">(real player)</span>
              )}
            </div>
            <div className="text-[var(--text-secondary)] text-sm italic mb-2">
              "{realCorpse ? realCorpse.finalMessage : room.corpse?.message}"
            </div>
            <div className="text-[var(--text-muted)] text-xs">
              └─ {realCorpse ? realCorpse.lootEmoji : '🗡️'} {realCorpse ? realCorpse.loot : room.corpse?.loot}
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
          {room.options.map((option, i) => (
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
      <footer className="bg-[var(--bg-base)] border-t border-[var(--border-dim)] px-3 py-2 sticky bottom-0">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[var(--red)]">♥</span>
              <HealthBar current={health} max={100} />
              <span className={`text-[10px] ${health < 30 ? 'text-[var(--red-bright)] animate-pulse' : 'text-[var(--red-bright)]'}`}>
                {health}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--blue)]">⚡</span>
              <StaminaBar current={stamina} max={3} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[var(--amber)]">◎</span>
            <span className="text-[var(--amber-bright)]">{stakeAmount} SOL</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-[var(--text-dim)]">🎒</span>
          {inventory.map((item) => (
            <span 
              key={item.id} 
              className="text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 whitespace-nowrap"
            >
              {item.emoji} {item.name}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}

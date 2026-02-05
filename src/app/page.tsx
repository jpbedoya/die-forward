'use client';

import { useState } from 'react';

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
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      
      {/* Menu panel */}
      <div className="relative bg-[--bg-surface] border border-[--border-default] w-[90%] max-w-xs p-4">
        <div className="text-[--amber] text-xs mb-4 flex items-center justify-between">
          <span className="tracking-wider">◈ DIE FORWARD</span>
          <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-secondary]">
            [X]
          </button>
        </div>
        
        {/* Wallet */}
        <div className="mb-4 text-xs">
          <div className="text-[--text-muted] mb-1">CONNECTED</div>
          <div className="text-[--text-secondary] font-mono truncate">
            {walletAddress}
          </div>
        </div>
        
        {/* Audio toggle */}
        <button 
          onClick={onToggleAudio}
          className="w-full text-left px-3 py-2 text-sm bg-[--bg-base] border border-[--border-dim] mb-2 flex items-center justify-between"
        >
          <span className="text-[--text-secondary]">Audio</span>
          <span className={audioEnabled ? 'text-[--green]' : 'text-[--red]'}>
            {audioEnabled ? '♪ ON' : '♪ OFF'}
          </span>
        </button>
        
        {/* Abandon run */}
        <button 
          className="w-full text-left px-3 py-2 text-sm bg-[--bg-base] border border-[--red-dim] text-[--red-bright] hover:bg-[--red-dim]/20"
        >
          ☠ Abandon Run
        </button>
      </div>
    </div>
  );
}

// Mockup data
const mockRoom = {
  zone: "THE SUNKEN CRYPT",
  roomNumber: 7,
  totalRooms: 12,
};

const mockNarrative = `You descend into a flooded chamber. Water laps at your knees, cold and dark.

In the corner, a corpse slumps against the moss-covered wall — someone who came before.

They died 2 hours ago.

Something moves in the water behind you.`;

const mockPlayer = {
  health: 73,
  maxHealth: 100,
  stamina: 2,
  maxStamina: 3,
  inventory: [
    { id: '1', name: 'Torch', emoji: '🔦' },
    { id: '2', name: 'Rusty Blade', emoji: '🗡️' },
    { id: '3', name: 'Herbs', emoji: '🌿' },
  ],
  stakeAmount: 0.05,
};

const mockOptions = [
  { id: '1', text: 'Search the corpse' },
  { id: '2', text: 'Ready your blade' },
  { id: '3', text: 'Wade to the exit' },
  { id: '4', text: 'Scan with torch' },
];

const corpsePlayer = 'hollowknight';
const corpseMessage = "should have dodged...";

const mockWallet = "8xH4...k9Qz";

// Simple ASCII health bar
function HealthBar({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const filled = Math.round(pct * 8);
  const empty = 8 - filled;
  return (
    <span className="font-mono tracking-tighter">
      <span className="text-[--red]">{'█'.repeat(filled)}</span>
      <span className="text-[--red-dim]">{'█'.repeat(empty)}</span>
    </span>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  return (
    <span className="font-mono">
      <span className="text-[--blue-bright]">{'◆'.repeat(current)}</span>
      <span className="text-[--blue-dim]">{'◇'.repeat(max - current)}</span>
    </span>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const filled = Math.round((current / total) * 12);
  const empty = 12 - filled;
  return (
    <span className="font-mono text-xs">
      <span className="text-[--amber]">{'▓'.repeat(filled)}</span>
      <span className="text-[--text-muted]">{'░'.repeat(empty)}</span>
    </span>
  );
}

export default function GameScreen() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-[--bg-base] flex flex-col font-mono">
      
      {/* Menu Overlay */}
      <Menu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        walletAddress={mockWallet}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
      />

      {/* Fixed Header */}
      <header className="bg-[--bg-base] border-b border-[--amber-dim] px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMenuOpen(true)}
              className="text-[--text-muted] hover:text-[--amber] transition-colors"
            >
              [≡]
            </button>
            <span className="text-[--amber]">◈</span>
            <span className="text-[--amber-bright] uppercase tracking-wide">
              {mockRoom.zone}
            </span>
          </div>
          <ProgressBar current={mockRoom.roomNumber} total={mockRoom.totalRooms} />
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-3 py-4">
        
        {/* Narrative */}
        <div className="text-[--text-primary] text-sm leading-relaxed mb-4 whitespace-pre-line">
          {mockNarrative}
        </div>

        {/* Corpse Callout */}
        <div className="bg-[--purple-dim]/20 border border-[--purple-dim] p-3 mb-4">
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="text-[--purple]">☠</span>
            <span className="text-[--purple-bright] font-bold">@{corpsePlayer}</span>
            <span className="text-[--text-muted] text-xs">2h ago</span>
          </div>
          <div className="text-[--text-secondary] text-sm italic mb-2">
            "{corpseMessage}"
          </div>
          <div className="text-[--text-muted] text-xs">
            ├─ 🗡️ Rusty Sword
            <br />
            └─ ◎ 0.02 SOL
          </div>
        </div>

        {/* Divider */}
        <div className="text-[--border-default] text-xs mb-4">
          ────────────────────────
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-4">
          <div className="text-[--text-muted] text-xs mb-2">▼ WHAT DO YOU DO?</div>
          {mockOptions.map((option, i) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`w-full text-left px-3 py-3 text-sm transition-all active:scale-[0.98] ${
                selectedOption === option.id
                  ? 'bg-[--amber-dim]/30 text-[--amber-bright] border-l-2 border-[--amber]'
                  : 'bg-[--bg-surface] text-[--text-secondary] border-l-2 border-[--border-dim] active:bg-[--bg-elevated]'
              }`}
            >
              <span className="text-[--text-muted] mr-2">{i + 1}.</span>
              {option.text}
              {selectedOption === option.id && (
                <span className="text-[--amber] float-right">◄</span>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* Fixed Bottom Stats Bar */}
      <footer className="bg-[--bg-base] border-t border-[--border-dim] px-3 py-2 sticky bottom-0">
        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-3">
            {/* Health */}
            <div className="flex items-center gap-1">
              <span className="text-[--red]">♥</span>
              <HealthBar current={mockPlayer.health} max={mockPlayer.maxHealth} />
              <span className="text-[--red-bright] text-[10px]">{mockPlayer.health}</span>
            </div>
            {/* Stamina */}
            <div className="flex items-center gap-1">
              <span className="text-[--blue]">⚡</span>
              <StaminaBar current={mockPlayer.stamina} max={mockPlayer.maxStamina} />
            </div>
          </div>
          {/* Stake */}
          <div className="flex items-center gap-1">
            <span className="text-[--amber]">◎</span>
            <span className="text-[--amber-bright]">{mockPlayer.stakeAmount} SOL</span>
          </div>
        </div>
        
        {/* Inventory Row */}
        <div className="flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-[--text-dim]">🎒</span>
          {mockPlayer.inventory.map((item) => (
            <span 
              key={item.id} 
              className="text-[--text-muted] bg-[--bg-surface] px-2 py-0.5 whitespace-nowrap"
            >
              {item.emoji} {item.name}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}

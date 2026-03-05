'use client';

import { useCallback } from 'react';
import { useAudio } from '@/lib/audio';

export interface ZoneData {
  id: string;
  name: string;
  tagline: string;
  element: string;
  difficulty: number;
  mechanic: string | null;
  emoji: string;
  colors: { primary: string; accent: string; text: string };
  unlockRequirement: string | null;
  enabled: boolean;
}

interface ZoneSelectorProps {
  zones: ZoneData[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}

const MAX_DIFFICULTY = 3;

function DifficultyDots({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: MAX_DIFFICULTY }).map((_, i) => (
        <span
          key={i}
          className="text-[10px] leading-none"
          style={{ opacity: i < difficulty ? 1 : 0.25 }}
        >
          ●
        </span>
      ))}
    </div>
  );
}

export default function ZoneSelector({ zones, selectedZoneId, onSelect }: ZoneSelectorProps) {
  const { playSFX } = useAudio();

  const handleHover = useCallback(
    (zoneId: string, enabled: boolean) => {
      if (enabled) playSFX('ui-hover');
    },
    [playSFX]
  );

  const handleSelect = useCallback(
    (zoneId: string, enabled: boolean) => {
      if (!enabled) return;
      playSFX('ui-click');
      onSelect(zoneId);
    },
    [playSFX, onSelect]
  );

  return (
    <div className="w-full">
      {/* Horizontal scroll container on desktop, vertical stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:overflow-x-auto gap-3 pb-2 sm:pb-4 font-mono">
        {zones.map((zone) => {
          const isSelected = selectedZoneId === zone.id;
          const isLocked = !zone.enabled;

          return (
            <button
              key={zone.id}
              onClick={() => handleSelect(zone.id, zone.enabled)}
              onMouseEnter={() => handleHover(zone.id, zone.enabled)}
              disabled={isLocked}
              aria-pressed={isSelected}
              className={[
                'relative flex-shrink-0 w-full sm:w-44 text-left transition-all duration-150',
                'border px-3 py-4 flex flex-col gap-2',
                isLocked
                  ? 'cursor-not-allowed opacity-60 grayscale border-[var(--border-dim)]'
                  : isSelected
                  ? 'cursor-pointer scale-[1.02]'
                  : 'cursor-pointer border-[var(--border-dim)] hover:border-[var(--text-muted)]',
              ].join(' ')}
              style={{
                backgroundColor: isLocked
                  ? 'var(--bg-surface)'
                  : `${zone.colors.primary}33`, // ~20% opacity tint
                borderColor: isSelected && !isLocked ? zone.colors.accent : undefined,
                boxShadow:
                  isSelected && !isLocked
                    ? `0 0 12px ${zone.colors.accent}55, 0 0 4px ${zone.colors.accent}33`
                    : undefined,
              }}
            >
              {/* COMING SOON badge */}
              {isLocked && (
                <span
                  className="absolute top-2 right-2 text-[9px] tracking-widest px-1.5 py-0.5 border"
                  style={{
                    borderColor: 'var(--border-dim)',
                    color: 'var(--text-dim)',
                    backgroundColor: 'var(--bg-base)',
                  }}
                >
                  COMING SOON
                </span>
              )}

              {/* Emoji */}
              <div className="text-3xl text-center leading-none mb-1">{zone.emoji}</div>

              {/* Zone name */}
              <div
                className="text-xs font-bold tracking-wider leading-tight"
                style={{ color: isLocked ? 'var(--text-muted)' : zone.colors.accent }}
              >
                {zone.name}
              </div>

              {/* Tagline */}
              <div className="text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                {zone.tagline}
              </div>

              {/* Difficulty */}
              <div
                className="flex items-center gap-1.5"
                style={{ color: isLocked ? 'var(--text-dim)' : zone.colors.text }}
              >
                <DifficultyDots difficulty={zone.difficulty} />
                <span className="text-[9px] tracking-wider opacity-70">
                  {['', 'EASY', 'MEDIUM', 'HARD'][zone.difficulty] ?? ''}
                </span>
              </div>

              {/* Mechanic teaser */}
              {zone.mechanic && (
                <div className="text-[9px] italic leading-snug" style={{ color: 'var(--text-dim)' }}>
                  {zone.mechanic}
                </div>
              )}

              {/* Lock overlay */}
              {isLocked && (
                <div className="mt-1 flex flex-col gap-1">
                  <div className="text-center text-lg">🔒</div>
                  {zone.unlockRequirement && (
                    <div className="text-[9px] text-center leading-snug" style={{ color: 'var(--text-dim)' }}>
                      {zone.unlockRequirement}
                    </div>
                  )}
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && !isLocked && (
                <div
                  className="text-[9px] tracking-widest text-center mt-1"
                  style={{ color: zone.colors.accent }}
                >
                  ▶ SELECTED
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

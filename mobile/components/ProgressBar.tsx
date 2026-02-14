import { View, Text } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export function ProgressBar({ current, total, showLabel = true }: ProgressBarProps) {
  // Calculate filled/empty blocks (using 13 chars to match dungeon length)
  const barLength = 13;
  const filled = Math.floor((current / total) * barLength);
  const empty = barLength - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-amber font-mono text-[10px] tracking-tighter">{bar}</Text>
      {showLabel && (
        <Text className="text-bone-dark text-xs font-mono">{current}</Text>
      )}
    </View>
  );
}

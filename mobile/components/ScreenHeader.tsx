import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

interface ScreenHeaderProps {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  border?: boolean;
  /** Show a [HOME] button on the left (overrides left prop if both set) */
  showHome?: boolean;
}

const BORDER_COLOR = 'rgba(245,158,11,0.2)';
const H_PAD = 12;
const V_PAD = 10;

export function ScreenHeader({
  title,
  left,
  right,
  border = true,
  showHome = false,
}: ScreenHeaderProps) {
  const leftContent = showHome ? (
    <Pressable
      onPress={() => router.replace('/')}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      style={{ paddingVertical: 6, paddingHorizontal: 8 }}
    >
      {({ pressed }) => (
        <Text style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: pressed ? '#f59e0b' : '#78716c',
        }}>
          [HOME]
        </Text>
      )}
    </Pressable>
  ) : left ?? <View style={{ minWidth: 56 }} />;

  const rightContent = right ?? <View style={{ minWidth: 56 }} />;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: H_PAD,
        paddingVertical: V_PAD,
        borderBottomWidth: border ? 1 : 0,
        borderColor: BORDER_COLOR,
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {leftContent}
      </View>

      {title ? (
        <Text style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#f59e0b',
          letterSpacing: 3,
          textAlign: 'center',
        }}>
          {title}
        </Text>
      ) : null}

      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {rightContent}
      </View>
    </View>
  );
}

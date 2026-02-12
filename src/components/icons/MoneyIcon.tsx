import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export default function MoneyIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M15 9.5c-.6-.9-1.7-1.5-3-1.5-1.7 0-3 1-3 2.5s1.3 2.5 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5c-1.3 0-2.4-.6-3-1.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 6v12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

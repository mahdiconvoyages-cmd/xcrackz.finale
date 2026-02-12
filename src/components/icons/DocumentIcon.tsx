import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export default function DocumentIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="3" width="14" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M8 8h8M8 12h8M8 16h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

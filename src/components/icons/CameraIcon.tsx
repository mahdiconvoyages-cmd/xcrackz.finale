import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

export default function CameraIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="14" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M9 6l1.5-2h3L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

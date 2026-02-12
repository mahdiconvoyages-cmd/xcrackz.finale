import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function DetailsIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16M4 12h16M4 18h10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

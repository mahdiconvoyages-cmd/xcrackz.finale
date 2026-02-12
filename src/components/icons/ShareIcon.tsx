import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ShareIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12l16-8-4 16-4-6-8-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

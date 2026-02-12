import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function SignatureIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 20h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 15c2-2 3-1 4 0s2 2 4-1 4-2 5 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 7l3-3 3 3-8 8H9V13l5-6z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

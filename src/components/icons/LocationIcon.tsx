import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function LocationIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s7-7.58 7-12a7 7 0 10-14 0c0 4.42 7 12 7 12z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 13a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

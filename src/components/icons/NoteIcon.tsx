import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function NoteIcon({ size = 22, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2h8l4 4v14a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2z" stroke={color} strokeWidth={2} />
      <Path d="M12 12h4M8 12h2M8 16h8M8 8h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface EquipmentIconProps {
  size?: number;
  color?: string;
}

/**
 * Icône SVG représentant équipements véhicule (roue de secours, clés, etc.)
 * Optimisé pour Android avec react-native-svg
 */
export default function EquipmentIcon({ size = 80, color = '#34C759' }: EquipmentIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Roue/Pneu */}
      <Circle cx="35" cy="35" r="15" stroke={color} strokeWidth="2.5" fill="none" />
      <Circle cx="35" cy="35" r="6" fill={color} />
      <Path d="M 35 26 L 35 20" stroke={color} strokeWidth="2" />
      <Path d="M 35 50 L 35 44" stroke={color} strokeWidth="2" />
      <Path d="M 26 35 L 20 35" stroke={color} strokeWidth="2" />
      <Path d="M 50 35 L 44 35" stroke={color} strokeWidth="2" />
      
      {/* Clé */}
      <Circle cx="70" cy="35" r="5" stroke={color} strokeWidth="2" fill="none" />
      <Rect x="68" y="38" width="4" height="15" fill={color} />
      <Rect x="68" y="48" width="6" height="2" fill={color} />
      <Rect x="68" y="52" width="4" height="2" fill={color} />
      
      {/* Trousse outils */}
      <Rect x="25" y="60" width="25" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M 30 60 L 30 55 L 45 55 L 45 60" stroke={color} strokeWidth="2" fill={color} opacity="0.2" />
      <Circle cx="37.5" cy="69" r="2" fill={color} />
      
      {/* Triangle de signalisation */}
      <Path 
        d="M 70 78 L 62 65 L 78 65 Z" 
        stroke={color} 
        strokeWidth="2" 
        fill="none"
      />
      <Path d="M 70 73 L 70 69" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="70" cy="75" r="1" fill={color} />
    </Svg>
  );
}

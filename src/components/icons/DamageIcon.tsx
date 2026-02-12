import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface DamageIconProps {
  size?: number;
  color?: string;
}

/**
 * Icône SVG représentant des dommages/rayures sur un véhicule
 * Optimisé pour Android avec react-native-svg
 */
export default function DamageIcon({ size = 80, color = '#FF3B30' }: DamageIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Contour véhicule simplifié */}
      <Path 
        d="M 20 50 L 30 35 L 70 35 L 80 50 L 75 65 L 25 65 Z" 
        stroke={color} 
        strokeWidth="2" 
        fill="none"
        opacity="0.3"
      />
      
      {/* Impact/Bosse (cercle avec lignes) */}
      <Circle cx="45" cy="48" r="8" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M 42 45 L 48 51" stroke={color} strokeWidth="2" />
      <Path d="M 48 45 L 42 51" stroke={color} strokeWidth="2" />
      
      {/* Rayure 1 */}
      <Path 
        d="M 55 40 L 65 50" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
      <Path 
        d="M 56 42 L 63 48" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round"
        opacity="0.5"
      />
      
      {/* Rayure 2 */}
      <Path 
        d="M 30 55 L 40 58" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      
      {/* Fissure */}
      <Path 
        d="M 70 42 L 72 48 L 70 52" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

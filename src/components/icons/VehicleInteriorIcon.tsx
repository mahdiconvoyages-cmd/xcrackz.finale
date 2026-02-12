import React from 'react';
import Svg, { Path, Circle, Rect, Line, Ellipse, Text as SvgText } from 'react-native-svg';

interface VehicleInteriorIconProps {
  size?: number;
  color?: string;
}

/**
 * Icône SVG détaillée représentant l'intérieur d'un véhicule
 * Adapté depuis le VehicleSchematic web avec sièges, volant, console centrale
 * Optimisé pour Android avec react-native-svg
 */
export default function VehicleInteriorIcon({ size = 80, color = '#8B7BE8' }: VehicleInteriorIconProps) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150" fill="none">
      {/* Cadre habitacle */}
      <Rect x="20" y="30" width="160" height="95" rx="10" 
        stroke={color} strokeWidth="3" fill="#F8F7FF"/>
      
      {/* Siège conducteur (gauche) */}
      <Path d="M 45 55 L 45 95 L 75 95 L 75 65 Q 75 55 65 55 Z" 
        stroke={color} strokeWidth="2.5" fill="#E5E1F8"/>
      <Path d="M 45 55 L 45 45 L 65 45 Q 75 45 75 55" 
        stroke={color} strokeWidth="2.5" fill="#D1CDEE"/>
      <Rect x="52" y="35" width="18" height="10" rx="4" 
        fill={color} stroke={color} strokeWidth="2"/>
      <Line x1="55" y1="55" x2="55" y2="95" stroke={color} strokeWidth="1" opacity="0.5"/>
      <Line x1="65" y1="55" x2="65" y2="95" stroke={color} strokeWidth="1" opacity="0.5"/>
      
      {/* Siège passager (droit) */}
      <Path d="M 125 55 L 125 95 L 155 95 L 155 65 Q 155 55 145 55 Z" 
        stroke={color} strokeWidth="2.5" fill="#E5E1F8"/>
      <Path d="M 125 55 L 125 45 L 145 45 Q 155 45 155 55" 
        stroke={color} strokeWidth="2.5" fill="#D1CDEE"/>
      <Rect x="130" y="35" width="18" height="10" rx="4" 
        fill={color} stroke={color} strokeWidth="2"/>
      <Line x1="135" y1="55" x2="135" y2="95" stroke={color} strokeWidth="1" opacity="0.5"/>
      <Line x1="145" y1="55" x2="145" y2="95" stroke={color} strokeWidth="1" opacity="0.5"/>
      
      {/* Volant (gauche) */}
      <Circle cx="60" cy="50" r="14" stroke={color} strokeWidth="3" fill="none"/>
      <Circle cx="60" cy="50" r="8" stroke={color} strokeWidth="2.5" fill={color}/>
      <Line x1="60" y1="36" x2="60" y2="44" stroke={color} strokeWidth="2.5"/>
      <Line x1="60" y1="56" x2="60" y2="64" stroke={color} strokeWidth="2.5"/>
      <Line x1="46" y1="50" x2="54" y2="50" stroke={color} strokeWidth="2.5"/>
      
      {/* Tableau de bord */}
      <Path d="M 30 45 L 170 45 L 170 50 L 30 50 Z" 
        stroke={color} strokeWidth="3" fill="#2D3748"/>
      <Circle cx="95" cy="47" r="2" fill="#10B981"/>
      <Circle cx="105" cy="47" r="2" fill="#F59E0B"/>
      
      {/* Console centrale */}
      <Rect x="85" y="75" width="30" height="45" rx="4" 
        stroke={color} strokeWidth="2.5" fill="#E5E1F8"/>
      
      {/* Levier de vitesse */}
      <Ellipse cx="100" cy="90" rx="7" ry="10" fill="#2D3748" stroke={color} strokeWidth="2"/>
      <Rect x="98" y="78" width="4" height="12" rx="2" fill="#4A5568"/>
      <Circle cx="100" cy="77" r="3" fill="#E5E1F8"/>
      
      {/* Frein à main */}
      <Rect x="92" y="105" width="4" height="12" rx="2" fill={color}/>
      <Rect x="90" y="105" width="8" height="4" rx="1" fill="#2D3748"/>
      
      {/* Ceintures de sécurité */}
      <Path d="M 48 50 L 58 75" stroke="#2D3748" strokeWidth="3" strokeLinecap="round"/>
      <Path d="M 128 50 L 138 75" stroke="#2D3748" strokeWidth="3" strokeLinecap="round"/>
      
      {/* Ventilation centrale */}
      <Rect x="95" y="52" width="10" height="8" rx="2" stroke={color} strokeWidth="1.5" fill="#4A5568"/>
      <Line x1="97" y1="54" x2="97" y2="58" stroke={color} strokeWidth="0.5"/>
      <Line x1="100" y1="54" x2="100" y2="58" stroke={color} strokeWidth="0.5"/>
      <Line x1="103" y1="54" x2="103" y2="58" stroke={color} strokeWidth="0.5"/>
    </Svg>
  );
}

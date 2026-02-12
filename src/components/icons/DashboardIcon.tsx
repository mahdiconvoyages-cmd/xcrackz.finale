import React from 'react';
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

interface DashboardIconProps {
  size?: number;
  color?: string;
}

/**
 * Icône SVG détaillée représentant le tableau de bord avec compteurs réalistes
 * Adapté depuis le VehicleSchematic web avec graduations, aiguilles, affichage LCD
 * Optimisé pour Android avec react-native-svg
 */
export default function DashboardIcon({ size = 80, color = '#8B7BE8' }: DashboardIconProps) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 200 120" fill="none">
      {/* Fond du tableau de bord */}
      <Rect x="10" y="10" width="180" height="100" rx="12" 
        fill="#1A1825" stroke={color} strokeWidth="3"/>
      
      {/* Compteur de vitesse (gauche) */}
      <Circle cx="60" cy="60" r="32" stroke={color} strokeWidth="3" fill="#2D3748"/>
      <Circle cx="60" cy="60" r="28" stroke="#E5E1F8" strokeWidth="1" opacity="0.3" fill="none"/>
      
      {/* Graduations vitesse */}
      <Line x1="60" y1="32" x2="60" y2="38" stroke="#E5E1F8" strokeWidth="2.5"/>
      <Line x1="84" y1="46" x2="80" y2="50" stroke="#E5E1F8" strokeWidth="2"/>
      <Line x1="84" y1="74" x2="80" y2="70" stroke="#E5E1F8" strokeWidth="2"/>
      <Line x1="60" y1="88" x2="60" y2="82" stroke="#E5E1F8" strokeWidth="2.5"/>
      <Line x1="36" y1="74" x2="40" y2="70" stroke="#E5E1F8" strokeWidth="2"/>
      <Line x1="36" y1="46" x2="40" y2="50" stroke="#E5E1F8" strokeWidth="2"/>
      
      {/* Chiffres vitesse */}
      <SvgText x="60" y="28" fill="#E5E1F8" fontSize="7" fontWeight="600" textAnchor="middle">0</SvgText>
      <SvgText x="86" y="46" fill="#E5E1F8" fontSize="6" fontWeight="600">60</SvgText>
      <SvgText x="86" y="76" fill="#E5E1F8" fontSize="6" fontWeight="600">120</SvgText>
      <SvgText x="60" y="92" fill="#E5E1F8" fontSize="7" fontWeight="600" textAnchor="middle">180</SvgText>
      
      {/* Aiguille vitesse (vert à 80 km/h) */}
      <Line x1="60" y1="60" x2="74" y2="74" 
        stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="60" cy="60" r="4" fill="#10B981"/>
      
      {/* Label km/h */}
      <SvgText x="60" y="70" fill="#E5E1F8" fontSize="6" textAnchor="middle" opacity="0.7">km/h</SvgText>
      
      {/* Compteur tours (droit) */}
      <Circle cx="140" cy="60" r="32" stroke={color} strokeWidth="3" fill="#2D3748"/>
      <Circle cx="140" cy="60" r="28" stroke="#E5E1F8" strokeWidth="1" opacity="0.3" fill="none"/>
      
      {/* Graduations RPM */}
      <Line x1="140" y1="32" x2="140" y2="38" stroke="#E5E1F8" strokeWidth="2.5"/>
      <Line x1="164" y1="46" x2="160" y2="50" stroke="#E5E1F8" strokeWidth="2"/>
      <Line x1="164" y1="74" x2="160" y2="70" stroke="#E5E1F8" strokeWidth="2"/>
      <Line x1="140" y1="88" x2="140" y2="82" stroke="#E5E1F8" strokeWidth="2.5"/>
      <Line x1="116" y1="74" x2="120" y2="70" stroke="#E5E1F8" strokeWidth="2"/>
      <Line x1="116" y1="46" x2="120" y2="50" stroke="#E5E1F8" strokeWidth="2"/>
      
      {/* Chiffres RPM */}
      <SvgText x="140" y="28" fill="#E5E1F8" fontSize="7" fontWeight="600" textAnchor="middle">0</SvgText>
      <SvgText x="166" y="46" fill="#E5E1F8" fontSize="6" fontWeight="600">2</SvgText>
      <SvgText x="166" y="76" fill="#E5E1F8" fontSize="6" fontWeight="600">4</SvgText>
      <SvgText x="140" y="92" fill="#E5E1F8" fontSize="7" fontWeight="600" textAnchor="middle">6</SvgText>
      
      {/* Zone rouge RPM (5000-6000) */}
      <Path d="M 150 37 A 28 28 0 0 1 160 43" 
        stroke="#EF4444" strokeWidth="6" strokeLinecap="round" fill="none"/>
      
      {/* Aiguille RPM (jaune à 2500) */}
      <Line x1="140" y1="60" x2="154" y2="74" 
        stroke="#FFD93D" strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="140" cy="60" r="4" fill="#FFD93D"/>
      
      {/* Label RPM */}
      <SvgText x="140" y="70" fill="#E5E1F8" fontSize="5" textAnchor="middle" opacity="0.7">x1000</SvgText>
      
      {/* Affichage digital LCD */}
      <Rect x="70" y="95" width="60" height="12" rx="2" 
        fill="#2D3748" stroke="#4A5568" strokeWidth="1"/>
      <SvgText x="100" y="103" fill="#10B981" fontSize="6" 
        fontFamily="monospace" textAnchor="middle">45,678 km</SvgText>
      
      {/* Voyants */}
      <Circle cx="25" cy="25" r="3" fill="#10B981" opacity="0.8"/>
      <Circle cx="175" cy="25" r="3" fill="#F59E0B" opacity="0.8"/>
    </Svg>
  );
}

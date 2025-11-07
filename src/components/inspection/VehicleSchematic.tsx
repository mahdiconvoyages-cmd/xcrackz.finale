import React from 'react';
import { View } from 'react-native';
import Svg, { 
  Path, 
  Rect, 
  Circle, 
  Ellipse, 
  Line, 
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop 
} from 'react-native-svg';

export type SchematicType = 
  | 'front' 
  | 'back' 
  | 'left_front'
  | 'left_back'
  | 'right_front'
  | 'right_back'
  | 'interior'
  | 'dashboard';

interface VehicleSchematicProps {
  type: SchematicType;
  width?: number;
  height?: number;
}

export default function VehicleSchematic({ type, width = 200, height = 150 }: VehicleSchematicProps) {
  const renderSchematic = () => {
    switch (type) {
      case 'front':
        return (
          <Svg width={width} height={height} viewBox="0 0 200 150" fill="none">
            {/* 🚗 VUE DE FACE */}
            
            {/* Toit avec ligne centrale */}
            <Path d="M 65 22 Q 100 18 135 22 L 138 38 L 62 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Pare-brise incliné */}
            <Path d="M 62 38 L 55 58 L 145 58 L 138 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.6"/>
            {/* Reflets pare-brise */}
            <Path d="M 65 40 L 60 54 L 80 54 L 75 40 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.4"/>
            <Path d="M 125 40 L 120 54 L 140 54 L 135 40 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.4"/>
            
            {/* Capot avec ligne centrale */}
            <Path d="M 55 58 Q 100 55 145 58 L 148 92 Q 100 88 52 92 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            <Line x1="100" y1="58" x2="100" y2="90" stroke="#2D3748" strokeWidth="2" opacity="0.3"/>
            
            {/* Ailes avant larges */}
            <Path d="M 52 92 Q 42 96 38 104 L 38 112 L 58 114 L 62 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            <Path d="M 148 92 Q 158 96 162 104 L 162 112 L 142 114 L 138 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Calandre */}
            <Path d="M 85 94 L 80 108 L 120 108 L 115 94 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#1A202C"/>
            
            {/* Logo central */}
            <Circle cx="100" cy="101" r="9" stroke="#2D3748" strokeWidth="2.5" fill="#718096"/>
            <Circle cx="100" cy="101" r="6" stroke="#E2E8F0" strokeWidth="2" fill="none"/>
            
            {/* Phares LED modernes */}
            <Defs>
              <LinearGradient id="ledGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9"/>
                <Stop offset="100%" stopColor="#FFA500" stopOpacity="0.9"/>
              </LinearGradient>
            </Defs>
            
            {/* Phare gauche */}
            <Path d="M 48 95 Q 44 98 46 102 L 58 104 L 72 102 Q 74 98 72 95 Z" 
              fill="url(#ledGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <Rect x="48" y="96" width="22" height="6" rx="2" fill="#FFFFFF" opacity="0.8"/>
            
            {/* Phare droit */}
            <Path d="M 152 95 Q 156 98 154 102 L 142 104 L 128 102 Q 126 98 128 95 Z" 
              fill="url(#ledGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <Rect x="130" y="96" width="22" height="6" rx="2" fill="#FFFFFF" opacity="0.8"/>
            
            {/* Plaque d'immatriculation */}
            <Rect x="70" y="108" width="60" height="12" rx="2" 
              stroke="#2D3748" strokeWidth="2" fill="#FFFFFF"/>
            <Rect x="72" y="110" width="12" height="8" rx="1" fill="#003399"/>
            <Rect x="116" y="110" width="12" height="8" rx="1" fill="#003399"/>
            
            {/* Pare-chocs avant */}
            <Path d="M 35 114 Q 38 120 48 122 L 152 122 Q 162 120 165 114" 
              stroke="#2D3748" strokeWidth="2.5" fill="#4A5568"/>
          </Svg>
        );

      case 'back':
        return (
          <Svg width={width} height={height} viewBox="0 0 200 150" fill="none">
            {/* 🚗 VUE ARRIÈRE */}
            
            {/* Toit */}
            <Path d="M 65 22 Q 100 18 135 22 L 138 38 L 62 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Lunette arrière */}
            <Path d="M 62 38 L 58 56 L 142 56 L 138 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Coffre */}
            <Path d="M 58 56 Q 100 54 142 56 L 146 92 Q 100 88 54 92 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            <Line x1="60" y1="72" x2="140" y2="72" stroke="#2D3748" strokeWidth="2" opacity="0.3"/>
            
            {/* Ailes arrière */}
            <Path d="M 54 92 Q 44 96 40 104 L 40 112 L 60 114 L 64 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            <Path d="M 146 92 Q 156 96 160 104 L 160 112 L 140 114 L 136 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Feux arrière LED */}
            <Defs>
              <LinearGradient id="rearLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#DC2626" stopOpacity="1"/>
                <Stop offset="50%" stopColor="#B91C1C" stopOpacity="0.9"/>
                <Stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.8"/>
              </LinearGradient>
            </Defs>
            
            {/* Feu gauche */}
            <Path d="M 46 94 L 46 106 L 70 106 L 70 94 Z" 
              fill="url(#rearLight)" stroke="#2D3748" strokeWidth="2.5"/>
            <Rect x="48" y="96" width="20" height="8" rx="1" fill="#DC2626" opacity="0.8"/>
            
            {/* Feu droit */}
            <Path d="M 154 94 L 154 106 L 130 106 L 130 94 Z" 
              fill="url(#rearLight)" stroke="#2D3748" strokeWidth="2.5"/>
            <Rect x="132" y="96" width="20" height="8" rx="1" fill="#DC2626" opacity="0.8"/>
            
            {/* Plaque arrière */}
            <Rect x="70" y="108" width="60" height="12" rx="2" 
              stroke="#2D3748" strokeWidth="2" fill="#FFFFFF"/>
            <Rect x="72" y="110" width="12" height="8" rx="1" fill="#003399"/>
            <Rect x="116" y="110" width="12" height="8" rx="1" fill="#003399"/>
            
            {/* Pare-chocs arrière */}
            <Path d="M 36 114 Q 40 120 50 122 L 150 122 Q 160 120 164 114" 
              stroke="#2D3748" strokeWidth="2.5" fill="#4A5568"/>
          </Svg>
        );

      case 'left_front':
        return (
          <Svg width={width} height={height} viewBox="0 0 220 140" fill="none">
            {/* 🚗 LATÉRAL GAUCHE AVANT */}
            
            {/* Toit */}
            <Path d="M 40 42 Q 80 38 140 42 L 142 50 L 38 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Pare-brise incliné */}
            <Path d="M 40 42 L 52 28 L 80 28 L 82 42 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant A */}
            <Path d="M 52 28 L 50 50 L 54 50 L 80 28 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre avant */}
            <Path d="M 54 50 L 54 68 L 95 68 L 95 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B */}
            <Rect x="95" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Capot et aile */}
            <Path d="M 82 42 L 140 42 L 148 50 L 150 85 L 142 88 L 138 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Portière avant */}
            <Path d="M 38 52 L 38 88 L 95 88 L 95 68 L 54 68 L 54 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Poignée de porte */}
            <Rect x="48" y="66" width="14" height="4" rx="2" 
              stroke="#2D3748" strokeWidth="1.5" fill="#718096"/>
            
            {/* Rétroviseur */}
            <Path d="M 32 48 L 26 52 L 28 58 L 34 54 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#4A5568"/>
            <Ellipse cx="29" cy="55" rx="4" ry="2.5" fill="#B3D9FF" opacity="0.6" stroke="#2D3748" strokeWidth="1"/>
            
            {/* Phare avant */}
            <Ellipse cx="142" cy="70" rx="12" ry="8" fill="#FFFFFF" stroke="#2D3748" strokeWidth="2.5" opacity="0.9"/>
            
            {/* Roue avant */}
            <Ellipse cx="125" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <Ellipse cx="125" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <Ellipse cx="125" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            
            {/* Bas de caisse */}
            <Line x1="38" y1="88" x2="150" y2="88" stroke="#2D3748" strokeWidth="3"/>
          </Svg>
        );

      case 'left_back':
        return (
          <Svg width={width} height={height} viewBox="0 0 220 140" fill="none">
            {/* 🚗 LATÉRAL GAUCHE ARRIÈRE */}
            
            {/* Toit */}
            <Path d="M 60 42 Q 100 38 160 44 L 162 52 L 58 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Lunette arrière */}
            <Path d="M 160 44 L 172 30 L 185 30 L 180 44 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant C */}
            <Path d="M 172 30 L 160 52 L 165 52 L 185 30 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre arrière */}
            <Path d="M 99 50 L 99 68 L 145 68 L 145 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B */}
            <Rect x="145" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Coffre et aile arrière */}
            <Path d="M 58 50 L 50 85 L 50 88 L 99 88 L 99 68 L 165 68 L 165 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Portière arrière */}
            <Path d="M 149 52 L 149 88 L 185 88 L 180 68 L 165 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Feu arrière */}
            <Path d="M 52 76 L 50 86 L 58 88 L 60 78 Z" 
              fill="#DC2626" stroke="#2D3748" strokeWidth="2.5" opacity="0.8"/>
            
            {/* Roue arrière */}
            <Ellipse cx="75" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <Ellipse cx="75" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <Ellipse cx="75" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            
            {/* Bas de caisse */}
            <Line x1="50" y1="88" x2="185" y2="88" stroke="#2D3748" strokeWidth="3"/>
          </Svg>
        );

      case 'right_front':
        return (
          <Svg width={width} height={height} viewBox="0 0 220 140" fill="none">
            {/* 🚗 LATÉRAL DROIT AVANT (miroir) */}
            
            {/* Toit */}
            <Path d="M 180 42 Q 140 38 80 42 L 78 50 L 182 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Pare-brise */}
            <Path d="M 180 42 L 168 28 L 140 28 L 138 42 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant A */}
            <Path d="M 168 28 L 170 50 L 166 50 L 140 28 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre avant */}
            <Path d="M 166 50 L 166 68 L 125 68 L 125 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B */}
            <Rect x="121" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Capot et aile */}
            <Path d="M 138 42 L 80 42 L 72 50 L 70 85 L 78 88 L 82 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Portière avant */}
            <Path d="M 182 52 L 182 88 L 125 88 L 125 68 L 166 68 L 166 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Poignée */}
            <Rect x="158" y="66" width="14" height="4" rx="2" 
              stroke="#2D3748" strokeWidth="1.5" fill="#718096"/>
            
            {/* Rétroviseur */}
            <Path d="M 188 48 L 194 52 L 192 58 L 186 54 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#4A5568"/>
            <Ellipse cx="191" cy="55" rx="4" ry="2.5" fill="#B3D9FF" opacity="0.6" stroke="#2D3748" strokeWidth="1"/>
            
            {/* Phare */}
            <Ellipse cx="78" cy="70" rx="12" ry="8" fill="#FFFFFF" stroke="#2D3748" strokeWidth="2.5" opacity="0.9"/>
            
            {/* Roue */}
            <Ellipse cx="95" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <Ellipse cx="95" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <Ellipse cx="95" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            
            {/* Bas de caisse */}
            <Line x1="70" y1="88" x2="182" y2="88" stroke="#2D3748" strokeWidth="3"/>
          </Svg>
        );

      case 'right_back':
        return (
          <Svg width={width} height={height} viewBox="0 0 220 140" fill="none">
            {/* 🚗 LATÉRAL DROIT ARRIÈRE (miroir) */}
            
            {/* Toit */}
            <Path d="M 160 42 Q 120 38 60 44 L 58 52 L 162 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Lunette */}
            <Path d="M 60 44 L 48 30 L 35 30 L 40 44 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant C */}
            <Path d="M 48 30 L 60 52 L 55 52 L 35 30 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre arrière */}
            <Path d="M 121 50 L 121 68 L 75 68 L 75 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B */}
            <Rect x="71" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Coffre et aile */}
            <Path d="M 162 50 L 170 85 L 170 88 L 121 88 L 121 68 L 55 68 L 55 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Portière arrière */}
            <Path d="M 71 52 L 71 88 L 35 88 L 40 68 L 55 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Feu arrière */}
            <Path d="M 168 76 L 170 86 L 162 88 L 160 78 Z" 
              fill="#DC2626" stroke="#2D3748" strokeWidth="2.5" opacity="0.8"/>
            
            {/* Roue arrière */}
            <Ellipse cx="145" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <Ellipse cx="145" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <Ellipse cx="145" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            
            {/* Bas de caisse */}
            <Line x1="35" y1="88" x2="170" y2="88" stroke="#2D3748" strokeWidth="3"/>
          </Svg>
        );

      case 'interior':
        return (
          <Svg width={width} height={height} viewBox="0 0 200 150" fill="none">
            {/* 🪑 VUE INTÉRIEURE */}
            
            {/* Cadre habitacle */}
            <Rect x="20" y="30" width="160" height="95" rx="10" 
              stroke="#8B7BE8" strokeWidth="3" fill="#F8F7FF"/>
            
            {/* Siège conducteur */}
            <Path d="M 45 55 L 45 95 L 75 95 L 75 65 Q 75 55 65 55 Z" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#E5E1F8"/>
            <Path d="M 45 55 L 45 45 L 65 45 Q 75 45 75 55" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#D1CDEE"/>
            <Rect x="52" y="35" width="18" height="10" rx="4" 
              fill="#8B7BE8" stroke="#8B7BE8" strokeWidth="2"/>
            
            {/* Siège passager */}
            <Path d="M 125 55 L 125 95 L 155 95 L 155 65 Q 155 55 145 55 Z" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#E5E1F8"/>
            <Path d="M 125 55 L 125 45 L 145 45 Q 155 45 155 55" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#D1CDEE"/>
            <Rect x="130" y="35" width="18" height="10" rx="4" 
              fill="#8B7BE8" stroke="#8B7BE8" strokeWidth="2"/>
            
            {/* Volant */}
            <Circle cx="60" cy="50" r="14" stroke="#8B7BE8" strokeWidth="3" fill="none"/>
            <Circle cx="60" cy="50" r="8" stroke="#8B7BE8" strokeWidth="2.5" fill="#8B7BE8"/>
            
            {/* Tableau de bord */}
            <Path d="M 30 45 L 170 45 L 170 50 L 30 50 Z" 
              stroke="#8B7BE8" strokeWidth="3" fill="#2D3748"/>
            <Circle cx="95" cy="47" r="2" fill="#10B981"/>
            <Circle cx="105" cy="47" r="2" fill="#F59E0B"/>
            
            {/* Console centrale */}
            <Rect x="85" y="75" width="30" height="45" rx="4" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#E5E1F8"/>
            
            {/* Levier de vitesse */}
            <Ellipse cx="100" cy="90" rx="7" ry="10" fill="#2D3748" stroke="#8B7BE8" strokeWidth="2"/>
            <Rect x="98" y="78" width="4" height="12" rx="2" fill="#4A5568"/>
            <Circle cx="100" cy="77" r="3" fill="#E5E1F8"/>
          </Svg>
        );

      case 'dashboard':
        return (
          <Svg width={width} height={height} viewBox="0 0 200 150" fill="none">
            {/* 📊 TABLEAU DE BORD */}
            
            {/* Fond */}
            <Rect x="20" y="25" width="160" height="100" rx="12" 
              stroke="#8B7BE8" strokeWidth="3" fill="#1A1825"/>
            
            {/* Compteur vitesse */}
            <Circle cx="65" cy="70" r="32" stroke="#8B7BE8" strokeWidth="3" fill="#0F0D1B"/>
            <Circle cx="65" cy="70" r="28" stroke="#4A5568" strokeWidth="1" fill="none" opacity="0.3"/>
            
            {/* Aiguille vitesse */}
            <Line x1="65" y1="70" x2="80" y2="54" stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
            <Circle cx="65" cy="70" r="4" fill="#10B981"/>
            
            {/* Compteur tours/min */}
            <Circle cx="135" cy="70" r="32" stroke="#8B7BE8" strokeWidth="3" fill="#0F0D1B"/>
            <Circle cx="135" cy="70" r="28" stroke="#4A5568" strokeWidth="1" fill="none" opacity="0.3"/>
            
            {/* Aiguille RPM */}
            <Line x1="135" y1="70" x2="148" y2="80" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round"/>
            <Circle cx="135" cy="70" r="4" fill="#FFD93D"/>
            
            {/* Écran digital */}
            <Rect x="40" y="108" width="120" height="14" rx="3" 
              stroke="#8B7BE8" strokeWidth="2" fill="#0F0D1B"/>
            
            {/* Témoins lumineux */}
            <Circle cx="50" cy="38" r="5" fill="#F59E0B" stroke="#8B7BE8" strokeWidth="1.5"/>
            <Circle cx="70" cy="38" r="5" fill="#EF4444" stroke="#8B7BE8" strokeWidth="1.5"/>
            <Circle cx="90" cy="38" r="5" fill="#10B981" stroke="#8B7BE8" strokeWidth="1.5"/>
            <Circle cx="110" cy="38" r="5" fill="#F59E0B" stroke="#8B7BE8" strokeWidth="1.5"/>
            <Circle cx="130" cy="38" r="5" fill="#EF4444" stroke="#8B7BE8" strokeWidth="1.5"/>
            <Circle cx="150" cy="38" r="5" fill="#EF4444" stroke="#8B7BE8" strokeWidth="1.5"/>
          </Svg>
        );

      default:
        return null;
    }
  };

  return <View>{renderSchematic()}</View>;
}

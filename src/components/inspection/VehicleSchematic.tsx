export type SchematicType = 
  | 'front' 
  | 'back' 
  | 'left_front'
  | 'left_back'
  | 'right_front'
  | 'right_back'
  | 'interior'
  | 'dashboard'
  | 'delivery_receipt';

export type VehicleType = 'VL' | 'VU' | 'PL';

interface VehicleSchematicProps {
  type: SchematicType;
  vehicleType?: VehicleType; // Type de véhicule pour adapter le SVG
  className?: string;
}

export default function VehicleSchematic({ type, className = '' }: VehicleSchematicProps) {
  // TODO: Implémenter vehicleType pour adapter les SVG (VU et PL)
  // Pour l'instant, tous les véhicules utilisent le design VL
  
  const renderSchematic = () => {
    switch (type) {
      case 'front':
        return (
          <svg viewBox="0 0 200 150" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 🚗 VUE DE FACE - Basé sur votre photo avant.png */}
            
            {/* Toit avec ligne centrale */}
            <path d="M 65 22 Q 100 18 135 22 L 138 38 L 62 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Pare-brise incliné (angle plus naturel) */}
            <path d="M 62 38 L 55 58 L 145 58 L 138 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.6"/>
            {/* Reflets pare-brise */}
            <path d="M 65 40 L 60 54 L 80 54 L 75 40 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.4"/>
            <path d="M 125 40 L 120 54 L 140 54 L 135 40 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.4"/>
            
            {/* Capot avec ligne centrale prononcée */}
            <path d="M 55 58 Q 100 55 145 58 L 148 92 Q 100 88 52 92 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            {/* Ligne centrale capot */}
            <line x1="100" y1="58" x2="100" y2="90" stroke="#2D3748" strokeWidth="2" opacity="0.3"/>
            {/* Nervures capot symétriques */}
            <path d="M 68 62 Q 85 60 95 62" stroke="#2D3748" strokeWidth="1.5" opacity="0.25"/>
            <path d="M 132 62 Q 115 60 105 62" stroke="#2D3748" strokeWidth="1.5" opacity="0.25"/>
            
            {/* Ailes avant larges */}
            <path d="M 52 92 Q 42 96 38 104 L 38 112 L 58 114 L 62 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            <path d="M 148 92 Q 158 96 162 104 L 162 112 L 142 114 L 138 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Calandre style moderne (hexagone allongé) */}
            <path d="M 85 94 L 80 108 L 120 108 L 115 94 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#1A202C"/>
            {/* Barres horizontales calandre */}
            <line x1="82" y1="98" x2="118" y2="98" stroke="#4A5568" strokeWidth="1.5"/>
            <line x1="81" y1="103" x2="119" y2="103" stroke="#4A5568" strokeWidth="1.5"/>
            
            {/* Logo central */}
            <circle cx="100" cy="101" r="9" stroke="#2D3748" strokeWidth="2.5" fill="#718096"/>
            <circle cx="100" cy="101" r="6" stroke="#E2E8F0" strokeWidth="2" fill="none"/>
            
            {/* Phares LED modernes (forme en L inversé) */}
            {/* Phare gauche */}
            <path d="M 48 95 Q 44 98 46 102 L 58 104 L 72 102 Q 74 98 72 95 Z" 
              fill="url(#ledGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <rect x="48" y="96" width="22" height="6" rx="2" fill="#FFFFFF" opacity="0.8"/>
            <circle cx="52" cy="99" r="2" fill="#FFE066"/>
            <circle cx="62" cy="99" r="2" fill="#FFE066"/>
            {/* Phare droit */}
            <path d="M 152 95 Q 156 98 154 102 L 142 104 L 128 102 Q 126 98 128 95 Z" 
              fill="url(#ledGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <rect x="130" y="96" width="22" height="6" rx="2" fill="#FFFFFF" opacity="0.8"/>
            <circle cx="148" cy="99" r="2" fill="#FFE066"/>
            <circle cx="138" cy="99" r="2" fill="#FFE066"/>
            
            {/* Antibrouillards ronds */}
            <circle cx="60" cy="112" r="4" fill="#FFD93D" stroke="#2D3748" strokeWidth="1.5"/>
            <circle cx="140" cy="112" r="4" fill="#FFD93D" stroke="#2D3748" strokeWidth="1.5"/>
            
            {/* Plaque d'immatriculation française */}
            <rect x="70" y="108" width="60" height="12" rx="2" 
              stroke="#2D3748" strokeWidth="2" fill="#FFFFFF"/>
            <rect x="72" y="110" width="12" height="8" rx="1" fill="#003399"/>
            <rect x="116" y="110" width="12" height="8" rx="1" fill="#003399"/>
            <text x="100" y="117" fontSize="8" fill="#1A202C" textAnchor="middle" fontFamily="Arial" fontWeight="bold">AB-123-CD</text>
            
            {/* Pare-chocs avant avec prise d'air */}
            <path d="M 35 114 Q 38 120 48 122 L 152 122 Q 162 120 165 114" 
              stroke="#2D3748" strokeWidth="2.5" fill="#4A5568"/>
            <rect x="75" y="116" width="50" height="4" rx="1" fill="#1A202C" opacity="0.5"/>
            
            {/* Gradients */}
            <defs>
              <linearGradient id="ledGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#FFA500" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
          </svg>
        );

      case 'back':
        return (
          <svg viewBox="0 0 200 150" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 🚗 VUE ARRIÈRE - Basé sur votre photo arriere.png */}
            
            {/* Toit plat */}
            <path d="M 65 22 Q 100 18 135 22 L 138 38 L 62 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Lunette arrière très inclinée */}
            <path d="M 62 38 L 58 56 L 142 56 L 138 38 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            {/* Reflets lunette */}
            <path d="M 70 40 L 68 52 L 90 52 L 85 40 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.3"/>
            
            {/* Coffre avec ligne de hayon */}
            <path d="M 58 56 Q 100 54 142 56 L 146 92 Q 100 88 54 92 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            {/* Ligne de hayon */}
            <line x1="60" y1="72" x2="140" y2="72" stroke="#2D3748" strokeWidth="2" opacity="0.3"/>
            
            {/* Ailes arrière musclées */}
            <path d="M 54 92 Q 44 96 40 104 L 40 112 L 60 114 L 64 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            <path d="M 146 92 Q 156 96 160 104 L 160 112 L 140 114 L 136 104 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Feux arrière LED (design horizontal moderne) */}
            {/* Feu gauche */}
            <path d="M 46 94 L 46 106 L 70 106 L 70 94 Z" 
              fill="url(#rearLightGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <rect x="48" y="96" width="20" height="8" rx="1" fill="#DC2626" opacity="0.8"/>
            <line x1="48" y1="100" x2="68" y2="100" stroke="#FFF" strokeWidth="1" opacity="0.5"/>
            <circle cx="52" cy="100" r="2" fill="#FFE066"/>
            
            {/* Feu droit */}
            <path d="M 154 94 L 154 106 L 130 106 L 130 94 Z" 
              fill="url(#rearLightGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <rect x="132" y="96" width="20" height="8" rx="1" fill="#DC2626" opacity="0.8"/>
            <line x1="132" y1="100" x2="152" y2="100" stroke="#FFF" strokeWidth="1" opacity="0.5"/>
            <circle cx="148" cy="100" r="2" fill="#FFE066"/>
            
            {/* Bandeau lumineux central (LED moderne) */}
            <rect x="72" y="98" width="56" height="4" rx="2" fill="#DC2626" opacity="0.5" stroke="#2D3748" strokeWidth="1.5"/>
            
            {/* Réflecteurs ronds */}
            <circle cx="62" cy="110" r="3" fill="#FF4D6D" stroke="#2D3748" strokeWidth="1.5"/>
            <circle cx="138" cy="110" r="3" fill="#FF4D6D" stroke="#2D3748" strokeWidth="1.5"/>
            
            {/* Plaque arrière */}
            <rect x="70" y="108" width="60" height="12" rx="2" 
              stroke="#2D3748" strokeWidth="2" fill="#FFFFFF"/>
            <rect x="72" y="110" width="12" height="8" rx="1" fill="#003399"/>
            <rect x="116" y="110" width="12" height="8" rx="1" fill="#003399"/>
            <text x="100" y="117" fontSize="8" fill="#1A202C" textAnchor="middle" fontFamily="Arial" fontWeight="bold">AB-123-CD</text>
            
            {/* Pare-chocs arrière avec diffuseur */}
            <path d="M 36 114 Q 40 120 50 122 L 150 122 Q 160 120 164 114" 
              stroke="#2D3748" strokeWidth="2.5" fill="#4A5568"/>
            {/* Diffuseur sportif */}
            <rect x="70" y="117" width="20" height="4" rx="1" fill="#1A202C" opacity="0.6"/>
            <rect x="110" y="117" width="20" height="4" rx="1" fill="#1A202C" opacity="0.6"/>
            
            {/* Échappement double */}
            <ellipse cx="132" cy="119" rx="4" ry="2.5" fill="#718096" stroke="#2D3748" strokeWidth="1.5"/>
            <ellipse cx="132" cy="119" rx="2.5" ry="1.5" fill="#2D3748"/>
            
            <defs>
              <linearGradient id="rearLightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#DC2626" stopOpacity="1"/>
                <stop offset="50%" stopColor="#B91C1C" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.8"/>
              </linearGradient>
            </defs>
          </svg>
        );

      case 'left_front':
        return (
          <svg viewBox="0 0 220 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 🚗 LATÉRAL GAUCHE AVANT - Basé sur lateral gauche avant.png */}
            
            {/* Toit plat avec léger arc */}
            <path d="M 40 42 Q 80 38 140 42 L 142 50 L 38 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Pare-brise incliné (angle berline) */}
            <path d="M 40 42 L 52 28 L 80 28 L 82 42 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            <path d="M 45 40 L 55 32 L 75 32 L 78 40 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.3"/>
            
            {/* Montant A (pilier avant) */}
            <path d="M 52 28 L 50 50 L 54 50 L 80 28 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre avant (portière conducteur) */}
            <path d="M 54 50 L 54 68 L 95 68 L 95 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B (pilier central) */}
            <rect x="95" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Capot et aile avant */}
            <path d="M 82 42 L 140 42 L 148 50 L 150 85 L 142 88 L 138 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            {/* Ligne de capot */}
            <line x1="90" y1="46" x2="145" y2="48" stroke="#2D3748" strokeWidth="1.5" opacity="0.25"/>
            
            {/* Portière avant complète */}
            <path d="M 38 52 L 38 88 L 95 88 L 95 68 L 54 68 L 54 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            {/* Ligne de portière */}
            <line x1="42" y1="72" x2="92" y2="72" stroke="#2D3748" strokeWidth="1.5" opacity="0.3"/>
            
            {/* Poignée de porte chromée */}
            <rect x="48" y="66" width="14" height="4" rx="2" 
              stroke="#2D3748" strokeWidth="1.5" fill="#718096"/>
            <ellipse cx="50" cy="68" rx="1.5" ry="1" fill="#E2E8F0"/>
            
            {/* Rétroviseur latéral moderne */}
            <path d="M 32 48 L 26 52 L 28 58 L 34 54 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#4A5568"/>
            <ellipse cx="29" cy="55" rx="4" ry="2.5" fill="#B3D9FF" opacity="0.6" stroke="#2D3748" strokeWidth="1"/>
            
            {/* Phare avant (vue latérale) */}
            <ellipse cx="142" cy="70" rx="12" ry="8" fill="url(#sideLightGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <ellipse cx="144" cy="68" rx="4" ry="3" fill="#FFFFFF" opacity="0.9"/>
            
            {/* Roue avant avec jante détaillée */}
            <ellipse cx="125" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <ellipse cx="125" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <ellipse cx="125" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            {/* Rayons jante style moderne (5 branches) */}
            <path d="M 125 81 L 125 111" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 110 96 L 140 96" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 113 85 L 137 107" stroke="#718096" strokeWidth="2"/>
            <path d="M 137 85 L 113 107" stroke="#718096" strokeWidth="2"/>
            <circle cx="125" cy="96" r="4" fill="#718096"/>
            
            {/* Passage de roue avant */}
            <path d="M 142 88 Q 125 78 105 88" 
              stroke="#2D3748" strokeWidth="2.5" fill="none"/>
            
            {/* Bas de caisse et protection latérale */}
            <line x1="38" y1="88" x2="150" y2="88" stroke="#2D3748" strokeWidth="3"/>
            <path d="M 40 88 L 42 96 L 148 96 L 150 88" 
              stroke="#2D3748" strokeWidth="2" fill="#CBD5E0"/>
            
            <defs>
              <linearGradient id="sideLightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFF" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#FFE066" stopOpacity="1"/>
              </linearGradient>
            </defs>
          </svg>
        );

      case 'left_back':
        return (
          <svg viewBox="0 0 220 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 🚗 LATÉRAL GAUCHE ARRIÈRE - Basé sur lateral gauche arriere.png */}
            
            {/* Toit descendant vers l'arrière */}
            <path d="M 60 42 Q 100 38 160 44 L 162 52 L 58 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Lunette arrière très inclinée */}
            <path d="M 160 44 L 172 30 L 185 30 L 180 44 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            <path d="M 165 42 L 175 34 L 182 34 L 178 42 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.3"/>
            
            {/* Montant C (pilier arrière épais) */}
            <path d="M 172 30 L 160 52 L 165 52 L 185 30 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre arrière (custode) */}
            <path d="M 99 50 L 99 68 L 145 68 L 145 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B */}
            <rect x="145" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Coffre et aile arrière musclée */}
            <path d="M 58 50 L 50 85 L 50 88 L 99 88 L 99 68 L 165 68 L 165 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Ligne de coffre/hayon */}
            <line x1="55" y1="70" x2="162" y2="70" stroke="#2D3748" strokeWidth="1.5" opacity="0.3"/>
            
            {/* Portière arrière complète */}
            <path d="M 149 52 L 149 88 L 185 88 L 180 68 L 165 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Poignée de porte arrière */}
            <rect x="158" y="66" width="14" height="4" rx="2" 
              stroke="#2D3748" strokeWidth="1.5" fill="#718096"/>
            <ellipse cx="170" cy="68" rx="1.5" ry="1" fill="#E2E8F0"/>
            
            {/* Feu arrière (vue latérale) */}
            <path d="M 52 76 L 50 86 L 58 88 L 60 78 Z" 
              fill="url(#rearSideLightGradient)" stroke="#2D3748" strokeWidth="2.5"/>
            <rect x="52" y="78" width="6" height="8" rx="1" fill="#DC2626" opacity="0.8"/>
            <circle cx="55" cy="82" r="1.5" fill="#FFE066"/>
            
            {/* Roue arrière avec jante détaillée */}
            <ellipse cx="75" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <ellipse cx="75" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <ellipse cx="75" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            {/* Rayons jante 5 branches */}
            <path d="M 75 81 L 75 111" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 60 96 L 90 96" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 63 85 L 87 107" stroke="#718096" strokeWidth="2"/>
            <path d="M 87 85 L 63 107" stroke="#718096" strokeWidth="2"/>
            <circle cx="75" cy="96" r="4" fill="#718096"/>
            
            {/* Passage de roue arrière */}
            <path d="M 50 88 Q 75 78 95 88" 
              stroke="#2D3748" strokeWidth="2.5" fill="none"/>
            
            {/* Bas de caisse */}
            <line x1="50" y1="88" x2="185" y2="88" stroke="#2D3748" strokeWidth="3"/>
            <path d="M 52 88 L 54 96 L 183 96 L 185 88" 
              stroke="#2D3748" strokeWidth="2" fill="#CBD5E0"/>
            
            {/* Pare-chocs arrière visible */}
            <rect x="48" y="90" width="12" height="8" rx="2" 
              fill="#4A5568" stroke="#2D3748" strokeWidth="1.5"/>
            
            <defs>
              <linearGradient id="rearSideLightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#DC2626" stopOpacity="1"/>
                <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
          </svg>
        );

      case 'right_front':
        return (
          <svg viewBox="0 0 220 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 🚗 LATÉRAL DROIT AVANT - Miroir de lateral droit avant.png */}
            
            {/* Toit plat avec léger arc (inversé) */}
            <path d="M 180 42 Q 140 38 80 42 L 78 50 L 182 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Pare-brise incliné (angle berline) - inversé */}
            <path d="M 180 42 L 168 28 L 140 28 L 138 42 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            <path d="M 175 40 L 165 32 L 145 32 L 142 40 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.3"/>
            
            {/* Montant A (pilier avant) - inversé */}
            <path d="M 168 28 L 170 50 L 166 50 L 140 28 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre avant (portière conducteur) - inversé */}
            <path d="M 166 50 L 166 68 L 125 68 L 125 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B (pilier central) - inversé */}
            <rect x="121" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Capot et aile avant - inversé */}
            <path d="M 138 42 L 80 42 L 72 50 L 70 85 L 78 88 L 82 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            {/* Ligne de capot */}
            <line x1="130" y1="46" x2="75" y2="48" stroke="#2D3748" strokeWidth="1.5" opacity="0.25"/>
            
            {/* Portière avant complète - inversé */}
            <path d="M 182 52 L 182 88 L 125 88 L 125 68 L 166 68 L 166 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            {/* Ligne de portière */}
            <line x1="178" y1="72" x2="128" y2="72" stroke="#2D3748" strokeWidth="1.5" opacity="0.3"/>
            
            {/* Poignée de porte chromée - inversé */}
            <rect x="158" y="66" width="14" height="4" rx="2" 
              stroke="#2D3748" strokeWidth="1.5" fill="#718096"/>
            <ellipse cx="170" cy="68" rx="1.5" ry="1" fill="#E2E8F0"/>
            
            {/* Rétroviseur latéral moderne - inversé */}
            <path d="M 188 48 L 194 52 L 192 58 L 186 54 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#4A5568"/>
            <ellipse cx="191" cy="55" rx="4" ry="2.5" fill="#B3D9FF" opacity="0.6" stroke="#2D3748" strokeWidth="1"/>
            
            {/* Phare avant (vue latérale) - inversé */}
            <ellipse cx="78" cy="70" rx="12" ry="8" fill="url(#sideLightGradientR)" stroke="#2D3748" strokeWidth="2.5"/>
            <ellipse cx="76" cy="68" rx="4" ry="3" fill="#FFFFFF" opacity="0.9"/>
            
            {/* Roue avant avec jante détaillée - inversé */}
            <ellipse cx="95" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <ellipse cx="95" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <ellipse cx="95" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            {/* Rayons jante style moderne (5 branches) */}
            <path d="M 95 81 L 95 111" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 80 96 L 110 96" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 83 85 L 107 107" stroke="#718096" strokeWidth="2"/>
            <path d="M 107 85 L 83 107" stroke="#718096" strokeWidth="2"/>
            <circle cx="95" cy="96" r="4" fill="#718096"/>
            
            {/* Passage de roue avant - inversé */}
            <path d="M 78 88 Q 95 78 115 88" 
              stroke="#2D3748" strokeWidth="2.5" fill="none"/>
            
            {/* Bas de caisse et protection latérale - inversé */}
            <line x1="70" y1="88" x2="182" y2="88" stroke="#2D3748" strokeWidth="3"/>
            <path d="M 72 88 L 70 96 L 180 96 L 182 88" 
              stroke="#2D3748" strokeWidth="2" fill="#CBD5E0"/>
            
            <defs>
              <linearGradient id="sideLightGradientR" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFE066" stopOpacity="1"/>
                <stop offset="100%" stopColor="#FFF" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
          </svg>
        );

      case 'right_back':
        return (
          <svg viewBox="0 0 220 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 🚗 LATÉRAL DROIT ARRIÈRE - Miroir de lateral droit arriere.png */}
            
            {/* Toit descendant vers l'arrière - inversé */}
            <path d="M 160 42 Q 120 38 60 44 L 58 52 L 162 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Lunette arrière très inclinée - inversé */}
            <path d="M 60 44 L 48 30 L 35 30 L 40 44 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            <path d="M 55 42 L 45 34 L 38 34 L 42 42 Z" 
              stroke="none" fill="#FFFFFF" opacity="0.3"/>
            
            {/* Montant C (pilier arrière épais) - inversé */}
            <path d="M 48 30 L 60 52 L 55 52 L 35 30 Z" 
              stroke="#2D3748" strokeWidth="2" fill="#2D3748"/>
            
            {/* Vitre arrière (custode) - inversé */}
            <path d="M 121 50 L 121 68 L 75 68 L 75 50 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#B3D9FF" opacity="0.5"/>
            
            {/* Montant B - inversé */}
            <rect x="71" y="50" width="4" height="18" fill="#2D3748" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Coffre et aile arrière musclée - inversé */}
            <path d="M 162 50 L 170 85 L 170 88 L 121 88 L 121 68 L 55 68 L 55 52 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            {/* Ligne de coffre/hayon - inversé */}
            <line x1="165" y1="70" x2="58" y2="70" stroke="#2D3748" strokeWidth="1.5" opacity="0.3"/>
            
            {/* Portière arrière complète - inversé */}
            <path d="M 71 52 L 71 88 L 35 88 L 40 68 L 55 68 Z" 
              stroke="#2D3748" strokeWidth="2.5" fill="#E2E8F0"/>
            
            {/* Poignée de porte arrière - inversé */}
            <rect x="48" y="66" width="14" height="4" rx="2" 
              stroke="#2D3748" strokeWidth="1.5" fill="#718096"/>
            <ellipse cx="50" cy="68" rx="1.5" ry="1" fill="#E2E8F0"/>
            
            {/* Feu arrière (vue latérale) - inversé */}
            <path d="M 168 76 L 170 86 L 162 88 L 160 78 Z" 
              fill="url(#rearSideLightGradientR)" stroke="#2D3748" strokeWidth="2.5"/>
            <rect x="162" y="78" width="6" height="8" rx="1" fill="#DC2626" opacity="0.8"/>
            <circle cx="165" cy="82" r="1.5" fill="#FFE066"/>
            
            {/* Roue arrière avec jante détaillée - inversé */}
            <ellipse cx="145" cy="96" rx="20" ry="20" stroke="#2D3748" strokeWidth="3" fill="#1A202C"/>
            <ellipse cx="145" cy="96" rx="15" ry="15" stroke="#718096" strokeWidth="2.5" fill="#2D3748"/>
            <ellipse cx="145" cy="96" rx="7" ry="7" stroke="#2D3748" strokeWidth="2" fill="#E2E8F0"/>
            {/* Rayons jante 5 branches - inversé */}
            <path d="M 145 81 L 145 111" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 130 96 L 160 96" stroke="#718096" strokeWidth="2.5"/>
            <path d="M 133 85 L 157 107" stroke="#718096" strokeWidth="2"/>
            <path d="M 157 85 L 133 107" stroke="#718096" strokeWidth="2"/>
            <circle cx="145" cy="96" r="4" fill="#718096"/>
            
            {/* Passage de roue arrière - inversé */}
            <path d="M 170 88 Q 145 78 125 88" 
              stroke="#2D3748" strokeWidth="2.5" fill="none"/>
            
            {/* Bas de caisse - inversé */}
            <line x1="35" y1="88" x2="170" y2="88" stroke="#2D3748" strokeWidth="3"/>
            <path d="M 37 88 L 35 96 L 168 96 L 170 88" 
              stroke="#2D3748" strokeWidth="2" fill="#CBD5E0"/>
            
            {/* Pare-chocs arrière visible - inversé */}
            <rect x="160" y="90" width="12" height="8" rx="2" 
              fill="#4A5568" stroke="#2D3748" strokeWidth="1.5"/>
            
            <defs>
              <linearGradient id="rearSideLightGradientR" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#DC2626" stopOpacity="1"/>
                <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
          </svg>
        );

      case 'interior':
        return (
          <svg viewBox="0 0 200 150" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 🪑 VUE INTÉRIEURE - Habitacle réaliste */}
            
            {/* Cadre habitacle */}
            <rect x="20" y="30" width="160" height="95" rx="10" 
              stroke="#8B7BE8" strokeWidth="3" fill="#F8F7FF"/>
            
            {/* Siège conducteur (gauche) */}
            <path d="M 45 55 L 45 95 L 75 95 L 75 65 Q 75 55 65 55 Z" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#E5E1F8"/>
            {/* Dossier */}
            <path d="M 45 55 L 45 45 L 65 45 Q 75 45 75 55" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#D1CDEE"/>
            {/* Appui-tête conducteur */}
            <rect x="52" y="35" width="18" height="10" rx="4" 
              fill="#8B7BE8" stroke="#8B7BE8" strokeWidth="2"/>
            {/* Coutures siège */}
            <line x1="55" y1="55" x2="55" y2="95" stroke="#8B7BE8" strokeWidth="1" opacity="0.5"/>
            <line x1="65" y1="55" x2="65" y2="95" stroke="#8B7BE8" strokeWidth="1" opacity="0.5"/>
            
            {/* Siège passager (droit) */}
            <path d="M 125 55 L 125 95 L 155 95 L 155 65 Q 155 55 145 55 Z" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#E5E1F8"/>
            <path d="M 125 55 L 125 45 L 145 45 Q 155 45 155 55" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#D1CDEE"/>
            <rect x="130" y="35" width="18" height="10" rx="4" 
              fill="#8B7BE8" stroke="#8B7BE8" strokeWidth="2"/>
            <line x1="135" y1="55" x2="135" y2="95" stroke="#8B7BE8" strokeWidth="1" opacity="0.5"/>
            <line x1="145" y1="55" x2="145" y2="95" stroke="#8B7BE8" strokeWidth="1" opacity="0.5"/>
            
            {/* Volant (gauche pour conduite française) */}
            <circle cx="60" cy="50" r="14" stroke="#8B7BE8" strokeWidth="3" fill="none"/>
            <circle cx="60" cy="50" r="8" stroke="#8B7BE8" strokeWidth="2.5" fill="#8B7BE8"/>
            {/* Branches volant */}
            <line x1="60" y1="36" x2="60" y2="44" stroke="#8B7BE8" strokeWidth="2.5"/>
            <line x1="60" y1="56" x2="60" y2="64" stroke="#8B7BE8" strokeWidth="2.5"/>
            <line x1="46" y1="50" x2="54" y2="50" stroke="#8B7BE8" strokeWidth="2.5"/>
            
            {/* Tableau de bord */}
            <path d="M 30 45 L 170 45 L 170 50 L 30 50 Z" 
              stroke="#8B7BE8" strokeWidth="3" fill="#2D3748"/>
            <circle cx="95" cy="47" r="2" fill="#10B981"/>
            <circle cx="105" cy="47" r="2" fill="#F59E0B"/>
            
            {/* Console centrale */}
            <rect x="85" y="75" width="30" height="45" rx="4" 
              stroke="#8B7BE8" strokeWidth="2.5" fill="#E5E1F8"/>
            
            {/* Levier de vitesse */}
            <ellipse cx="100" cy="90" rx="7" ry="10" fill="#2D3748" stroke="#8B7BE8" strokeWidth="2"/>
            <rect x="98" y="78" width="4" height="12" rx="2" fill="#4A5568"/>
            <circle cx="100" cy="77" r="3" fill="#E5E1F8"/>
            
            {/* Frein à main */}
            <rect x="92" y="105" width="4" height="12" rx="2" fill="#8B7BE8"/>
            <rect x="90" y="105" width="8" height="4" rx="1" fill="#2D3748"/>
            
            {/* Ceintures de sécurité */}
            <path d="M 48 50 L 58 75" stroke="#2D3748" strokeWidth="3" strokeLinecap="round"/>
            <path d="M 128 50 L 138 75" stroke="#2D3748" strokeWidth="3" strokeLinecap="round"/>
            
            {/* Ventilation centrale */}
            <rect x="95" y="52" width="10" height="8" rx="2" stroke="#8B7BE8" strokeWidth="1.5" fill="#4A5568"/>
            <line x1="97" y1="54" x2="97" y2="58" stroke="#8B7BE8" strokeWidth="0.5"/>
            <line x1="100" y1="54" x2="100" y2="58" stroke="#8B7BE8" strokeWidth="0.5"/>
            <line x1="103" y1="54" x2="103" y2="58" stroke="#8B7BE8" strokeWidth="0.5"/>
          </svg>
        );

      case 'dashboard':
        return (
          <svg viewBox="0 0 200 150" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 📊 TABLEAU DE BORD - Style digital moderne */}
            
            {/* Fond tableau de bord */}
            <rect x="20" y="25" width="160" height="100" rx="12" 
              stroke="#8B7BE8" strokeWidth="3" fill="#1A1825"/>
            
            {/* Compteur vitesse (gauche) */}
            <circle cx="65" cy="70" r="32" stroke="#8B7BE8" strokeWidth="3" fill="#0F0D1B"/>
            <circle cx="65" cy="70" r="28" stroke="#4A5568" strokeWidth="1" fill="none" opacity="0.3"/>
            
            {/* Graduations vitesse (0-240 km/h) */}
            <path d="M 65 38 L 65 44" stroke="#E5E1F8" strokeWidth="2.5"/>
            <path d="M 42 50 L 46 54" stroke="#E5E1F8" strokeWidth="2"/>
            <path d="M 33 70 L 39 70" stroke="#E5E1F8" strokeWidth="2.5"/>
            <path d="M 42 90 L 46 86" stroke="#E5E1F8" strokeWidth="2"/>
            <path d="M 65 102 L 65 96" stroke="#E5E1F8" strokeWidth="2.5"/>
            <path d="M 88 90 L 84 86" stroke="#E5E1F8" strokeWidth="2"/>
            <path d="M 97 70 L 91 70" stroke="#E5E1F8" strokeWidth="2.5"/>
            
            {/* Chiffres vitesse */}
            <text x="65" y="48" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">0</text>
            <text x="40" y="74" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">60</text>
            <text x="65" y="100" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">120</text>
            <text x="90" y="74" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">180</text>
            
            {/* Aiguille vitesse (80 km/h) */}
            <line x1="65" y1="70" x2="80" y2="54" stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="65" cy="70" r="4" fill="#10B981"/>
            
            {/* Label km/h */}
            <text x="65" y="84" fontSize="7" fill="#9CA3AF" textAnchor="middle" fontFamily="Arial">km/h</text>
            
            {/* Compteur tours/min (droit) */}
            <circle cx="135" cy="70" r="32" stroke="#8B7BE8" strokeWidth="3" fill="#0F0D1B"/>
            <circle cx="135" cy="70" r="28" stroke="#4A5568" strokeWidth="1" fill="none" opacity="0.3"/>
            
            {/* Graduations RPM */}
            <path d="M 135 38 L 135 44" stroke="#E5E1F8" strokeWidth="2.5"/>
            <path d="M 112 50 L 116 54" stroke="#E5E1F8" strokeWidth="2"/>
            <path d="M 103 70 L 109 70" stroke="#E5E1F8" strokeWidth="2.5"/>
            <path d="M 112 90 L 116 86" stroke="#E5E1F8" strokeWidth="2"/>
            <path d="M 135 102 L 135 96" stroke="#E5E1F8" strokeWidth="2.5"/>
            <path d="M 158 90 L 154 86" stroke="#E5E1F8" strokeWidth="2"/>
            <path d="M 167 70 L 161 70" stroke="#E5E1F8" strokeWidth="2.5"/>
            
            {/* Chiffres RPM */}
            <text x="135" y="48" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">0</text>
            <text x="110" y="74" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">2</text>
            <text x="135" y="100" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">4</text>
            <text x="160" y="74" fontSize="8" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">6</text>
            
            {/* Zone rouge RPM */}
            <path d="M 158 90 A 28 28 0 0 0 167 70" stroke="#EF4444" strokeWidth="4"/>
            
            {/* Aiguille RPM (2500 tours) */}
            <line x1="135" y1="70" x2="148" y2="80" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="135" cy="70" r="4" fill="#FFD93D"/>
            
            {/* Label RPM */}
            <text x="135" y="84" fontSize="7" fill="#9CA3AF" textAnchor="middle" fontFamily="Arial">x1000 rpm</text>
            
            {/* Écran digital central */}
            <rect x="40" y="108" width="120" height="14" rx="3" 
              stroke="#8B7BE8" strokeWidth="2" fill="#0F0D1B"/>
            <text x="100" y="118" fontSize="8" fill="#10B981" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              ODO: 45,678 km  |  TRIP: 234 km
            </text>
            
            {/* Témoins lumineux (en haut) */}
            {/* ABS */}
            <circle cx="50" cy="38" r="5" fill="#F59E0B" stroke="#8B7BE8" strokeWidth="1.5"/>
            <text x="50" y="40" fontSize="6" fill="#1A1825" textAnchor="middle" fontFamily="Arial" fontWeight="bold">ABS</text>
            
            {/* Airbag */}
            <circle cx="70" cy="38" r="5" fill="#EF4444" stroke="#8B7BE8" strokeWidth="1.5"/>
            <text x="70" y="41" fontSize="10" fill="#FFF" textAnchor="middle">🛡</text>
            
            {/* Batterie */}
            <circle cx="90" cy="38" r="5" fill="#10B981" stroke="#8B7BE8" strokeWidth="1.5"/>
            <text x="90" y="41" fontSize="10" fill="#1A1825" textAnchor="middle">🔋</text>
            
            {/* Moteur */}
            <circle cx="110" cy="38" r="5" fill="#F59E0B" stroke="#8B7BE8" strokeWidth="1.5"/>
            <text x="110" y="41" fontSize="10" fill="#1A1825" textAnchor="middle">⚙️</text>
            
            {/* Huile */}
            <circle cx="130" cy="38" r="5" fill="#EF4444" stroke="#8B7BE8" strokeWidth="1.5"/>
            <text x="130" y="41" fontSize="10" fill="#FFF" textAnchor="middle">🛢</text>
            
            {/* Ceinture */}
            <circle cx="150" cy="38" r="5" fill="#EF4444" stroke="#8B7BE8" strokeWidth="1.5"/>
            <text x="150" y="41" fontSize="10" fill="#FFF" textAnchor="middle">🔴</text>
            
            {/* Jauge essence (bas gauche) */}
            <rect x="30" y="95" width="30" height="6" rx="2" stroke="#8B7BE8" strokeWidth="1.5" fill="#0F0D1B"/>
            <rect x="31" y="96" width="20" height="4" rx="1" fill="#10B981"/>
            <text x="45" y="92" fontSize="6" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial">⛽ FUEL</text>
            <text x="32" y="92" fontSize="5" fill="#E5E1F8" fontFamily="Arial">E</text>
            <text x="58" y="92" fontSize="5" fill="#E5E1F8" fontFamily="Arial">F</text>
            
            {/* Jauge température (bas droit) */}
            <rect x="140" y="95" width="30" height="6" rx="2" stroke="#8B7BE8" strokeWidth="1.5" fill="#0F0D1B"/>
            <rect x="141" y="96" width="12" height="4" rx="1" fill="#10B981"/>
            <text x="155" y="92" fontSize="6" fill="#E5E1F8" textAnchor="middle" fontFamily="Arial">🌡 TEMP</text>
            <text x="142" y="92" fontSize="5" fill="#E5E1F8" fontFamily="Arial">C</text>
            <text x="168" y="92" fontSize="5" fill="#E5E1F8" fontFamily="Arial">H</text>
          </svg>
        );

      case 'delivery_receipt':
        return (
          <svg viewBox="0 0 200 150" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 📄 PROCÈS-VERBAL DE LIVRAISON */}
            
            {/* Document principal */}
            <rect x="40" y="20" width="120" height="110" rx="6" 
              stroke="#8B7BE8" strokeWidth="3" fill="#FFFFFF"/>
            
            {/* Coin plié (effet papier) */}
            <path d="M 140 20 L 140 35 L 155 35 Z" 
              stroke="#8B7BE8" strokeWidth="3" fill="#E5E1F8"/>
            <path d="M 140 35 L 155 35 L 160 20" 
              stroke="#8B7BE8" strokeWidth="3" fill="none"/>
            
            {/* En-tête */}
            <rect x="50" y="30" width="80" height="20" rx="3" 
              stroke="#8B7BE8" strokeWidth="2" fill="#F8F7FF"/>
            <text x="90" y="42" fontSize="10" fill="#8B7BE8" textAnchor="middle" fontFamily="Arial" fontWeight="bold">
              PV LIVRAISON
            </text>
            
            {/* Icône document */}
            <circle cx="90" cy="70" r="18" stroke="#8B7BE8" strokeWidth="2.5" fill="#F8F7FF"/>
            <path d="M 82 70 L 88 76 L 98 64" 
              stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            
            {/* Lignes de texte */}
            <line x1="55" y1="95" x2="125" y2="95" stroke="#8B7BE8" strokeWidth="2" opacity="0.4"/>
            <line x1="55" y1="102" x2="110" y2="102" stroke="#8B7BE8" strokeWidth="2" opacity="0.3"/>
            <line x1="55" y1="109" x2="120" y2="109" stroke="#8B7BE8" strokeWidth="2" opacity="0.3"/>
            <line x1="55" y1="116" x2="105" y2="116" stroke="#8B7BE8" strokeWidth="2" opacity="0.3"/>
            
            {/* Zone signature */}
            <rect x="50" y="122" width="35" height="3" rx="1" fill="#8B7BE8" opacity="0.3"/>
            <text x="67" y="120" fontSize="6" fill="#8B7BE8" textAnchor="middle" fontFamily="Arial" opacity="0.6">
              Signature
            </text>
            
            {/* Tampon "REÇU" */}
            <circle cx="130" cy="110" r="12" stroke="#10B981" strokeWidth="2" fill="none" opacity="0.4"/>
            <text x="130" y="113" fontSize="7" fill="#10B981" textAnchor="middle" fontFamily="Arial" fontWeight="bold" opacity="0.5">
              REÇU
            </text>
          </svg>
        );

      default:
        return null;
    }
  };

  return renderSchematic();
}

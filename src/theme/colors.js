/**
 * FleetFinale Mobile - Thème de couleurs unifié
 * Palette: Noir, Vert Turquoise, Bleu Ciel
 * Compatible React Native
 */

export const colors = {
  // ==========================================
  // COULEURS PRINCIPALES
  // ==========================================
  
  // Primaire: Vert Turquoise
  primary: '#14b8a6',
  primaryDark: '#0d9488',
  primaryLight: '#2dd4bf',
  primaryLighter: '#5eead4',
  primaryDarkest: '#0f766e',

  // Secondaire: Bleu Ciel
  secondary: '#0ea5e9',
  secondaryDark: '#0284c7',
  secondaryLight: '#38bdf8',
  secondaryLighter: '#7dd3fc',
  secondaryDarkest: '#0369a1',

  // Accent: Cyan
  accent: '#06b6d4',
  accentDark: '#0891b2',
  accentLight: '#22d3ee',

  // ==========================================
  // ÉTATS
  // ==========================================
  success: '#10b981',
  successDark: '#059669',
  successLight: '#34d399',
  
  warning: '#f59e0b',
  warningDark: '#d97706',
  warningLight: '#fbbf24',
  
  error: '#ef4444',
  errorDark: '#dc2626',
  errorLight: '#f87171',
  
  info: '#0ea5e9', // Aligné avec secondaire

  // ==========================================
  // BACKGROUNDS
  // ==========================================
  
  // Mode Clair
  background: '#f8fafc',
  backgroundSecondary: '#f1f5f9',
  surface: '#ffffff',
  surfaceSecondary: '#f9fafb',
  
  // Mode Sombre
  backgroundDark: '#0a0a0a',      // Noir absolu
  backgroundDarkSecondary: '#171717',
  surfaceDark: '#1a1a1a',
  surfaceDarkSecondary: '#262626',

  // ==========================================
  // TEXTE
  // ==========================================
  
  // Mode Clair
  text: '#0a0a0a',
  textSecondary: '#525252',
  textTertiary: '#a3a3a3',
  textDisabled: '#d4d4d4',
  
  // Mode Sombre
  textDark: '#ffffff',
  textDarkSecondary: '#d4d4d4',
  textDarkTertiary: '#a3a3a3',
  textDarkDisabled: '#525252',
  
  // Spécifiques
  textOnPrimary: '#ffffff',
  textOnSecondary: '#ffffff',
  textOnDark: '#ffffff',

  // ==========================================
  // BORDURES
  // ==========================================
  border: '#e2e8f0',
  borderDark: '#334155',
  borderLight: '#f1f5f9',
  borderFocus: '#14b8a6',
  borderFocusSecondary: '#0ea5e9',

  // ==========================================
  // OMBRES
  // ==========================================
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',

  // Glows
  glowTurquoise: 'rgba(20, 184, 166, 0.4)',
  glowSky: 'rgba(14, 165, 233, 0.4)',
  glowCyan: 'rgba(6, 182, 212, 0.4)',

  // ==========================================
  // OVERLAYS
  // ==========================================
  overlay: 'rgba(10, 10, 10, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',

  // ==========================================
  // COULEURS SPÉCIFIQUES AUX FONCTIONNALITÉS
  // ==========================================
  
  // Modules de l'app
  covoiturage: '#10b981',        // Vert (success)
  missions: '#0ea5e9',           // Bleu ciel (secondary)
  scanner: '#14b8a6',            // Turquoise (primary)
  facturation: '#f59e0b',        // Ambre (warning)
  marketplace: '#06b6d4',        // Cyan (accent)
  inspection: '#14b8a6',         // Turquoise (primary)
  wallet: '#0ea5e9',             // Bleu ciel (secondary)

  // États des missions
  missionPending: '#f59e0b',     // Orange
  missionInProgress: '#0ea5e9',  // Bleu ciel
  missionCompleted: '#10b981',   // Vert
  missionCancelled: '#ef4444',   // Rouge
  
  // États des véhicules
  vehicleAvailable: '#10b981',   // Vert
  vehicleInUse: '#0ea5e9',       // Bleu ciel
  vehicleMaintenance: '#f59e0b', // Orange
  vehicleUnavailable: '#737373', // Gris

  // ==========================================
  // TRANSPARENCES
  // ==========================================
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',
  
  // Niveaux d'opacité
  opacity: {
    10: '1A',  // 10%
    20: '33',  // 20%
    30: '4D',  // 30%
    40: '66',  // 40%
    50: '80',  // 50%
    60: '99',  // 60%
    70: 'B3',  // 70%
    80: 'CC',  // 80%
    90: 'E6',  // 90%
  },
};

/**
 * Gradients pour React Native
 * Utiliser avec react-native-linear-gradient ou expo-linear-gradient
 */
export const gradients = {
  // Principaux
  primary: ['#14b8a6', '#0d9488'],
  secondary: ['#0ea5e9', '#0284c7'],
  accent: ['#06b6d4', '#0891b2'],
  
  // Combinaisons
  turquoiseSky: ['#14b8a6', '#0ea5e9'],
  skyTurquoise: ['#0ea5e9', '#14b8a6'],
  oceanDepth: ['#0a0a0a', '#0f766e', '#0284c7'],
  
  // Modules
  covoiturage: ['#10b981', '#059669'],
  missions: ['#0ea5e9', '#0284c7'],
  scanner: ['#14b8a6', '#0d9488'],
  facturation: ['#f59e0b', '#d97706'],
  marketplace: ['#06b6d4', '#0891b2'],
  inspection: ['#14b8a6', '#06b6d4'],
  
  // Foncés
  dark: ['#0a0a0a', '#171717'],
  darkTurquoise: ['#0a0a0a', '#14b8a6'],
  darkSky: ['#0a0a0a', '#0ea5e9'],
  
  // Clairs
  light: ['#ffffff', '#f8fafc'],
  lightTurquoise: ['#f0fdfa', '#ccfbf1'],
  lightSky: ['#f0f9ff', '#e0f2fe'],
};

/**
 * Palette de couleurs pour cartes et visualisations
 */
export const chartColors = [
  '#14b8a6', // Turquoise
  '#0ea5e9', // Bleu ciel
  '#06b6d4', // Cyan
  '#10b981', // Vert
  '#f59e0b', // Ambre
  '#8b5cf6', // Violet
  '#ec4899', // Rose
  '#f97316', // Orange
];

/**
 * Ombres pour React Native
 * Utiliser avec les propriétés shadow*
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  // Glows colorés
  glowTurquoise: {
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glowSky: {
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

/**
 * Espacements standardisés
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

/**
 * Border radius standardisés
 */
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

/**
 * Typographie
 */
export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

/**
 * Helper: Obtenir une couleur avec opacité
 * @param {string} color - Couleur hex (ex: '#14b8a6')
 * @param {number} opacity - Opacité de 0 à 100
 * @returns {string} Couleur avec opacité (ex: '#14b8a680')
 */
export const withOpacity = (color, opacity) => {
  const opacityHex = colors.opacity[opacity] || 'FF';
  return `${color}${opacityHex}`;
};

/**
 * Helper: Obtenir le style d'ombre
 * @param {string} size - Taille de l'ombre ('sm', 'md', 'lg', 'xl')
 * @returns {object} Style d'ombre React Native
 */
export const getShadow = (size = 'md') => {
  return shadows[size] || shadows.md;
};

// Export par défaut
export default {
  colors,
  gradients,
  chartColors,
  shadows,
  spacing,
  borderRadius,
  typography,
  withOpacity,
  getShadow,
};

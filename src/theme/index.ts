// Theme System - Cohérent Web/Mobile
export const lightTheme = {
  // Colors principales (cohérent avec web Tailwind)
  primary: '#14b8a6', // teal-500
  primaryDark: '#0d9488', // teal-600
  primaryLight: '#5eead4', // teal-300
  
  secondary: '#3b82f6', // blue-500
  secondaryDark: '#2563eb', // blue-600
  secondaryLight: '#60a5fa', // blue-400
  
  accent: '#8b5cf6', // violet-500
  accentDark: '#7c3aed', // violet-600
  
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
  
  // Backgrounds
  background: '#ffffff',
  backgroundSecondary: '#f8fafc', // slate-50
  backgroundTertiary: '#f1f5f9', // slate-100
  
  // Surfaces
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  card: '#ffffff',
  
  // Text
  text: '#0f172a', // slate-900
  textSecondary: '#475569', // slate-600
  textTertiary: '#94a3b8', // slate-400
  textDisabled: '#cbd5e1', // slate-300
  
  // Borders
  border: '#e2e8f0', // slate-200
  borderLight: '#f1f5f9', // slate-100
  borderDark: '#cbd5e1', // slate-300
  
  // Overlays
  overlay: 'rgba(15, 23, 42, 0.5)', // slate-900 50%
  overlayLight: 'rgba(15, 23, 42, 0.2)',
  
  // Shadows
  shadow: '#0f172a',
  
  // Status bar
  statusBar: 'dark' as 'dark' | 'light',
};

export const darkTheme = {
  // Colors principales (identiques - restent vives)
  primary: '#14b8a6',
  primaryDark: '#0d9488',
  primaryLight: '#5eead4',
  
  secondary: '#3b82f6',
  secondaryDark: '#2563eb',
  secondaryLight: '#60a5fa',
  
  accent: '#8b5cf6',
  accentDark: '#7c3aed',
  
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  
  // Backgrounds - Dark
  background: '#0f172a', // slate-900
  backgroundSecondary: '#1e293b', // slate-800
  backgroundTertiary: '#334155', // slate-700
  
  // Surfaces - Dark
  surface: '#1e293b',
  surfaceElevated: '#334155',
  card: '#1e293b',
  
  // Text - Inversé
  text: '#f8fafc', // slate-50
  textSecondary: '#cbd5e1', // slate-300
  textTertiary: '#94a3b8', // slate-400
  textDisabled: '#64748b', // slate-500
  
  // Borders - Dark
  border: '#334155', // slate-700
  borderLight: '#475569', // slate-600
  borderDark: '#1e293b', // slate-800
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Shadows
  shadow: '#000000',
  
  // Status bar
  statusBar: 'light' as 'dark' | 'light',
};

export type Theme = typeof lightTheme;

// Gradient presets (cohérent web/mobile)
export const gradients = {
  primary: ['#14b8a6', '#0d9488'],
  secondary: ['#3b82f6', '#2563eb'],
  accent: ['#8b5cf6', '#7c3aed'],
  sunset: ['#f59e0b', '#ef4444'],
  ocean: ['#06b6d4', '#3b82f6'],
  forest: ['#10b981', '#14b8a6'],
  purple: ['#8b5cf6', '#ec4899'],
  blue: ['#3b82f6', '#06b6d4'],
} as const;

// Spacing (cohérent avec Tailwind)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Border radius (cohérent avec Tailwind)
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// Typography (cohérent avec web)
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
} as const;

// Shadows (cohérent avec Tailwind)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },
} as const;

export default {
  light: lightTheme,
  dark: darkTheme,
  gradients,
  spacing,
  borderRadius,
  typography,
  shadows,
};

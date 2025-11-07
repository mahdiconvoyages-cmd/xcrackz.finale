import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Définition des couleurs
export const lightColors = {
  background: '#ffffff',
  surface: '#f8fafc',
  card: '#ffffff',
  primary: '#00AFF5',
  secondary: '#64748b',
  accent: '#10b981',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
};

export const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  card: '#1e293b',
  primary: '#00AFF5',
  secondary: '#94a3b8',
  accent: '#34d399',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  border: '#334155',
  error: '#f87171',
  warning: '#fbbf24',
  success: '#34d399',
  info: '#60a5fa',
};

type ThemeMode = 'light' | 'dark' | 'auto';
type Colors = typeof lightColors;

interface ThemeContextType {
  mode: ThemeMode;
  colors: Colors;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [loadedMode, setLoadedMode] = useState(false);

  // Charger le thème sauvegardé
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('theme_mode');
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
        setMode(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Erreur chargement thème:', error);
    } finally {
      setLoadedMode(true);
    }
  };

  const setTheme = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme_mode', newMode);
      setMode(newMode);
    } catch (error) {
      console.error('Erreur sauvegarde thème:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
    await setTheme(newMode);
  };

  // Déterminer si le thème est dark
  const isDark = mode === 'auto' 
    ? systemColorScheme === 'dark'
    : mode === 'dark';

  // Sélectionner les couleurs appropriées
  const colors = isDark ? darkColors : lightColors;

  // Ne pas rendre les enfants tant que le thème n'est pas chargé
  if (!loadedMode) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  }
  return context;
};

// Hook pour avoir un style conditionnel selon le thème
export const useThemedStyles = <T extends object>(
  getStyles: (colors: Colors, isDark: boolean) => T
): T => {
  const { colors, isDark } = useTheme();
  return getStyles(colors, isDark);
};

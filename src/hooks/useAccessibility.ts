// Hook pour gérer l'accessibilité
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useAccessibility() {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isBoldTextEnabled, setIsBoldTextEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    // Vérifier si le lecteur d'écran est activé
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setIsScreenReaderEnabled(enabled);
    });

    // Écouter les changements
    const screenReaderChangedSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    if (Platform.OS === 'ios') {
      // iOS uniquement
      AccessibilityInfo.isBoldTextEnabled().then(setIsBoldTextEnabled);
      AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotionEnabled);

      const boldTextChangedSubscription = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        setIsBoldTextEnabled
      );

      const reduceMotionChangedSubscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setIsReduceMotionEnabled
      );

      return () => {
        screenReaderChangedSubscription.remove();
        boldTextChangedSubscription.remove();
        reduceMotionChangedSubscription.remove();
      };
    }

    return () => {
      screenReaderChangedSubscription.remove();
    };
  }, []);

  return {
    isScreenReaderEnabled,
    isBoldTextEnabled,
    isReduceMotionEnabled,
  };
}

/**
 * Helper pour créer des props d'accessibilité
 */
export function createAccessibilityProps(
  label: string,
  hint?: string,
  role?: string
) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role as any,
  };
}

/**
 * Helper pour annoncer un message via le lecteur d'écran
 */
export function announceForAccessibility(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

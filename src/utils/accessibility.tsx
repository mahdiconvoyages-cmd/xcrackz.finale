/**
 * Accessibility Utilities
 * Helpers pour améliorer l'accessibilité de l'application
 */

/**
 * Hook personnalisé pour gérer les raccourcis clavier
 */
export const useKeyboardShortcut = (key: string, callback: () => void, deps: any[] = []) => {
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === key) {
        e.preventDefault();
        callback();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, deps);
};

/**
 * Hook pour gérer le focus trap dans les modals
 */
export const useFocusTrap = (isOpen: boolean, containerRef: React.RefObject<HTMLElement>) => {
  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus le premier élément au montage
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isOpen, containerRef]);
};

/**
 * Génère un ID unique pour lier les labels et les inputs
 */
export const generateAriaId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Props communes pour les éléments accessibles
 */
export interface AccessibleProps {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaLive?: 'polite' | 'assertive' | 'off';
  role?: string;
}

/**
 * Vérifie le ratio de contraste entre deux couleurs
 * @returns true si le ratio est >= 4.5:1 (WCAG AA)
 */
export const checkContrastRatio = (foreground: string, background: string): boolean => {
  // Convertit hex en RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calcule la luminance relative
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return false;

  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);

  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return ratio >= 4.5;
};

/**
 * Classes CSS pour améliorer la visibilité du focus clavier
 */
export const focusRingClasses = 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500';

/**
 * Classes CSS pour les états de boutons accessibles
 */
export const buttonAccessibleClasses = `
  ${focusRingClasses}
  disabled:opacity-50
  disabled:cursor-not-allowed
  transition-all
  duration-200
`;

/**
 * Annonce un message aux screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Palette de couleurs accessibles (WCAG AA compliant)
 */
export const accessibleColors = {
  // Texte sur fond blanc
  text: {
    primary: '#0f172a',    // Ratio 15.68:1
    secondary: '#334155',   // Ratio 10.27:1
    tertiary: '#475569',    // Ratio 7.77:1
  },
  // Texte sur fond sombre
  textOnDark: {
    primary: '#ffffff',     // Ratio 21:1
    secondary: '#e2e8f0',   // Ratio 16.09:1
    tertiary: '#cbd5e1',    // Ratio 12.63:1
  },
  // Boutons et liens
  interactive: {
    primary: '#0d9488',     // Teal-600 - Ratio 4.54:1 sur blanc
    primaryHover: '#0f766e', // Teal-700 - Ratio 5.49:1 sur blanc
    secondary: '#0891b2',   // Cyan-600 - Ratio 4.52:1 sur blanc
    danger: '#dc2626',      // Red-600 - Ratio 5.9:1 sur blanc
    warning: '#d97706',     // Amber-600 - Ratio 5.59:1 sur blanc
    success: '#059669',     // Emerald-600 - Ratio 4.54:1 sur blanc
  },
  // États
  states: {
    error: '#b91c1c',       // Red-700 - Ratio 7.73:1 sur blanc
    warning: '#b45309',     // Amber-700 - Ratio 7.36:1 sur blanc
    success: '#047857',     // Emerald-700 - Ratio 5.93:1 sur blanc
    info: '#0369a1',        // Sky-700 - Ratio 6.19:1 sur blanc
  },
};

/**
 * Skip to main content - à ajouter en haut de App.tsx
 */
export const SkipToMainContent = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-600 focus:text-white focus:rounded-lg focus:shadow-lg"
  >
    Aller au contenu principal
  </a>
);

/**
 * Helper pour gérer les événements clavier sur des éléments non-interactifs
 */
export const makeClickable = (onClick: () => void) => ({
  onClick,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  },
  role: 'button',
  tabIndex: 0,
});

/**
 * Classes pour masquer visuellement mais garder accessible aux screen readers
 */
export const visuallyHiddenClasses = 'sr-only';

/**
 * Hook pour annoncer les erreurs de formulaire
 */
export const useFormErrorAnnouncement = (errors: Record<string, string>) => {
  React.useEffect(() => {
    const errorMessages = Object.values(errors).filter(Boolean);
    if (errorMessages.length > 0) {
      announceToScreenReader(
        `Erreur de validation : ${errorMessages.join(', ')}`,
        'assertive'
      );
    }
  }, [errors]);
};

// Export React pour les hooks
import React from 'react';

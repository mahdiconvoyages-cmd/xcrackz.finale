import { useState, useEffect } from 'react';

/**
 * Hook pour détecter si l'utilisateur est sur mobile
 * Détecte aussi les changements d'orientation
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Vérification initiale
    const checkIsMobile = () => {
      const mobile = window.innerWidth < breakpoint || 
                     /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    checkIsMobile();

    // Écouter les changements de taille d'écran
    const handleResize = () => {
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}

/**
 * Hook pour détecter le type d'appareil spécifique
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      const ua = navigator.userAgent;

      if (width < 768 || /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        setDeviceType('mobile');
      } else if (width < 1024 || /iPad/i.test(ua)) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();

    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);

    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  return deviceType;
}

/**
 * Hook pour détecter si on est sur iOS
 */
export function useIsIOS(): boolean {
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
  }, []);

  return isIOS;
}

import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

/**
 * Hook pour gérer les deeplinks d'ouverture de mission
 * 
 * Formats supportés:
 * - finality://mission/open/{missionId}
 * - https://www.xcrackz.com/mission/{missionId}
 */
export function useDeeplinkMission() {
  const navigation = useNavigation<NavigationProp<any>>();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Handler pour les liens cliqués quand l'app est fermée
    const handleInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url && !isProcessingRef.current) {
          console.log('🔗 Initial deeplink:', url);
          handleDeeplink(url);
        }
      } catch (error) {
        console.error('❌ Erreur récupération initial URL:', error);
      }
    };

    // Handler pour les liens cliqués quand l'app est ouverte
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!isProcessingRef.current) {
        console.log('🔗 Deeplink reçu:', url);
        handleDeeplink(url);
      }
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeeplink = (url: string) => {
    if (isProcessingRef.current) return;
    
    try {
      isProcessingRef.current = true;

      // Parser l'URL
      const parsed = Linking.parse(url);
      console.log('📍 URL parsée:', parsed);

      // Format: finality://mission/open/{missionId}
      if (parsed.hostname === 'mission') {
        const pathParts = parsed.path?.split('/').filter(Boolean) || [];
        
        if (pathParts[0] === 'open' && pathParts[1]) {
          const missionId = pathParts[1];
          console.log('✅ Ouverture mission:', missionId);
          
          // Naviguer vers la mission
          setTimeout(() => {
            navigation.navigate('MissionDetail', { missionId });
            isProcessingRef.current = false;
          }, 300);
          return;
        }
      }

      // Format: https://www.xcrackz.com/mission/{missionId}
      if (url.includes('xcrackz.com/mission/')) {
        const match = url.match(/\/mission\/([a-f0-9-]+)/i);
        if (match && match[1]) {
          const missionId = match[1];
          console.log('✅ Ouverture mission (web):', missionId);
          
          setTimeout(() => {
            navigation.navigate('MissionDetail', { missionId });
            isProcessingRef.current = false;
          }, 300);
          return;
        }
      }

      console.warn('⚠️ Format de deeplink non reconnu:', url);
      isProcessingRef.current = false;

    } catch (error) {
      console.error('❌ Erreur traitement deeplink:', error);
      isProcessingRef.current = false;
    }
  };

  return null;
}

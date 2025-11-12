import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

/**
 * Hook pour gérer les deep links
 * Formats supportés:
 * - finality://mission/join/XZ-ABC-DEF
 * - https://finality.app/mission/join/XZ-ABC-DEF
 */
export function useDeepLinking() {
  const navigation = useNavigation();

  useEffect(() => {
    // Gérer le lien initial (app ouverte via deep link)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Gérer les liens quand l'app est déjà ouverte
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    console.log('[DeepLink] Received:', url);

    try {
      const { path, queryParams } = Linking.parse(url);
      
      // Format: finality://mission/join/XZ-ABC-DEF
      // ou: https://finality.app/mission/join/XZ-ABC-DEF
      if (path?.includes('mission/join/')) {
        const shareCode = path.split('/').pop();
        
        if (shareCode) {
          console.log('[DeepLink] Joining mission with code:', shareCode);
          await joinMissionWithCode(shareCode);
        }
      }
    } catch (error) {
      console.error('[DeepLink] Error parsing URL:', error);
    }
  };

  const joinMissionWithCode = async (shareCode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert(
          'Connexion requise',
          'Vous devez être connecté pour rejoindre une mission.',
          [{ text: 'OK' }]
        );
        return;
      }

      const { data, error } = await supabase.rpc('join_mission_with_code', {
        p_share_code: shareCode.toUpperCase(),
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        throw new Error(result.message || result.error || 'Erreur inconnue');
      }

      Alert.alert(
        '✅ Mission acceptée !',
        `Vous avez rejoint la mission ${result.mission?.reference || ''}`,
        [
          {
            text: 'Voir la mission',
            onPress: () => {
              // @ts-ignore - Navigation typée complexe
              navigation.navigate('Missions', {
                screen: 'MissionList',
                params: { refresh: true },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[DeepLink] Error joining mission:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible de rejoindre la mission');
    }
  };
}

/**
 * Créer un deep link pour partager une mission
 */
export function createMissionShareLink(shareCode: string): string {
  // URL scheme pour deep linking
  const deepLink = Linking.createURL(`mission/join/${shareCode}`);
  
  // Retourne: finality://mission/join/XZ-ABC-DEF
  return deepLink;
}

/**
 * Créer un lien web universel (fallback si l'app n'est pas installée)
 */
export function createMissionWebLink(shareCode: string): string {
  // Dans un vrai projet, ce serait votre domaine
  // Ex: https://finality.app/mission/join/XZ-ABC-DEF
  return `https://finality.app/mission/join/${shareCode}`;
}

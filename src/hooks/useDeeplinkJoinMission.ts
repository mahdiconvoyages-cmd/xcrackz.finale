import { useEffect, useState } from 'react';
import { Linking, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cleanShareCode } from '../lib/shareCode';

interface DeeplinkJoinResult {
  loading: boolean;
  lastCode?: string;
  lastStatus?: 'added' | 'already' | 'error';
  errorMessage?: string;
}

/**
 * Hook qui écoute les deeplinks du type:
 *   finality://mission/join/XXXXXXXX
 *   https://www.checksfleet.com/join/XXXXXXXX
 * Et tente automatiquement l'assignation.
 */
export function useDeeplinkJoinMission(onSuccess?: (missionId: string) => void) : DeeplinkJoinResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState<string | undefined>();
  const [lastStatus, setLastStatus] = useState<'added' | 'already' | 'error' | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      processUrl(event.url);
    };

    Linking.addEventListener('url', handleUrl);
    // URL initiale (si ouverture directe via lien)
    Linking.getInitialURL().then((initial) => {
      if (initial) processUrl(initial);
    });

    return () => {
      Linking.removeAllListeners('url');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function processUrl(url: string) {
    if (!user?.id) return; // Besoin utilisateur connecté

    // Extraire le segment après /join/
    const match = url.match(/(?:mission\/join|join)\/([A-Za-z0-9]+)/i);
    if (!match) return;
    const raw = match[1].toUpperCase();

    // Normaliser pour affichage / contrôle (8 caractères alphanumériques)
    if (raw.length !== 8) {
      setErrorMessage('Code deeplink invalide');
      setLastStatus('error');
      return;
    }

    setLoading(true);
    setLastCode(raw);
    setErrorMessage(undefined);
    setLastStatus(undefined);

    try {
      // Appel RPC vers la nouvelle fonction claim_mission (via wrapper join_mission_with_code ou directement claim_mission)
      const { data, error } = await supabase.rpc('claim_mission', {
        p_code: raw,
        p_user_id: user.id,
      });

      if (error) {
        throw error;
      }

      // data peut être JSON déjà parsé (Supabase) ou une chaîne; assurer robustesse
      let result: any = data;
      if (typeof result === 'string') {
        try { result = JSON.parse(result); } catch {}
      }

      if (!result || typeof result !== 'object') {
        throw new Error('Réponse inattendue');
      }

      if (!result.success) {
        setErrorMessage(result.error || result.message || 'Échec assignation');
        setLastStatus('error');
        return;
      }

      if (result.alreadyJoined) {
        setLastStatus('already');
      } else {
        setLastStatus('added');
      }

      if (onSuccess && result.mission_id) {
        onSuccess(result.mission_id);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur deeplink');
      setLastStatus('error');
    } finally {
      setLoading(false);
    }
  }

  return { loading, lastCode, lastStatus, errorMessage };
}

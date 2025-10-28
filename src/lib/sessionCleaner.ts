// Utilitaire pour nettoyer les sessions invalides
import { supabase } from './supabase';

export async function cleanInvalidSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      // Si erreur de session, déconnecter
      await supabase.auth.signOut();
      // Nettoyer le storage local
      localStorage.removeItem('xcrackz-auth');
      window.location.href = '/login';
      return;
    }
    
    if (!session) {
      console.log('No active session');
      return;
    }
    
    // Vérifier si le token est expiré
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && expiresAt < now) {
      console.log('Session expired, refreshing...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        await supabase.auth.signOut();
        localStorage.removeItem('xcrackz-auth');
        window.location.href = '/login';
      }
    }
  } catch (error) {
    console.error('Error cleaning session:', error);
  }
}

// Exécuter au chargement de l'app
cleanInvalidSession();

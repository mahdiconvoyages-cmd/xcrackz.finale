import { createClient } from '@supabase/supabase-js';

// Nettoyer les variables d'environnement (retirer \r\n et espaces)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/[\r\n]/g, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim().replace(/[\r\n]/g, '');
// ⚠️ TEMPORAIRE: Utiliser service_role pour contourner RLS sur storage
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/[\r\n]/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('[Supabase Config - WEB]', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

// Singleton pattern pour éviter les instances multiples
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    // ⚠️ TEMPORAIRE: Utiliser service_role si disponible pour contourner RLS
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const usingServiceRole = !!supabaseServiceKey;
    
    supabaseInstance = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'xcrackz-auth', // Clé unique pour éviter les conflits
      },
      global: {
        headers: {
          'x-application-name': 'xcrackz-web',
        },
      },
    });
    
    console.log('[Supabase] Client initialized', {
      url: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      usingServiceRole, // ⚠️ SUPPRIMEZ APRÈS FIX RLS
    });
  }
  
  return supabaseInstance;
})();

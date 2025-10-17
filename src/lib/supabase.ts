import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton pattern pour éviter les instances multiples
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Pas de storageKey personnalisé pour garder la compatibilité
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
    });
  }
  
  return supabaseInstance;
})();

import { createClient } from '@supabase/supabase-js';

// Nettoyer les variables d'environnement (retirer \r\n et espaces)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/[\r\n]/g, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim().replace(/[\r\n]/g, '');

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
        storageKey: 'CHECKSFLEET-auth',
      },
      global: {
        headers: {
          'x-application-name': 'CHECKSFLEET-web',
        },
      },
    });
  }
  
  return supabaseInstance;
})() as any;

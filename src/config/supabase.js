// Version WEB - pas de polyfill React Native nécessaire
// import 'react-native-url-polyfill/auto'; // ❌ React Native only
// import AsyncStorage from '@react-native-async-storage/async-storage'; // ❌ React Native only
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase - Valeurs fixes pour assurer la connexion
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bfrkthzovwpjrvqktdjn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc';

console.log('[Supabase Config - WEB]', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Pour le web, on utilise localStorage par défaut (pas besoin de AsyncStorage)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // ✅ Important pour OAuth web
  },
});

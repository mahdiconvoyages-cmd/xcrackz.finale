// Temporary shim for JS supabase config until migrated to TS
declare module '../config/supabase' {
  import type { SupabaseClient } from '@supabase/supabase-js';
  export const supabase: SupabaseClient<any, any, any>;
}

declare module '../config/supabase.js' {
  import type { SupabaseClient } from '@supabase/supabase-js';
  export const supabase: SupabaseClient<any, any, any>;
}

// API Route pour uploader des fichiers en contournant RLS
// Ce fichier doit être placé dans: src/api/upload.ts (ou créer un serveur Express séparé)

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Utiliser SERVICE_ROLE_KEY au lieu de ANON_KEY
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ⚠️ Cette clé contourne RLS

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ publicUrl: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${userId}-${Date.now()}.${fileExt}`;

    // Upload avec service role (contourne RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Mettre à jour le profil
    await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    return { publicUrl };
  } catch (error: any) {
    return { publicUrl: '', error: error.message };
  }
}

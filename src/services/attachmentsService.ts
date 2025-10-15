// Service pour gérer les pièces jointes
import { supabase } from '../lib/supabase';

export interface Attachment {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category?: 'invoice' | 'quote' | 'contract' | 'report' | 'photo' | 'other';
  related_to?: string; // ID du document lié (facture, mission, etc.)
  related_type?: 'invoice' | 'quote' | 'mission' | 'inspection' | 'client';
  description?: string;
  uploaded_at: string;
  public_url?: string;
}

/**
 * Upload un fichier vers Supabase Storage
 */
export async function uploadAttachment(
  file: File,
  userId: string,
  options?: {
    category?: Attachment['category'];
    relatedTo?: string;
    relatedType?: Attachment['related_type'];
    description?: string;
  }
): Promise<Attachment> {
  try {
    // Vérifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Le fichier ne doit pas dépasser 10MB');
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExt}`;
    const storagePath = `${userId}/${fileName}`;

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(storagePath);

    // Enregistrer les métadonnées dans la base de données
    const { data: attachmentData, error: dbError } = await supabase
      .from('attachments')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        category: options?.category || 'other',
        related_to: options?.relatedTo,
        related_type: options?.relatedType,
        description: options?.description,
        public_url: urlData.publicUrl
      })
      .select()
      .single();

    if (dbError) {
      // Si erreur DB, supprimer le fichier uploadé
      await supabase.storage.from('attachments').remove([storagePath]);
      throw new Error(`Erreur lors de l'enregistrement: ${dbError.message}`);
    }

    return attachmentData;
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
}

/**
 * Récupérer toutes les pièces jointes d'un utilisateur
 */
export async function getUserAttachments(userId: string): Promise<Attachment[]> {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching attachments:', error);
    throw error;
  }
}

/**
 * Récupérer les pièces jointes liées à un document spécifique
 */
export async function getRelatedAttachments(
  relatedTo: string,
  relatedType: Attachment['related_type']
): Promise<Attachment[]> {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('related_to', relatedTo)
      .eq('related_type', relatedType)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching related attachments:', error);
    throw error;
  }
}

/**
 * Supprimer une pièce jointe
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  try {
    // Récupérer les infos de la pièce jointe
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;
    if (!attachment) throw new Error('Pièce jointe introuvable');

    // Supprimer le fichier du storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Supprimer l'entrée de la base de données
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
}

/**
 * Télécharger une pièce jointe
 */
export async function downloadAttachment(attachment: Attachment): Promise<void> {
  try {
    // Télécharger le fichier depuis le storage
    const { data, error } = await supabase.storage
      .from('attachments')
      .download(attachment.storage_path);

    if (error) throw error;
    if (!data) throw new Error('Fichier introuvable');

    // Créer un lien de téléchargement
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.file_name;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Nettoyer l'URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
}

/**
 * Obtenir la taille totale des pièces jointes d'un utilisateur
 */
export async function getUserStorageUsage(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('file_size')
      .eq('user_id', userId);

    if (error) throw error;
    
    const totalSize = data?.reduce((sum, item) => sum + (item.file_size || 0), 0) || 0;
    return totalSize;
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return 0;
  }
}

/**
 * Formater la taille d'un fichier
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Obtenir l'icône pour un type de fichier
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '📦';
  if (fileType.includes('text')) return '📃';
  return '📎';
}

/**
 * Valider le type de fichier
 */
export function isValidFileType(file: File): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Texte
    'text/plain',
    'text/csv',
  ];

  return allowedTypes.includes(file.type);
}

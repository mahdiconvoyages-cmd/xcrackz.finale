/**
 * 📄 SERVICE DE DOCUMENTS D'INSPECTION - Table existante
 * 
 * Utilise la table inspection_documents existante (mobile compatible)
 * Synchronisation automatique web ↔ mobile
 */

import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompression';

export interface InspectionDocument {
  id: string;
  inspection_id: string;
  document_type: string;
  document_title: string;
  document_url: string;
  pages_count?: number;
  file_size_kb?: number;
  scanned_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Uploader un document scanné
 */
export async function uploadInspectionDocument(
  file: File,
  userId: string,
  options: {
    inspectionId?: string;
    documentType?: string;
    title?: string;
  } = {}
): Promise<InspectionDocument | null> {
  try {
    const {
      inspectionId,
      documentType = 'generic',
      title = `Document ${Date.now()}`
    } = options;

    // 1. Compress if image, then upload to Storage
    const fileToUpload = file.type.startsWith('image/') 
      ? await compressImage(file, { maxDimension: 1600, quality: 0.8 })
      : file;
    const fileName = `${userId}/${Date.now()}_${fileToUpload.name}`;
    const { error: uploadError } = await supabase.storage
      .from('scanned-documents')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // 2. Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('scanned-documents')
      .getPublicUrl(fileName);

    // 3. Créer l'entrée dans inspection_documents
    const insertData: any = {
      inspection_id: inspectionId || null,
      document_type: documentType,
      document_title: title,
      document_url: urlData.publicUrl,
      pages_count: 1,
      file_size_kb: Math.round(fileToUpload.size / 1024),
      user_id: userId
    };

    const { data: docData, error: docError } = await supabase
      .from('inspection_documents')
      .insert(insertData)
      .select()
      .single();

    if (docError) {
      console.error('Database insert error:', docError);
      throw docError;
    }

    return docData;
  } catch (error) {
    console.error('Erreur upload document:', error);
    return null;
  }
}

/**
 * Récupérer tous les documents d'un utilisateur (via inspections)
 */
export async function getUserDocuments(
  userId: string,
  options: {
    inspectionId?: string;
    documentType?: string;
    limit?: number;
  } = {}
): Promise<InspectionDocument[]> {
  try {
    let query = supabase
      .from('inspection_documents')
      .select(`
        *,
        vehicle_inspections!inner(
          id,
          mission_id,
          missions!inner(
            user_id
          )
        )
      `)
      .eq('vehicle_inspections.missions.user_id', userId)
      .order('created_at', { ascending: false });

    if (options.inspectionId) {
      query = query.eq('inspection_id', options.inspectionId);
    }

    if (options.documentType) {
      query = query.eq('document_type', options.documentType);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erreur récupération documents:', error);
    return [];
  }
}

/**
 * Récupérer tous les documents (standalone inclus)
 * Les RLS policies gèrent automatiquement le filtrage multi-sources:
 * 1. Documents standalone avec user_id direct
 * 2. Documents liés aux inspections de missions créées par l'utilisateur
 * 3. Documents liés aux inspections de missions assignées à l'utilisateur
 */
export async function getAllUserDocuments(userId: string): Promise<InspectionDocument[]> {
  try {
    // NOUVELLE APPROCHE: Requête simple - les RLS filtrent automatiquement
    const { data, error } = await supabase
      .from('inspection_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération documents:', error);
      return [];
    }

    console.log(`📄 Documents trouvés via RLS: ${data?.length || 0}`);
    return data || [];
  } catch (error) {
    console.error('❌ Exception récupération documents:', error);
    return [];
  }
}

/**
 * Supprimer un document
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    // 1. Récupérer l'URL du document
    const { data: doc, error: fetchError } = await supabase
      .from('inspection_documents')
      .select('document_url')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Extraire le chemin du fichier depuis l'URL
    const filePath = extractFilePathFromUrl(doc.document_url);

    // 3. Supprimer le fichier du Storage
    if (filePath) {
      await supabase.storage
        .from('scanned-documents')
        .remove([filePath]);
    }

    // 4. Supprimer l'entrée de la base de données
    const { error: deleteError } = await supabase
      .from('inspection_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Erreur suppression document:', error);
    return false;
  }
}

/**
 * Mettre à jour un document
 */
export async function updateDocument(
  documentId: string,
  updates: {
    document_title?: string;
    document_type?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('inspection_documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erreur mise à jour document:', error);
    return false;
  }
}

/**
 * Télécharger un document
 */
export async function downloadDocument(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Erreur téléchargement:', error);
    throw error;
  }
}

/**
 * Exporter un document en PDF
 */
export async function exportDocumentToPDF(imageUrl: string, fileName: string) {
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
    const width = img.width * ratio;
    const height = img.height * ratio;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    pdf.addImage(img, 'JPEG', x, y, width, height);
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Erreur export PDF:', error);
    throw error;
  }
}

/**
 * Extraire le chemin du fichier depuis l'URL publique
 */
function extractFilePathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/scanned-documents\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * 📱💻 SERVICE DE DOCUMENTS UNIFIÉS - Synchronisation Web & Mobile
 * 
 * Stockage centralisé dans Supabase:
 * - Table: unified_scanned_documents
 * - Storage: scanned-documents (bucket)
 * - Synchronisation automatique entre toutes les plateformes
 * - Support inspection_id pour lier aux inspections
 */

import { supabase } from '../lib/supabase';

export interface UnifiedDocument {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  public_url: string;
  filter_type: 'bw' | 'grayscale' | 'color';
  document_type?: 'registration' | 'insurance' | 'receipt' | 'generic';
  inspection_id?: string;
  created_at: string;
  platform: 'web' | 'mobile';
  file_size?: number;
  width?: number;
  height?: number;
}

/**
 * Uploader un document scanné dans Supabase
 */
export async function uploadScannedDocument(
  file: File,
  userId: string,
  options: {
    name?: string;
    filterType?: 'bw' | 'grayscale' | 'color';
    documentType?: 'registration' | 'insurance' | 'receipt' | 'generic';
    inspectionId?: string;
    platform?: 'web' | 'mobile';
  } = {}
): Promise<UnifiedDocument | null> {
  try {
    const {
      name = `scan_${Date.now()}`,
      filterType = 'bw',
      documentType = 'generic',
      inspectionId,
      platform = 'web'
    } = options;

    // 1. Upload du fichier dans Storage
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('scanned-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('scanned-documents')
      .getPublicUrl(fileName);

    // 3. Obtenir les dimensions de l'image
    const imgDimensions = await getImageDimensions(file);

    // 4. Créer l'entrée dans la table
    const { data: docData, error: docError } = await supabase
      .from('unified_scanned_documents')
      .insert({
        user_id: userId,
        name,
        file_path: fileName,
        public_url: urlData.publicUrl,
        filter_type: filterType,
        document_type: documentType,
        inspection_id: inspectionId,
        platform,
        file_size: file.size,
        width: imgDimensions.width,
        height: imgDimensions.height
      })
      .select()
      .single();

    if (docError) throw docError;

    return docData;
  } catch (error) {
    console.error('Erreur upload document:', error);
    return null;
  }
}

/**
 * Récupérer tous les documents d'un utilisateur
 */
export async function getUserDocuments(
  userId: string,
  options: {
    inspectionId?: string;
    documentType?: string;
    limit?: number;
  } = {}
): Promise<UnifiedDocument[]> {
  try {
    let query = supabase
      .from('unified_scanned_documents')
      .select('*')
      .eq('user_id', userId)
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
 * Supprimer un document
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    // 1. Récupérer le document pour avoir le file_path
    const { data: doc, error: fetchError } = await supabase
      .from('unified_scanned_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Supprimer du Storage
    const { error: storageError } = await supabase.storage
      .from('scanned-documents')
      .remove([doc.file_path]);

    if (storageError) throw storageError;

    // 3. Supprimer de la table
    const { error: deleteError } = await supabase
      .from('unified_scanned_documents')
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
  updates: Partial<Pick<UnifiedDocument, 'name' | 'filter_type' | 'document_type'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('unified_scanned_documents')
      .update(updates)
      .eq('id', documentId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Erreur mise à jour document:', error);
    return false;
  }
}

/**
 * Obtenir les dimensions d'une image
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };

    img.src = url;
  });
}

/**
 * Télécharger un document depuis l'URL publique
 */
export async function downloadDocument(publicUrl: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(publicUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erreur téléchargement document:', error);
    throw error;
  }
}

/**
 * Exporter un document en PDF
 */
export async function exportDocumentToPDF(publicUrl: string, fileName: string): Promise<void> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = publicUrl;
    await new Promise(resolve => { img.onload = resolve; });

    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgRatio = img.width / img.height;
    const pageRatio = pageWidth / pageHeight;

    let finalWidth = pageWidth;
    let finalHeight = pageHeight;

    if (imgRatio > pageRatio) {
      finalHeight = pageWidth / imgRatio;
    } else {
      finalWidth = pageHeight * imgRatio;
    }

    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    pdf.addImage(publicUrl, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Erreur export PDF:', error);
    throw error;
  }
}

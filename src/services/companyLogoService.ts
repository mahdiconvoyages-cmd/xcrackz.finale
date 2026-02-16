// Service pour gérer le logo de l'entreprise
const LOGO_STORAGE_KEY = 'finality_company_logo';

export interface CompanyLogo {
  url: string;
  name: string;
  uploadedAt: string;
}

/**
 * Récupérer le logo de l'entreprise depuis le localStorage
 */
export function getCompanyLogo(): CompanyLogo | null {
  try {
    const logoData = localStorage.getItem(LOGO_STORAGE_KEY);
    if (!logoData) return null;
    return JSON.parse(logoData);
  } catch (error) {
    console.error('Erreur lors de la récupération du logo:', error);
    return null;
  }
}

/**
 * Enregistrer le logo de l'entreprise
 */
export function saveCompanyLogo(logo: CompanyLogo): void {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, JSON.stringify(logo));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du logo:', error);
    throw new Error('Impossible de sauvegarder le logo');
  }
}

/**
 * Supprimer le logo de l'entreprise
 */
export function deleteCompanyLogo(): void {
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
  } catch (error) {
    console.error('Erreur lors de la suppression du logo:', error);
  }
}

/**
 * Convertir un fichier image en base64 pour stockage
 */
export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier doit être une image'));
      return;
    }

    // Vérifier la taille (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      reject(new Error('L\'image ne doit pas dépasser 2MB'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Uploader et enregistrer un nouveau logo
 */
export async function uploadCompanyLogo(file: File): Promise<CompanyLogo> {
  try {
    // Convertir en base64
    const base64Url = await convertImageToBase64(file);
    
    // Créer l'objet logo
    const logo: CompanyLogo = {
      url: base64Url,
      name: file.name,
      uploadedAt: new Date().toISOString(),
    };
    
    // Sauvegarder
    saveCompanyLogo(logo);
    
    return logo;
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error);
    throw error;
  }
}

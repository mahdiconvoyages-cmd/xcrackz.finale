// Service pour l'API publique INSEE (recherche d'entreprises par SIRET)
// Documentation: https://api.insee.fr/catalogue/

export interface InseeCompany {
  siret: string;
  siren: string;
  denomination: string;
  nomCommercial?: string;
  adresse: {
    complementAdresse?: string;
    numeroVoie?: string;
    typeVoie?: string;
    libelleVoie?: string;
    codePostal?: string;
    libelleCommune?: string;
  };
  activitePrincipale?: string;
  dateCreation?: string;
}

/**
 * Recherche une entreprise par SIRET via l'API INSEE publique
 * @param siret - Numéro SIRET (14 chiffres)
 * @returns Informations de l'entreprise ou null si non trouvée
 */
export async function searchBySiret(siret: string): Promise<InseeCompany | null> {
  try {
    // Nettoyer le SIRET (enlever espaces et caractères spéciaux)
    const cleanSiret = siret.replace(/\s/g, '').replace(/[^0-9]/g, '');
    
    console.log('🔍 searchBySiret appelé avec:', siret);
    console.log('🧹 SIRET nettoyé:', cleanSiret);
    
    if (cleanSiret.length !== 14) {
      console.warn('❌ SIRET invalide (doit contenir 14 chiffres), longueur:', cleanSiret.length);
      return null;
    }

    // Essayer d'abord l'API Recherche Entreprises (plus stable)
    console.log('📡 Tentative 1: API Recherche Entreprises...');
    const url1 = `https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiret}`;
    console.log('📡 URL:', url1);
    
    try {
      const response1 = await fetch(url1, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      console.log('📥 Réponse API Recherche - Status:', response1.status);

      if (response1.ok) {
        const data1 = await response1.json();
        console.log('📦 Données API Recherche:', data1);
        
        if (data1.results && data1.results.length > 0) {
          const result = data1.results[0];
          console.log('✅ Entreprise trouvée via API Recherche !');
          
          return {
            siret: result.siege?.siret || cleanSiret,
            siren: result.siren || cleanSiret.substring(0, 9),
            denomination: result.nom_complet || result.nom_raison_sociale || 'Entreprise',
            nomCommercial: result.enseigne || result.nom_commercial,
            adresse: {
              complementAdresse: result.siege?.complement_adresse,
              numeroVoie: result.siege?.numero_voie,
              typeVoie: result.siege?.type_voie,
              libelleVoie: result.siege?.libelle_voie,
              codePostal: result.siege?.code_postal,
              libelleCommune: result.siege?.libelle_commune
            },
            activitePrincipale: result.activite_principale,
            dateCreation: result.date_creation
          };
        }
      }
    } catch (err1) {
      console.warn('⚠️ API Recherche échouée, tentative API INSEE...', err1);
    }

    // Fallback: API INSEE (entreprise.data.gouv.fr)
    console.log('📡 Tentative 2: API INSEE entreprise.data.gouv.fr...');
    const url = `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${cleanSiret}`;
    console.log('📡 URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('📥 Réponse API INSEE - Status:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('❌ SIRET non trouvé dans la base INSEE (404)');
        return null;
      }
      console.error('❌ Erreur API INSEE:', response.status);
      throw new Error(`Erreur API INSEE: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Données brutes reçues:', data);
    
    const etablissement = data.etablissement;

    if (!etablissement) {
      console.warn('❌ Pas de données établissement dans la réponse');
      return null;
    }

    console.log('🏢 Établissement trouvé:', {
      siret: etablissement.siret,
      denomination: etablissement.unite_legale?.denomination,
      adresse: etablissement.adresse
    });

    // Formater l'adresse
    const adresse = etablissement.adresse || {};
    
    const adresseFormatee = [
      adresse.numero_voie,
      adresse.type_voie,
      adresse.libelle_voie,
      adresse.code_postal,
      adresse.libelle_commune
    ].filter(Boolean).join(' ').trim();
    
    console.log('📍 Adresse formatée:', adresseFormatee);

    const result = {
      siret: etablissement.siret,
      siren: etablissement.siren,
      denomination: etablissement.unite_legale?.denomination || 
                    etablissement.unite_legale?.denomination_usuelle ||
                    `${etablissement.unite_legale?.prenom_1 || ''} ${etablissement.unite_legale?.nom || ''}`.trim() ||
                    'Entreprise sans nom',
      nomCommercial: etablissement.enseigne_1 || etablissement.enseigne_2 || etablissement.enseigne_3,
      adresse: {
        complementAdresse: adresse.complement_adresse,
        numeroVoie: adresse.numero_voie,
        typeVoie: adresse.type_voie,
        libelleVoie: adresse.libelle_voie,
        codePostal: adresse.code_postal,
        libelleCommune: adresse.libelle_commune
      },
      activitePrincipale: etablissement.activite_principale,
      dateCreation: etablissement.date_creation
    };
    
    console.log('✅ Résultat final:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors de la recherche SIRET:', error);
    return null;
  }
}

/**
 * Formate une adresse INSEE en string
 */
export function formatInseeAddress(adresse: InseeCompany['adresse']): string {
  return [
    adresse.complementAdresse,
    adresse.numeroVoie,
    adresse.typeVoie,
    adresse.libelleVoie,
    adresse.codePostal,
    adresse.libelleCommune
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Formate un numéro SIRET avec espaces (XXX XXX XXX XXXXX)
 */
export function formatSiret(siret: string): string {
  const clean = siret.replace(/\s/g, '');
  if (clean.length !== 14) return siret;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 14)}`;
}

/**
 * Valide un numéro SIRET (14 chiffres)
 */
export function isValidSiret(siret: string): boolean {
  const clean = siret.replace(/\s/g, '');
  return /^\d{14}$/.test(clean);
}

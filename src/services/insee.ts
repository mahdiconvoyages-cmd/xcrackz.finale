export interface InseeCompany {
  siren: string;
  siret: string;
  denomination: string;
  nom?: string;
  prenom?: string;
  adresse: string;
  codePostal: string;
  commune: string;
  activitePrincipale: string;
  dateCreation?: string;
}

export async function searchCompaniesBySiret(siret: string): Promise<InseeCompany | null> {
  try {
    const cleanSiret = siret.replace(/\s/g, '');

    if (cleanSiret.length !== 14) {
      throw new Error('Le SIRET doit contenir 14 chiffres');
    }

    const response = await fetch(
      `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${cleanSiret}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('SIRET non trouvé');
      }
      throw new Error('Erreur lors de la recherche');
    }

    const data = await response.json();
    const etablissement = data.etablissement;
    const uniteLegale = etablissement.unite_legale;

    return {
      siren: etablissement.siren,
      siret: etablissement.siret,
      denomination:
        uniteLegale.denomination ||
        (uniteLegale.nom_raison_sociale) ||
        (uniteLegale.prenom_1 && uniteLegale.nom ? `${uniteLegale.prenom_1} ${uniteLegale.nom}` : '') ||
        'Entreprise',
      nom: uniteLegale.nom,
      prenom: uniteLegale.prenom_1,
      adresse: [
        etablissement.geo_l4,
        etablissement.geo_l5,
        etablissement.geo_l6,
      ].filter(Boolean).join(', '),
      codePostal: etablissement.code_postal || '',
      commune: etablissement.libelle_commune || '',
      activitePrincipale: etablissement.activite_principale || '',
      dateCreation: uniteLegale.date_creation,
    };
  } catch (error) {
    console.error('Erreur API INSEE:', error);
    throw error;
  }
}

export async function searchCompaniesByName(name: string): Promise<InseeCompany[]> {
  try {
    if (name.length < 3) {
      throw new Error('Le nom doit contenir au moins 3 caractères');
    }

    const response = await fetch(
      `https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales?nom_raison_sociale=${encodeURIComponent(name)}&per_page=10`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la recherche');
    }

    const data = await response.json();

    if (!data.unite_legale || data.unite_legale.length === 0) {
      return [];
    }

    return data.unite_legale.map((unite: any) => ({
      siren: unite.siren,
      siret: unite.etablissement_siege?.siret || unite.siren + '00000',
      denomination:
        unite.denomination ||
        unite.nom_raison_sociale ||
        (unite.prenom_1 && unite.nom ? `${unite.prenom_1} ${unite.nom}` : '') ||
        'Entreprise',
      nom: unite.nom,
      prenom: unite.prenom_1,
      adresse: unite.etablissement_siege ? [
        unite.etablissement_siege.geo_l4,
        unite.etablissement_siege.geo_l5,
        unite.etablissement_siege.geo_l6,
      ].filter(Boolean).join(', ') : '',
      codePostal: unite.etablissement_siege?.code_postal || '',
      commune: unite.etablissement_siege?.libelle_commune || '',
      activitePrincipale: unite.activite_principale || '',
      dateCreation: unite.date_creation,
    }));
  } catch (error) {
    console.error('Erreur API INSEE:', error);
    throw error;
  }
}

// Service pour créer des clients (avec recherche SIRET automatique)
import { supabase } from '../lib/supabase';
import { searchBySiret, formatInseeAddress } from './inseeService';

export interface ClientData {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  siret?: string;
  siren?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  is_company?: boolean;
  notes?: string;
}

export interface ClientCreationResult {
  success: boolean;
  client?: any;
  message: string;
  missingFields?: string[];
  suggestedData?: ClientData;
}

/**
 * Crée un client en utilisant un SIRET pour pré-remplir les données
 * @param userId - ID de l'utilisateur
 * @param siret - Numéro SIRET (14 chiffres)
 * @param additionalData - Données supplémentaires (email, phone, notes...)
 * @returns Résultat de la création avec client créé ou suggestions
 */
export async function createClientFromSiret(
  userId: string,
  siret: string,
  additionalData?: Partial<ClientData>
): Promise<ClientCreationResult> {
  try {
    console.log('🏢 Création client avec SIRET:', siret);
    
    // 1. Vérifier si le client existe déjà avec ce SIRET
    const existingClient = await findClient(userId, siret);
    
    if (existingClient) {
      return {
        success: false,
        message: `⚠️ Ce client existe déjà !\n\n📋 ${existingClient.name}\n${existingClient.company_name ? `🏢 ${existingClient.company_name}\n` : ''}📄 SIRET: ${existingClient.siret}\n📧 ${existingClient.email || 'Pas d\'email'}\n📞 ${existingClient.phone || 'Pas de téléphone'}\n📍 ${existingClient.address || 'Pas d\'adresse'}\n\n💡 Tu peux créer une facture ou un devis pour ce client !`,
        client: existingClient,
      };
    }
    
    // 2. Rechercher les informations via l'API INSEE
    const inseeData = await searchBySiret(siret);
    
    if (!inseeData) {
      return {
        success: false,
        message: `❌ SIRET ${siret} non trouvé dans la base INSEE. Veux-tu créer le client manuellement ?`,
        missingFields: ['name', 'address'],
      };
    }

    console.log('✅ Données INSEE récupérées:', inseeData);

    // 2. Préparer les données du client
    const fullAddress = formatInseeAddress(inseeData.adresse);
    
    const clientData: ClientData = {
      name: inseeData.denomination,
      company_name: inseeData.nomCommercial || inseeData.denomination,
      siret: inseeData.siret,
      siren: inseeData.siren,
      address: fullAddress,
      postal_code: inseeData.adresse.codePostal,
      city: inseeData.adresse.libelleCommune,
      country: 'France',
      is_company: true,
      // Données supplémentaires fournies par l'utilisateur
      email: additionalData?.email,
      phone: additionalData?.phone,
      notes: additionalData?.notes,
    };

    // 3. Vérifier les champs obligatoires manquants
    const missingFields: string[] = [];
    
    if (!clientData.email) missingFields.push('email');
    if (!clientData.phone) missingFields.push('phone');

    // Si des champs facultatifs manquent, on suggère mais on ne bloque pas
    if (missingFields.length > 0) {
      return {
        success: false,
        message: `✅ J'ai trouvé l'entreprise "${clientData.name}" !\n\n📋 Informations récupérées:\n- Raison sociale: ${clientData.name}\n- SIRET: ${clientData.siret}\n- Adresse: ${clientData.address}\n\n💡 Pour finaliser, j'ai besoin de:\n${missingFields.map(f => `- ${f === 'email' ? 'Email' : 'Téléphone'}`).join('\n')}\n\nTu peux me les donner ou je peux créer le client sans ces infos (facultatives).`,
        suggestedData: clientData,
        missingFields,
      };
    }

    // 4. Créer le client dans la base de données
    const { data: client, error } = await supabase
      .from('clients')
      .insert([
        {
          user_id: userId,
          ...clientData,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création client:', error);
      return {
        success: false,
        message: `❌ Erreur lors de la création du client: ${error.message}`,
      };
    }

    console.log('✅ Client créé avec succès:', client);

    return {
      success: true,
      client,
      message: `✅ Client "${clientData.name}" créé avec succès ! 🎉\n\n📋 Récapitulatif:\n- Entreprise: ${clientData.company_name}\n- SIRET: ${clientData.siret}\n- Adresse: ${clientData.address}\n- Email: ${clientData.email || 'Non renseigné'}\n- Téléphone: ${clientData.phone || 'Non renseigné'}\n\nJe peux maintenant créer des factures ou devis pour ce client ! 💼`,
    };
  } catch (err: any) {
    console.error('❌ Erreur createClientFromSiret:', err);
    return {
      success: false,
      message: `❌ Une erreur est survenue: ${err.message}`,
    };
  }
}

/**
 * Crée un client manuellement (sans SIRET)
 * @param userId - ID de l'utilisateur
 * @param clientData - Données du client
 * @returns Résultat de la création
 */
export async function createClientManually(
  userId: string,
  clientData: ClientData
): Promise<ClientCreationResult> {
  try {
    console.log('📝 Création client manuelle:', clientData);

    // Vérifier les champs obligatoires
    if (!clientData.name) {
      return {
        success: false,
        message: '❌ Le nom du client est obligatoire.',
        missingFields: ['name'],
      };
    }

    // Créer le client
    const { data: client, error } = await supabase
      .from('clients')
      .insert([
        {
          user_id: userId,
          ...clientData,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création client manuelle:', error);
      return {
        success: false,
        message: `❌ Erreur lors de la création: ${error.message}`,
      };
    }

    console.log('✅ Client créé manuellement:', client);

    return {
      success: true,
      client,
      message: `✅ Client "${clientData.name}" créé avec succès ! 🎉\n\nJe peux maintenant créer des factures ou devis pour ce client ! 💼`,
    };
  } catch (err: any) {
    console.error('❌ Erreur createClientManually:', err);
    return {
      success: false,
      message: `❌ Une erreur est survenue: ${err.message}`,
    };
  }
}

/**
 * Recherche un client existant par nom, email ou SIRET
 * @param userId - ID de l'utilisateur
 * @param query - Nom, email ou SIRET
 * @returns Client trouvé ou null
 */
export async function findClient(userId: string, query: string): Promise<any | null> {
  try {
    console.log('🔍 Recherche client:', query);

    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,siret.eq.${query}`)
      .limit(1);

    if (error) {
      console.error('❌ Erreur recherche client:', error);
      return null;
    }

    if (clients && clients.length > 0) {
      console.log('✅ Client trouvé:', clients[0]);
      return clients[0];
    }

    console.log('❌ Aucun client trouvé pour:', query);
    return null;
  } catch (err) {
    console.error('❌ Erreur findClient:', err);
    return null;
  }
}

/**
 * Liste tous les clients de l'utilisateur
 * @param userId - ID de l'utilisateur
 * @returns Liste des clients
 */
export async function listClients(userId: string): Promise<any[]> {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur liste clients:', error);
      return [];
    }

    return clients || [];
  } catch (err) {
    console.error('❌ Erreur listClients:', err);
    return [];
  }
}

// Service de tools/outils exécutables pour Clara
// Clara peut appeler ces fonctions pour interagir avec le site
import { supabase } from '../lib/supabase';
import { NavigateFunction } from 'react-router-dom';

// ========================================
// TYPES
// ========================================

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  redirect?: string; // Page vers laquelle rediriger
  requiresConfirmation?: boolean;
}

export interface ToolExecutionContext {
  userId: string;
  navigate?: NavigateFunction;
  userMetadata?: any;
}

// ========================================
// OUTILS - GESTION DES CLIENTS
// ========================================

/**
 * Recherche une entreprise via API Sirene (INSEE)
 */
export async function searchCompanyBySiret(siret: string): Promise<ToolResult> {
  try {
    // Nettoyer le SIRET (retirer espaces)
    const cleanSiret = siret.replace(/\s/g, '');
    
    if (cleanSiret.length !== 14) {
      return {
        success: false,
        message: "❌ Le SIRET doit contenir 14 chiffres. Exemple: 12345678900014"
      };
    }

    const response = await fetch(`https://api.insee.fr/entreprises/sirene/V3/siret/${cleanSiret}`, {
      headers: {
        'Authorization': 'Bearer votre-token-insee', // TODO: Ajouter token INSEE
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        message: "❌ Entreprise non trouvée dans la base Sirene. Vérifie le SIRET."
      };
    }

    const data = await response.json();
    const etablissement = data.etablissement;

    return {
      success: true,
      message: "✅ Entreprise trouvée !",
      data: {
        company_name: etablissement.uniteLegale.denominationUniteLegale,
        siret: etablissement.siret,
        siren: etablissement.siren,
        address: `${etablissement.adresseEtablissement.numeroVoieEtablissement || ''} ${etablissement.adresseEtablissement.typeVoieEtablissement || ''} ${etablissement.adresseEtablissement.libelleVoieEtablissement || ''}`.trim(),
        postal_code: etablissement.adresseEtablissement.codePostalEtablissement,
        city: etablissement.adresseEtablissement.libelleCommuneEtablissement
      }
    };
  } catch (error) {
    console.error('Error searching company:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la recherche de l'entreprise."
    };
  }
}

/**
 * Créer un client (particulier ou entreprise)
 */
export async function createClient(
  ctx: ToolExecutionContext,
  clientData: {
    type: 'individual' | 'company';
    first_name?: string;
    last_name?: string;
    company_name?: string;
    siret?: string;
    siren?: string;
    email?: string;
    phone?: string;
    address?: string;
    postal_code?: string;
    city?: string;
  }
): Promise<ToolResult> {
  try {
    // Validation
    if (clientData.type === 'individual' && (!clientData.first_name || !clientData.last_name)) {
      return {
        success: false,
        message: "❌ Pour un particulier, le prénom et le nom sont obligatoires."
      };
    }

    if (clientData.type === 'company' && !clientData.company_name) {
      return {
        success: false,
        message: "❌ Pour une entreprise, la raison sociale est obligatoire."
      };
    }

    // Vérifier si le client existe déjà
    let existingClient = null;
    
    if (clientData.siret) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', ctx.userId)
        .eq('siret', clientData.siret)
        .maybeSingle();
      existingClient = data;
    } else if (clientData.email) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', ctx.userId)
        .eq('email', clientData.email)
        .maybeSingle();
      existingClient = data;
    }

    if (existingClient) {
      return {
        success: false,
        message: `⚠️ Ce client existe déjà ! ${existingClient.company_name || `${existingClient.first_name} ${existingClient.last_name}`}`,
        data: existingClient
      };
    }

    // Créer le client
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        user_id: ctx.userId,
        type: clientData.type,
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        company_name: clientData.company_name,
        siret: clientData.siret,
        siren: clientData.siren,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        postal_code: clientData.postal_code,
        city: clientData.city
      })
      .select()
      .single();

    if (error) throw error;

    const clientName = newClient.company_name || `${newClient.first_name} ${newClient.last_name}`;

    return {
      success: true,
      message: `✅ Client créé avec succès ! ${clientName}`,
      data: newClient,
      redirect: '/billing'
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la création du client."
    };
  }
}

/**
 * Rechercher un client
 */
export async function searchClient(
  ctx: ToolExecutionContext,
  query: string
): Promise<ToolResult> {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', ctx.userId)
      .or(`company_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,siret.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    if (!clients || clients.length === 0) {
      return {
        success: false,
        message: `❌ Aucun client trouvé pour "${query}". Veux-tu en créer un ?`
      };
    }

    return {
      success: true,
      message: `✅ ${clients.length} client(s) trouvé(s):`,
      data: clients
    };
  } catch (error) {
    console.error('Error searching clients:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la recherche de clients."
    };
  }
}

/**
 * Lister tous les clients
 */
export async function listClients(
  ctx: ToolExecutionContext,
  type?: 'individual' | 'company' | 'all'
): Promise<ToolResult> {
  try {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', ctx.userId);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data: clients, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const typeLabel = type === 'individual' ? 'particuliers' : type === 'company' ? 'entreprises' : 'clients';

    return {
      success: true,
      message: `✅ ${clients.length} ${typeLabel} trouvé(s):`,
      data: clients,
      redirect: '/billing'
    };
  } catch (error) {
    console.error('Error listing clients:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la récupération des clients."
    };
  }
}

// ========================================
// OUTILS - FACTURATION
// ========================================

/**
 * Générer une facture ou un devis
 */
export async function generateInvoice(
  ctx: ToolExecutionContext,
  invoiceData: {
    client_id: string;
    amount_ttc: number;
    description: string;
    issue_date?: string;
    type: 'invoice' | 'quote';
  }
): Promise<ToolResult> {
  try {
    // Validation
    if (!invoiceData.client_id || !invoiceData.amount_ttc || !invoiceData.description) {
      return {
        success: false,
        message: "❌ Informations manquantes: client_id, amount_ttc, description sont obligatoires."
      };
    }

    if (invoiceData.amount_ttc <= 0) {
      return {
        success: false,
        message: "❌ Le montant TTC doit être supérieur à 0."
      };
    }

    // Récupérer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoiceData.client_id)
      .eq('user_id', ctx.userId)
      .single();

    if (clientError || !client) {
      return {
        success: false,
        message: "❌ Client non trouvé. Vérifie l'ID du client."
      };
    }

    // Calculs automatiques
    const amount_ht = invoiceData.amount_ttc / 1.20;
    const tva_amount = amount_ht * 0.20;

    // Générer numéro de facture/devis
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('user_id', ctx.userId)
      .eq('type', invoiceData.type)
      .order('created_at', { ascending: false })
      .limit(1);

    let invoice_number = '';
    if (existingInvoices && existingInvoices.length > 0) {
      const lastNumber = parseInt(existingInvoices[0].invoice_number.split('-')[1]);
      invoice_number = `${invoiceData.type === 'invoice' ? 'FAC' : 'DEV'}-${String(lastNumber + 1).padStart(5, '0')}`;
    } else {
      invoice_number = `${invoiceData.type === 'invoice' ? 'FAC' : 'DEV'}-00001`;
    }

    // Créer la facture/devis
    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert({
        user_id: ctx.userId,
        client_id: invoiceData.client_id,
        invoice_number,
        type: invoiceData.type,
        amount_ttc: invoiceData.amount_ttc,
        amount_ht: Number(amount_ht.toFixed(2)),
        tva_amount: Number(tva_amount.toFixed(2)),
        tva_rate: 20,
        description: invoiceData.description,
        issue_date: invoiceData.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoiceData.issue_date ? new Date(new Date(invoiceData.issue_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    const clientName = client.company_name || `${client.first_name} ${client.last_name}`;
    const docType = invoiceData.type === 'invoice' ? 'Facture' : 'Devis';

    return {
      success: true,
      message: `✅ ${docType} ${invoice_number} créé(e) avec succès pour ${clientName} !\n💰 Montant: ${invoiceData.amount_ttc.toFixed(2)}€ TTC (${amount_ht.toFixed(2)}€ HT + ${tva_amount.toFixed(2)}€ TVA)\n📄 Tu peux la télécharger dans ta page Facturation.`,
      data: newInvoice,
      redirect: '/billing'
    };
  } catch (error) {
    console.error('Error generating invoice:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la génération de la facture/devis."
    };
  }
}

// ========================================
// OUTILS - MISSIONS
// ========================================

/**
 * Créer une mission
 */
export async function createMission(
  ctx: ToolExecutionContext,
  missionData: {
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate?: string;
    vehicle_vin?: string;
    pickup_address: string;
    pickup_date: string;
    delivery_address: string;
    delivery_date?: string;
    price: number;
    notes?: string;
  }
): Promise<ToolResult> {
  try {
    // Vérifier crédits
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', ctx.userId)
      .single();

    if (creditsError || !credits || credits.balance < 1) {
      return {
        success: false,
        message: "❌ Crédits insuffisants. Tu as besoin d'au moins 1 crédit pour créer une mission. Veux-tu en acheter ?",
        redirect: '/shop'
      };
    }

    // Générer référence unique
    const { data: existingMissions } = await supabase
      .from('missions')
      .select('reference')
      .order('created_at', { ascending: false })
      .limit(1);

    let reference = 'MISS-001';
    if (existingMissions && existingMissions.length > 0) {
      const lastNumber = parseInt(existingMissions[0].reference.split('-')[1]);
      reference = `MISS-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Créer la mission
    const { data: newMission, error } = await supabase
      .from('missions')
      .insert({
        reference,
        user_id: ctx.userId,
        vehicle_brand: missionData.vehicle_brand,
        vehicle_model: missionData.vehicle_model,
        vehicle_plate: missionData.vehicle_plate,
        vehicle_vin: missionData.vehicle_vin,
        pickup_address: missionData.pickup_address,
        pickup_date: missionData.pickup_date,
        delivery_address: missionData.delivery_address,
        delivery_date: missionData.delivery_date || missionData.pickup_date,
        price: missionData.price,
        notes: missionData.notes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Déduire 1 crédit
    await supabase
      .from('user_credits')
      .update({ balance: credits.balance - 1 })
      .eq('user_id', ctx.userId);

    // Enregistrer le revenu
    // TODO: Implémenter table monthly_revenue ou ajouter au dashboard

    return {
      success: true,
      message: `✅ Mission ${reference} créée avec succès !\n🚗 ${missionData.vehicle_brand} ${missionData.vehicle_model}\n📍 ${missionData.pickup_address} → ${missionData.delivery_address}\n💰 Revenu: ${missionData.price.toFixed(2)}€ HT\n🎫 Crédits restants: ${credits.balance - 1}`,
      data: newMission,
      redirect: '/missions'
    };
  } catch (error) {
    console.error('Error creating mission:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la création de la mission."
    };
  }
}

/**
 * Assigner une mission à un chauffeur
 */
export async function assignMission(
  ctx: ToolExecutionContext,
  assignmentData: {
    mission_id: string;
    contact_id: string;
    payment_ht: number;
    commission: number;
  }
): Promise<ToolResult> {
  try {
    // Récupérer la mission
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', assignmentData.mission_id)
      .eq('user_id', ctx.userId)
      .single();

    if (missionError || !mission) {
      return {
        success: false,
        message: "❌ Mission non trouvée. Vérifie l'ID de la mission."
      };
    }

    // Vérifier que payment_ht + commission = mission.price
    const total = assignmentData.payment_ht + assignmentData.commission;
    if (Math.abs(total - mission.price) > 0.01) {
      return {
        success: false,
        message: `❌ Incohérence de montants !\n• Prestataire: ${assignmentData.payment_ht}€ HT\n• Commission: ${assignmentData.commission}€ HT\n• Total: ${total}€ HT\n• Mission: ${mission.price}€ HT\n\nLe total (prestataire + commission) doit égaler le montant de la mission.`
      };
    }

    // Récupérer le contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', assignmentData.contact_id)
      .eq('user_id', ctx.userId)
      .single();

    if (contactError || !contact) {
      return {
        success: false,
        message: "❌ Contact/chauffeur non trouvé. Vérifie l'ID du contact."
      };
    }

    // Créer l'assignation
    const { data: assignment, error } = await supabase
      .from('mission_assignments')
      .insert({
        mission_id: assignmentData.mission_id,
        contact_id: assignmentData.contact_id,
        payment_ht: assignmentData.payment_ht,
        commission: assignmentData.commission,
        status: 'assigned'
      })
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour la mission
    await supabase
      .from('missions')
      .update({
        driver_id: assignmentData.contact_id,
        status: 'assigned'
      })
      .eq('id', assignmentData.mission_id);

    return {
      success: true,
      message: `✅ Mission ${mission.reference} assignée à ${contact.name} !\n💰 Prestataire: ${assignmentData.payment_ht.toFixed(2)}€ HT\n💸 Ta commission: ${assignmentData.commission.toFixed(2)}€ HT\n📊 Revenu du mois: +${assignmentData.commission.toFixed(2)}€`,
      data: assignment,
      redirect: '/missions'
    };
  } catch (error) {
    console.error('Error assigning mission:', error);
    return {
      success: false,
      message: "❌ Erreur lors de l'assignation de la mission."
    };
  }
}

/**
 * Suggérer le meilleur chauffeur pour une mission
 */
export async function suggestDriver(
  ctx: ToolExecutionContext,
  missionData: {
    mission_id?: string;
    vehicle_type: 'light' | 'heavy_goods';
    departure_city: string;
    departure_date: string;
  }
): Promise<ToolResult> {
  try {
    // Récupérer TOUS les chauffeurs
    const { data: drivers, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', ctx.userId)
      .eq('type', 'driver');

    if (error) throw error;

    if (!drivers || drivers.length === 0) {
      return {
        success: false,
        message: "❌ Tu n'as aucun chauffeur dans tes contacts. Ajoute d'abord des chauffeurs."
      };
    }

    // Analyser chaque chauffeur
    interface DriverScore {
      driver: any;
      score: number;
      available: boolean;
      hasRightLicense: boolean;
      sameCity: boolean;
      distance: number;
      reasons: string[];
    }

    const driverScores: DriverScore[] = [];

    for (const driver of drivers) {
      let score = 0;
      const reasons: string[] = [];
      
      // 1. Vérifier disponibilité (via calendrier)
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', driver.id)
        .gte('start_date', missionData.departure_date)
        .lte('end_date', missionData.departure_date);

      const available = !events || events.length === 0;
      if (available) {
        score += 30;
        reasons.push("✅ Disponible");
      } else {
        reasons.push("❌ Pas disponible");
      }

      // 2. Vérifier type de permis
      const hasRightLicense = driver.license_type === missionData.vehicle_type;
      if (hasRightLicense) {
        score += 40;
        reasons.push("✅ Permis adapté");
      } else {
        reasons.push("❌ Permis non adapté");
      }

      // 3. Vérifier ville (proximité)
      const sameCity = driver.city?.toLowerCase() === missionData.departure_city.toLowerCase();
      if (sameCity) {
        score += 30;
        reasons.push("✅ Même ville");
      } else {
        score += 10; // Points bonus si proche
        reasons.push(`⚠️ Ville différente (${driver.city || 'non renseignée'})`);
      }

      // 4. Distance (approximative)
      // TODO: Utiliser Google Maps Distance Matrix API
      const distance = sameCity ? 0 : 100; // Placeholder

      driverScores.push({
        driver,
        score,
        available,
        hasRightLicense,
        sameCity,
        distance,
        reasons
      });
    }

    // Trier par score décroissant
    driverScores.sort((a, b) => b.score - a.score);

    // Prendre les 3 meilleurs
    const topDrivers = driverScores.slice(0, 3);

    // Formater le message
    let message = `🎯 Suggestions de chauffeurs pour cette mission:\n\n`;
    
    topDrivers.forEach((ds, index) => {
      const medal = index === 0 ? '⭐' : index === 1 ? '🥈' : '🥉';
      message += `${medal} ${index + 1}. ${ds.driver.name} (${ds.score}/100)\n`;
      ds.reasons.forEach(reason => {
        message += `   ${reason}\n`;
      });
      if (ds.driver.rating) {
        message += `   Note: ${ds.driver.rating}/5 (${ds.driver.total_missions || 0} missions)\n`;
      }
      message += `\n`;
    });

    if (topDrivers.length > 0 && topDrivers[0].score >= 70) {
      message += `💡 Je recommande ${topDrivers[0].driver.name}. Veux-tu lui assigner cette mission ?`;
    } else {
      message += `⚠️ Aucun chauffeur idéal trouvé. Considère:\n`;
      message += `   • Ajouter plus de chauffeurs\n`;
      message += `   • Vérifier leurs disponibilités\n`;
      message += `   • Mettre à jour leurs villes`;
    }

    return {
      success: true,
      message,
      data: topDrivers
    };
  } catch (error) {
    console.error('Error suggesting driver:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la suggestion de chauffeur."
    };
  }
}

// ========================================
// OUTILS - CONTACTS
// ========================================

/**
 * Lister tous les contacts
 */
export async function listContacts(
  ctx: ToolExecutionContext,
  type?: 'customer' | 'driver' | 'supplier' | 'personal' | 'all'
): Promise<ToolResult> {
  try {
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('user_id', ctx.userId);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data: contacts, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const typeLabel = type === 'customer' ? 'clients' : type === 'driver' ? 'chauffeurs' : type === 'supplier' ? 'fournisseurs' : type === 'personal' ? 'personnels' : 'contacts';

    return {
      success: true,
      message: `✅ ${contacts.length} ${typeLabel} trouvé(s):`,
      data: contacts,
      redirect: '/contacts'
    };
  } catch (error) {
    console.error('Error listing contacts:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la récupération des contacts."
    };
  }
}

/**
 * Vérifier la disponibilité d'un chauffeur
 */
export async function checkDriverAvailability(
  ctx: ToolExecutionContext,
  contactId: string,
  date: string
): Promise<ToolResult> {
  try {
    // Récupérer le contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', ctx.userId)
      .single();

    if (contactError || !contact) {
      return {
        success: false,
        message: "❌ Contact non trouvé."
      };
    }

    // Vérifier si le contact a accès au calendrier
    if (!contact.has_calendar_access) {
      return {
        success: false,
        message: `❌ ${contact.name} n'a pas activé le partage de son calendrier.`
      };
    }

    // Récupérer les événements à cette date
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', contact.id)
      .gte('start_date', `${date}T00:00:00`)
      .lte('end_date', `${date}T23:59:59`);

    if (error) throw error;

    if (!events || events.length === 0) {
      return {
        success: true,
        message: `✅ ${contact.name} est disponible le ${new Date(date).toLocaleDateString('fr-FR')} !`,
        data: { available: true, events: [] }
      };
    }

    return {
      success: true,
      message: `❌ ${contact.name} n'est PAS disponible le ${new Date(date).toLocaleDateString('fr-FR')}.\n\nÉvénements prévus:`,
      data: { available: false, events }
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la vérification de disponibilité."
    };
  }
}

// ========================================
// OUTILS - CRÉDITS
// ========================================

/**
 * Vérifier le solde de crédits
 */
export async function checkCredits(
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  try {
    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', ctx.userId)
      .single();

    if (error) throw error;

    let message = `💳 **Crédits disponibles:** ${credits.balance}\n\n`;
    message += `📊 Statistiques:\n`;
    message += `   • Total gagné: ${credits.lifetime_earned}\n`;
    message += `   • Total dépensé: ${credits.lifetime_spent}\n`;

    if (credits.balance < 5) {
      message += `\n⚠️ Ton solde est faible. Veux-tu en acheter ?`;
      return {
        success: true,
        message,
        data: credits,
        redirect: '/shop'
      };
    }

    return {
      success: true,
      message,
      data: credits
    };
  } catch (error) {
    console.error('Error checking credits:', error);
    return {
      success: false,
      message: "❌ Erreur lors de la vérification des crédits."
    };
  }
}

// ========================================
// OUTILS - NAVIGATION
// ========================================

/**
 * Naviguer vers une page
 */
export async function navigateToPage(
  ctx: ToolExecutionContext,
  page: string
): Promise<ToolResult> {
  if (ctx.navigate) {
    ctx.navigate(page);
    
    const pageNames: Record<string, string> = {
      '/dashboard': 'Tableau de bord',
      '/missions': 'Missions',
      '/billing': 'Facturation',
      '/contacts': 'Contacts',
      '/covoiturage': 'Covoiturage',
      '/rapports-inspection': 'Rapports d\'inspection',
      '/shop': 'Boutique (crédits)',
      '/profile': 'Profil'
    };

    return {
      success: true,
      message: `✅ Redirection vers ${pageNames[page] || page}...`,
      redirect: page
    };
  }

  return {
    success: false,
    message: "❌ Impossible de naviguer (contexte manquant)."
  };
}

// ========================================
// EXPORT
// ========================================

export const ToolsService = {
  // Clients
  searchCompanyBySiret,
  createClient,
  searchClient,
  listClients,
  
  // Facturation
  generateInvoice,
  
  // Missions
  createMission,
  assignMission,
  suggestDriver,
  
  // Contacts
  listContacts,
  checkDriverAvailability,
  
  // Crédits
  checkCredits,
  
  // Navigation
  navigateToPage
};

export default ToolsService;

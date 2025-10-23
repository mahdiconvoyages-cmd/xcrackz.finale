import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  distance?: number;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  price: number;
  notes?: string;
  created_at: string;
}

interface Assignment {
  payment_ht?: number;
  commission?: number;
  notes?: string;
  assigned_at?: string;
  status?: string;
  assigner?: {
    email: string;
  };
}

/**
 * Génère un PDF pour une mission avec ses détails et assignation
 */
export async function generateMissionPDF(
  mission: Mission,
  assignment?: Assignment
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const html = generateMissionHTML(mission, assignment);
    
    // Générer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Renommer le fichier avec un nom explicite
    const fileName = `Mission_${mission.reference}_${new Date().toISOString().split('T')[0]}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    return { success: true, uri: newUri };
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Génère et partage le PDF
 */
export async function generateAndShareMissionPDF(
  mission: Mission,
  assignment?: Assignment
): Promise<void> {
  try {
    const result = await generateMissionPDF(mission, assignment);
    
    if (!result.success || !result.uri) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
      return;
    }

    // Vérifier si le partage est disponible
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Mission ${mission.reference}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Succès', 'PDF généré et enregistré dans les documents');
    }
  } catch (error: any) {
    console.error('Error sharing PDF:', error);
    Alert.alert('Erreur', 'Impossible de partager le PDF');
  }
}

/**
 * Génère le HTML pour le PDF de la mission
 */
function generateMissionHTML(mission: Mission, assignment?: Assignment): string {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'assigned': return 'Assignée';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'in_progress': return '#3B82F6';
      case 'assigned': return '#A855F7';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#64748B';
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mission ${mission.reference}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #1E293B;
          padding: 20px;
        }
        
        .header {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .header .reference {
          font-size: 18px;
          opacity: 0.9;
        }
        
        .section {
          margin-bottom: 25px;
          background: #F8FAFC;
          padding: 20px;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #1E293B;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        
        .section-title span {
          margin-right: 8px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
        }
        
        .info-label {
          font-size: 10px;
          color: #64748B;
          text-transform: uppercase;
          margin-bottom: 4px;
          font-weight: 600;
        }
        
        .info-value {
          font-size: 13px;
          color: #1E293B;
          font-weight: 500;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 11px;
          background: ${getStatusColor(mission.status)}20;
          color: ${getStatusColor(mission.status)};
        }
        
        .route-point {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          border-left: 4px solid #22C55E;
        }
        
        .route-point.delivery {
          border-left-color: #EF4444;
        }
        
        .route-label {
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          color: #22C55E;
          margin-bottom: 8px;
        }
        
        .route-point.delivery .route-label {
          color: #EF4444;
        }
        
        .route-address {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          margin-bottom: 8px;
        }
        
        .route-date {
          font-size: 11px;
          color: #64748B;
          margin-bottom: 8px;
        }
        
        .contact-box {
          background: #F1F5F9;
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
        }
        
        .contact-name {
          font-size: 12px;
          font-weight: 600;
          color: #1E293B;
          margin-bottom: 4px;
        }
        
        .contact-phone {
          font-size: 12px;
          color: #3B82F6;
          font-weight: 500;
        }
        
        .assignment-section {
          background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%);
          border: 2px solid #F59E0B;
        }
        
        .payment-box {
          display: flex;
          justify-content: space-between;
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        
        .payment-item {
          text-align: center;
        }
        
        .payment-label {
          font-size: 10px;
          color: #64748B;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .payment-value {
          font-size: 20px;
          font-weight: bold;
          color: #22C55E;
        }
        
        .commission-value {
          color: #F59E0B;
        }
        
        .notes-box {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 1px dashed #CBD5E1;
          margin-top: 15px;
          font-style: italic;
          color: #475569;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #E2E8F0;
          text-align: center;
          color: #94A3B8;
          font-size: 10px;
        }
        
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <h1>🚗 DÉTAILS DE LA MISSION</h1>
        <div class="reference">${mission.reference}</div>
      </div>

      <!-- VÉHICULE -->
      <div class="section">
        <div class="section-title">
          <span>🚙</span> Véhicule
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Marque & Modèle</div>
            <div class="info-value">${mission.vehicle_brand} ${mission.vehicle_model}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Plaque</div>
            <div class="info-value">${mission.vehicle_plate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Statut</div>
            <div class="info-value">
              <span class="status-badge">${getStatusLabel(mission.status)}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Prix</div>
            <div class="info-value">${mission.price.toFixed(2)}€</div>
          </div>
        </div>
      </div>

      <!-- ITINÉRAIRE -->
      <div class="section">
        <div class="section-title">
          <span>📍</span> Itinéraire
        </div>
        
        <!-- Point de départ -->
        <div class="route-point">
          <div class="route-label">📍 DÉPART</div>
          <div class="route-address">${mission.pickup_address}</div>
          <div class="route-date">📅 ${formatDate(mission.pickup_date)}</div>
          ${mission.pickup_contact_name || mission.pickup_contact_phone ? `
            <div class="contact-box">
              ${mission.pickup_contact_name ? `<div class="contact-name">👤 ${mission.pickup_contact_name}</div>` : ''}
              ${mission.pickup_contact_phone ? `<div class="contact-phone">📞 ${mission.pickup_contact_phone}</div>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Distance -->
        ${mission.distance ? `
          <div style="text-align: center; color: #64748B; margin: 10px 0;">
            🛣️ Distance: <strong>${mission.distance} km</strong>
          </div>
        ` : ''}

        <!-- Point d'arrivée -->
        <div class="route-point delivery">
          <div class="route-label">🏁 ARRIVÉE</div>
          <div class="route-address">${mission.delivery_address}</div>
          <div class="route-date">📅 ${formatDate(mission.delivery_date)}</div>
          ${mission.delivery_contact_name || mission.delivery_contact_phone ? `
            <div class="contact-box">
              ${mission.delivery_contact_name ? `<div class="contact-name">👤 ${mission.delivery_contact_name}</div>` : ''}
              ${mission.delivery_contact_phone ? `<div class="contact-phone">📞 ${mission.delivery_contact_phone}</div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- ASSIGNATION -->
      ${assignment ? `
        <div class="section assignment-section">
          <div class="section-title">
            <span>🎯</span> Informations d'Assignation
          </div>
          
          <div class="info-grid">
            ${assignment.assigner?.email ? `
              <div class="info-item">
                <div class="info-label">Assignée par</div>
                <div class="info-value">👤 ${assignment.assigner.email}</div>
              </div>
            ` : ''}
            ${assignment.assigned_at ? `
              <div class="info-item">
                <div class="info-label">Date d'assignation</div>
                <div class="info-value">📅 ${formatDate(assignment.assigned_at)}</div>
              </div>
            ` : ''}
          </div>

          ${(assignment.payment_ht !== undefined && assignment.payment_ht > 0) || (assignment.commission !== undefined && assignment.commission > 0) ? `
            <div class="payment-box">
              ${assignment.payment_ht !== undefined && assignment.payment_ht > 0 ? `
                <div class="payment-item">
                  <div class="payment-label">Paiement HT</div>
                  <div class="payment-value">${assignment.payment_ht.toFixed(2)}€</div>
                </div>
              ` : ''}
              ${assignment.commission !== undefined && assignment.commission > 0 ? `
                <div class="payment-item">
                  <div class="payment-label">Commission</div>
                  <div class="payment-value commission-value">+${assignment.commission.toFixed(2)}€</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${assignment.notes ? `
            <div class="notes-box">
              <strong>📝 Notes:</strong><br>${assignment.notes}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- NOTES GÉNÉRALES -->
      ${mission.notes ? `
        <div class="section">
          <div class="section-title">
            <span>📝</span> Notes
          </div>
          <div class="notes-box">${mission.notes}</div>
        </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="footer">
        <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
        <p>Finality - Plateforme de Gestion de Convoyage</p>
      </div>
    </body>
    </html>
  `;
}

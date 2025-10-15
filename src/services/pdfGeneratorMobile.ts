import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

interface Client {
  name: string;
  email?: string;
  address?: string;
  siret?: string;
}

interface Company {
  name: string;
  address?: string;
  siret?: string;
  email?: string;
  phone?: string;
}

interface GeneratePDFParams {
  number: string;
  type: 'invoice' | 'quote';
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  client: Client;
  company: Company;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
}

/**
 * Génère le HTML pour une facture ou un devis
 */
export function generateInvoiceHTML(params: GeneratePDFParams): string {
  const {
    number,
    type,
    issueDate,
    dueDate,
    validUntil,
    client,
    company,
    items,
    subtotal,
    taxAmount,
    total,
    notes,
    paymentTerms,
  } = params;

  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'FACTURE' : 'DEVIS';
  const dateLabel = isInvoice ? "Date d'échéance" : 'Valide jusqu\'au';
  const dateValue = isInvoice ? dueDate : validUntil;

  const itemsHTML = items
    .map(
      (item, index) => `
        <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">
            ${item.description}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${item.unit_price.toFixed(2)}€
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.tax_rate}%
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
            ${(item.quantity * item.unit_price).toFixed(2)}€
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} ${number}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #1f2937;
          padding: 40px;
          background-color: #ffffff;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          border-bottom: 3px solid #14b8a6;
          padding-bottom: 20px;
        }
        
        .header-left h1 {
          color: #14b8a6;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .header-left p {
          color: #6b7280;
          font-size: 14px;
        }
        
        .header-right {
          text-align: right;
        }
        
        .header-right h2 {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .header-right p {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        
        .info-box {
          width: 48%;
        }
        
        .info-box h3 {
          font-size: 14px;
          color: #14b8a6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          font-weight: 600;
        }
        
        .info-box p {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 4px;
        }
        
        .info-box strong {
          color: #1f2937;
          font-weight: 600;
        }
        
        .dates {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
        }
        
        .date-item {
          flex: 1;
        }
        
        .date-item label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .date-item span {
          display: block;
          font-size: 15px;
          color: #1f2937;
          font-weight: 600;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        thead {
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          color: white;
        }
        
        thead th {
          padding: 14px 12px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        thead th:nth-child(2),
        thead th:nth-child(4) {
          text-align: center;
        }
        
        thead th:nth-child(3),
        thead th:nth-child(5) {
          text-align: right;
        }
        
        tbody td {
          font-size: 14px;
          color: #4b5563;
        }
        
        .totals {
          margin-left: auto;
          width: 350px;
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          border: 2px solid #e5e7eb;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 15px;
        }
        
        .total-row span:first-child {
          color: #6b7280;
        }
        
        .total-row span:last-child {
          color: #1f2937;
          font-weight: 600;
        }
        
        .total-final {
          border-top: 2px solid #14b8a6;
          padding-top: 12px;
          margin-top: 12px;
        }
        
        .total-final span:first-child {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
        }
        
        .total-final span:last-child {
          font-size: 22px;
          font-weight: bold;
          color: #14b8a6;
        }
        
        .notes {
          background-color: #f9fafb;
          border-left: 4px solid #14b8a6;
          padding: 16px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .notes h4 {
          font-size: 14px;
          color: #14b8a6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .notes p {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }
        
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <h1>${title}</h1>
          <p>N° ${number}</p>
        </div>
        <div class="header-right">
          <h2>${company.name}</h2>
          ${company.address ? `<p>${company.address}</p>` : ''}
          ${company.siret ? `<p>SIRET: ${company.siret}</p>` : ''}
          ${company.email ? `<p>${company.email}</p>` : ''}
          ${company.phone ? `<p>${company.phone}</p>` : ''}
        </div>
      </div>
      
      <!-- Info Section -->
      <div class="info-section">
        <div class="info-box">
          <h3>Client</h3>
          <p><strong>${client.name}</strong></p>
          ${client.email ? `<p>${client.email}</p>` : ''}
          ${client.address ? `<p>${client.address}</p>` : ''}
          ${client.siret ? `<p>SIRET: ${client.siret}</p>` : ''}
        </div>
        <div class="info-box">
          <h3>Informations</h3>
          <p><strong>Type:</strong> ${isInvoice ? 'Facture' : 'Devis'}</p>
          <p><strong>Numéro:</strong> ${number}</p>
          <p><strong>Date d'émission:</strong> ${new Date(issueDate).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
      
      <!-- Dates -->
      <div class="dates">
        <div class="date-item">
          <label>Date d'émission</label>
          <span>${new Date(issueDate).toLocaleDateString('fr-FR')}</span>
        </div>
        ${dateValue ? `
        <div class="date-item">
          <label>${dateLabel}</label>
          <span>${new Date(dateValue).toLocaleDateString('fr-FR')}</span>
        </div>
        ` : ''}
      </div>
      
      <!-- Items Table -->
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qté</th>
            <th>Prix HT</th>
            <th>TVA</th>
            <th>Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <!-- Totals -->
      <div class="totals">
        <div class="total-row">
          <span>Sous-total HT</span>
          <span>${subtotal.toFixed(2)}€</span>
        </div>
        <div class="total-row">
          <span>TVA</span>
          <span>${taxAmount.toFixed(2)}€</span>
        </div>
        <div class="total-row total-final">
          <span>Total TTC</span>
          <span>${total.toFixed(2)}€</span>
        </div>
      </div>
      
      <!-- Notes -->
      ${notes ? `
      <div class="notes">
        <h4>Notes</h4>
        <p>${notes}</p>
      </div>
      ` : ''}
      
      <!-- Payment Terms -->
      ${isInvoice && paymentTerms ? `
      <div class="notes">
        <h4>Conditions de paiement</h4>
        <p>${paymentTerms}</p>
      </div>
      ` : ''}
      
      <!-- Footer -->
      <div class="footer">
        <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p>${company.name} - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère et partage un PDF
 */
export async function generateAndSharePDF(
  html: string,
  filename: string
): Promise<void> {
  try {
    // Générer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Vérifier si le partage est disponible
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      Alert.alert(
        'Erreur',
        'Le partage de fichiers n\'est pas disponible sur cet appareil'
      );
      return;
    }

    // Partager le PDF
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Partager ${filename}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert(
      'Erreur',
      'Impossible de générer le PDF. Veuillez réessayer.'
    );
    throw error;
  }
}

/**
 * Génère et imprime un PDF
 */
export async function printPDF(html: string): Promise<void> {
  try {
    await Print.printAsync({
      html,
    });
  } catch (error) {
    console.error('Error printing PDF:', error);
    Alert.alert(
      'Erreur',
      'Impossible d\'imprimer le document. Veuillez réessayer.'
    );
    throw error;
  }
}

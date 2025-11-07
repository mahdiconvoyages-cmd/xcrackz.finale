import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  sort_order: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address?: string;
  client_siret?: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  payment_terms?: string;
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  sort_order: number;
}

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_address?: string;
  client_siret?: string;
  issue_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
}

/**
 * Génère le HTML d'une facture avec style professionnel
 */
function generateInvoiceHTML(invoice: Invoice, items: InvoiceItem[], companyInfo?: any): string {
  const itemsRows = items
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unit_price.toFixed(2)} €</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.tax_rate.toFixed(0)} %</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${item.amount.toFixed(2)} €</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica', 'Arial', sans-serif; 
      color: #1f2937; 
      background: #ffffff;
      padding: 40px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .company-info { flex: 1; }
    .company-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 8px; }
    .company-details { font-size: 12px; color: #6b7280; line-height: 1.6; }
    .invoice-title {
      text-align: right;
      flex: 1;
    }
    .invoice-label { font-size: 32px; font-weight: bold; color: #2563eb; margin-bottom: 8px; }
    .invoice-number { font-size: 14px; color: #6b7280; }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 40px;
    }
    .info-block { flex: 1; }
    .info-title { 
      font-size: 12px; 
      font-weight: 600; 
      color: #6b7280; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .info-content { 
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.6;
    }
    .info-content strong { display: block; margin-bottom: 4px; color: #1f2937; }
    .table-container { margin-bottom: 30px; }
    table { 
      width: 100%; 
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    thead { background: #2563eb; color: #ffffff; }
    th { 
      padding: 14px 12px; 
      text-align: left; 
      font-size: 12px; 
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    th:nth-child(2), th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: center; }
    th:last-child { text-align: right; }
    td { font-size: 13px; color: #374151; }
    .totals {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 350px;
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
    }
    .total-row.subtotal {
      border-bottom: 1px solid #e5e7eb;
      color: #6b7280;
    }
    .total-row.tax {
      border-bottom: 2px solid #d1d5db;
      color: #6b7280;
    }
    .total-row.total {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      padding-top: 16px;
    }
    .notes {
      margin-top: 40px;
      padding: 20px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }
    .notes-title {
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 8px;
    }
    .notes-content {
      font-size: 13px;
      color: #78350f;
      line-height: 1.6;
    }
    .payment-terms {
      margin-top: 30px;
      padding: 16px;
      background: #eff6ff;
      border-radius: 8px;
      font-size: 12px;
      color: #1e40af;
      text-align: center;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-draft { background: #f3f4f6; color: #6b7280; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <!-- En-tête -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${companyInfo?.name || 'xCRACKZ'}</div>
        <div class="company-details">
          ${companyInfo?.address || ''}<br>
          ${companyInfo?.postal_code || ''} ${companyInfo?.city || ''}<br>
          SIRET: ${companyInfo?.siret || ''}<br>
          Tél: ${companyInfo?.phone || ''}<br>
          Email: ${companyInfo?.email || ''}
        </div>
      </div>
      <div class="invoice-title">
        <div class="invoice-label">FACTURE</div>
        <div class="invoice-number">${invoice.invoice_number}</div>
        <div style="margin-top: 12px;">
          <span class="status-badge status-${invoice.status}">${invoice.status}</span>
        </div>
      </div>
    </div>

    <!-- Informations Client et Dates -->
    <div class="info-section">
      <div class="info-block">
        <div class="info-title">Client</div>
        <div class="info-content">
          <strong>${invoice.client_name}</strong>
          ${invoice.client_address ? invoice.client_address + '<br>' : ''}
          ${invoice.client_siret ? 'SIRET: ' + invoice.client_siret + '<br>' : ''}
          Email: ${invoice.client_email}
        </div>
      </div>
      <div class="info-block">
        <div class="info-title">Dates</div>
        <div class="info-content">
          <strong>Date d'émission</strong>
          ${new Date(invoice.issue_date).toLocaleDateString('fr-FR')}<br><br>
          <strong>Date d'échéance</strong>
          ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>

    <!-- Tableau des articles -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qté</th>
            <th>Prix Unit.</th>
            <th>TVA</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <!-- Totaux -->
    <div class="totals">
      <div class="totals-table">
        <div class="total-row subtotal">
          <span>Sous-total HT</span>
          <span>${invoice.subtotal.toFixed(2)} €</span>
        </div>
        <div class="total-row tax">
          <span>TVA (${invoice.tax_rate.toFixed(0)}%)</span>
          <span>${invoice.tax_amount.toFixed(2)} €</span>
        </div>
        <div class="total-row total">
          <span>TOTAL TTC</span>
          <span>${invoice.total.toFixed(2)} €</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    ${
      invoice.notes
        ? `
      <div class="notes">
        <div class="notes-title">Notes</div>
        <div class="notes-content">${invoice.notes}</div>
      </div>
    `
        : ''
    }

    <!-- Conditions de paiement -->
    ${
      invoice.payment_terms
        ? `
      <div class="payment-terms">
        ${invoice.payment_terms}
      </div>
    `
        : ''
    }

    <!-- Pied de page -->
    <div class="footer">
      Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}<br>
      ${companyInfo?.name || 'xCRACKZ'} - Tous droits réservés
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Génère le HTML d'un devis (similaire à la facture mais adapté)
 */
function generateQuoteHTML(quote: Quote, items: QuoteItem[], companyInfo?: any): string {
  const itemsRows = items
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unit_price.toFixed(2)} €</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.tax_rate.toFixed(0)} %</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${item.amount.toFixed(2)} €</td>
    </tr>
  `
    )
    .join('');

  // HTML similaire à la facture avec quelques adaptations
  const html = generateInvoiceHTML(quote as any, items as any, companyInfo);
  return html
    .replace('FACTURE', 'DEVIS')
    .replace('invoice-number', 'quote-number')
    .replace("Date d'échéance", 'Valide jusqu\'au')
    .replace(new Date((quote as any).due_date).toLocaleDateString('fr-FR'), new Date(quote.valid_until).toLocaleDateString('fr-FR'));
}

/**
 * Génère et partage le PDF d'une facture
 */
export async function generateAndShareInvoicePDF(
  invoice: Invoice,
  items: InvoiceItem[],
  companyInfo?: any
): Promise<{ success: boolean; uri?: string; message: string }> {
  try {
    const html = generateInvoiceHTML(invoice, items, companyInfo);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Facture ${invoice.invoice_number}`,
        UTI: 'com.adobe.pdf',
      });
    }

    return {
      success: true,
      uri,
      message: 'PDF généré et partagé avec succès',
    };
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return {
      success: false,
      message: error.message || 'Erreur lors de la génération du PDF',
    };
  }
}

/**
 * Génère et partage le PDF d'un devis
 */
export async function generateAndShareQuotePDF(
  quote: Quote,
  items: QuoteItem[],
  companyInfo?: any
): Promise<{ success: boolean; uri?: string; message: string }> {
  try {
    const html = generateQuoteHTML(quote, items, companyInfo);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Devis ${quote.quote_number}`,
        UTI: 'com.adobe.pdf',
      });
    }

    return {
      success: true,
      uri,
      message: 'PDF généré et partagé avec succès',
    };
  } catch (error: any) {
    console.error('Error generating quote PDF:', error);
    return {
      success: false,
      message: error.message || 'Erreur lors de la génération du PDF',
    };
  }
}

/**
 * Génère un PDF et l'upload vers Supabase Storage
 */
export async function generateAndUploadInvoicePDF(
  invoice: Invoice,
  items: InvoiceItem[],
  companyInfo?: any
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const html = generateInvoiceHTML(invoice, items, companyInfo);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Lire le fichier PDF en base64 (nouvelle API expo-file-system v19+)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convertir en blob
    const blob = await (await fetch(`data:application/pdf;base64,${base64}`)).blob();

    // Upload vers Supabase Storage
    const fileName = `invoice-${invoice.invoice_number}-${Date.now()}.pdf`;
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(fileName, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) throw error;

    // Obtenir l'URL publique
    const {
      data: { publicUrl },
    } = supabase.storage.from('invoices').getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
      message: 'PDF généré et uploadé avec succès',
    };
  } catch (error: any) {
    console.error('Error uploading invoice PDF:', error);
    return {
      success: false,
      message: error.message || 'Erreur lors de l\'upload du PDF',
    };
  }
}

/**
 * Convertit un devis en facture
 */
export async function convertQuoteToInvoice(
  quoteId: string,
  userId: string
): Promise<{ success: boolean; invoiceId?: string; message: string }> {
  try {
    // Récupérer le devis et ses items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError) throw quoteError;

    const { data: quoteItems, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId);

    if (itemsError) throw itemsError;

    // Générer un nouveau numéro de facture
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let invoiceNumber = 'INV-001';
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[1]);
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Créer la facture
    const { data: newInvoice, error: invoiceInsertError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_address: quote.client_address,
        client_siret: quote.client_siret,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
        status: 'draft',
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        notes: quote.notes,
      })
      .select()
      .single();

    if (invoiceInsertError) throw invoiceInsertError;

    // Créer les items de facture
    const invoiceItems = quoteItems.map((item) => ({
      invoice_id: newInvoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      amount: item.amount,
      sort_order: item.sort_order,
    }));

    const { error: itemsInsertError } = await supabase.from('invoice_items').insert(invoiceItems);

    if (itemsInsertError) throw itemsInsertError;

    // Mettre à jour le statut du devis
    await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quoteId);

    return {
      success: true,
      invoiceId: newInvoice.id,
      message: `Facture ${invoiceNumber} créée avec succès`,
    };
  } catch (error: any) {
    console.error('Error converting quote to invoice:', error);
    return {
      success: false,
      message: error.message || 'Erreur lors de la conversion',
    };
  }
}

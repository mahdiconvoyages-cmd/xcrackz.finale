interface InvoiceData {
  number: string;
  type: 'invoice' | 'quote';
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  client: {
    name: string;
    email?: string;
    address?: string;
    siret?: string;
  };
  company: {
    name: string;
    address: string;
    siret?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const isQuote = data.type === 'quote';
  const title = isQuote ? 'DEVIS' : 'FACTURE';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} ${data.number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background: #fff;
      padding: 40px;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 3px solid #14b8a6;
    }

    .header-left h1 {
      font-size: 42px;
      font-weight: 800;
      background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .header-left p {
      font-size: 18px;
      color: #64748b;
      font-weight: 500;
    }

    .header-right {
      text-align: right;
    }

    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #14b8a6;
      margin-bottom: 12px;
    }

    .company-info {
      font-size: 13px;
      color: #64748b;
      line-height: 1.8;
    }

    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 50px;
      gap: 40px;
    }

    .party {
      flex: 1;
      padding: 25px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .party-label {
      font-size: 11px;
      font-weight: 700;
      color: #14b8a6;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .party-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .party-details {
      font-size: 13px;
      color: #64748b;
      line-height: 1.8;
    }

    .dates {
      display: flex;
      gap: 20px;
      margin-bottom: 40px;
      padding: 20px;
      background: #fef3c7;
      border-radius: 12px;
      border-left: 4px solid #f59e0b;
    }

    .date-item {
      flex: 1;
    }

    .date-label {
      font-size: 12px;
      color: #92400e;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .date-value {
      font-size: 15px;
      color: #78350f;
      font-weight: 700;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    thead {
      background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
    }

    thead th {
      padding: 16px 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    thead th:last-child {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #f1f5f9;
      background: white;
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    tbody td {
      padding: 16px 12px;
      font-size: 14px;
      color: #475569;
    }

    tbody td:last-child {
      text-align: right;
      font-weight: 600;
      color: #0f172a;
    }

    .totals {
      margin-left: auto;
      width: 350px;
      margin-bottom: 40px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }

    .total-row.subtotal {
      color: #64748b;
    }

    .total-row.tax {
      color: #64748b;
    }

    .total-row.final {
      border-top: 3px solid #14b8a6;
      border-bottom: none;
      padding: 20px 0 0 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 12px;
    }

    .total-row .label {
      font-weight: 600;
    }

    .total-row.final .amount {
      color: #14b8a6;
      font-size: 28px;
    }

    .notes {
      margin-bottom: 30px;
      padding: 25px;
      background: #f8fafc;
      border-radius: 12px;
      border-left: 4px solid #06b6d4;
    }

    .notes-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .notes-content {
      font-size: 13px;
      color: #64748b;
      line-height: 1.8;
      white-space: pre-line;
    }

    .footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #f1f5f9;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.8;
    }

    .footer strong {
      color: #64748b;
      display: block;
      margin-top: 8px;
    }

    @media print {
      body {
        padding: 0;
      }

      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <h1>${title}</h1>
        <p>${data.number}</p>
      </div>
      <div class="header-right">
        <div class="logo">xcrackz</div>
        <div class="company-info">
          ${data.company.name}<br>
          ${data.company.address ? data.company.address.replace(/\n/g, '<br>') : ''}<br>
          ${data.company.siret ? `SIRET: ${data.company.siret}<br>` : ''}
          ${data.company.email ? data.company.email + '<br>' : ''}
          ${data.company.phone || ''}
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-label">Émetteur</div>
        <div class="party-name">${data.company.name}</div>
        <div class="party-details">
          ${data.company.address ? data.company.address.replace(/\n/g, '<br>') : ''}<br>
          ${data.company.siret ? `SIRET: ${data.company.siret}` : ''}
        </div>
      </div>

      <div class="party">
        <div class="party-label">Client</div>
        <div class="party-name">${data.client.name}</div>
        <div class="party-details">
          ${data.client.address ? data.client.address.replace(/\n/g, '<br>') : ''}<br>
          ${data.client.siret ? `SIRET: ${data.client.siret}<br>` : ''}
          ${data.client.email || ''}
        </div>
      </div>
    </div>

    <div class="dates">
      <div class="date-item">
        <div class="date-label">Date d'émission</div>
        <div class="date-value">${new Date(data.issueDate).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</div>
      </div>
      ${data.dueDate ? `
      <div class="date-item">
        <div class="date-label">Date d'échéance</div>
        <div class="date-value">${new Date(data.dueDate).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</div>
      </div>
      ` : ''}
      ${data.validUntil ? `
      <div class="date-item">
        <div class="date-label">Valide jusqu'au</div>
        <div class="date-value">${new Date(data.validUntil).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</div>
      </div>
      ` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50%">Description</th>
          <th style="width: 12%; text-align: center">Quantité</th>
          <th style="width: 18%; text-align: right">Prix unitaire</th>
          <th style="width: 20%; text-align: right">Montant HT</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
        <tr>
          <td><strong>${item.description}</strong></td>
          <td style="text-align: center">${item.quantity}</td>
          <td style="text-align: right">${item.unitPrice.toFixed(2)}€</td>
          <td style="text-align: right">${item.amount.toFixed(2)}€</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row subtotal">
        <span class="label">Sous-total HT</span>
        <span class="amount">${data.subtotal.toFixed(2)}€</span>
      </div>
      <div class="total-row tax">
        <span class="label">TVA (20%)</span>
        <span class="amount">${data.taxAmount.toFixed(2)}€</span>
      </div>
      <div class="total-row final">
        <span class="label">Total TTC</span>
        <span class="amount">${data.total.toFixed(2)}€</span>
      </div>
    </div>

    ${data.notes ? `
    <div class="notes">
      <div class="notes-title">Notes</div>
      <div class="notes-content">${data.notes}</div>
    </div>
    ` : ''}

    ${data.paymentTerms && !isQuote ? `
    <div class="notes">
      <div class="notes-title">Conditions de paiement</div>
      <div class="notes-content">${data.paymentTerms}</div>
    </div>
    ` : ''}

    <div class="footer">
      ${!isQuote ? `
        <strong>Pénalités de retard</strong>
        En cas de retard de paiement, des pénalités au taux de 3 fois le taux d'intérêt légal seront appliquées,<br>
        ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement (articles L.441-6 et D.441-5 du Code de commerce).<br>
        <br>
      ` : `
        <strong>Validité du devis</strong>
        Ce devis est valable jusqu'à la date indiquée ci-dessus.<br>
        <br>
      `}
      ${data.company.name} • ${data.company.siret ? `SIRET: ${data.company.siret} • ` : ''}${data.company.email || ''}
    </div>
  </div>
</body>
</html>
  `;
}

export async function downloadPDF(html: string, filename: string): Promise<void> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les pop-ups.');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

export function previewPDF(html: string): void {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error('Impossible d\'ouvrir la fenêtre de prévisualisation. Veuillez autoriser les pop-ups.');
  }

  previewWindow.document.write(html);
  previewWindow.document.close();
}

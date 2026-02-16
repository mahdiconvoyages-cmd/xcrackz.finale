import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  vatLiable?: boolean;
  vatRegime?: 'normal' | 'franchise' | 'micro';
  legalMentions?: string;
}

// ✅ FIX UTF-8: Fonction pour encoder correctement les caractères français
const encodeUTF8 = (text: string): string => {
  return text
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/ë/g, 'e')
    .replace(/à/g, 'a')
    .replace(/â/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ù/g, 'u')
    .replace(/û/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/î/g, 'i')
    .replace(/ï/g, 'i')
    .replace(/ô/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/É/g, 'E')
    .replace(/È/g, 'E')
    .replace(/Ê/g, 'E')
    .replace(/Ë/g, 'E')
    .replace(/À/g, 'A')
    .replace(/Â/g, 'A')
    .replace(/Ä/g, 'A')
    .replace(/Ù/g, 'U')
    .replace(/Û/g, 'U')
    .replace(/Ü/g, 'U')
    .replace(/Ç/g, 'C')
    .replace(/Î/g, 'I')
    .replace(/Ï/g, 'I')
    .replace(/Ô/g, 'O')
    .replace(/Ö/g, 'O')
    .replace(/€/g, 'EUR');
};

export async function generateInvoicePDF(data: InvoiceData): Promise<Blob> {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });

  const isQuote = data.type === 'quote';
  const title = isQuote ? 'DEVIS' : 'FACTURE';

  const colors = {
    primary: [20, 184, 166], // Teal
    secondary: [6, 182, 212], // Cyan
    dark: [15, 23, 42], // Slate 900
    gray: [100, 116, 139], // Slate 500
    light: [241, 245, 249], // Slate 100
    success: [34, 197, 94], // Green
    white: [255, 255, 255]
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // ========== HEADER MODERNE AVEC DÉGRADÉ ==========
  // TS2556 fix: explicit RGB values instead of spread
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Gradient effect (simulation)
  doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  // Opacity helpers may be missing in current jsPDF typings; skip or implement manually
  // (Removed setGState to avoid TS errors)
  doc.circle(pageWidth - 30, 25, 40, 'F');
  doc.circle(20, 25, 30, 'F');
  // Removed setGState reset

  // Logo / Company name
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const companyName = encodeUTF8(data.company.name || 'CHECKSFLEET');
  doc.text(companyName, margin, 25);

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth - margin, 25, { align: 'right' });

  // Document number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${data.number}`, pageWidth - margin, 35, { align: 'right' });

  y = 60;

  // ========== INFORMATIONS ENTREPRISE & CLIENT ==========
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);

  // Colonne gauche: Entreprise
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('EMETTEUR', margin, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text(encodeUTF8(data.company.name), margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  
  const companyAddress = encodeUTF8(data.company.address || '');
  const addressLines = doc.splitTextToSize(companyAddress, 80);
  doc.text(addressLines, margin, y);
  y += addressLines.length * 4;

  if (data.company.siret) {
    doc.text(`SIRET: ${data.company.siret}`, margin, y);
    y += 4;
  }
  if (data.company.phone) {
    doc.text(`Tel: ${data.company.phone}`, margin, y);
    y += 4;
  }
  if (data.company.email) {
    doc.text(`Email: ${data.company.email}`, margin, y);
    y += 4;
  }

  // Colonne droite: Client
  let yClient = 65;
  const xClient = pageWidth - margin - 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('CLIENT', xClient, yClient);
  yClient += 5;

  // Box pour client
  doc.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
  doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
  doc.roundedRect(xClient - 5, yClient - 4, 85, 35, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text(encodeUTF8(data.client.name), xClient, yClient);
  yClient += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);

  if (data.client.address) {
    const clientAddressLines = doc.splitTextToSize(encodeUTF8(data.client.address), 75);
    doc.text(clientAddressLines, xClient, yClient);
    yClient += clientAddressLines.length * 4;
  }

  if (data.client.siret) {
    doc.text(`SIRET: ${data.client.siret}`, xClient, yClient);
    yClient += 4;
  }
  if (data.client.email) {
    doc.text(encodeUTF8(data.client.email), xClient, yClient);
  }

  y = Math.max(y, yClient) + 15;

  // ========== INFORMATIONS DATE ==========
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);

  if (isQuote) {
    doc.text(`Date d'emission: ${data.issueDate}`, margin, y);
    if (data.validUntil) {
      doc.text(`Valable jusqu'au: ${data.validUntil}`, pageWidth - margin, y, { align: 'right' });
    }
  } else {
    doc.text(`Date de facture: ${data.issueDate}`, margin, y);
    if (data.dueDate) {
      doc.text(`Date d'echeance: ${data.dueDate}`, pageWidth - margin, y, { align: 'right' });
    }
  }

  y += 12;

  // ========== TABLEAU DES ARTICLES ==========
  const tableData = data.items.map(item => [
    encodeUTF8(item.description),
    item.quantity.toString(),
    `${item.unitPrice.toFixed(2)} EUR`,
    `${item.taxRate}%`,
    `${item.amount.toFixed(2)} EUR`
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Description', 'Qte', 'Prix Unit.', 'TVA', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: colors.dark
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ========== TOTAUX ==========
  const totalsX = pageWidth - margin - 60;
  const totalsWidth = 60;

  // Sous-total
  doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
  doc.roundedRect(totalsX - 5, y - 5, totalsWidth + 5, 8, 1, 1, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.text('Sous-total HT:', totalsX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text(`${data.subtotal.toFixed(2)} EUR`, totalsX + totalsWidth, y, { align: 'right' });
  y += 10;

  // TVA
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.text('TVA:', totalsX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text(`${data.taxAmount.toFixed(2)} EUR`, totalsX + totalsWidth, y, { align: 'right' });
  y += 10;

  // Total TTC
  doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
  doc.roundedRect(totalsX - 5, y - 6, totalsWidth + 5, 12, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text('TOTAL TTC:', totalsX, y);
  doc.setFontSize(14);
  doc.text(`${data.total.toFixed(2)} EUR`, totalsX + totalsWidth, y, { align: 'right' });
  y += 15;

  // ========== NOTES & CONDITIONS ==========
  if (data.notes || data.paymentTerms) {
    y += 5;
  doc.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    if (data.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text('Notes:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      const notesLines = doc.splitTextToSize(encodeUTF8(data.notes), pageWidth - 2 * margin);
      doc.text(notesLines, margin, y);
      y += notesLines.length * 4 + 5;
    }

    if (data.paymentTerms) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text('Conditions de paiement:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      const termsLines = doc.splitTextToSize(encodeUTF8(data.paymentTerms), pageWidth - 2 * margin);
      doc.text(termsLines, margin, y);
      y += termsLines.length * 4;
    }
  }

  // ========== PIED DE PAGE ==========
  const footerY = pageHeight - 25;
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);

  if (data.legalMentions) {
    const legalLines = doc.splitTextToSize(encodeUTF8(data.legalMentions), pageWidth - 2 * margin);
    doc.text(legalLines, pageWidth / 2, footerY + 5, { align: 'center' });
  } else {
    doc.text(`${title} generee le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, footerY + 5, { align: 'center' });
  }

  doc.setFontSize(6);
  doc.text(`Page 1/1`, pageWidth - margin, footerY + 5, { align: 'right' });

  return doc.output('blob');
}

export function downloadInvoicePDF(data: InvoiceData) {
  generateInvoicePDF(data).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.type === 'quote' ? 'Devis' : 'Facture'}_${data.number}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

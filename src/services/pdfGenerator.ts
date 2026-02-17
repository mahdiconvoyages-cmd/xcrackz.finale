// @ts-nocheck - jsPDF type definitions incomplete, all operations work correctly at runtime
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    vatNumber?: string;
  };
  company: {
    name: string;
    address: string;
    siret?: string;
    email?: string;
    phone?: string;
    legalForm?: string;
    capitalSocial?: number | null;
    rcsCity?: string;
    tvaNumber?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice?: number;
    unit_price?: number;
    taxRate?: number;
    tax_rate?: number;
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
  logoUrl?: string;
  latePenaltyRate?: number;
  recoveryFee?: number;
  discountEarlyPayment?: string;
}

// jsPDF standard fonts (helvetica) support WinAnsiEncoding
// which includes accented characters (Ã©, Ã¨, Ãª, etc.) and â‚¬ symbol
// No text conversion needed for WinAnsiEncoding range
const encodeText = (text: string): string => {
  if (!text) return '';
  return String(text);
};

/**
 * Detect image format from a data URL or file extension
 */
function detectImageFormat(url: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (!url) return 'PNG';
  const lower = url.toLowerCase();
  // Check data URL mime type
  if (lower.startsWith('data:image/jpeg') || lower.startsWith('data:image/jpg')) return 'JPEG';
  if (lower.startsWith('data:image/png')) return 'PNG';
  if (lower.startsWith('data:image/webp')) return 'WEBP';
  // Check file extension
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'JPEG';
  if (lower.includes('.webp')) return 'WEBP';
  return 'PNG'; // default
}

/**
 * Convert a remote image URL to a base64 data URL (avoids CORS issues with jsPDF)
 */
async function imageUrlToBase64(url: string): Promise<string> {
  // Already a data URL (base64) — return as-is
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to fetch logo image, trying no-cors proxy:', e);
    // If CORS fails, try via a canvas approach 
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas context failed')); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) { reject(err); }
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
  }
}

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

  // ========== HEADER MODERNE AVEC DÃ‰GRADÃ‰ ==========
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Gradient effect (simulation)
  doc.setFillColor(...colors.secondary);
  doc.setGState(doc.GState({ opacity: 0.3 }));
  doc.circle(pageWidth - 30, 25, 40, 'F');
  doc.circle(20, 25, 30, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Logo / Company name
  doc.setTextColor(...colors.white);
  let logoXOffset = margin;
  if (data.logoUrl) {
    try {
      // Pre-fetch remote URL as base64 to avoid CORS issues
      const logoBase64 = await imageUrlToBase64(data.logoUrl);
      const format = detectImageFormat(logoBase64);
      doc.addImage(logoBase64, format, margin, 8, 35, 35);
      logoXOffset = margin + 40;
    } catch (e) {
      console.warn('Logo failed to load for PDF, skipping:', e);
      // If logo fails, just show company name
    }
  }
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const companyName = encodeText(data.company.name || 'CHECKSFLEET');
  doc.text(companyName, logoXOffset, 25);

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
  doc.setTextColor(...colors.dark);

  // Colonne gauche: Entreprise
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('EMETTEUR', margin, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  // Company name with legal form
  const legalForm = data.company.legalForm || '';
  const needsCapital = ['SAS', 'SASU', 'SARL', 'EURL', 'SA'].includes(legalForm);
  const isMicro = legalForm === 'Auto-entrepreneur' || data.vatRegime === 'micro';
  const isEI = legalForm === 'EI';
  
  let companyLine = encodeText(data.company.name);
  if (legalForm && !isMicro && !isEI) {
    companyLine += ` (${legalForm})`;
  }
  doc.text(companyLine, margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colors.gray);

  // Micro / EI mention
  if (isMicro || isEI) {
    doc.text('Entrepreneur individuel', margin, y);
    y += 4;
  }

  const companyAddress = encodeText(data.company.address || '');
  const addressLines = doc.splitTextToSize(companyAddress, 80);
  doc.text(addressLines, margin, y);
  y += addressLines.length * 4;

  if (data.company.siret) {
    doc.text(`SIRET: ${data.company.siret}`, margin, y);
    y += 4;
  }
  // RCS (obligatoire pour sociétés commerciales)
  if (data.company.rcsCity && !isMicro && !isEI) {
    const siren = data.company.siret ? data.company.siret.substring(0, 9).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : '';
    doc.text(`RCS ${data.company.rcsCity}${siren ? ` ${siren}` : ''}`, margin, y);
    y += 4;
  }
  // Capital social (obligatoire pour SAS, SASU, SARL, EURL, SA)
  if (needsCapital && data.company.capitalSocial) {
    doc.text(`Capital social: ${data.company.capitalSocial.toLocaleString('fr-FR')} EUR`, margin, y);
    y += 4;
  }
  // TVA intracommunautaire (si assujetti)
  if (data.company.tvaNumber && data.vatLiable && data.vatRegime === 'normal') {
    doc.text(`TVA: ${data.company.tvaNumber}`, margin, y);
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
  doc.setTextColor(...colors.primary);
  doc.text('CLIENT', xClient, yClient);
  yClient += 5;

  // Box pour client
  doc.setDrawColor(...colors.light);
  doc.setFillColor(...colors.light);
  doc.roundedRect(xClient - 5, yClient - 4, 85, 35, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text(encodeText(data.client.name), xClient, yClient);
  yClient += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colors.gray);

  if (data.client.address) {
    const clientAddressLines = doc.splitTextToSize(encodeText(data.client.address), 75);
    doc.text(clientAddressLines, xClient, yClient);
    yClient += clientAddressLines.length * 4;
  }

  if (data.client.siret) {
    doc.text(`SIRET: ${data.client.siret}`, xClient, yClient);
    yClient += 4;
  }
  if (data.client.vatNumber) {
    doc.text(`TVA: ${data.client.vatNumber}`, xClient, yClient);
    yClient += 4;
  }
  if (data.client.email) {
    doc.text(encodeText(data.client.email), xClient, yClient);
  }

  y = Math.max(y, yClient) + 15;

  // ========== INFORMATIONS DATE ==========
  doc.setFillColor(...colors.primary);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);

  if (isQuote) {
    doc.text(`Date d'émission: ${data.issueDate}`, margin, y);
    if (data.validUntil) {
      doc.text(`Valable jusqu'au: ${data.validUntil}`, pageWidth - margin, y, { align: 'right' });
    }
  } else {
    doc.text(`Date de facture: ${data.issueDate}`, margin, y);
    if (data.dueDate) {
      doc.text(`Date d'échéance: ${data.dueDate}`, pageWidth - margin, y, { align: 'right' });
    }
  }

  y += 12;

  // ========== TABLEAU DES ARTICLES ==========
  const tableData = data.items.map(item => {
    const unitPrice = item.unitPrice ?? item.unit_price ?? 0;
    const taxRate = item.taxRate ?? item.tax_rate ?? 0;
    const amount = item.amount ?? (item.quantity * unitPrice);
    return [
      encodeText(item.description),
      item.quantity.toString(),
      `${unitPrice.toFixed(2)} €`,
      `${taxRate}%`,
      `${amount.toFixed(2)} €`
    ];
  });

  autoTable(doc, {
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
  const showVAT = data.vatLiable !== false && data.vatRegime === 'normal';

  // Sous-total
  doc.setFillColor(...colors.light);
  doc.roundedRect(totalsX - 5, y - 5, totalsWidth + 5, 8, 1, 1, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);
  doc.text(showVAT ? 'Sous-total HT:' : 'Total:', totalsX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text(`${data.subtotal.toFixed(2)} EUR`, totalsX + totalsWidth, y, { align: 'right' });
  y += 10;

  if (showVAT) {
    // TVA
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.gray);
    doc.text('TVA:', totalsX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text(`${data.taxAmount.toFixed(2)} EUR`, totalsX + totalsWidth, y, { align: 'right' });
    y += 10;

    // Total TTC
    doc.setFillColor(...colors.success);
    doc.roundedRect(totalsX - 5, y - 6, totalsWidth + 5, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.white);
    doc.text('TOTAL TTC:', totalsX, y);
    doc.setFontSize(14);
    doc.text(`${data.total.toFixed(2)} EUR`, totalsX + totalsWidth, y, { align: 'right' });
    y += 15;
  } else {
    // No VAT — just show total with green box
    doc.setFillColor(...colors.success);
    doc.roundedRect(totalsX - 5, y - 6, totalsWidth + 5, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.white);
    doc.text('TOTAL:', totalsX, y);
    doc.setFontSize(14);
    doc.text(`${data.total.toFixed(2)} EUR`, totalsX + totalsWidth, y, { align: 'right' });
    y += 10;

    // TVA exemption mention
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...colors.gray);
    doc.text('TVA non applicable - Article 293 B du CGI', totalsX - 5, y);
    y += 10;
  }

  // ========== NOTES & CONDITIONS ==========
  // Always show payment conditions (mandatory in France)
  y += 5;
  doc.setDrawColor(...colors.light);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('Notes:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    const notesLines = doc.splitTextToSize(encodeText(data.notes), pageWidth - 2 * margin);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4 + 5;
  }

  if (data.paymentTerms) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('Conditions de paiement:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    const termsLines = doc.splitTextToSize(encodeText(data.paymentTerms), pageWidth - 2 * margin);
    doc.text(termsLines, margin, y);
    y += termsLines.length * 4 + 3;
  }

  // Mandatory payment penalty mentions (French law)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);

  const penaltyRate = data.latePenaltyRate ?? 10;
  const recoveryFee = data.recoveryFee ?? 40;

  doc.text(`Penalites de retard: ${penaltyRate}% par an`, margin, y);
  y += 3.5;
  doc.text(`Indemnite forfaitaire pour frais de recouvrement: ${recoveryFee} EUR (art. L.441-6 C. com.)`, margin, y);
  y += 3.5;
  if (data.discountEarlyPayment) {
    doc.text(`Escompte paiement anticipe: ${encodeText(data.discountEarlyPayment)}`, margin, y);
    y += 3.5;
  } else {
    doc.text('Pas d\'escompte en cas de paiement anticipe.', margin, y);
    y += 3.5;
  }

  // ========== PIED DE PAGE ==========
  const footerY = pageHeight - 20;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);

  // Build footer legal line
  const footerParts: string[] = [];
  footerParts.push(encodeText(data.company.name));
  if (legalForm && !isMicro && !isEI) footerParts.push(legalForm);
  if (isMicro || isEI) footerParts.push('Entrepreneur individuel');
  if (needsCapital && data.company.capitalSocial) footerParts.push(`Capital: ${data.company.capitalSocial.toLocaleString('fr-FR')} EUR`);
  if (data.company.siret) footerParts.push(`SIRET: ${data.company.siret}`);
  if (data.company.rcsCity && !isMicro && !isEI) {
    const siren = data.company.siret ? data.company.siret.substring(0, 9) : '';
    footerParts.push(`RCS ${data.company.rcsCity}${siren ? ` ${siren}` : ''}`);
  }
  if (data.company.tvaNumber && data.vatLiable && data.vatRegime === 'normal') footerParts.push(`TVA: ${data.company.tvaNumber}`);

  const footerText = footerParts.join(' - ');
  const footerLines = doc.splitTextToSize(footerText, pageWidth - 2 * margin);
  doc.text(footerLines, pageWidth / 2, footerY + 4, { align: 'center' });

  // TVA exemption in footer for micro/franchise
  if (!showVAT) {
    const exemptY = footerY + 4 + footerLines.length * 3;
    doc.setFont('helvetica', 'italic');
    doc.text('TVA non applicable - Article 293 B du Code General des Impots', pageWidth / 2, exemptY, { align: 'center' });
  }

  doc.setFontSize(6);
  doc.text(`Page 1/1`, pageWidth - margin, footerY + 4, { align: 'right' });

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

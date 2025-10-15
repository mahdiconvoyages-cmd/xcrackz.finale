import { supabase } from '../lib/supabase';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string; // Base64
    contentType: string;
  }[];
}

/**
 * Envoie un email avec pièce jointe PDF
 */
export async function sendEmailWithPDF(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Utiliser Supabase Edge Function pour envoyer l'email
    const { error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error.message || 'Erreur lors de l\'envoi de l\'email' 
    };
  }
}

/**
 * Envoie une facture par email
 */
export async function sendInvoiceEmail(
  recipientEmail: string,
  recipientName: string,
  invoiceNumber: string,
  pdfBase64: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Facture ${invoiceNumber}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          color: white;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .content p {
          margin: 10px 0;
        }
        .invoice-number {
          background: white;
          padding: 15px;
          border-left: 4px solid #14b8a6;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-top: 30px;
        }
        .button {
          display: inline-block;
          background: #14b8a6;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📄 Nouvelle Facture</h1>
      </div>
      
      <div class="content">
        <p>Bonjour ${recipientName},</p>
        
        <p>Vous trouverez ci-joint votre facture.</p>
        
        <div class="invoice-number">
          Numéro de facture : ${invoiceNumber}
        </div>
        
        <p>Le document PDF est attaché à cet email.</p>
        
        <p>Si vous avez des questions concernant cette facture, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>L'équipe</p>
      </div>
      
      <div class="footer">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmailWithPDF({
    to: recipientEmail,
    subject,
    html,
    attachments: [{
      filename: `facture-${invoiceNumber}.pdf`,
      content: pdfBase64,
      contentType: 'application/pdf',
    }],
  });
}

/**
 * Envoie un devis par email
 */
export async function sendQuoteEmail(
  recipientEmail: string,
  recipientName: string,
  quoteNumber: string,
  pdfBase64: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Devis ${quoteNumber}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          color: white;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .content p {
          margin: 10px 0;
        }
        .quote-number {
          background: white;
          padding: 15px;
          border-left: 4px solid #14b8a6;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Nouveau Devis</h1>
      </div>
      
      <div class="content">
        <p>Bonjour ${recipientName},</p>
        
        <p>Vous trouverez ci-joint votre devis.</p>
        
        <div class="quote-number">
          Numéro de devis : ${quoteNumber}
        </div>
        
        <p>Le document PDF est attaché à cet email.</p>
        
        <p>N'hésitez pas à nous contacter pour toute question ou pour accepter ce devis.</p>
        
        <p>Cordialement,<br>L'équipe</p>
      </div>
      
      <div class="footer">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmailWithPDF({
    to: recipientEmail,
    subject,
    html,
    attachments: [{
      filename: `devis-${quoteNumber}.pdf`,
      content: pdfBase64,
      contentType: 'application/pdf',
    }],
  });
}

/**
 * Alternative : Ouvrir le client email par défaut avec mailto
 * (Solution simple sans backend)
 */
export function openEmailClient(
  recipientEmail: string,
  subject: string,
  body: string
): void {
  const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

/**
 * Télécharger le PDF et ouvrir le client email
 * (Solution de secours si pas de backend email)
 */
export async function sendInvoiceViaEmailClient(
  recipientEmail: string,
  recipientName: string,
  invoiceNumber: string
): Promise<void> {
  const subject = `Facture ${invoiceNumber}`;
  const body = `Bonjour ${recipientName},\n\nVeuillez trouver ci-joint la facture ${invoiceNumber}.\n\nCordialement`;
  
  // Informer l'utilisateur
  alert(`Votre client email va s'ouvrir.\n\nPensez à attacher le PDF de la facture ${invoiceNumber} avant d'envoyer.`);
  
  openEmailClient(recipientEmail, subject, body);
}

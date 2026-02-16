import { supabase } from '../lib/supabase';

// Dupliquer une facture
export async function duplicateInvoice(invoiceId: string, userId: string) {
  try {
    // Récupérer la facture originale
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) throw new Error('Facture introuvable');

    // Récupérer les lignes
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) throw new Error('Erreur lors de la récupération des lignes');

    // Générer nouveau numéro
    const newNumber = `${invoice.invoice_number}-COPIE-${Date.now().toString().slice(-4)}`;

    // Créer nouvelle facture
    const { data: newInvoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: newNumber,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_address: invoice.client_address,
        client_siret: invoice.client_siret,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: invoice.subtotal,
        tax_rate: invoice.tax_rate,
        tax_amount: invoice.tax_amount,
        total: invoice.total,
        notes: invoice.notes,
        payment_terms: invoice.payment_terms,
      })
      .select()
      .single();

    if (createError || !newInvoice) throw new Error('Erreur lors de la création');

    // Créer les lignes
    if (items && items.length > 0) {
      const newItems = items.map(item => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        amount: item.amount,
      }));

      const { error: itemsCreateError } = await supabase
        .from('invoice_items')
        .insert(newItems);

      if (itemsCreateError) throw new Error('Erreur lors de la création des lignes');
    }

    return { success: true, invoice: newInvoice };
  } catch (error) {
    console.error('Erreur duplication facture:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

// Dupliquer un devis
export async function duplicateQuote(quoteId: string, userId: string) {
  try {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .maybeSingle();

    if (quoteError || !quote) throw new Error('Devis introuvable');

    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId);

    if (itemsError) throw new Error('Erreur lors de la récupération des lignes');

    const newNumber = `${quote.quote_number}-COPIE-${Date.now().toString().slice(-4)}`;

    const { data: newQuote, error: createError } = await supabase
      .from('quotes')
      .insert({
        user_id: userId,
        quote_number: newNumber,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_address: quote.client_address,
        client_siret: quote.client_siret,
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        notes: quote.notes,
      })
      .select()
      .single();

    if (createError || !newQuote) throw new Error('Erreur lors de la création');

    if (items && items.length > 0) {
      const newItems = items.map(item => ({
        quote_id: newQuote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        amount: item.amount,
      }));

      const { error: itemsCreateError } = await supabase
        .from('quote_items')
        .insert(newItems);

      if (itemsCreateError) throw new Error('Erreur lors de la création des lignes');
    }

    return { success: true, quote: newQuote };
  } catch (error) {
    console.error('Erreur duplication devis:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

// Convertir devis en facture
export async function convertQuoteToInvoice(quoteId: string, userId: string) {
  try {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .maybeSingle();

    if (quoteError || !quote) throw new Error('Devis introuvable');

    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId);

    if (itemsError) throw new Error('Erreur lors de la récupération des lignes');

    // Générer numéro de facture
    const invoiceNumber = `F-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Créer la facture
    const { data: newInvoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_address: quote.client_address,
        client_siret: quote.client_siret,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        notes: `Facture générée depuis le devis ${quote.quote_number}${quote.notes ? '\n\n' + quote.notes : ''}`,
        payment_terms: 'Paiement à réception de facture',
      })
      .select()
      .single();

    if (createError || !newInvoice) throw new Error('Erreur lors de la création de la facture');

    // Créer les lignes de facture
    if (items && items.length > 0) {
      const invoiceItems = items.map(item => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        amount: item.amount,
      }));

      const { error: itemsCreateError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsCreateError) throw new Error('Erreur lors de la création des lignes');
    }

    // Marquer le devis comme accepté
    await supabase
      .from('quotes')
      .update({ status: 'accepted' })
      .eq('id', quoteId);

    return { success: true, invoice: newInvoice };
  } catch (error) {
    console.error('Erreur conversion devis → facture:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

// Calculer totaux avec remise
export function calculateTotals(
  items: Array<{ quantity: number; unit_price: number; tax_rate: number }>,
  discountType: 'percent' | 'amount',
  discountValue: number,
  tvaApplicable: boolean = true
) {
  // Sous-total HT
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price);
  }, 0);

  // Remise
  let discountAmount = 0;
  if (discountValue > 0) {
    if (discountType === 'percent') {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
  }

  const subtotalAfterDiscount = subtotal - discountAmount;

  // TVA
  let taxAmount = 0;
  if (tvaApplicable) {
    taxAmount = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemAfterDiscount = discountValue > 0
        ? itemSubtotal * (discountType === 'percent' ? (1 - discountValue / 100) : (subtotalAfterDiscount / subtotal))
        : itemSubtotal;
      return sum + (itemAfterDiscount * (item.tax_rate / 100));
    }, 0);
  }

  const total = subtotalAfterDiscount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    subtotalAfterDiscount: Math.round(subtotalAfterDiscount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Taux TVA disponibles
export const TVA_RATES = [
  { value: 0, label: '0% (Exonéré)' },
  { value: 2.1, label: '2,1% (Taux super réduit)' },
  { value: 5.5, label: '5,5% (Taux réduit)' },
  { value: 10, label: '10% (Taux intermédiaire)' },
  { value: 20, label: '20% (Taux normal)' },
];

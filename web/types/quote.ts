// types/quote.ts
// TypeScript interfaces for Quote entity
// Synced with Supabase database schema

export interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  reference: string;
  client_id?: string | null;
  mission_id?: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  quote_date: string;
  expiration_date: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired';
  terms?: string | null;
  notes?: string | null;
  total: number;
  tax_amount?: number | null;
  discount_amount?: number | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  converted_at?: string | null;
  converted_invoice_id?: string | null;
  custom_fields?: Record<string, any> | null;
  items?: QuoteItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteRequest {
  reference: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  quote_date: string;
  expiration_date: string;
  status?: 'draft' | 'sent';
  terms?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  client_id?: string;
  mission_id?: string;
}

export interface UpdateQuoteRequest {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  quote_date?: string;
  expiration_date?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired';
  terms?: string;
  notes?: string;
  discount_amount?: number;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface ConvertQuoteToInvoiceRequest {
  quote_id: string;
  invoice_date: string;
  due_date: string;
  status?: 'draft' | 'sent';
}

// types/invoice.ts
// TypeScript interfaces for Invoice entity
// Synced with Supabase database schema

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  reference: string;
  client_id?: string | null;
  mission_id?: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  billing_address?: string | null;
  invoice_date: string;
  due_date: string;
  payment_method?: string | null; // check, transfer, card, cash, etc.
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at?: string | null;
  sent_at?: string | null;
  total: number;
  tax_amount?: number | null;
  notes?: string | null;
  custom_fields?: Record<string, any> | null;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceRequest {
  reference: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  billing_address?: string;
  invoice_date: string;
  due_date: string;
  status?: 'draft' | 'sent';
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  client_id?: string;
  mission_id?: string;
}

export interface UpdateInvoiceRequest {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  billing_address?: string;
  invoice_date?: string;
  due_date?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  paid_at?: string | null;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

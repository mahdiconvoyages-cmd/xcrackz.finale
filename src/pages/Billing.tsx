import { useEffect, useState } from 'react';
import { Plus, Search, Download, Eye, Send, FileText, Euro, X, Check, Clock, Building2, FileCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ClientSelector from '../components/ClientSelector';
import { generateInvoiceHTML, downloadPDF, previewPDF } from '../services/pdfGenerator';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionRequired from '../components/SubscriptionRequired';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  client_siret: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string;
  payment_terms: string;
  created_at: string;
}

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_siret: string;
  client_address: string;
  issue_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string;
  created_at: string;
}

interface DocumentItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}


interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  siret?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  is_company: boolean;
}

export default function BillingModern() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotes'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showLegalMenu, setShowLegalMenu] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    number: `${activeTab === 'invoices' ? 'F' : 'D'}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    client_name: '',
    client_email: '',
    client_siret: '',
    client_address: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    valid_until: '',
    notes: '',
    payment_terms: 'Paiement à réception de facture',
  });

  const [items, setItems] = useState<DocumentItem[]>([
    { description: '', quantity: 1, unit_price: 0, tax_rate: 20, amount: 0 },
  ]);

  useEffect(() => {
    loadDocuments();
    loadUserProfile();
  }, [user, activeTab]);

  useEffect(() => {
    if (selectedClient) {
      setFormData({
        ...formData,
        client_name: selectedClient.name,
        client_email: selectedClient.email || '',
        client_siret: selectedClient.siret || '',
        client_address: selectedClient.address ? `${selectedClient.address}\n${selectedClient.postal_code || ''} ${selectedClient.city || ''}`.trim() : '',
      });
    }
  }, [selectedClient]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const loadDocuments = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (activeTab === 'invoices') {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInvoices(data || []);
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setQuotes(data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };


  const calculateItemAmount = (item: DocumentItem) => item.quantity * item.unit_price;
  const calculateSubtotal = () => items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  const calculateTax = () => items.reduce((sum, item) => sum + (calculateItemAmount(item) * item.tax_rate) / 100, 0);
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, tax_rate: 20, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof DocumentItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const subtotal = calculateSubtotal();
    const taxAmount = calculateTax();
    const total = calculateTotal();

    try {
      if (activeTab === 'invoices') {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            user_id: user.id,
            invoice_number: formData.number,
            client_name: formData.client_name,
            client_email: formData.client_email || null,
            client_siret: formData.client_siret || null,
            client_address: formData.client_address || null,
            issue_date: formData.issue_date,
            due_date: formData.due_date || null,
            status: 'draft',
            subtotal,
            tax_rate: 20,
            tax_amount: taxAmount,
            total,
            notes: formData.notes || null,
            payment_terms: formData.payment_terms || null,
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        const invoiceItems = items.map((item) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: calculateItemAmount(item),
        }));

        const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
        if (itemsError) throw itemsError;
      } else {
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .insert([{
            user_id: user.id,
            quote_number: formData.number,
            client_name: formData.client_name,
            client_email: formData.client_email || null,
            client_siret: formData.client_siret || null,
            client_address: formData.client_address || null,
            issue_date: formData.issue_date,
            valid_until: formData.valid_until || null,
            status: 'draft',
            subtotal,
            tax_rate: 20,
            tax_amount: taxAmount,
            total,
            notes: formData.notes || null,
          }])
          .select()
          .single();

        if (quoteError) throw quoteError;

        const quoteItems = items.map((item) => ({
          quote_id: quoteData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: calculateItemAmount(item),
        }));

        const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems);
        if (itemsError) throw itemsError;
      }

      setShowModal(false);
      resetForm();
      loadDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      number: `${activeTab === 'invoices' ? 'F' : 'D'}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      client_name: '',
      client_email: '',
      client_siret: '',
      client_address: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      valid_until: '',
      notes: '',
      payment_terms: 'Paiement à réception de facture',
    });
    setItems([{ description: '', quantity: 1, unit_price: 0, tax_rate: 20, amount: 0 }]);
    setSelectedClient(null);
  };

  const handleDownloadPDF = async (doc: Invoice | Quote) => {
    if (!userProfile) return;

    const isInvoice = 'invoice_number' in doc;

    const table = isInvoice ? 'invoice_items' : 'quote_items';
    const idField = isInvoice ? 'invoice_id' : 'quote_id';

    const { data: docItems } = await supabase
      .from(table)
      .select('*')
      .eq(idField, doc.id);

    const html = generateInvoiceHTML({
      number: isInvoice ? doc.invoice_number : doc.quote_number,
      type: isInvoice ? 'invoice' : 'quote',
      issueDate: doc.issue_date,
      dueDate: isInvoice ? (doc as Invoice).due_date : undefined,
      validUntil: !isInvoice ? (doc as Quote).valid_until : undefined,
      client: {
        name: doc.client_name,
        email: doc.client_email,
        address: doc.client_address,
        siret: doc.client_siret,
      },
      company: {
        name: userProfile.company_name || 'xcrackz',
        address: userProfile.company_address || '',
        siret: userProfile.company_siret || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
      },
      items: docItems || [],
      subtotal: doc.subtotal,
      taxAmount: doc.tax_amount,
      total: doc.total,
      notes: doc.notes,
      paymentTerms: isInvoice ? (doc as Invoice).payment_terms : undefined,
    });

    try {
      await downloadPDF(html, `${isInvoice ? 'facture' : 'devis'}-${isInvoice ? doc.invoice_number : doc.quote_number}.pdf`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePreviewPDF = async (doc: Invoice | Quote) => {
    if (!userProfile) return;

    const isInvoice = 'invoice_number' in doc;

    const table = isInvoice ? 'invoice_items' : 'quote_items';
    const idField = isInvoice ? 'invoice_id' : 'quote_id';

    const { data: docItems } = await supabase
      .from(table)
      .select('*')
      .eq(idField, doc.id);

    const html = generateInvoiceHTML({
      number: isInvoice ? doc.invoice_number : doc.quote_number,
      type: isInvoice ? 'invoice' : 'quote',
      issueDate: doc.issue_date,
      dueDate: isInvoice ? (doc as Invoice).due_date : undefined,
      validUntil: !isInvoice ? (doc as Quote).valid_until : undefined,
      client: {
        name: doc.client_name,
        email: doc.client_email,
        address: doc.client_address,
        siret: doc.client_siret,
      },
      company: {
        name: userProfile.company_name || 'xcrackz',
        address: userProfile.company_address || '',
        siret: userProfile.company_siret || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
      },
      items: docItems || [],
      subtotal: doc.subtotal,
      taxAmount: doc.tax_amount,
      total: doc.total,
      notes: doc.notes,
      paymentTerms: isInvoice ? (doc as Invoice).payment_terms : undefined,
    });

    try {
      previewPDF(html);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleStatusChange = async (docId: string, newStatus: string) => {
    try {
      const table = activeTab === 'invoices' ? 'invoices' : 'quotes';
      const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', docId);
      if (error) throw error;
      loadDocuments();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'accepted':
        return 'bg-green-500/20 text-green-600 border-green-500/50';
      case 'sent':
        return 'bg-blue-500/20 text-blue-600 border-blue-500/50';
      case 'overdue':
      case 'rejected':
        return 'bg-red-500/20 text-red-600 border-red-500/50';
      case 'draft':
        return 'bg-slate-500/20 text-slate-600 border-slate-500/50';
      case 'expired':
        return 'bg-orange-500/20 text-orange-600 border-orange-500/50';
      default:
        return 'bg-slate-500/20 text-slate-600 border-slate-500/50';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      paid: 'Payée',
      sent: 'Envoyée',
      overdue: 'En retard',
      draft: 'Brouillon',
      accepted: 'Accepté',
      rejected: 'Refusé',
      expired: 'Expiré',
    };
    return labels[status] || status;
  };

  const currentList = activeTab === 'invoices' ? invoices : quotes;
  const filteredList = currentList.filter((doc) => {
    const matchesSearch =
      ('invoice_number' in doc ? doc.invoice_number : doc.quote_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: currentList.reduce((sum, doc) => sum + doc.total, 0),
    paid: currentList.filter((doc) => doc.status === 'paid' || doc.status === 'accepted').reduce((sum, doc) => sum + doc.total, 0),
    pending: currentList.filter((doc) => doc.status === 'sent').reduce((sum, doc) => sum + doc.total, 0),
    draft: currentList.filter((doc) => doc.status === 'draft').length,
  };

  if (loading || subscription.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!subscription.hasActiveSubscription) {
    return <SubscriptionRequired feature="la facturation" daysRemaining={subscription.daysRemaining} expiresAt={subscription.expiresAt} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-sm mb-2">
            Facturation
          </h1>
          <p className="text-slate-600 text-lg">Gérez vos devis et factures professionnelles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLegalMenu(true)}
            className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 px-4 py-3 rounded-lg font-semibold transition text-slate-700"
          >
            <FileCheck className="w-5 h-5" />
            Mentions légales
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 rounded-lg font-semibold hover:shadow-2xl hover:shadow-teal-500/60 transition text-white"
          >
            <Plus className="w-5 h-5" />
            Nouveau {activeTab === 'invoices' ? 'Facture' : 'Devis'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            activeTab === 'invoices'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-600 hover:text-teal-600'
          }`}
        >
          <FileText className="w-5 h-5 inline mr-2" />
          Factures
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            activeTab === 'quotes'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-600 hover:text-teal-600'
          }`}
        >
          <FileCheck className="w-5 h-5 inline mr-2" />
          Devis
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total</span>
            <Euro className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold">{stats.total.toLocaleString('fr-FR')}€</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">{activeTab === 'invoices' ? 'Payé' : 'Accepté'}</span>
            <Check className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.paid.toLocaleString('fr-FR')}€</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">En attente</span>
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.pending.toLocaleString('fr-FR')}€</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-slate-500/10 to-slate-600/10 border border-slate-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Brouillons</span>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/80 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/80 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            {activeTab === 'invoices' ? (
              <>
                <option value="paid">Payé</option>
                <option value="overdue">En retard</option>
              </>
            ) : (
              <>
                <option value="accepted">Accepté</option>
                <option value="rejected">Refusé</option>
                <option value="expired">Expiré</option>
              </>
            )}
          </select>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              {activeTab === 'invoices' ? 'Aucune facture trouvée' : 'Aucun devis trouvé'}
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 rounded-lg font-semibold hover:shadow-2xl hover:shadow-teal-500/60 transition text-white"
            >
              <Plus className="w-5 h-5" />
              Créer {activeTab === 'invoices' ? 'une facture' : 'un devis'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    {activeTab === 'invoices' ? 'Échéance' : 'Valide jusqu\'au'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 hover:bg-white/50 transition">
                    <td className="py-4 px-4">
                      <span className="font-semibold text-teal-600">
                        {'invoice_number' in doc ? doc.invoice_number : doc.quote_number}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-slate-900">{doc.client_name}</p>
                        {doc.client_email && <p className="text-sm text-slate-600">{doc.client_email}</p>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      {new Date(doc.issue_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      {'due_date' in doc && doc.due_date
                        ? new Date(doc.due_date).toLocaleDateString('fr-FR')
                        : 'valid_until' in doc && doc.valid_until
                        ? new Date(doc.valid_until).toLocaleDateString('fr-FR')
                        : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-lg text-slate-900">{doc.total.toLocaleString('fr-FR')}€</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(doc.status)}`}>
                        {getStatusLabel(doc.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePreviewPDF(doc)}
                          className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(doc)}
                          className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {doc.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'sent')}
                            className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                            title="Envoyer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl my-8 text-slate-900">
            <h2 className="text-2xl font-bold mb-6">
              Nouveau {activeTab === 'invoices' ? 'Facture' : 'Devis'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Numéro *</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date d'émission *</label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  Informations client
                </h3>

                <ClientSelector
                  onSelect={setSelectedClient}
                  selectedClient={selectedClient}
                />

                {selectedClient && (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <p className="text-sm font-semibold text-teal-900">Client sélectionné</p>
                    <p className="text-teal-700">{selectedClient.name}</p>
                    {selectedClient.company_name && <p className="text-sm text-teal-600">{selectedClient.company_name}</p>}
                    {selectedClient.siret && <p className="text-xs text-teal-600">SIRET: {selectedClient.siret}</p>}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {activeTab === 'invoices' ? "Date d'échéance" : 'Valide jusqu\'au'}
                    </label>
                    <input
                      type="date"
                      value={activeTab === 'invoices' ? formData.due_date : formData.valid_until}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [activeTab === 'invoices' ? 'due_date' : 'valid_until']: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Lignes</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm px-3 py-1 bg-teal-500/20 text-teal-700 rounded-lg hover:bg-teal-500/30 transition"
                  >
                    + Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qté"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Prix HT"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-semibold text-slate-900">{calculateItemAmount(item).toFixed(2)}€</span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-300 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Sous-total HT</span>
                    <span className="font-semibold text-slate-900">{calculateSubtotal().toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">TVA (20%)</span>
                    <span className="font-semibold text-slate-900">{calculateTax().toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-300 pt-2">
                    <span className="text-slate-900">Total TTC</span>
                    <span className="text-teal-600">{calculateTotal().toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {activeTab === 'invoices' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Conditions de paiement</label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold py-3 rounded-lg hover:shadow-2xl hover:shadow-teal-500/60 transition"
                >
                  Créer {activeTab === 'invoices' ? 'la facture' : 'le devis'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-lg transition font-semibold text-slate-700"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLegalMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Mentions légales</h2>
              <button onClick={() => setShowLegalMenu(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-semibold text-lg mb-2">Informations obligatoires</h3>
                <p className="text-slate-600 mb-2">
                  Conformément aux articles L.441-3 et suivants du Code de commerce, toute facture doit mentionner :
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Le nom ou la dénomination sociale et l'adresse de l'émetteur</li>
                  <li>Le numéro SIRET de l'émetteur</li>
                  <li>Le numéro de TVA intracommunautaire (si applicable)</li>
                  <li>La date d'émission et le numéro de la facture</li>
                  <li>Les nom et adresse du client</li>
                  <li>La désignation, quantité et prix unitaire des produits/services</li>
                  <li>Le montant total HT et TTC</li>
                  <li>Le taux de TVA appliqué</li>
                  <li>Les conditions de paiement et pénalités de retard</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Pénalités de retard</h3>
                <p className="text-slate-600">
                  En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux d'intérêt légal seront
                  appliquées, ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement (articles L.441-6 et
                  D.441-5 du Code de commerce).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Conservation</h3>
                <p className="text-slate-600">
                  Les factures doivent être conservées pendant 10 ans à compter de la clôture de l'exercice comptable
                  (article L.123-22 du Code de commerce).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">API INSEE</h3>
                <p className="text-slate-600">
                  Cette application utilise l'API SIRENE de l'INSEE pour récupérer automatiquement les informations des
                  entreprises françaises à partir de leur numéro SIRET. Service gratuit fourni par la Direction Générale
                  des Finances Publiques.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={() => setShowLegalMenu(false)}
                className="w-full bg-teal-500 text-white font-semibold py-3 rounded-lg hover:bg-teal-600 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

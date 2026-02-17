import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, Download, Eye, Send, FileText, X, Building2, FileCheck, 
  Search, Calendar, Euro, TrendingUp, Clock, 
  CheckCircle2, XCircle, AlertCircle, MoreHorizontal,
  Edit2, Trash2, Check, Copy, Archive, Share2, MessageCircle, Mail, Link2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  generateLegalMentions, 
  shouldApplyVAT, 
  getVATRegimeOptions,
  type LegalMentionsConfig 
} from '../services/legalMentionsService';
import { generateInvoicePDF } from '../services/pdfGenerator';
import { getCompanyLogo } from '../services/companyLogoService';
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
  vat_liable?: boolean;
  vat_regime?: 'normal' | 'franchise' | 'micro';
  legal_mentions?: string;
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
  user_id: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string;
  vat_liable?: boolean;
  vat_regime?: 'normal' | 'franchise' | 'micro';
  legal_mentions?: string;
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
  email: string;
  phone: string;
  address: string;
  siret: string;
  created_at: string;
}

export default function Billing() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const location = useLocation();
  const missionPreFilled = useRef(false);
  
  // États principaux
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotes'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États de recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // États modaux
  const [showModal, setShowModal] = useState(false);
  
  // Profil utilisateur
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // États clients
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Configuration TVA
  const [vatConfig, setVatConfig] = useState<LegalMentionsConfig>({
    vatLiable: true,
    vatRegime: 'normal',
    customMentions: '',
  });
  
  // Formulaire
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

  // Charger les documents
  useEffect(() => {
    if (user) {
      loadDocuments();
      loadUserProfile();
      loadClients();
    }
  }, [user, activeTab]);

  // Pré-remplir depuis une mission (quand on vient du bouton "Créer facture" sur une mission)
  useEffect(() => {
    const fromMission = location.state?.fromMission;
    if (fromMission && !missionPreFilled.current) {
      missionPreFilled.current = true;
      
      // Construire la description automatique
      const vehicleName = [fromMission.vehicle_brand, fromMission.vehicle_model].filter(Boolean).join(' ') || 'Véhicule';
      const plate = fromMission.vehicle_plate || '';
      const pickupAddr = fromMission.pickup_address || '';
      const deliveryAddr = fromMission.delivery_address || '';
      
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return dateStr; }
      };
      
      const pickupDate = formatDate(fromMission.pickup_date);
      const deliveryDate = formatDate(fromMission.delivery_date);
      const distance = fromMission.distance || fromMission.estimated_distance || '';
      
      const descParts: string[] = [];
      descParts.push(`Convoyage: ${vehicleName}${plate ? ` - ${plate}` : ''}`);
      if (pickupAddr) descParts.push(`Enlèvement: ${pickupAddr}${pickupDate ? ` le ${pickupDate}` : ''}`);
      if (deliveryAddr) descParts.push(`Livraison: ${deliveryAddr}${deliveryDate ? ` le ${deliveryDate}` : ''}`);
      if (distance) descParts.push(`Distance: ${distance} km`);
      
      const description = descParts.join('\n');
      
      // Pré-remplir le formulaire (sans mandataire, sans client, sans prix)
      setActiveTab('invoices');
      setItems([{ description, quantity: 1, unit_price: 0, tax_rate: 20, amount: 0 }]);
      
      // Ouvrir le modal automatiquement
      setTimeout(() => {
        setShowModal(true);
        setShowClientSelector(true);
      }, 300);
    }
  }, [location.state]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setUserProfile(data);
  };

  const loadClients = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      
      if (!error && data) {
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadDocuments = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      if (activeTab === 'invoices') {
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setInvoices(data || []);
      } else {
        const { data } = await supabase
          .from('quotes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setQuotes(data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculs
  const calculateItemAmount = (item: DocumentItem) => item.quantity * item.unit_price;
  const calculateSubtotal = () => items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  const calculateTax = () => {
    if (!shouldApplyVAT(vatConfig)) return 0;
    return items.reduce((sum, item) => sum + (calculateItemAmount(item) * item.tax_rate) / 100, 0);
  };
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  // Sélection de client
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      ...formData,
      client_name: client.name,
      client_email: client.email || '',
      client_siret: client.siret || '',
      client_address: client.address || '',
    });
    setShowClientSelector(false);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setFormData({
      ...formData,
      client_name: '',
      client_email: '',
      client_siret: '',
      client_address: '',
    });
  };

  // Gestion items
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

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const subtotal = calculateSubtotal();
    const taxAmount = calculateTax();
    const total = calculateTotal();
    const finalLegalMentions = generateLegalMentions(vatConfig);

    try {
      if (activeTab === 'invoices') {
        // @ts-ignore - Supabase generated types may be outdated
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
            tax_rate: shouldApplyVAT(vatConfig) ? 20 : 0,
            tax_amount: taxAmount,
            total,
            notes: formData.notes || null,
            payment_terms: formData.payment_terms || null,
            vat_liable: vatConfig.vatLiable,
            vat_regime: vatConfig.vatRegime,
            legal_mentions: finalLegalMentions,
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // @ts-ignore - Supabase generated types may be outdated
        const invoiceItems = items.map((item) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: calculateItemAmount(item),
        }));

        // @ts-ignore - Supabase generated types may be outdated
        const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
        if (itemsError) throw itemsError;
      } else {
        // @ts-ignore - Supabase generated types may be outdated
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
            tax_rate: shouldApplyVAT(vatConfig) ? 20 : 0,
            tax_amount: taxAmount,
            total,
            notes: formData.notes || null,
            vat_liable: vatConfig.vatLiable,
            vat_regime: vatConfig.vatRegime,
            legal_mentions: finalLegalMentions,
          }])
          .select()
          .single();

        if (quoteError) throw quoteError;

        // @ts-ignore - Supabase generated types may be outdated
        const quoteItems = items.map((item) => ({
          quote_id: quoteData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: calculateItemAmount(item),
        }));

        // @ts-ignore - Supabase generated types may be outdated
        const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems);
        if (itemsError) throw itemsError;
      }

      setShowModal(false);
      loadDocuments();
      resetForm();
    } catch (error: any) {
      showToast('error', 'Erreur', error.message);
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
    setVatConfig({ vatLiable: true, vatRegime: 'normal', customMentions: '' });
    setSelectedClient(null);
    setShowClientSelector(false);
  };

  // Actions PDF
  const handlePreviewPDF = async (doc: Invoice | Quote) => {
    if (!userProfile) return;

    try {
      showToast('info', 'Génération...', 'Préparation de l\'aperçu PDF');

      const isInvoice = 'invoice_number' in doc;
      const table = isInvoice ? 'invoice_items' : 'quote_items';
      const idField = isInvoice ? 'invoice_id' : 'quote_id';

      const { data: docItems } = await supabase
        .from(table)
        .select('*')
        .eq(idField, doc.id);

      const pdfBlob = await generateInvoicePDF({
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
          name: userProfile.company_name || 'Votre Entreprise',
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
        vatLiable: (doc as any).vat_liable,
        vatRegime: (doc as any).vat_regime,
        legalMentions: (doc as any).legal_mentions,
        logoUrl: getCompanyLogo()?.url || userProfile.logo_url || undefined,
      });

      // Open PDF in new tab — delay revoke to let browser load fully
      const url = URL.createObjectURL(pdfBlob);
      const newTab = window.open(url, '_blank');
      if (!newTab) {
        // Popup blocked — fallback: download directly
        const a = document.createElement('a');
        a.href = url;
        a.download = `${isInvoice ? 'Facture' : 'Devis'}_${isInvoice ? doc.invoice_number : (doc as Quote).quote_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('info', 'PDF téléchargé', 'Le popup a été bloqué, le PDF a été téléchargé à la place');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('Preview PDF error:', e);
      showToast('error', 'Erreur PDF', 'Impossible de générer l\'aperçu. Réessayez.');
    }
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

    const pdfBlob = await generateInvoicePDF({
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
        name: userProfile.company_name || 'Votre Entreprise',
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
      vatLiable: (doc as any).vat_liable,
      vatRegime: (doc as any).vat_regime,
      legalMentions: (doc as any).legal_mentions,
      logoUrl: getCompanyLogo()?.url || userProfile.logo_url || undefined,
    });

    // Download PDF
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isInvoice ? 'facture' : 'devis'}-${isInvoice ? doc.invoice_number : doc.quote_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── SHARE MODAL ──
  const [shareDoc, setShareDoc] = useState<Invoice | Quote | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const handleOpenShare = (doc: Invoice | Quote) => {
    setShareDoc(doc);
  };

  const getShareData = (doc: Invoice | Quote) => {
    const isInvoice = 'invoice_number' in doc;
    const docType = isInvoice ? 'Facture' : 'Devis';
    const docNumber = isInvoice ? (doc as Invoice).invoice_number : (doc as Quote).quote_number;
    const companyName = userProfile?.company_name || 'ChecksFleet';
    const subject = `${docType} n°${docNumber} - ${companyName}`;
    const body = `Bonjour,\n\nVeuillez trouver ci-joint le ${docType.toLowerCase()} n°${docNumber} d'un montant de ${doc.total.toFixed(2)}€.\n\nCordialement,\n${companyName}`;
    return { docType, docNumber, subject, body, companyName };
  };

  const handleShareViaEmail = (doc: Invoice | Quote) => {
    const { subject, body } = getShareData(doc);
    const email = doc.client_email || '';
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    showToast('info', 'Email', 'Client de messagerie ouvert. N\'oubliez pas d\'ajouter le PDF en pièce jointe.');
    setShareDoc(null);
  };

  const handleShareViaWhatsApp = (doc: Invoice | Quote) => {
    const { docType, docNumber, companyName } = getShareData(doc);
    const message = `${docType} n°${docNumber} - ${companyName}\nMontant: ${doc.total.toFixed(2)}€\nClient: ${doc.client_name}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    setShareDoc(null);
  };

  const handleCopyShareInfo = (doc: Invoice | Quote) => {
    const { docType, docNumber, companyName } = getShareData(doc);
    const text = `${docType} n°${docNumber}\n${companyName}\nClient: ${doc.client_name}\nMontant: ${doc.total.toFixed(2)}€\nDate: ${new Date(doc.issue_date).toLocaleDateString('fr-FR')}`;
    navigator.clipboard.writeText(text);
    showToast('success', 'Copié', 'Informations copiées dans le presse-papier');
    setShareDoc(null);
  };

  const handleDownloadAndShare = async (doc: Invoice | Quote) => {
    setShareLoading(true);
    try {
      await handleDownloadPDF(doc);
      showToast('success', 'PDF téléchargé', 'Vous pouvez maintenant partager le fichier PDF');
    } catch (e) {
      showToast('error', 'Erreur', 'Erreur lors du téléchargement du PDF');
    } finally {
      setShareLoading(false);
    }
  };

  const handleNativeShare = async (doc: Invoice | Quote) => {
    const { docType, docNumber, companyName } = getShareData(doc);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${docType} n°${docNumber}`,
          text: `${docType} n°${docNumber} - ${companyName} - ${doc.total.toFixed(2)}€`,
        });
        setShareDoc(null);
      } catch (e) {
        // User cancelled share
      }
    } else {
      handleCopyShareInfo(doc);
    }
  };

  const [activeActionDocId, setActiveActionDocId] = useState<string | null>(null);

  const handleMoreActions = (doc: Invoice | Quote, action: string) => {
    setActiveActionDocId(null);
    switch (action) {
      case 'duplicate':
        handleDuplicate(doc);
        break;
      case 'archive':
        handleArchive(doc);
        break;
      case 'delete':
        handleDelete(doc);
        break;
      case 'special':
        if ('invoice_number' in doc) {
          handleMarkAsPaid(doc as Invoice);
        } else {
          handleConvertToInvoice(doc as Quote);
        }
        break;
    }
  };

  const handleDuplicate = async (doc: Invoice | Quote) => {
    const isInvoice = 'invoice_number' in doc;
    const confirmed = confirm(`Dupliquer ce ${isInvoice ? 'facture' : 'devis'} ?`);
    
    if (confirmed) {
      try {
        const table = isInvoice ? 'invoices' : 'quotes';
        const itemsTable = isInvoice ? 'invoice_items' : 'quote_items';
        const idField = isInvoice ? 'invoice_id' : 'quote_id';
        const numberField = isInvoice ? 'invoice_number' : 'quote_number';

        // Récupérer les items
        const { data: items } = await supabase
          .from(itemsTable)
          .select('*')
          .eq(idField, doc.id);

        // Créer le nouveau document
        const newNumber = `${isInvoice ? 'INV' : 'QT'}-${Date.now().toString().slice(-6)}`;
        const { data: newDoc, error: docError } = await supabase
          .from(table)
          .insert([{
            ...doc,
            id: undefined,
            [numberField]: newNumber,
            status: 'draft',
            created_at: undefined,
          }])
          .select()
          .single();

        if (docError) throw docError;

        // Dupliquer les items
        if (items && items.length > 0) {
          const newItems = items.map((item: Record<string, unknown>) => ({
            ...item,
            id: undefined,
            [idField]: newDoc.id,
          }));

          await supabase.from(itemsTable).insert(newItems);
        }

        showToast('success', 'Dupliqué', `${isInvoice ? 'Facture' : 'Devis'} dupliqué avec succès`);
        loadDocuments();
      } catch (error) {
        console.error('Error duplicating:', error);
        showToast('error', 'Erreur', 'Erreur lors de la duplication');
      }
    }
  };

  const handleArchive = async (doc: Invoice | Quote) => {
    const isInvoice = 'invoice_number' in doc;
    const confirmed = confirm(`Archiver ce ${isInvoice ? 'facture' : 'devis'} ?`);
    
    if (confirmed) {
      try {
        const table = isInvoice ? 'invoices' : 'quotes';
        await supabase
          .from(table)
          .update({ status: 'cancelled' })
          .eq('id', doc.id);

        showToast('success', 'Archivé', 'Document archivé avec succès');
        loadDocuments();
      } catch (error) {
        console.error('Error archiving:', error);
        showToast('error', 'Erreur', 'Erreur lors de l\'archivage');
      }
    }
  };

  const handleDelete = async (doc: Invoice | Quote) => {
    const isInvoice = 'invoice_number' in doc;
    const confirmed = confirm(
      `⚠️ ATTENTION ⚠️\n\nSupprimer définitivement ce ${isInvoice ? 'facture' : 'devis'} ?\n\nCette action est irréversible !`
    );
    
    if (confirmed) {
      try {
        const table = isInvoice ? 'invoices' : 'quotes';
        const itemsTable = isInvoice ? 'invoice_items' : 'quote_items';
        const idField = isInvoice ? 'invoice_id' : 'quote_id';

        // Supprimer les items d'abord
        await supabase
          .from(itemsTable)
          .delete()
          .eq(idField, doc.id);

        // Supprimer le document
        await supabase
          .from(table)
          .delete()
          .eq('id', doc.id);

        showToast('success', 'Supprimé', 'Document supprimé définitivement');
        loadDocuments();
      } catch (error) {
        console.error('Error deleting:', error);
        showToast('error', 'Erreur', 'Erreur lors de la suppression');
      }
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    const confirmed = confirm(`Marquer la facture n°${invoice.invoice_number} comme payée ?`);
    
    if (confirmed) {
      try {
        await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', invoice.id);

        showToast('success', 'Payée', 'Facture marquée comme payée');
        loadDocuments();
      } catch (error) {
        console.error('Error marking as paid:', error);
        showToast('error', 'Erreur', 'Erreur lors de la mise à jour');
      }
    }
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    const confirmed = confirm(
      `Convertir le devis n°${quote.quote_number} en facture ?\n\n` +
      `Cette action créera une nouvelle facture basée sur ce devis.`
    );
    
    if (confirmed) {
      try {
        // Récupérer les items du devis
        const { data: quoteItems } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', quote.id);

        // Créer la facture
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            user_id: quote.user_id,
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
            notes: quote.notes,
            payment_terms: '30 jours',
            vat_liable: (quote as any).vat_liable,
            vat_regime: (quote as any).vat_regime,
            legal_mentions: (quote as any).legal_mentions,
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Copier les items
        if (quoteItems && quoteItems.length > 0) {
          const invoiceItems = quoteItems.map((item: Record<string, any>) => ({
            invoice_id: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.total ?? item.amount ?? (item.quantity * item.unit_price),
          }));

          await supabase.from('invoice_items').insert(invoiceItems);
        }

        // Marquer le devis comme accepté
        await supabase
          .from('quotes')
          .update({ status: 'accepted' })
          .eq('id', quote.id);

        showToast('success', 'Converti', `Facture n°${invoiceNumber} créée avec succès`);
        setActiveTab('invoices');
        loadDocuments();
      } catch (error) {
        console.error('Error converting to invoice:', error);
        showToast('error', 'Erreur', 'Erreur lors de la conversion');
      }
    }
  };

  // Filtrage
  const currentList = activeTab === 'invoices' ? invoices : quotes;
  const filteredList = currentList.filter((doc) => {
    const matchesSearch =
      ('invoice_number' in doc ? doc.invoice_number : doc.quote_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistiques
  const stats = {
    total: currentList.reduce((sum, doc) => sum + doc.total, 0),
    count: currentList.length,
    paid: currentList.filter((doc) => doc.status === 'paid' || doc.status === 'accepted').length,
    pending: currentList.filter((doc) => doc.status === 'sent' || doc.status === 'draft').length,
  };

  // Statut helper
  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: Edit2 },
      sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700', icon: Send },
      paid: { label: 'Payé', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: Check },
      overdue: { label: 'En retard', color: 'bg-red-100 text-red-700', icon: AlertCircle },
      rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: XCircle },
      cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-700', icon: XCircle },
      expired: { label: 'Expiré', color: 'bg-orange-100 text-orange-700', icon: Clock },
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  if (loading || subscription?.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!subscription?.hasActiveSubscription) {
    return <SubscriptionRequired feature="la facturation" daysRemaining={subscription?.daysRemaining} expiresAt={subscription?.expiresAt} />;
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* 🎯 HEADER ULTRA-MODERNE - Sans wrapper car déjà dans CRM */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-4 sm:p-6 md:p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-lg">
                  💼 Facturation Pro
                </h1>
                <p className="text-cyan-100 text-sm sm:text-lg font-medium">
                  Gérez vos factures et devis en toute simplicité
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="group relative px-4 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gradient-to-r hover:from-white hover:to-cyan-50 rounded-xl sm:rounded-2xl font-bold text-teal-600 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
                <Plus className="w-6 h-6 relative" />
                <span className="relative">Nouveau Document</span>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 STATISTIQUES CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <FileText className="w-12 h-12 text-white/80" />
                <div className="text-right">
                  <p className="text-blue-100 text-sm font-semibold">Total Documents</p>
                  <p className="text-4xl font-black text-white">{stats.count}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle2 className="w-12 h-12 text-white/80" />
                <div className="text-right">
                  <p className="text-green-100 text-sm font-semibold">Payés</p>
                  <p className="text-4xl font-black text-white">{stats.paid}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-12 h-12 text-white/80" />
                <div className="text-right">
                  <p className="text-orange-100 text-sm font-semibold">En Attente</p>
                  <p className="text-4xl font-black text-white">{stats.pending}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <Euro className="w-12 h-12 text-white/80" />
                <div className="text-right">
                  <p className="text-purple-100 text-sm font-semibold">Chiffre d'Affaires</p>
                  <p className="text-4xl font-black text-white">{stats.total.toFixed(0)}€</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔍 FILTRES ET RECHERCHE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Tabs */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                  activeTab === 'invoices'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-teal-600'
                }`}
              >
                <FileText className="w-5 h-5" />
                Factures
              </button>
              <button
                onClick={() => setActiveTab('quotes')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                  activeTab === 'quotes'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-teal-600'
                }`}
              >
                <FileCheck className="w-5 h-5" />
                Devis
              </button>
            </div>

            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none"
              />
            </div>

            {/* Filtre statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none font-semibold text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
              <option value="paid">Payé</option>
              <option value="accepted">Accepté</option>
              <option value="overdue">En retard</option>
            </select>
          </div>
        </div>

        {/* 📄 LISTE DES DOCUMENTS */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/50">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-12 h-12 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Aucun document</h3>
              <p className="text-slate-600 mb-6">Créez votre premier {activeTab === 'invoices' ? 'facture' : 'devis'}</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Créer un document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-black text-slate-700 uppercase tracking-wide">Numéro</th>
                    <th className="text-left px-6 py-4 text-sm font-black text-slate-700 uppercase tracking-wide">Client</th>
                    <th className="text-left px-6 py-4 text-sm font-black text-slate-700 uppercase tracking-wide">Date</th>
                    <th className="text-left px-6 py-4 text-sm font-black text-slate-700 uppercase tracking-wide">Montant</th>
                    <th className="text-left px-6 py-4 text-sm font-black text-slate-700 uppercase tracking-wide">Statut</th>
                    <th className="text-right px-6 py-4 text-sm font-black text-slate-700 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((doc) => (
                    <tr key={doc.id} className="hover:bg-teal-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-teal-600 text-lg">
                          {'invoice_number' in doc ? doc.invoice_number : doc.quote_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {doc.client_name ? doc.client_name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{doc.client_name || 'Sans nom'}</p>
                            <p className="text-sm text-slate-500">{doc.client_email || 'Pas d\'email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold">
                            {new Date(doc.issue_date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Euro className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-black text-slate-800">{doc.total.toFixed(2)}€</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handlePreviewPDF(doc)}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-all hover:scale-110"
                            title="Aperçu"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(doc)}
                            className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-all hover:scale-110"
                            title="Télécharger"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleOpenShare(doc)}
                            className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-all hover:scale-110"
                            title="Partager"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActiveActionDocId(activeActionDocId === doc.id ? null : doc.id)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all hover:scale-110"
                              title="Plus"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {activeActionDocId === doc.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50 min-w-[200px] animate-fadeIn">
                                <button onClick={() => handleMoreActions(doc, 'duplicate')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700">
                                  <Copy className="w-4 h-4" /> Dupliquer
                                </button>
                                <button onClick={() => handleMoreActions(doc, 'archive')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700">
                                  <Archive className="w-4 h-4" /> Archiver
                                </button>
                                <button onClick={() => handleMoreActions(doc, 'special')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 text-emerald-600 font-medium">
                                  {'invoice_number' in doc ? <><Check className="w-4 h-4" /> Marquer payée</> : <><FileCheck className="w-4 h-4" /> Convertir en facture</>}
                                </button>
                                <hr className="my-1 border-slate-100" />
                                <button onClick={() => handleMoreActions(doc, 'delete')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600">
                                  <Trash2 className="w-4 h-4" /> Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 🎨 MODAL CRÉATION/ÉDITION ULTRA-MODERNE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
            
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-4 sm:p-6 md:p-8 rounded-t-xl sm:rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white mb-1 sm:mb-2">
                    ✨ {activeTab === 'invoices' ? 'Nouvelle Facture' : 'Nouveau Devis'}
                  </h2>
                  <p className="text-cyan-100 text-sm sm:text-lg">Remplissez les informations ci-dessous</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all hover:rotate-90 duration-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
              
              {/* 📋 INFORMATIONS CLIENT */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    Informations Client
                  </h3>
                  
                  <div className="flex gap-2">
                    {selectedClient ? (
                      <button
                        type="button"
                        onClick={handleClearClient}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Effacer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowClientSelector(!showClientSelector)}
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center gap-2"
                      >
                        <Building2 className="w-4 h-4" />
                        {showClientSelector ? 'Masquer' : 'Sélectionner un client'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sélecteur de clients */}
                {showClientSelector && !selectedClient && (
                  <div className="mb-6 p-4 bg-white rounded-xl border-2 border-teal-200">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Choisir un client existant
                    </h4>
                    
                    {clients.length === 0 ? (
                      <p className="text-sm text-slate-600 italic">
                        Aucun client enregistré. Créez-en un depuis la page <a href="/clients" className="text-teal-600 font-bold hover:underline">Clients</a>.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {clients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="p-3 bg-gradient-to-br from-slate-50 to-blue-50 hover:from-teal-50 hover:to-cyan-50 border-2 border-slate-200 hover:border-teal-500 rounded-xl transition text-left group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-black flex-shrink-0">
                                {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 truncate group-hover:text-teal-700">
                                  {client.name || 'Sans nom'}
                                </p>
                                {client.email && (
                                  <p className="text-xs text-slate-600 truncate">{client.email}</p>
                                )}
                                {client.siret && (
                                  <p className="text-xs text-slate-500">SIRET: {client.siret}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Badge client sélectionné */}
                {selectedClient && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-500 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-black text-lg">
                        {selectedClient.name ? selectedClient.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-teal-900">{selectedClient.name || 'Sans nom'}</p>
                        <p className="text-sm text-teal-700">{selectedClient.email || 'Pas d\'email'}</p>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-teal-600" />
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Nom du client *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      disabled={!!selectedClient}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none disabled:bg-slate-100 disabled:text-slate-600"
                      placeholder="Nom de l'entreprise ou du client"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      disabled={!!selectedClient}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none disabled:bg-slate-100 disabled:text-slate-600"
                      placeholder="client@exemple.fr"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      SIRET
                    </label>
                    <input
                      type="text"
                      value={formData.client_siret}
                      onChange={(e) => setFormData({ ...formData, client_siret: e.target.value })}
                      disabled={!!selectedClient}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none disabled:bg-slate-100 disabled:text-slate-600"
                      placeholder="123 456 789 00012"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Adresse
                    </label>
                    <textarea
                      value={formData.client_address}
                      onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                      disabled={!!selectedClient}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none resize-none disabled:bg-slate-100 disabled:text-slate-600"
                      placeholder="Adresse complète du client"
                    />
                  </div>
                </div>
              </div>

              {/* 📅 DATES ET NUMÉRO */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200/50">
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  Dates et Numérotation
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Numéro *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none font-mono font-bold"
                      placeholder="F-2024-0001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Date d'émission *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none"
                    />
                  </div>
                  
                  {activeTab === 'invoices' ? (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Date d'échéance
                      </label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Valide jusqu'au
                      </label>
                      <input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 🛒 ARTICLES/SERVICES */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    Articles et Services
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 shadow-md border-2 border-green-100">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-5">
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Description *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition outline-none text-sm"
                            placeholder="Description du service/produit"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Quantité *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition outline-none text-sm"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Prix Unit. (€) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition outline-none text-sm"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Total
                          </label>
                          <div className="px-3 py-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-200 text-teal-700 font-black text-sm">
                            {calculateItemAmount(item).toFixed(2)}€
                          </div>
                        </div>
                        
                        <div className="md:col-span-1 flex items-end justify-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 💰 TVA ET RÉGIME FISCAL */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200/50">
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Euro className="w-6 h-6 text-white" />
                  </div>
                  TVA et Régime Fiscal
                </h3>

                {/* Choix du régime */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Régime de TVA
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {getVATRegimeOptions().map((regime) => (
                      <button
                        key={regime.value}
                        type="button"
                        onClick={() => setVatConfig({ ...vatConfig, vatRegime: regime.value })}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          vatConfig.vatRegime === regime.value
                            ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-lg scale-105'
                            : 'border-slate-200 hover:border-teal-300 hover:shadow-md'
                        }`}
                      >
                        <div className="text-3xl mb-2">{regime.icon}</div>
                        <div className="font-black text-slate-800">{regime.label}</div>
                        <div className="text-xs text-slate-600 mt-1">{regime.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle assujetti TVA (seulement pour régime normal) */}
                {vatConfig.vatRegime === 'normal' && (
                  <div className="mb-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={vatConfig.vatLiable}
                          onChange={(e) => setVatConfig({ ...vatConfig, vatLiable: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-8 bg-slate-300 peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-500 rounded-full transition-all shadow-inner"></div>
                        <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6 shadow-lg"></div>
                      </div>
                      <span className="font-bold text-slate-800 group-hover:text-teal-600 transition">
                        Assujetti à la TVA
                      </span>
                    </label>
                  </div>
                )}

                {/* Aperçu des mentions légales */}
                <div className="bg-white rounded-xl p-4 border-2 border-amber-200">
                  <h4 className="text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Aperçu des mentions légales
                  </h4>
                  <div className="text-xs text-slate-600 whitespace-pre-line bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {generateLegalMentions(vatConfig)}
                  </div>
                </div>
              </div>

              {/* 📝 NOTES ET CONDITIONS */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border-2 border-slate-200/50">
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  Notes et Conditions
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Notes supplémentaires
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none resize-none"
                      placeholder="Informations complémentaires..."
                    />
                  </div>

                  {activeTab === 'invoices' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Conditions de paiement
                      </label>
                      <input
                        type="text"
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition outline-none"
                        placeholder="Paiement à réception de facture"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 💵 RÉCAPITULATIF DES TOTAUX */}
              <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-2xl p-6 border-2 border-teal-300/50 shadow-lg">
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  Récapitulatif
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-700 font-semibold">Sous-total HT</span>
                    <span className="text-2xl font-black text-slate-800">{calculateSubtotal().toFixed(2)}€</span>
                  </div>

                  {shouldApplyVAT(vatConfig) ? (
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-700 font-semibold">TVA (20%)</span>
                      <span className="text-2xl font-black text-green-600">+{calculateTax().toFixed(2)}€</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-700 font-semibold">TVA</span>
                      <span className="text-lg font-bold text-amber-600">Non applicable</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-4 bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl px-4">
                    <span className="text-xl font-black text-slate-800">TOTAL {shouldApplyVAT(vatConfig) ? 'TTC' : ''}</span>
                    <span className="text-4xl font-black text-teal-600">{calculateTotal().toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* BOUTONS D'ACTION */}
              <div className="flex gap-4 pt-6 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-8 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all hover:shadow-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 text-white font-black rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <Check className="w-6 h-6" />
                  Créer {activeTab === 'invoices' ? 'la facture' : 'le devis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 📤 MODAL PARTAGE */}
      {shareDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShareDoc(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">📤 Partager</h2>
                  <p className="text-pink-100 text-sm mt-1">
                    {'invoice_number' in shareDoc ? `Facture n°${(shareDoc as Invoice).invoice_number}` : `Devis n°${(shareDoc as Quote).quote_number}`}
                  </p>
                </div>
                <button
                  onClick={() => setShareDoc(null)}
                  className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all hover:rotate-90 duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {/* Email */}
              <button
                onClick={() => handleShareViaEmail(shareDoc)}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all hover:scale-[1.02] group"
              >
                <div className="p-3 bg-blue-500 rounded-xl text-white">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">Email</p>
                  <p className="text-sm text-slate-500">
                    {shareDoc.client_email || 'Ouvrir le client mail'}
                  </p>
                </div>
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => handleShareViaWhatsApp(shareDoc)}
                className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-2xl transition-all hover:scale-[1.02]"
              >
                <div className="p-3 bg-green-500 rounded-xl text-white">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">WhatsApp</p>
                  <p className="text-sm text-slate-500">Envoyer via WhatsApp</p>
                </div>
              </button>

              {/* Download PDF to share */}
              <button
                onClick={() => handleDownloadAndShare(shareDoc)}
                disabled={shareLoading}
                className="w-full flex items-center gap-4 p-4 bg-orange-50 hover:bg-orange-100 rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <div className="p-3 bg-orange-500 rounded-xl text-white">
                  <Download className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">{shareLoading ? 'Téléchargement...' : 'Télécharger le PDF'}</p>
                  <p className="text-sm text-slate-500">Télécharger pour partager manuellement</p>
                </div>
              </button>

              {/* Copy info */}
              <button
                onClick={() => handleCopyShareInfo(shareDoc)}
                className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all hover:scale-[1.02]"
              >
                <div className="p-3 bg-slate-500 rounded-xl text-white">
                  <Link2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">Copier les infos</p>
                  <p className="text-sm text-slate-500">Copier dans le presse-papier</p>
                </div>
              </button>

              {/* Native share (mobile) */}
              {'share' in navigator && (
                <button
                  onClick={() => handleNativeShare(shareDoc)}
                  className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-2xl transition-all hover:scale-[1.02]"
                >
                  <div className="p-3 bg-purple-500 rounded-xl text-white">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">Partager</p>
                    <p className="text-sm text-slate-500">Utiliser le partage système</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

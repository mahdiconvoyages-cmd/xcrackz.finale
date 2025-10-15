import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import { generateInvoiceHTML, generateAndSharePDF, printPDF } from '../services/pdfGeneratorMobile';

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
  tax_amount: number;
  total: number;
  notes?: string;
  payment_terms?: string;
  created_at: string;
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
  tax_amount: number;
  total: number;
  notes?: string;
  created_at: string;
}

export default function FacturationScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotes'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadUserProfile();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'invoices') {
        await loadInvoices();
      } else {
        await loadQuotes();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setInvoices(data || []);
  };

  const loadQuotes = async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setQuotes(data || []);
  };

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Créer facture ou devis
  const handleCreateDocument = async (formData: any, items: any[]) => {
    if (!user) return;

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxAmount = items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100,
      0
    );
    const total = subtotal + taxAmount;

    try {
      if (activeTab === 'invoices') {
        // Créer la facture
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

        // Créer les lignes de facture
        const invoiceItems = items.map((item) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
        if (itemsError) throw itemsError;

        Alert.alert('Succès', 'Facture créée avec succès !');
      } else {
        // Créer le devis
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

        // Créer les lignes de devis
        const quoteItems = items.map((item) => ({
          quote_id: quoteData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems);
        if (itemsError) throw itemsError;

        Alert.alert('Succès', 'Devis créé avec succès !');
      }

      // Recharger les données
      await loadData();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  };

  // Générer et partager PDF
  const handleDownloadPDF = async (doc: Invoice | Quote) => {
    if (!userProfile) {
      Alert.alert('Erreur', 'Profil utilisateur non chargé');
      return;
    }

    const isInvoice = 'invoice_number' in doc;
    const table = isInvoice ? 'invoice_items' : 'quote_items';
    const idField = isInvoice ? 'invoice_id' : 'quote_id';

    try {
      // Charger les articles
      const { data: docItems } = await supabase
        .from(table)
        .select('*')
        .eq(idField, doc.id);

      // Générer le HTML
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
          name: userProfile.company_name || userProfile.full_name || 'xcrackz',
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

      const filename = `${isInvoice ? 'facture' : 'devis'}-${isInvoice ? doc.invoice_number : doc.quote_number}.pdf`;
      
      await generateAndSharePDF(html, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // L'erreur est déjà gérée dans generateAndSharePDF
    }
  };

  // Imprimer PDF
  const handlePrintPDF = async (doc: Invoice | Quote) => {
    if (!userProfile) {
      Alert.alert('Erreur', 'Profil utilisateur non chargé');
      return;
    }

    const isInvoice = 'invoice_number' in doc;
    const table = isInvoice ? 'invoice_items' : 'quote_items';
    const idField = isInvoice ? 'invoice_id' : 'quote_id';

    try {
      // Charger les articles
      const { data: docItems } = await supabase
        .from(table)
        .select('*')
        .eq(idField, doc.id);

      // Générer le HTML
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
          name: userProfile.company_name || userProfile.full_name || 'xcrackz',
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

      await printPDF(html);
    } catch (error) {
      console.error('Error printing PDF:', error);
      // L'erreur est déjà gérée dans printPDF
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'accepted':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'overdue':
      case 'rejected':
        return '#ef4444';
      case 'draft':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: 'Brouillon',
      pending: 'En attente',
      paid: 'Payée',
      overdue: 'En retard',
      accepted: 'Accepté',
      rejected: 'Refusé',
      sent: 'Envoyé',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)}€`;
  };

  const renderInvoiceCard = (invoice: Invoice) => (
    <View key={invoice.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumber}>{invoice.invoice_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(invoice.status)}</Text>
        </View>
      </View>
      <Text style={styles.cardClient}>{invoice.client_name}</Text>
      {invoice.client_email && (
        <Text style={styles.cardEmail}>{invoice.client_email}</Text>
      )}
      <View style={styles.cardFooter}>
        <View style={styles.cardDate}>
          <Feather name="calendar" size={14} color="#9ca3af" />
          <Text style={styles.cardDateText}>{formatDate(invoice.issue_date)}</Text>
        </View>
        <Text style={styles.cardPrice}>{formatPrice(invoice.total)}</Text>
      </View>
      
      {/* Boutons d'action */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDownloadPDF(invoice)}
        >
          <Feather name="download" size={18} color="#14b8a6" />
          <Text style={styles.actionButtonText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePrintPDF(invoice)}
        >
          <Feather name="printer" size={18} color="#14b8a6" />
          <Text style={styles.actionButtonText}>Imprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuoteCard = (quote: Quote) => (
    <View key={quote.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumber}>{quote.quote_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quote.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(quote.status)}</Text>
        </View>
      </View>
      <Text style={styles.cardClient}>{quote.client_name}</Text>
      {quote.client_email && (
        <Text style={styles.cardEmail}>{quote.client_email}</Text>
      )}
      <View style={styles.cardFooter}>
        <View style={styles.cardDate}>
          <Feather name="calendar" size={14} color="#9ca3af" />
          <Text style={styles.cardDateText}>{formatDate(quote.issue_date)}</Text>
        </View>
        <Text style={styles.cardPrice}>{formatPrice(quote.total)}</Text>
      </View>
      
      {/* Boutons d'action */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDownloadPDF(quote)}
        >
          <Feather name="download" size={18} color="#14b8a6" />
          <Text style={styles.actionButtonText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePrintPDF(quote)}
        >
          <Feather name="printer" size={18} color="#14b8a6" />
          <Text style={styles.actionButtonText}>Imprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
      <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
        <Text style={styles.headerTitle}>💰 Facturation</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
          onPress={() => setActiveTab('invoices')}
        >
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>
            Factures
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quotes' && styles.activeTab]}
          onPress={() => setActiveTab('quotes')}
        >
          <Text style={[styles.tabText, activeTab === 'quotes' && styles.activeTabText]}>
            Devis
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#14b8a6']} />
          }
        >
          {activeTab === 'invoices' ? (
            invoices.length > 0 ? (
              invoices.map(renderInvoiceCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Feather name="file-text" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>Aucune facture</Text>
                <Text style={styles.emptySubtext}>Créez votre première facture</Text>
              </View>
            )
          ) : quotes.length > 0 ? (
            quotes.map(renderQuoteCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Aucun devis</Text>
              <Text style={styles.emptySubtext}>Créez votre premier devis</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal de création */}
      <CreateInvoiceModal
        visible={showModal}
        type={activeTab === 'invoices' ? 'invoice' : 'quote'}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateDocument}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a2332',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#14b8a6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3544',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardClient: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 4,
  },
  cardEmail: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14b8a6',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
  },
});

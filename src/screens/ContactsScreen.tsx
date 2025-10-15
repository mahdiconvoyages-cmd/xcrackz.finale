import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, ActivityIndicator, Modal, Platform, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  getReceivedInvitations, 
  acceptContactInvitation, 
  rejectContactInvitation,
  sendContactInvitation,
  type ContactInvitation
} from '../services/contactInvitationService';

interface Contact {
  id: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  invitation_status?: string;
}

export default function ContactsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invitations, setInvitations] = useState<ContactInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'contacts' | 'invitations'>('contacts');
  const [showModal, setShowModal] = useState(false);
  const [searchMethod, setSearchMethod] = useState<'phone' | 'email'>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadContacts();
    loadInvitations();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('invitation_status', 'accepted')
        .order('name');
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!user) return;
    try {
      const data = await getReceivedInvitations(user.id);
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleSearchUser = async () => {
    if (!searchValue.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un email ou téléphone');
      return;
    }
    setSearching(true);
    try {
      let query = supabase.from('profiles').select('*');
      if (searchMethod === 'phone') {
        query = query.eq('phone', searchValue.trim());
      } else {
        query = query.eq('email', searchValue.trim().toLowerCase());
      }
      const { data: profile, error } = await query.maybeSingle();
      if (error) throw error;

      if (!profile) {
        Alert.alert('Non trouvé', 'Aucun utilisateur trouvé avec ces informations');
        setSearching(false);
        return;
      }

      if (profile.id === user?.id) {
        Alert.alert('Erreur', 'Vous ne pouvez pas vous ajouter');
        setSearching(false);
        return;
      }

      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('invited_user_id', profile.id)
        .maybeSingle();

      if (existing) {
        Alert.alert('Info', 'Une invitation existe déjà pour ce contact');
        setSearching(false);
        return;
      }

      // Déterminer le type de contact basé sur le user_type
      const contactType = profile.user_type === 'convoyeur' ? 'driver' : 'customer';

      // Send invitation using the service
      const result = await sendContactInvitation(
        user!.id,
        profile.id,
        contactType,
        profile.full_name || 'Sans nom',
        profile.email,
        profile.phone || '',
        profile.company || ''
      );

      if (result.success) {
        Alert.alert('Succès', 'Invitation envoyée !');
        setShowModal(false);
        setSearchValue('');
      } else {
        Alert.alert('Erreur', result.message || 'Impossible d\'envoyer l\'invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'invitation');
    } finally {
      setSearching(false);
    }
  };

  const handleAcceptInvitation = async (invitation: ContactInvitation) => {
    try {
      const result = await acceptContactInvitation(invitation.id, user!.id);
      if (result.success) {
        Alert.alert('Succès', 'Contact ajouté !');
        loadContacts();
        loadInvitations();
      } else {
        Alert.alert('Erreur', result.message || 'Impossible d\'accepter');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Erreur', 'Impossible d\'accepter l\'invitation');
    }
  };

  const handleRejectInvitation = async (invitation: ContactInvitation) => {
    Alert.alert(
      'Refuser l\'invitation',
      `Refuser l'invitation de ${invitation.inviter_name}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await rejectContactInvitation(invitation.id, user!.id);
              if (result.success) {
                Alert.alert('Info', 'Invitation refusée');
                loadInvitations();
              } else {
                Alert.alert('Erreur', result.message || 'Impossible de refuser');
              }
            } catch (error) {
              console.error('Error rejecting invitation:', error);
              Alert.alert('Erreur', 'Impossible de refuser l\'invitation');
            }
          },
        },
      ]
    );
  };

  const handleDeleteContact = async (id: string) => {
    Alert.alert(
      'Confirmer',
      'Supprimer ce contact ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('contacts').delete().eq('id', id);
            if (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            } else {
              loadContacts();
            }
          },
        },
      ]
    );
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'Client';
      case 'driver': return 'Chauffeur';
      case 'supplier': return 'Fournisseur';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return '#3b82f6';
      case 'driver': return '#10b981';
      case 'supplier': return '#f59e0b';
      default: return '#64748b';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <View style={styles.headerButtons}>
          {invitations.length > 0 && (
            <TouchableOpacity 
              style={styles.invitationBadge} 
              onPress={() => setViewMode(viewMode === 'contacts' ? 'invitations' : 'contacts')}
            >
              <Feather name="bell" size={20} color="#fff" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{invitations.length}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
            <Feather name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* View Mode Toggle */}
      {invitations.length > 0 && (
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'contacts' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('contacts')}
          >
            <Text style={[styles.viewModeText, viewMode === 'contacts' && styles.viewModeTextActive]}>
              Mes contacts ({contacts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'invitations' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('invitations')}
          >
            <Text style={[styles.viewModeText, viewMode === 'invitations' && styles.viewModeTextActive]}>
              Invitations ({invitations.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilters}>
          {['all', 'customer', 'driver', 'supplier'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeFilterButton, typeFilter === type && styles.typeFilterButtonActive]}
              onPress={() => setTypeFilter(type)}
            >
              <Text style={[styles.typeFilterText, typeFilter === type && styles.typeFilterTextActive]}>
                {type === 'all' ? 'Tous' : getTypeLabel(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'android' ? 110 : 100 }
        ]}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#14b8a6" style={styles.loader} />
        ) : viewMode === 'invitations' ? (
          /* Invitations List */
          invitations.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="bell" size={64} color="#64748b" />
              <Text style={styles.emptyText}>Aucune invitation</Text>
            </View>
          ) : (
            invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.contactName}>{invitation.inviter_name || 'Utilisateur'}</Text>
                      <Text style={styles.invitationDate}>
                        {new Date(invitation.invitation_sent_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  </View>
                  {invitation.inviter_email && (
                    <View style={styles.contactDetail}>
                      <Feather name="mail" size={16} color="#64748b" />
                      <Text style={styles.contactDetailText}>{invitation.inviter_email}</Text>
                    </View>
                  )}
                  {invitation.inviter_phone && (
                    <View style={styles.contactDetail}>
                      <Feather name="phone" size={16} color="#64748b" />
                      <Text style={styles.contactDetailText}>{invitation.inviter_phone}</Text>
                    </View>
                  )}
                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={[styles.invitationButton, styles.acceptButton]}
                      onPress={() => handleAcceptInvitation(invitation)}
                    >
                      <Feather name="check" size={18} color="#fff" />
                      <Text style={styles.invitationButtonText}>Accepter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.invitationButton, styles.rejectButton]}
                      onPress={() => handleRejectInvitation(invitation)}
                    >
                      <Feather name="x" size={18} color="#fff" />
                      <Text style={styles.invitationButtonText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            ))
          )
        ) : (
          /* Contacts List */
          filteredContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={64} color="#64748b" />
              <Text style={styles.emptyText}>
                {searchQuery || typeFilter !== 'all' ? 'Aucun contact trouvé' : 'Aucun contact'}
              </Text>
              <Text style={styles.emptySubtext}>Appuyez sur + pour envoyer une invitation</Text>
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <LinearGradient
                  colors={['rgba(20, 184, 166, 0.1)', 'rgba(6, 182, 212, 0.05)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(contact.type)}20` }]}>
                        <Text style={[styles.typeText, { color: getTypeColor(contact.type) }]}>
                          {getTypeLabel(contact.type)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteContact(contact.id)}>
                      <Feather name="trash-2" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  {contact.email && (
                    <View style={styles.contactDetail}>
                      <Feather name="mail" size={16} color="#64748b" />
                      <Text style={styles.contactDetailText}>{contact.email}</Text>
                    </View>
                  )}
                  {contact.phone && (
                    <View style={styles.contactDetail}>
                      <Feather name="phone" size={16} color="#64748b" />
                      <Text style={styles.contactDetailText}>{contact.phone}</Text>
                    </View>
                  )}
                  {contact.company && (
                    <View style={styles.contactDetail}>
                      <Feather name="briefcase" size={16} color="#64748b" />
                      <Text style={styles.contactDetailText}>{contact.company}</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un contact</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.methodSelector}>
              <TouchableOpacity
                style={[styles.methodButton, searchMethod === 'phone' && styles.methodButtonActive]}
                onPress={() => setSearchMethod('phone')}
              >
                <Feather name="phone" size={20} color={searchMethod === 'phone' ? '#fff' : '#64748b'} />
                <Text style={[styles.methodText, searchMethod === 'phone' && styles.methodTextActive]}>
                  Téléphone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodButton, searchMethod === 'email' && styles.methodButtonActive]}
                onPress={() => setSearchMethod('email')}
              >
                <Feather name="mail" size={20} color={searchMethod === 'email' ? '#fff' : '#64748b'} />
                <Text style={[styles.methodText, searchMethod === 'email' && styles.methodTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder={searchMethod === 'phone' ? 'Numéro de téléphone' : 'Adresse email'}
              value={searchValue}
              onChangeText={setSearchValue}
              keyboardType={searchMethod === 'phone' ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchUser}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="search" size={20} color="#fff" />
                  <Text style={styles.searchButtonText}>Rechercher et ajouter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', flex: 1 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invitationBadge: { position: 'relative', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  viewModeContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0e1930', gap: 8 },
  viewModeButton: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1a2744', alignItems: 'center' },
  viewModeButtonActive: { backgroundColor: '#14b8a6' },
  viewModeText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  viewModeTextActive: { color: '#fff' },
  filtersContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0e1930' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a2744', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: '#fff', fontSize: 15 },
  typeFilters: { flexDirection: 'row' },
  typeFilterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a2744', marginRight: 8 },
  typeFilterButtonActive: { backgroundColor: '#14b8a6' },
  typeFilterText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  typeFilterTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  loader: { marginTop: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#cbd5e1', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#64748b', marginTop: 8 },
  contactCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  invitationCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  cardGradient: { padding: 16, borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.2)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo: { flex: 1 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  invitationDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 12, fontWeight: '600' },
  contactDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  contactDetailText: { color: '#cbd5e1', fontSize: 14, marginLeft: 8 },
  invitationActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  invitationButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  acceptButton: { backgroundColor: '#10b981' },
  rejectButton: { backgroundColor: '#ef4444' },
  invitationButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a2744', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  methodSelector: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  methodButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#0e1930', gap: 8 },
  methodButtonActive: { backgroundColor: '#14b8a6' },
  methodText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  methodTextActive: { color: '#fff' },
  modalInput: { backgroundColor: '#0e1930', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15, marginBottom: 20 },
  searchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#14b8a6', borderRadius: 12, paddingVertical: 16, gap: 8 },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

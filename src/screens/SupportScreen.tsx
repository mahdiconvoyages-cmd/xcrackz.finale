import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  message: string;
  sender_type: 'user' | 'admin' | 'bot';
  is_automated: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  last_message_at: string;
  created_at: string;
}

const CATEGORIES = [
  { id: 'billing', label: 'Facturation', emoji: '💳', color: '#3b82f6' },
  { id: 'missions', label: 'Missions', emoji: '🚗', color: '#10b981' },
  { id: 'technical', label: 'Technique', emoji: '⚙️', color: '#f59e0b' },
  { id: 'reports', label: 'Rapports', emoji: '📊', color: '#a855f7' },
  { id: 'other', label: 'Autre', emoji: '💬', color: '#64748b' },
];

const STATUS_COLORS = {
  open: '#3b82f6',
  pending: '#f59e0b',
  resolved: '#10b981',
  closed: '#64748b',
};

export default function SupportScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [newConvForm, setNewConvForm] = useState({
    subject: '',
    category: 'other',
    priority: 'medium',
    message: '',
  });

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
      subscribeToMessages(currentConversation.id);
    }
  }, [currentConversation]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);

      if (data && data.length > 0 && !currentConversation) {
        setCurrentConversation(data[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      const lastMessage = data?.[data.length - 1];
      if (lastMessage?.sender_type === 'user') {
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }, 1000);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`support_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createConversation = async () => {
    if (!user || !newConvForm.subject.trim() || !newConvForm.message.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      const { data: convData, error: convError } = await supabase
        .from('support_conversations')
        .insert([
          {
            user_id: user.id,
            subject: newConvForm.subject.trim(),
            category: newConvForm.category,
            priority: newConvForm.priority,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from('support_messages').insert([
        {
          conversation_id: convData.id,
          sender_id: user.id,
          sender_type: 'user',
          message: newConvForm.message.trim(),
        },
      ]);

      await supabase.from('support_messages').insert([
        {
          conversation_id: convData.id,
          sender_id: user.id,
          sender_type: 'bot',
          is_automated: true,
          message: `Bonjour ! 👋\n\nMerci d'avoir contacté notre support. Nous avons bien reçu votre demande concernant "${newConvForm.subject}".\n\nUn agent va prendre en charge votre demande dans les plus brefs délais.`,
        },
      ]);

      setConversations([convData, ...conversations]);
      setCurrentConversation(convData);
      setNewConvForm({ subject: '', category: 'other', priority: 'medium', message: '' });
      setShowNewConversation(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Erreur', 'Erreur lors de la création de la conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !currentConversation || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setLoading(true);
    setNewMessage(''); // Clear input immediately

    try {
      const { data: messageData, error: messageError } = await supabase
        .from('support_messages')
        .insert([
          {
            conversation_id: currentConversation.id,
            sender_id: user.id,
            sender_type: 'user',
            message: messageText,
          },
        ])
        .select()
        .single();

      if (messageError) throw messageError;

      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversation.id);

      // Add message to state immediately
      if (messageData) {
        setMessages((prev) => [...prev, messageData as Message]);
      }

      const autoResponse = getAutomatedResponse(messageText);
      if (autoResponse) {
        setTimeout(async () => {
          const { data: botData } = await supabase
            .from('support_messages')
            .insert([
              {
                conversation_id: currentConversation.id,
                sender_id: user.id,
                sender_type: 'bot',
                is_automated: true,
                message: autoResponse,
              },
            ])
            .select()
            .single();

          if (botData) {
            setMessages((prev) => [...prev, botData as Message]);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi du message');
      setNewMessage(messageText); // Restore on error
    } finally {
      setLoading(false);
    }
  };

  const getAutomatedResponse = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('facture') || lowerMessage.includes('paiement')) {
      return "Je vois que vous avez une question sur la facturation. 💳\n\nVous pouvez consulter toutes vos factures dans la section 'Facturation'. Si vous avez besoin d'aide spécifique, un agent va vous répondre rapidement.";
    }

    if (lowerMessage.includes('bug') || lowerMessage.includes('erreur') || lowerMessage.includes('problème')) {
      return "Merci d'avoir signalé ce problème. 🔧\n\nPourriez-vous nous donner plus de détails ?\n- Quel écran/page ?\n- Quand est-ce arrivé ?\n- Message d'erreur ?\n\nCela nous aidera à résoudre le problème plus rapidement.";
    }

    if (lowerMessage.includes('merci') || lowerMessage.includes('résolu')) {
      return "Avec plaisir ! 😊\n\nN'hésitez pas à nous recontacter si vous avez d'autres questions.";
    }

    return null;
  };

  const getCategoryEmoji = (category: string) => {
    return CATEGORIES.find((c) => c.id === category)?.emoji || '💬';
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Veuillez vous connecter</Text>
      </View>
    );
  }

  if (showNewConversation) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.newConvContainer}>
            <View style={styles.newConvHeader}>
              <MaterialIcons name="chat-bubble" size={48} color="#14b8a6" />
              <Text style={styles.newConvTitle}>Nouvelle demande</Text>
              <Text style={styles.newConvSubtitle}>Décrivez votre problème</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Catégorie *</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setNewConvForm({ ...newConvForm, category: cat.id })}
                    style={[
                      styles.categoryCard,
                      newConvForm.category === cat.id && styles.categoryCardActive,
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Sujet *</Text>
              <TextInput
                value={newConvForm.subject}
                onChangeText={(text) => setNewConvForm({ ...newConvForm, subject: text })}
                placeholder="Ex: Problème avec ma facture..."
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />

              <Text style={styles.label}>Message *</Text>
              <TextInput
                value={newConvForm.message}
                onChangeText={(text) => setNewConvForm({ ...newConvForm, message: text })}
                placeholder="Décrivez votre problème en détail..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={6}
                style={[styles.input, styles.textArea]}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => {
                    setShowNewConversation(false);
                    setNewConvForm({ subject: '', category: 'other', priority: 'medium', message: '' });
                  }}
                  style={[styles.button, styles.buttonSecondary]}
                >
                  <Text style={styles.buttonSecondaryText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={createConversation}
                  disabled={loading || !newConvForm.subject.trim() || !newConvForm.message.trim()}
                  style={[styles.button, styles.buttonPrimary]}
                >
                  <LinearGradient
                    colors={['#14b8a6', '#06b6d4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <MaterialIcons name="send" size={20} color="white" />
                    <Text style={styles.buttonPrimaryText}>Envoyer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  if (!currentConversation) {
    return (
      <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialIcons name="chat-bubble-outline" size={80} color="#475569" />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptySubtitle}>Créez votre première demande de support</Text>
          
          <TouchableOpacity onPress={() => setShowNewConversation(true)} style={styles.button}>
            <LinearGradient
              colors={['#14b8a6', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <MaterialIcons name="add" size={24} color="white" />
              <Text style={styles.buttonPrimaryText}>Nouvelle demande</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.conversationHeader}>
          <TouchableOpacity
            onPress={() => setCurrentConversation(null)}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.conversationInfo}>
            <Text style={styles.conversationEmoji}>{getCategoryEmoji(currentConversation.category)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {currentConversation.subject}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[currentConversation.status as keyof typeof STATUS_COLORS] },
                ]}
              >
                <Text style={styles.statusText}>{currentConversation.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageWrapper,
                msg.sender_type === 'user' && styles.messageWrapperUser,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  msg.sender_type === 'user'
                    ? styles.messageBubbleUser
                    : msg.sender_type === 'bot'
                    ? styles.messageBubbleBot
                    : styles.messageBubbleAdmin,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender_type === 'user' && styles.messageTextUser,
                  ]}
                >
                  {msg.message}
                </Text>
                {msg.is_automated && (
                  <View style={styles.automatedBadge}>
                    <MaterialIcons name="smart-toy" size={12} color="#a855f7" />
                    <Text style={styles.automatedText}>Réponse automatique</Text>
                  </View>
                )}
              </View>
              <Text style={styles.messageTime}>
                {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}

          {isTyping && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Tapez votre message..."
            placeholderTextColor="#94a3b8"
            style={styles.messageInput}
            multiline
            editable={currentConversation.status !== 'closed'}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={loading || !newMessage.trim() || currentConversation.status === 'closed'}
            style={styles.sendButton}
          >
            <LinearGradient
              colors={['#14b8a6', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendButtonGradient}
            >
              <MaterialIcons name="send" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* FAB - Nouvelle conversation */}
      {!showNewConversation && !currentConversation && (
        <TouchableOpacity
          onPress={() => setShowNewConversation(true)}
          style={styles.fab}
        >
          <LinearGradient
            colors={['#14b8a6', '#06b6d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fabGradient}
          >
            <MaterialIcons name="add" size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 8,
    marginBottom: 32,
    textAlign: 'center',
  },
  newConvContainer: {
    padding: 20,
  },
  newConvHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  newConvTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
  },
  newConvSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  categoryCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    backgroundColor: 'rgba(20,184,166,0.2)',
    borderColor: '#14b8a6',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  buttonSecondaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonPrimary: {},
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.2)',
  },
  backButton: {
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conversationEmoji: {
    fontSize: 32,
  },
  conversationTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageWrapper: {
    maxWidth: '80%',
  },
  messageWrapperUser: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleUser: {
    backgroundColor: '#14b8a6',
  },
  messageBubbleBot: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderWidth: 2,
    borderColor: '#a855f7',
  },
  messageBubbleAdmin: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextUser: {
    color: 'white',
  },
  automatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  automatedText: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '600',
  },
  messageTime: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 8,
  },
  typingIndicator: {
    maxWidth: '80%',
  },
  typingBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.2)',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  ride_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  read: boolean;
  created_at: string;
  ride?: {
    departure_city: string;
    arrival_city: string;
    departure_date: string;
  };
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
  recipient?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  ride_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  last_message: string;
  last_message_date: string;
  unread_count: number;
  ride_departure_city: string;
  ride_arrival_city: string;
}

const CovoiturageMessages: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('ride_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_messages',
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Fetch all messages where user is sender or recipient
      const { data: messages, error } = await supabase
        .from('ride_messages')
        .select(`
          id,
          ride_id,
          sender_id,
          recipient_id,
          message,
          read,
          created_at,
          ride:rides(departure_city, arrival_city, departure_date),
          sender:profiles!ride_messages_sender_id_fkey(full_name, avatar_url),
          recipient:profiles!ride_messages_recipient_id_fkey(full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by ride_id and other user
      const conversationsMap = new Map<string, Conversation>();

      messages?.forEach((msg: any) => {
        const isUserSender = msg.sender_id === user.id;
        const otherUserId = isUserSender ? msg.recipient_id : msg.sender_id;
        const otherUserName = isUserSender 
          ? msg.recipient?.full_name || 'Utilisateur'
          : msg.sender?.full_name || 'Utilisateur';
        const otherUserAvatar = isUserSender 
          ? msg.recipient?.avatar_url 
          : msg.sender?.avatar_url;
        
        const key = `${msg.ride_id}-${otherUserId}`;

        if (!conversationsMap.has(key)) {
          conversationsMap.set(key, {
            ride_id: msg.ride_id,
            other_user_id: otherUserId,
            other_user_name: otherUserName,
            other_user_avatar: otherUserAvatar,
            last_message: msg.message,
            last_message_date: msg.created_at,
            unread_count: !isUserSender && !msg.read ? 1 : 0,
            ride_departure_city: msg.ride?.departure_city || '',
            ride_arrival_city: msg.ride?.arrival_city || '',
          });
        } else {
          const conv = conversationsMap.get(key)!;
          if (!isUserSender && !msg.read) {
            conv.unread_count += 1;
          }
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Navigate to trip details
    (navigation as any).navigate('CovoiturageTripDetails', { 
      tripId: conversation.ride_id,
      userId: conversation.other_user_id 
    });
  };

  const formatMessageDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return format(date, 'HH:mm', { locale: fr });
      } else if (diffInHours < 168) {
        return format(date, 'EEEE', { locale: fr });
      } else {
        return format(date, 'dd/MM/yyyy', { locale: fr });
      }
    } catch {
      return '';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const renderConversation = (conversation: Conversation, index: number) => {
    return (
      <TouchableOpacity
        key={`${conversation.ride_id}-${conversation.other_user_id}`}
        onPress={() => handleConversationPress(conversation)}
        style={styles.conversationCard}
      >
        <View style={styles.conversationContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#06b6d4', '#0891b2']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {conversation.other_user_name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            {conversation.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {conversation.unread_count}
                </Text>
              </View>
            )}
          </View>

          {/* Message Info */}
          <View style={styles.messageInfo}>
            <View style={styles.messageHeader}>
              <Text style={styles.userName}>{conversation.other_user_name}</Text>
              <Text style={styles.messageDate}>
                {formatMessageDate(conversation.last_message_date)}
              </Text>
            </View>
            
            <Text style={styles.routeInfo}>
              {conversation.ride_departure_city} → {conversation.ride_arrival_city}
            </Text>
            
            <Text 
              style={[
                styles.lastMessage,
                conversation.unread_count > 0 && styles.lastMessageUnread
              ]}
              numberOfLines={1}
            >
              {truncateMessage(conversation.last_message)}
            </Text>
          </View>

          {/* Arrow */}
          <MaterialIcons name="chevron-right" size={24} color="#64748b" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#06b6d4', '#0891b2']}
        style={styles.emptyIconContainer}
      >
        <MaterialIcons name="chat-bubble-outline" size={48} color="#fff" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Aucun message</Text>
      <Text style={styles.emptyDescription}>
        Vos conversations avec les conducteurs et passagers apparaîtront ici
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('CovoiturageHome' as never)}
        style={styles.emptyButton}
      >
        <LinearGradient
          colors={['#06b6d4', '#0891b2']}
          style={styles.emptyButtonGradient}
        >
          <Text style={styles.emptyButtonText}>Rechercher un trajet</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Chargement des messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#06b6d4"
              colors={['#06b6d4']}
            />
          }
        >
          {conversations.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.conversationsList}>
              <Text style={styles.sectionTitle}>
                Messages ({conversations.length})
              </Text>
              {conversations.map((conv, index) => renderConversation(conv, index))}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  conversationsList: {
    gap: 12,
  },
  conversationCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
    marginBottom: 12,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageInfo: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageDate: {
    color: '#64748b',
    fontSize: 12,
  },
  routeInfo: {
    color: '#06b6d4',
    fontSize: 13,
    marginBottom: 4,
  },
  lastMessage: {
    color: '#94a3b8',
    fontSize: 14,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#cbd5e1',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyDescription: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CovoiturageMessages;

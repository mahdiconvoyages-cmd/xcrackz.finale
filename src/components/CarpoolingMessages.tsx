import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Check, CheckCheck, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  trip_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  trip: {
    id: string;
    departure_city: string;
    arrival_city: string;
    departure_datetime: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  isTyping: boolean;
}

export default function CarpoolingMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  // Charger les conversations
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Temps réel : écouter les nouveaux messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('carpooling_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'carpooling_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          handleNewMessage(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'carpooling_messages',
          filter: `sender_id=eq.${user.id}`
        },
        (payload) => {
          handleMessageUpdate(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  // Écouter l'indicateur "en train d'écrire"
  useEffect(() => {
    if (!user || !selectedConversation) return;

    const typingChannel = supabase.channel(`typing:${selectedConversation.trip.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedConversation.otherUser.id) {
          setSelectedConversation(prev => 
            prev ? { ...prev, isTyping: true } : null
          );

          // Cacher l'indicateur après 3 secondes
          setTimeout(() => {
            setSelectedConversation(prev => 
              prev ? { ...prev, isTyping: false } : null
            );
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [user, selectedConversation]);

  const loadConversations = async () => {
    if (!user) return;

    setLoading(true);

    // Récupérer tous les messages où l'utilisateur est impliqué
    const { data: messages, error } = await supabase
      .from('carpooling_messages')
      .select(`
        *,
        sender:profiles!carpooling_messages_sender_id_fkey(id, full_name, avatar_url),
        receiver:profiles!carpooling_messages_receiver_id_fkey(id, full_name, avatar_url),
        trip:carpooling_trips(id, departure_city, arrival_city, departure_datetime)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
      return;
    }

    // Grouper les messages par conversation (trip_id + autre utilisateur)
    const conversationsMap = new Map<string, Conversation>();

    messages?.forEach((msg: any) => {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const conversationKey = `${msg.trip_id}_${otherUserId}`;

      if (!conversationsMap.has(conversationKey)) {
        const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;
        
        conversationsMap.set(conversationKey, {
          id: conversationKey,
          otherUser,
          trip: msg.trip,
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
          messages: [],
          isTyping: false
        });
      }

      const conversation = conversationsMap.get(conversationKey)!;
      conversation.messages.push(msg);

      // Compter les messages non lus
      if (msg.receiver_id === user.id && !msg.is_read) {
        conversation.unreadCount++;
      }
    });

    // Trier les messages dans chaque conversation par date
    conversationsMap.forEach(conv => {
      conv.messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    setConversations(Array.from(conversationsMap.values()));
    setLoading(false);
  };

  const handleNewMessage = (newMessage: Message) => {
    // Ajouter le message à la conversation appropriée
    setConversations(prev => {
      const updated = [...prev];
      const otherUserId = newMessage.sender_id === user!.id ? newMessage.receiver_id : newMessage.sender_id;
      const convIndex = updated.findIndex(c => 
        c.trip.id === newMessage.trip_id && c.otherUser.id === otherUserId
      );

      if (convIndex >= 0) {
        updated[convIndex].messages.push(newMessage);
        updated[convIndex].lastMessage = newMessage.message;
        updated[convIndex].lastMessageTime = newMessage.created_at;
        if (newMessage.receiver_id === user!.id) {
          updated[convIndex].unreadCount++;
        }
      }

      return updated;
    });

    // Si c'est la conversation active, marquer comme lu
    if (selectedConversation?.trip.id === newMessage.trip_id && newMessage.receiver_id === user!.id) {
      markAsRead(newMessage.id);
    }

    // Notification sonore (optionnel)
    if (newMessage.receiver_id === user!.id) {
      // new Audio('/notification.mp3').play();
      toast.success(`Nouveau message de ${newMessage.sender?.full_name}`);
    }
  };

  const handleMessageUpdate = (updatedMessage: Message) => {
    // Mettre à jour le statut "lu" dans l'interface
    setSelectedConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        )
      };
    });
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !user) return;

    const { data, error } = await supabase
      .from('carpooling_messages')
      .insert({
        trip_id: selectedConversation.trip.id,
        sender_id: user.id,
        receiver_id: selectedConversation.otherUser.id,
        message: messageText.trim(),
        is_read: false
      })
      .select(`
        *,
        sender:profiles!carpooling_messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      return;
    }

    // Ajouter le message localement
    setSelectedConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, data],
        lastMessage: data.message,
        lastMessageTime: data.created_at
      };
    });

    setMessageText('');
  };

  const handleTyping = () => {
    if (!selectedConversation || !user) return;

    // Envoyer l'indicateur "en train d'écrire"
    supabase.channel(`typing:${selectedConversation.trip.id}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id }
      });

    // Réinitialiser le timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('carpooling_messages')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', messageId)
      .eq('receiver_id', user.id);
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);

    // Marquer tous les messages non lus comme lus
    const unreadMessages = conversation.messages.filter(
      msg => msg.receiver_id === user!.id && !msg.is_read
    );

    for (const msg of unreadMessages) {
      await markAsRead(msg.id);
    }

    // Mettre à jour le compteur localement
    setConversations(prev => 
      prev.map(c => 
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'À l\'instant' : `Il y a ${minutes}m`;
    }
    if (hours < 24) {
      return `Il y a ${hours}h`;
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-semibold">Aucune conversation</p>
        <p className="text-sm">Les messages apparaîtront ici après vos réservations</p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
      {/* Liste des conversations (gauche) */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Messages
          </h3>
        </div>

        {conversations.map(conversation => (
          <button
            key={conversation.id}
            onClick={() => selectConversation(conversation)}
            className={`w-full p-4 border-b border-gray-100 hover:bg-blue-50 transition-all text-left ${
              selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {conversation.otherUser.avatar_url ? (
                  <img
                    src={conversation.otherUser.avatar_url}
                    alt={conversation.otherUser.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {conversation.otherUser.full_name[0]}
                  </div>
                )}
                {conversation.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {conversation.unreadCount}
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {conversation.otherUser.full_name}
                  </p>
                  <span className="text-xs text-gray-500">
                    {formatTime(conversation.lastMessageTime)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1 truncate">
                  {conversation.trip.departure_city} → {conversation.trip.arrival_city}
                </p>
                <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  {conversation.lastMessage}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Zone de chat (droite) */}
      <div className="w-2/3 flex flex-col">
        {selectedConversation ? (
          <>
            {/* En-tête */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                {selectedConversation.otherUser.avatar_url ? (
                  <img
                    src={selectedConversation.otherUser.avatar_url}
                    alt={selectedConversation.otherUser.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {selectedConversation.otherUser.full_name[0]}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900">
                    {selectedConversation.otherUser.full_name}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {selectedConversation.trip.departure_city} → {selectedConversation.trip.arrival_city}
                    {' • '}
                    {new Date(selectedConversation.trip.departure_datetime).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {selectedConversation.messages.map((msg) => {
                const isOwn = msg.sender_id === user!.id;
                return (
                  <div
                    key={msg.id}
                    className={`mb-4 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-white text-gray-900 rounded-bl-none shadow-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span>{formatTime(msg.created_at)}</span>
                        {isOwn && (
                          <>
                            {msg.is_read ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Indicateur "en train d'écrire" */}
              {selectedConversation.isTyping && (
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                  <div className="flex gap-1">
                    <Circle className="w-2 h-2 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <Circle className="w-2 h-2 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <Circle className="w-2 h-2 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="italic">{selectedConversation.otherUser.full_name} est en train d'écrire...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input de message */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold"
                >
                  <Send className="w-5 h-5" />
                  Envoyer
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">Sélectionnez une conversation</p>
              <p className="text-sm">Choisissez une conversation dans la liste</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Search, 
  Users, 
  Send,
  Paperclip,
  Image,
  File,
  X,
  Check,
  CheckCheck,
  MapPin,
  Calendar,
  Phone,
  Video,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  attachments: any[];
  read_by: string[];
  delivered_to: string[];
  reply_to_message_id?: string;
  created_at: string;
  sender?: {
    full_name: string;
    photo_url?: string;
  };
}

interface Conversation {
  id: string;
  ride_id: string;
  participants: string[];
  is_group_chat: boolean;
  last_message_at: string;
  last_message?: string;
  unread_count: Record<string, number>;
  ride?: {
    departure_city: string;
    arrival_city: string;
    departure_date: string;
  };
  participants_info?: {
    full_name: string;
    photo_url?: string;
    user_id: string;
  }[];
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
    subscribeToConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
      subscribeToMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les conversations où l'utilisateur est participant
      const { data: convos, error } = await supabase
        .from('ride_conversations')
        .select(`
          *,
          ride:carpooling_rides_pro!ride_conversations_ride_id_fkey (
            departure_city,
            arrival_city,
            departure_date
          )
        `)
        .contains('participants', [user.id])
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Charger les infos des participants pour chaque conversation
      if (convos) {
        const conversationsWithParticipants = await Promise.all(
          convos.map(async (convo) => {
            const participantIds = convo.participants.filter((id: string) => id !== user.id);
            
            const { data: profiles } = await supabase
              .from('driver_profiles')
              .select('user_id, full_name, photo_url')
              .in('user_id', participantIds);

            return {
              ...convo,
              participants_info: profiles || []
            };
          })
        );

        setConversations(conversationsWithParticipants);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ride_messages')
        .select(`
          *,
          sender:driver_profiles!ride_messages_sender_id_fkey (
            full_name,
            photo_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const subscribeToConversations = () => {
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Auto-scroll vers le bas
          setTimeout(() => {
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Marquer tous les messages non lus comme lus
      const { data: unreadMessages } = await supabase
        .from('ride_messages')
        .select('id, read_by')
        .eq('conversation_id', conversationId)
        .not('sender_id', 'eq', user.id);

      if (unreadMessages) {
        for (const msg of unreadMessages) {
          if (!msg.read_by?.includes(user.id)) {
            await supabase
              .from('ride_messages')
              .update({ read_by: [...(msg.read_by || []), user.id] })
              .eq('id', msg.id);
          }
        }
      }

      // Réinitialiser le compteur de non-lus
      const { data: convo } = await supabase
        .from('ride_conversations')
        .select('unread_count')
        .eq('id', conversationId)
        .single();

      if (convo) {
        const updatedUnreadCount = { ...convo.unread_count, [user.id]: 0 };
        await supabase
          .from('ride_conversations')
          .update({ unread_count: updatedUnreadCount })
          .eq('id', conversationId);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload des pièces jointes si présentes
      const uploadedAttachments = await uploadAttachments();

      // Créer le message
      const { data: message, error } = await supabase
        .from('ride_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          message: newMessage.trim(),
          attachments: uploadedAttachments,
          reply_to_message_id: replyingTo?.id,
          delivered_to: selectedConversation.participants.filter(id => id !== user.id)
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour la conversation
      await supabase
        .from('ride_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message: newMessage.trim().substring(0, 100)
        })
        .eq('id', selectedConversation.id);

      // Incrémenter le compteur de non-lus pour les autres participants
      const { data: convo } = await supabase
        .from('ride_conversations')
        .select('unread_count')
        .eq('id', selectedConversation.id)
        .single();

      if (convo) {
        const updatedUnreadCount = { ...convo.unread_count };
        selectedConversation.participants.forEach(participantId => {
          if (participantId !== user.id) {
            updatedUnreadCount[participantId] = (updatedUnreadCount[participantId] || 0) + 1;
          }
        });

        await supabase
          .from('ride_conversations')
          .update({ unread_count: updatedUnreadCount })
          .eq('id', selectedConversation.id);
      }

      // Créer une notification pour les autres participants
      for (const participantId of selectedConversation.participants) {
        if (participantId !== user.id) {
          await supabase
            .from('user_notifications')
            .insert({
              user_id: participantId,
              type: 'message',
              title: 'Nouveau message',
              message: newMessage.trim().substring(0, 100),
              related_ride_id: selectedConversation.ride_id,
              channels: ['push'],
              action_url: `/covoiturage/messages?conversation=${selectedConversation.id}`
            });
        }
      }

      // Réinitialiser
      setNewMessage('');
      setAttachments([]);
      setReplyingTo(null);
      setShowAttachMenu(false);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const uploadAttachments = async () => {
    const uploaded = [];

    for (const file of attachments) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `chat-attachments/${fileName}`;

        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        uploaded.push({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: publicUrl,
          name: file.name,
          size: file.size
        });
      } catch (err) {
        console.error('Error uploading file:', err);
      }
    }

    return uploaded;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    setShowAttachMenu(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.is_group_chat) {
      return conversation.ride 
        ? `${conversation.ride.departure_city} → ${conversation.ride.arrival_city}`
        : 'Conversation de groupe';
    } else {
      const otherParticipant = conversation.participants_info?.[0];
      return otherParticipant?.full_name || 'Utilisateur';
    }
  };

  const getConversationPhoto = (conversation: Conversation) => {
    if (conversation.is_group_chat) {
      return null;
    } else {
      const otherParticipant = conversation.participants_info?.[0];
      return otherParticipant?.photo_url || 
        `https://ui-avatars.com/api/?name=${otherParticipant?.full_name || 'User'}`;
    }
  };

  const filteredConversations = conversations.filter(convo => {
    const title = getConversationTitle(convo).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Liste des conversations */}
      <div className="w-full md:w-96 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <MessageCircle className="w-7 h-7 text-blue-600" />
            Messages
          </h1>
          
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((convo) => {
              const unreadCount = convo.unread_count?.[currentUserId] || 0;
              const isActive = selectedConversation?.id === convo.id;

              return (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConversation(convo)}
                  className={`w-full p-4 border-b hover:bg-gray-50 transition text-left ${
                    isActive ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Photo */}
                    {convo.is_group_chat ? (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    ) : (
                      <img
                        src={getConversationPhoto(convo) || ''}
                        alt={getConversationTitle(convo)}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    )}

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {getConversationTitle(convo)}
                        </h3>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatTime(convo.last_message_at)}
                        </span>
                      </div>
                      
                      {convo.ride && (
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(convo.ride.departure_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {convo.last_message || 'Aucun message'}
                        </p>
                        {unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Zone de chat */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Header du chat */}
          <div className="bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedConversation.is_group_chat ? (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                ) : (
                  <img
                    src={getConversationPhoto(selectedConversation) || ''}
                    alt={getConversationTitle(selectedConversation)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {getConversationTitle(selectedConversation)}
                  </h2>
                  {selectedConversation.ride && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedConversation.ride.departure_city} → {selectedConversation.ride.arrival_city}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            id="messages-container"
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
          >
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              const isRead = msg.read_by?.length > 1;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <img
                      src={msg.sender?.photo_url || `https://ui-avatars.com/api/?name=${msg.sender?.full_name}`}
                      alt={msg.sender?.full_name}
                      className="w-8 h-8 rounded-full object-cover mt-1"
                    />
                  )}

                  <div className={`max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMine && (
                      <span className="text-xs text-gray-500 mb-1 px-2">
                        {msg.sender?.full_name}
                      </span>
                    )}

                    {/* Réponse à */}
                    {msg.reply_to_message_id && (
                      <div className="bg-gray-200 border-l-4 border-blue-600 px-3 py-1 mb-1 rounded text-sm text-gray-700">
                        <p className="text-xs text-gray-500">Réponse à</p>
                        <p className="truncate">Message cité...</p>
                      </div>
                    )}

                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isMine
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                      {/* Pièces jointes */}
                      {msg.attachments?.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map((attachment: any, index: number) => (
                            <div key={index}>
                              {attachment.type === 'image' ? (
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="rounded-lg max-w-xs cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(attachment.url, '_blank')}
                                />
                              ) : (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded ${
                                    isMine ? 'bg-blue-700' : 'bg-gray-100'
                                  }`}
                                >
                                  <File className="w-4 h-4" />
                                  <span className="text-sm">{attachment.name}</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-1 px-2">
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && (
                        isRead ? (
                          <CheckCheck className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Check className="w-4 h-4 text-gray-400" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zone de saisie */}
          <div className="bg-white border-t p-4">
            {/* Réponse à */}
            {replyingTo && (
              <div className="bg-gray-100 border-l-4 border-blue-600 px-3 py-2 mb-2 rounded flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Réponse à {replyingTo.sender?.full_name}</p>
                  <p className="text-sm text-gray-700 truncate">{replyingTo.message}</p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Pièces jointes sélectionnées */}
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {attachments.map((file, index) => (
                  <div key={index} className="relative bg-gray-100 rounded p-2 flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <Image className="w-5 h-5 text-gray-600" />
                    ) : (
                      <File className="w-5 h-5 text-gray-600" />
                    )}
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Bouton pièces jointes */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-3 hover:bg-gray-100 rounded-lg transition"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-lg shadow-lg p-2 space-y-1">
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                      <Image className="w-5 h-5 text-blue-600" />
                      <span className="text-sm">Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                      <File className="w-5 h-5 text-gray-600" />
                      <span className="text-sm">Fichier</span>
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Zone de texte */}
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Tapez votre message..."
                rows={1}
                className="flex-1 px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Bouton envoyer */}
              <button
                onClick={handleSendMessage}
                disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sélectionnez une conversation
            </h3>
            <p className="text-gray-500">
              Choisissez une conversation dans la liste pour commencer à discuter
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

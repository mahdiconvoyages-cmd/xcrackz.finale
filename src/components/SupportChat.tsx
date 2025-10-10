import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Bot, User as UserIcon, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  message: string;
  sender_type: 'user' | 'admin' | 'bot';
  is_automated: boolean;
  created_at: string;
  sender_id: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  category: string;
}

export default function SupportChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && isOpen) {
      loadConversations();
      checkUnreadMessages();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
      subscribeToMessages(currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkUnreadMessages = async () => {
    if (!user) return;

    const { data: conversations } = await supabase
      .from('support_conversations')
      .select('id')
      .eq('user_id', user.id);

    const conversationIds = conversations?.map(c => c.id) || [];

    const { count } = await supabase
      .from('support_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'admin')
      .is('read_at', null)
      .in('conversation_id', conversationIds);

    setUnreadCount(count || 0);
  };

  const loadConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);

    if (data && data.length > 0 && !currentConversation) {
      setCurrentConversation(data[0]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);

    await supabase
      .from('support_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'admin')
      .is('read_at', null);

    checkUnreadMessages();
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
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
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getAutoResponse = async (message: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('support_auto_responses')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !data) return null;

    const lowerMessage = message.toLowerCase();

    for (const response of data) {
      const hasKeyword = response.keywords.some((keyword: string) =>
        lowerMessage.includes(keyword.toLowerCase())
      );
      if (hasKeyword) {
        return response.response;
      }
    }

    return 'Merci pour votre message ! J\'ai transmis votre demande à un administrateur qui vous répondra dans les plus brefs délais.';
  };

  const createConversation = async () => {
    if (!user || !newSubject.trim()) return;

    setLoading(true);

    try {
      const { data: conversation, error: convError } = await supabase
        .from('support_conversations')
        .insert([
          {
            user_id: user.id,
            subject: newSubject.trim(),
            status: 'open',
            category: 'general',
          },
        ])
        .select()
        .single();

      if (convError) throw convError;

      const { error: msgError } = await supabase
        .from('support_messages')
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: user.id,
            sender_type: 'user',
            message: `Nouveau sujet : ${newSubject.trim()}`,
          },
        ]);

      if (msgError) throw msgError;

      const autoResponse = await getAutoResponse(newSubject);
      if (autoResponse) {
        await supabase.from('support_messages').insert([
          {
            conversation_id: conversation.id,
            sender_id: null,
            sender_type: 'bot',
            message: autoResponse,
            is_automated: true,
          },
        ]);
      }

      setNewSubject('');
      setShowNewConversation(false);
      await loadConversations();
      setCurrentConversation(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !currentConversation || !newMessage.trim()) return;

    setLoading(true);

    try {
      const { error: msgError } = await supabase
        .from('support_messages')
        .insert([
          {
            conversation_id: currentConversation.id,
            sender_id: user.id,
            sender_type: 'user',
            message: newMessage.trim(),
          },
        ]);

      if (msgError) throw msgError;

      const autoResponse = await getAutoResponse(newMessage);
      if (autoResponse && messages.length < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        await supabase.from('support_messages').insert([
          {
            conversation_id: currentConversation.id,
            sender_id: null,
            sender_type: 'bot',
            message: autoResponse,
            is_automated: true,
          },
        ]);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'resolved': return 'bg-blue-100 text-blue-700';
      case 'closed': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Ouvert';
      case 'pending': return 'En attente';
      case 'resolved': return 'Résolu';
      case 'closed': return 'Fermé';
      default: return status;
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-white font-bold">Support</h3>
                <p className="text-white/80 text-xs">Nous sommes là pour vous aider</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {showNewConversation ? (
            <div className="flex-1 p-4">
              <h4 className="font-semibold text-slate-900 mb-3">Nouvelle conversation</h4>
              <input
                type="text"
                placeholder="Sujet de votre demande..."
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createConversation()}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewConversation(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={createConversation}
                  disabled={loading || !newSubject.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  Créer
                </button>
              </div>
            </div>
          ) : !currentConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <MessageCircle className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 text-center mb-4">
                Aucune conversation active
              </p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Démarrer une conversation
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 text-sm truncate flex-1">
                    {currentConversation.subject}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(currentConversation.status)}`}>
                    {getStatusLabel(currentConversation.status)}
                  </span>
                </div>
                {conversations.length > 1 && (
                  <button
                    onClick={() => setShowNewConversation(false)}
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Voir toutes ({conversations.length})
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${
                      msg.sender_type === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.sender_type === 'bot'
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                          : msg.sender_type === 'admin'
                          ? 'bg-gradient-to-br from-orange-500 to-red-500'
                          : 'bg-gradient-to-br from-teal-500 to-cyan-500'
                      }`}
                    >
                      {msg.sender_type === 'bot' ? (
                        <Bot className="w-4 h-4 text-white" />
                      ) : msg.sender_type === 'admin' ? (
                        <Shield className="w-4 h-4 text-white" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        msg.sender_type === 'user'
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                          : msg.sender_type === 'bot'
                          ? 'bg-purple-50 text-purple-900 border border-purple-200'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_type === 'user'
                            ? 'text-white/70'
                            : 'text-slate-500'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-200 p-3 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tapez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !newMessage.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

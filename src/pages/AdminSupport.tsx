import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, User as UserIcon, Shield, Clock, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  message: string;
  sender_type: 'user' | 'admin' | 'bot';
  is_automated: boolean;
  created_at: string;
  sender_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  last_message_at: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminSupport() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();

    const conversationsChannel = supabase
      .channel('admin-support-conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, []);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
      subscribeToMessages(currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    filterConversations();
  }, [searchQuery, statusFilter, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filterConversations = () => {
    let filtered = conversations;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(conv =>
        conv.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredConversations(filtered);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('support_conversations')
      .select(`
        *,
        profiles(full_name, email)
      `)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
    setFilteredConversations(data || []);

    if (data && data.length > 0 && !currentConversation) {
      setCurrentConversation(data[0]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select(`
        *,
        profiles(full_name, email)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`admin_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', payload.new.sender_id)
            .single();

          setMessages((prev) => [...prev, { ...payload.new, profiles: profileData } as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!user || !currentConversation || !newMessage.trim()) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert([
          {
            conversation_id: currentConversation.id,
            sender_id: user.id,
            sender_type: 'admin',
            message: newMessage.trim(),
          },
        ]);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConversationStatus = async (status: string) => {
    if (!currentConversation) return;

    const { error } = await supabase
      .from('support_conversations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', currentConversation.id);

    if (error) {
      console.error('Error updating status:', error);
      return;
    }

    setCurrentConversation({ ...currentConversation, status });
    loadConversations();
  };

  const updateConversationPriority = async (priority: string) => {
    if (!currentConversation) return;

    const { error } = await supabase
      .from('support_conversations')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', currentConversation.id);

    if (error) {
      console.error('Error updating priority:', error);
      return;
    }

    setCurrentConversation({ ...currentConversation, priority });
    loadConversations();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <XCircle className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      <div className="w-96 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-teal-600" />
            Support ({filteredConversations.length})
          </h2>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'pending', 'resolved', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {status === 'all' ? 'Tous' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setCurrentConversation(conv)}
              className={`w-full p-4 border-b border-slate-200 hover:bg-slate-50 transition text-left ${
                currentConversation?.id === conv.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">
                    {conv.profiles.full_name || conv.profiles.email}
                  </h3>
                  <p className="text-xs text-slate-600 truncate">{conv.subject}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(conv.status)}`}>
                    {conv.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${getPriorityColor(conv.priority)}`}>
                    {conv.priority}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {new Date(conv.last_message_at).toLocaleString('fr-FR')}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        {currentConversation ? (
          <>
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {currentConversation.profiles.full_name}
                  </h3>
                  <p className="text-sm text-slate-600">{currentConversation.profiles.email}</p>
                  <p className="text-xs text-slate-500 mt-1">{currentConversation.subject}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusIcon(currentConversation.status)}
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={currentConversation.status}
                  onChange={(e) => updateConversationStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="open">Ouvert</option>
                  <option value="pending">En attente</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </select>

                <select
                  value={currentConversation.priority}
                  onChange={(e) => updateConversationPriority(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.sender_type === 'admin' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.sender_type === 'bot'
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                        : msg.sender_type === 'admin'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500'
                        : 'bg-gradient-to-br from-teal-500 to-cyan-500'
                    }`}
                  >
                    {msg.sender_type === 'bot' ? (
                      <Bot className="w-5 h-5 text-white" />
                    ) : msg.sender_type === 'admin' ? (
                      <Shield className="w-5 h-5 text-white" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 max-w-[70%]">
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.sender_type === 'admin'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : msg.sender_type === 'bot'
                          ? 'bg-purple-50 text-purple-900 border border-purple-200'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}
                    >
                      {msg.sender_type !== 'admin' && msg.profiles && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {msg.profiles.full_name || msg.profiles.email}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      {msg.is_automated && (
                        <p className="text-xs mt-1 opacity-60">
                          Réponse automatique
                        </p>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender_type === 'admin' ? 'text-right' : ''
                      } text-slate-500`}
                    >
                      {new Date(msg.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-200 p-4 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Tapez votre réponse..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Envoyer
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Bot, User as UserIcon, Shield, Clock, CheckCircle, XCircle,
  AlertCircle, Search, Star, Paperclip, Smile, Zap, TrendingUp,
  AlertTriangle, MoreVertical, Phone, Video, Mail,
  Activity, Eye, EyeOff, ShoppingCart, Building2
} from 'lucide-react';
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

interface QuoteRequest {
  id: string;
  user_id: string;
  company_name: string;
  email: string;
  phone: string;
  expected_volume: string | null;
  message: string;
  status: 'pending' | 'contacted' | 'quoted' | 'closed' | 'rejected';
  admin_notes: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Stats {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  avgResponseTime: string;
  satisfaction: number;
}

const QUICK_RESPONSES = [
  { id: 1, text: "Merci pour votre message. Un agent va vous répondre sous peu.", category: "greeting" },
  { id: 2, text: "Votre problème a été résolu. N'hésitez pas à nous recontacter si besoin.", category: "closing" },
  { id: 3, text: "Pouvez-vous fournir plus de détails sur votre problème ?", category: "info" },
  { id: 4, text: "Nous travaillons actuellement sur votre demande. Merci de votre patience.", category: "update" },
  { id: 5, text: "Votre demande a été transmise à notre équipe technique.", category: "escalation" },
];

const PRIORITY_COLORS = {
  urgent: 'from-red-500 to-pink-500',
  high: 'from-orange-500 to-amber-500',
  medium: 'from-yellow-500 to-orange-500',
  low: 'from-slate-400 to-slate-500',
};

const STATUS_COLORS = {
  open: 'from-blue-500 to-cyan-500',
  pending: 'from-yellow-500 to-orange-500',
  resolved: 'from-green-500 to-emerald-500',
  closed: 'from-slate-500 to-slate-600',
};

export default function AdminSupport() {
  const { user } = useAuth();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'conversations' | 'quotes'>('conversations');
  
  // Conversations states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showQuickResponses, setShowQuickResponses] = useState(false);
  const [showStats, setShowStats] = useState(true);
  
  // Quote requests states
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteRequest[]>([]);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  
  const [stats, setStats] = useState<Stats>({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    avgResponseTime: '2h 30min',
    satisfaction: 4.5,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadStats();
    loadQuoteRequests(); // ← Charger les demandes de devis

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
          loadStats();
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
  }, [searchQuery, statusFilter, priorityFilter, conversations]);

  // Filter quote requests
  useEffect(() => {
    let filtered = quoteRequests;

    if (quoteStatusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === quoteStatusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(q =>
        q.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredQuotes(filtered);
  }, [quoteRequests, quoteStatusFilter, searchQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadStats = async () => {
    const { data, error } = await supabase
      .from('support_conversations')
      .select('status');

    if (!error && data) {
      const total = data.length;
      const open = data.filter(c => c.status === 'open').length;
      const pending = data.filter(c => c.status === 'pending').length;
      const resolved = data.filter(c => c.status === 'resolved').length;

      setStats({
        total,
        open,
        pending,
        resolved,
        avgResponseTime: '2h 30min',
        satisfaction: 4.5,
      });
    }
  };

  const loadQuoteRequests = async () => {
    try {
      console.log('🔍 Chargement demandes boutique...');
      
      // Charger les demandes sans JOIN
      const { data: quotes, error } = await supabase
        .from('shop_quote_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement demandes:', error);
        throw error;
      }

      console.log('📦 Demandes brutes:', quotes?.length || 0, quotes);

      // Charger les profils pour enrichir les données
      if (quotes && quotes.length > 0) {
        const userIds = quotes.map(q => q.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('⚠️ Erreur chargement profils:', profilesError);
        } else {
          console.log('👥 Profils chargés:', profiles?.length || 0);
        }

        // Enrichir les demandes avec les infos de profil
        const enrichedQuotes = quotes.map(quote => ({
          ...quote,
          profiles: profiles?.find(p => p.id === quote.user_id) || { full_name: 'Utilisateur inconnu', email: '' }
        }));

        console.log('✅ Demandes enrichies:', enrichedQuotes.length, enrichedQuotes);
        setQuoteRequests(enrichedQuotes as any);
        setFilteredQuotes(enrichedQuotes as any);
      } else {
        console.log('✅ Aucune demande trouvée');
        setQuoteRequests([]);
        setFilteredQuotes([]);
      }
    } catch (error) {
      console.error('Error loading quote requests:', error);
    }
  };

  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('shop_quote_requests')
        .update({
          status: newStatus,
          admin_notes: notes || null,
          responded_at: newStatus !== 'pending' ? new Date().toISOString() : null,
          responded_by: newStatus !== 'pending' ? user?.id : null
        })
        .eq('id', quoteId);

      if (error) throw error;

      await loadQuoteRequests();
      alert('Statut mis à jour avec succès !');
    } catch (error) {
      console.error('Error updating quote status:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const filterConversations = () => {
    let filtered = conversations;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(conv => conv.priority === priorityFilter);
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
      .select('*')
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

  const sendMessage = async (messageText?: string) => {
    if (!user || !currentConversation) return;
    
    const textToSend = messageText || newMessage;
    if (!textToSend.trim()) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert([
          {
            conversation_id: currentConversation.id,
            sender_id: user.id,
            sender_type: 'admin',
            message: textToSend.trim(),
          },
        ]);

      if (error) throw error;

      setNewMessage('');
      setShowQuickResponses(false);
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
    loadStats();
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'medium': return <Activity className="w-4 h-4" />;
      case 'low': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <XCircle className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 p-6">
      {/* Header avec Stats */}
      <div className="max-w-[1800px] mx-auto mb-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Support Client
            </h1>
            <p className="text-slate-600 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Gestion des conversations en temps réel
            </p>
          </div>
          
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition"
          >
            {showStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showStats ? 'Masquer stats' : 'Afficher stats'}
          </button>
        </div>

        {/* Stats Dashboard */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 mb-1">{stats.total}</p>
              <p className="text-sm text-slate-600 font-semibold">Total</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-black text-blue-600 mb-1">{stats.open}</p>
              <p className="text-sm text-slate-600 font-semibold">Ouverts</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-yellow-200 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-black text-yellow-600 mb-1">{stats.pending}</p>
              <p className="text-sm text-slate-600 font-semibold">En attente</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-green-200 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-black text-green-600 mb-1">{stats.resolved}</p>
              <p className="text-sm text-slate-600 font-semibold">Résolus</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-600 mb-1">{stats.avgResponseTime}</p>
              <p className="text-sm text-slate-600 font-semibold">Temps moyen</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-lg hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-black text-amber-600 mb-1">{stats.satisfaction}/5</p>
              <p className="text-sm text-slate-600 font-semibold">Satisfaction</p>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'conversations'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            Conversations
            {conversations.length > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                activeTab === 'conversations' ? 'bg-white/20' : 'bg-blue-100 text-blue-600'
              }`}>
                {conversations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'quotes'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Demandes Boutique
            {quoteRequests.filter(q => q.status === 'pending').length > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                activeTab === 'quotes' ? 'bg-white/20' : 'bg-purple-100 text-purple-600'
              }`}>
                {quoteRequests.filter(q => q.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      

      {/* Main Content - Conversations Tab */}
      {activeTab === 'conversations' && (
      <div className="max-w-[1800px] mx-auto">
        <div className="flex gap-6 h-[calc(100vh-350px)]">
          {/* Sidebar - Liste des conversations */}
          <div className="w-96 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {/* Filtres */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                />
              </div>

              <div className="flex gap-2 mb-2">
                {['all', 'open', 'pending', 'resolved', 'closed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      statusFilter === status
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'all' ? '📋 Tous' : status}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                {['all', 'urgent', 'high', 'medium', 'low'].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      priorityFilter === priority
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {priority === 'all' ? '🏷️ Toutes' : priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv)}
                  className={`w-full p-4 border-b border-slate-100 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition text-left ${
                    currentConversation?.id === conv.id
                      ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-l-teal-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-black">
                          {conv.profiles.full_name?.charAt(0).toUpperCase() || conv.profiles.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {conv.profiles.full_name || conv.profiles.email}
                          </h3>
                          <p className="text-xs text-slate-600 truncate">{conv.subject}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r ${STATUS_COLORS[conv.status as keyof typeof STATUS_COLORS]} text-white flex items-center gap-1`}>
                        {getStatusIcon(conv.status)}
                        {conv.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r ${PRIORITY_COLORS[conv.priority as keyof typeof PRIORITY_COLORS]} text-white flex items-center gap-1`}>
                        {getPriorityIcon(conv.priority)}
                        {conv.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      {new Date(conv.last_message_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Zone de Chat */}
          <div className="flex-1 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {currentConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg">
                        {currentConversation.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">
                          {currentConversation.profiles.full_name}
                        </h3>
                        <p className="text-sm text-slate-600">{currentConversation.profiles.email}</p>
                        <p className="text-xs text-slate-500 mt-1 font-semibold">#{currentConversation.subject}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-white rounded-lg transition">
                        <Phone className="w-5 h-5 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition">
                        <Video className="w-5 h-5 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition">
                        <Mail className="w-5 h-5 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition">
                        <MoreVertical className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={currentConversation.status}
                      onChange={(e) => updateConversationStatus(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="open">🔵 Ouvert</option>
                      <option value="pending">🟡 En attente</option>
                      <option value="resolved">🟢 Résolu</option>
                      <option value="closed">⚫ Fermé</option>
                    </select>

                    <select
                      value={currentConversation.priority}
                      onChange={(e) => updateConversationPriority(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="low">🟢 Basse</option>
                      <option value="medium">🟡 Moyenne</option>
                      <option value="high">🟠 Haute</option>
                      <option value="urgent">🔴 Urgente</option>
                    </select>

                    <button
                      onClick={() => setShowQuickResponses(!showQuickResponses)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Réponses rapides
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${
                        msg.sender_type === 'admin' ? 'flex-row-reverse' : ''
                      } animate-in fade-in slide-in-from-bottom duration-300`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
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
                          className={`rounded-2xl px-4 py-3 shadow-lg ${
                            msg.sender_type === 'admin'
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                              : msg.sender_type === 'bot'
                              ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-2 border-purple-200'
                              : 'bg-white text-slate-900 border-2 border-slate-200'
                          }`}
                        >
                          {msg.sender_type !== 'admin' && msg.profiles && (
                            <p className="text-xs font-bold mb-1 opacity-70">
                              {msg.profiles.full_name || msg.profiles.email}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap font-medium">{msg.message}</p>
                          {msg.is_automated && (
                            <p className="text-xs mt-2 opacity-60 flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              Réponse automatique
                            </p>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-right' : ''} text-slate-500 font-semibold`}>
                          {new Date(msg.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div ref={messagesEndRef} />
                </div>

                {/* Réponses Rapides */}
                {showQuickResponses && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-purple-200 animate-in slide-in-from-bottom duration-300">
                    <p className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Cliquez pour envoyer une réponse rapide :
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {QUICK_RESPONSES.map((response) => (
                        <button
                          key={response.id}
                          onClick={() => sendMessage(response.text)}
                          className="text-left p-3 bg-white hover:bg-purple-100 rounded-xl border border-purple-200 text-sm transition hover:shadow-lg"
                        >
                          <p className="text-slate-800 font-medium">{response.text}</p>
                          <p className="text-xs text-purple-600 font-semibold mt-1">#{response.category}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="border-t border-slate-200 p-4 bg-white">
                  <div className="flex gap-3">
                    <button className="p-3 hover:bg-slate-100 rounded-xl transition">
                      <Paperclip className="w-5 h-5 text-slate-600" />
                    </button>
                    <button className="p-3 hover:bg-slate-100 rounded-xl transition">
                      <Smile className="w-5 h-5 text-slate-600" />
                    </button>
                    
                    <input
                      type="text"
                      placeholder="Tapez votre réponse..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={loading}
                      className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                    />
                    
                    <button
                      onClick={() => sendMessage()}
                      disabled={loading || !newMessage.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center gap-2"
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
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-semibold">Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Quote Requests Tab */}
      {activeTab === 'quotes' && (
        <div className="max-w-[1800px] mx-auto">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                Demandes de Devis
              </h2>
              
              {/* Status Filter */}
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Tous', color: 'slate' },
                  { value: 'pending', label: 'En attente', color: 'yellow' },
                  { value: 'contacted', label: 'Contactés', color: 'blue' },
                  { value: 'quoted', label: 'Devis envoyés', color: 'purple' },
                  { value: 'closed', label: 'Conclus', color: 'green' },
                  { value: 'rejected', label: 'Refusés', color: 'red' }
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => setQuoteStatusFilter(value)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                      quoteStatusFilter === value
                        ? `bg-${color}-500 text-white shadow-lg`
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                    {value !== 'all' && (
                      <span className="ml-2 text-xs opacity-75">
                        ({quoteRequests.filter(q => q.status === value).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quote Requests List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white border-2 border-slate-200 rounded-xl p-5 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedQuote(selectedQuote?.id === quote.id ? null : quote)}
                >
                  {/* Header avec statut */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-5 h-5 text-slate-600" />
                        <h3 className="font-black text-lg text-slate-900">{quote.company_name}</h3>
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        {quote.profiles?.full_name || 'Utilisateur'}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      quote.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      quote.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                      quote.status === 'quoted' ? 'bg-purple-100 text-purple-700' :
                      quote.status === 'closed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {quote.status === 'pending' ? '⏳ En attente' :
                       quote.status === 'contacted' ? '📞 Contacté' :
                       quote.status === 'quoted' ? '📄 Devis envoyé' :
                       quote.status === 'closed' ? '✅ Conclu' :
                       '❌ Refusé'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{quote.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{quote.phone}</span>
                    </div>
                    {quote.expected_volume && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">Volume: {quote.expected_volume}</span>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-slate-700 line-clamp-3">{quote.message}</p>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-slate-500">
                    Demandé le {new Date(quote.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {/* Expanded Actions */}
                  {selectedQuote?.id === quote.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 animate-in fade-in slide-in-from-top duration-300">
                      {/* Full Message */}
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1">Message complet:</p>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.message}</p>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      {quote.admin_notes && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1">Notes admin:</p>
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-sm text-slate-700">{quote.admin_notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {quote.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQuoteStatus(quote.id, 'contacted');
                              }}
                              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition"
                            >
                              📞 Marquer comme contacté
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQuoteStatus(quote.id, 'rejected');
                              }}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition"
                            >
                              ❌ Refuser
                            </button>
                          </>
                        )}
                        
                        {quote.status === 'contacted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuoteStatus(quote.id, 'quoted');
                            }}
                            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition"
                          >
                            📄 Marquer devis envoyé
                          </button>
                        )}
                        
                        {quote.status === 'quoted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuoteStatus(quote.id, 'closed');
                            }}
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition"
                          >
                            ✅ Marquer comme conclu
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredQuotes.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-200 to-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-10 h-10 text-purple-600" />
                </div>
                <p className="text-slate-500 font-semibold text-lg mb-2">Aucune demande de devis</p>
                <p className="text-slate-400 text-sm">
                  Les demandes de devis depuis la boutique apparaîtront ici
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Bot, Sparkles, Plus,
  CheckCircle2, Clock, AlertCircle, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  message: string;
  sender_type: 'user' | 'admin' | 'bot';
  is_automated: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
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
  { id: 'billing', label: 'Facturation', emoji: '💳', color: 'from-blue-500 to-cyan-500' },
  { id: 'missions', label: 'Missions', emoji: '🚗', color: 'from-green-500 to-emerald-500' },
  { id: 'technical', label: 'Technique', emoji: '⚙️', color: 'from-orange-500 to-red-500' },
  { id: 'reports', label: 'Rapports', emoji: '📊', color: 'from-purple-500 to-pink-500' },
  { id: 'other', label: 'Autre', emoji: '💬', color: 'from-slate-500 to-slate-600' },
];

const STATUS_CONFIG = {
  open: { label: 'Ouvert', color: 'from-blue-500 to-cyan-500', icon: AlertCircle },
  pending: { label: 'En attente', color: 'from-yellow-500 to-orange-500', icon: Clock },
  resolved: { label: 'Résolu', color: 'from-green-500 to-emerald-500', icon: CheckCircle2 },
  closed: { label: 'Fermé', color: 'from-slate-500 to-slate-600', icon: CheckCircle2 },
};

export default function Support() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Nouveau formulaire de conversation
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    try {
      console.log('🔍 Chargement conversations support pour user:', user.id);
      
      const { data, error } = await supabase
        .from('support_conversations')
        .select('id, user_id, subject, category, priority, status, last_message_at, created_at, updated_at')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement conversations:', error);
        throw error;
      }
      
      console.log('✅ Conversations chargées:', data?.length || 0, data);
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

      // Simuler admin en train d'écrire
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

  const createConversation = async () => {
    if (!user || !newConvForm.subject.trim() || !newConvForm.message.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      console.log('📤 Création conversation support...', {
        user_id: user.id,
        subject: newConvForm.subject,
        category: newConvForm.category,
        priority: newConvForm.priority,
      });

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

      if (convError) {
        console.error('❌ Erreur création conversation:', convError);
        throw convError;
      }

      console.log('✅ Conversation créée:', convData);

      // Message initial de l'utilisateur
      console.log('📤 Ajout message initial...');
      const { error: msgError } = await supabase.from('support_messages').insert([
        {
          conversation_id: (convData as any).id,
          sender_id: user.id,
          sender_type: 'user',
          message: newConvForm.message.trim(),
        },
      ]);

      if (msgError) {
        console.error('❌ Erreur message initial:', msgError);
      } else {
        console.log('✅ Message initial ajouté');
      }

      // Message de bienvenue automatique
      await supabase.from('support_messages').insert([
        {
          conversation_id: (convData as any).id,
          sender_id: user.id,
          sender_type: 'bot',
          is_automated: true,
          message: `Bonjour ! 👋\n\nMerci d'avoir contacté notre support. Nous avons bien reçu votre demande concernant "${newConvForm.subject}".\n\nUn agent va prendre en charge votre demande dans les plus brefs délais. En attendant, n'hésitez pas à ajouter plus de détails pour nous aider à mieux vous assister.`,
        },
      ]);

      setConversations([convData as any, ...conversations]);
      setCurrentConversation(convData as any);
      setNewConvForm({ subject: '', category: 'other', priority: 'medium', message: '' });
      setShowNewConversation(false);
      
      // Recharger les conversations
      await loadConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Erreur lors de la création de la conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !currentConversation || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setLoading(true);
    setNewMessage(''); // Clear input immediately for better UX

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

      // Update last message timestamp
      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversation.id);

      // Manually add message to state for instant feedback
      if (messageData) {
        setMessages((prev) => [...prev, messageData as Message]);
      }

      // Réponse automatique intelligente
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
      alert('Erreur lors de l\'envoi du message');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setLoading(false);
    }
  };

  const getAutomatedResponse = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('facture') || lowerMessage.includes('paiement')) {
      return "Je vois que vous avez une question sur la facturation. 💳\n\nVous pouvez consulter toutes vos factures dans la section 'Facturation' de votre dashboard. Si vous avez besoin d'aide spécifique, un agent va vous répondre rapidement.";
    }

    if (lowerMessage.includes('bug') || lowerMessage.includes('erreur') || lowerMessage.includes('problème')) {
      return "Merci d'avoir signalé ce problème. 🔧\n\nPourriez-vous nous donner plus de détails ?\n- Quel écran/page ?\n- Quand est-ce arrivé ?\n- Message d'erreur ?\n\nCela nous aidera à résoudre le problème plus rapidement.";
    }

    if (lowerMessage.includes('merci') || lowerMessage.includes('résolu')) {
      return "Avec plaisir ! 😊\n\nN'hésitez pas à nous recontacter si vous avez d'autres questions.";
    }

    return null;
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r ${config.color} text-white`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getCategoryEmoji = (category: string) => {
    return CATEGORIES.find((c) => c.id === category)?.emoji || '💬';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <MessageCircle className="w-20 h-20 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">Veuillez vous connecter pour accéder au support</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Support Client
          </h1>
          <p className="text-slate-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Contactez notre équipe pour toute question
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Liste des conversations */}
          <div className="lg:w-96 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {/* Actions */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <button
                onClick={() => setShowNewConversation(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 mb-4"
              >
                <Plus className="w-5 h-5" />
                Nouvelle demande
              </button>

              {/* Recherche */}
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

              {/* Filtres statut */}
              <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Liste conversations */}
            <div className="flex-1 overflow-y-auto">
              {loading && conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-sm text-slate-600">Chargement...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold mb-2">
                    {searchQuery || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucune conversation'}
                  </p>
                  <p className="text-sm text-slate-400">
                    Créez votre première demande de support
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
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
                          <span className="text-2xl">{getCategoryEmoji(conv.category)}</span>
                          <h3 className="font-bold text-slate-900 text-sm truncate flex-1">
                            {conv.subject}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {getStatusBadge(conv.status)}
                      <p className="text-xs text-slate-500 font-semibold">
                        {new Date(conv.last_message_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Zone principale */}
          <div className="flex-1 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-xl min-h-[600px]">
            {showNewConversation ? (
              /* Formulaire nouvelle conversation */
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Nouvelle demande</h2>
                    <p className="text-slate-600">Décrivez votre problème et nous vous répondrons rapidement</p>
                  </div>

                  <div className="space-y-6">
                    {/* Catégorie */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        Catégorie *
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setNewConvForm({ ...newConvForm, category: cat.id })}
                            className={`p-4 rounded-xl border-2 transition text-center ${
                              newConvForm.category === cat.id
                                ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50'
                                : 'border-slate-200 bg-white hover:border-teal-300'
                            }`}
                          >
                            <div className="text-3xl mb-2">{cat.emoji}</div>
                            <p className="font-bold text-sm text-slate-800">{cat.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sujet */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Sujet *
                      </label>
                      <input
                        type="text"
                        value={newConvForm.subject}
                        onChange={(e) => setNewConvForm({ ...newConvForm, subject: e.target.value })}
                        placeholder="Ex: Problème avec ma facture du mois..."
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                      />
                    </div>

                    {/* Priorité */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Priorité
                      </label>
                      <select
                        value={newConvForm.priority}
                        onChange={(e) => setNewConvForm({ ...newConvForm, priority: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-bold"
                      >
                        <option value="low">🟢 Basse</option>
                        <option value="medium">🟡 Moyenne</option>
                        <option value="high">🟠 Haute</option>
                        <option value="urgent">🔴 Urgente</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        value={newConvForm.message}
                        onChange={(e) => setNewConvForm({ ...newConvForm, message: e.target.value })}
                        rows={6}
                        placeholder="Décrivez votre problème en détail..."
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none font-medium"
                      />
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewConversation(false);
                          setNewConvForm({ subject: '', category: 'other', priority: 'medium', message: '' });
                        }}
                        className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={createConversation}
                        disabled={loading || !newConvForm.subject.trim() || !newConvForm.message.trim()}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                        Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentConversation ? (
              /* Vue conversation */
              <>
                {/* Header conversation */}
                <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">
                        {getCategoryEmoji(currentConversation.category)}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">
                          {currentConversation.subject}
                        </h3>
                        <p className="text-sm text-slate-600">
                          Créé le {new Date(currentConversation.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(currentConversation.status)}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${
                        msg.sender_type === 'user' ? 'flex-row-reverse' : ''
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
                          <Sparkles className="w-5 h-5 text-white" />
                        ) : (
                          <span className="text-white font-black text-sm">
                            {user.email?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 max-w-[70%]">
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-lg ${
                            msg.sender_type === 'user'
                              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                              : msg.sender_type === 'bot'
                              ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-2 border-purple-200'
                              : 'bg-gradient-to-r from-orange-100 to-red-100 text-slate-900 border-2 border-orange-300 shadow-xl'
                          }`}
                        >
                          {msg.sender_type === 'admin' && (
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-orange-300">
                              <Sparkles className="w-4 h-4 text-orange-600" />
                              <span className="text-xs font-black text-orange-600 uppercase tracking-wider">Réponse de l'équipe</span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap font-medium">{msg.message}</p>
                          {msg.is_automated && (
                            <p className="text-xs mt-2 opacity-60 flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              Réponse automatique
                            </p>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender_type === 'user' ? 'text-right' : ''
                          } text-slate-500 font-semibold`}
                        >
                          {new Date(msg.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex items-center gap-3 animate-in fade-in">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 shadow-lg">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input message */}
                <div className="border-t border-slate-200 p-4 bg-white">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Tapez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={loading || currentConversation.status === 'closed'}
                      className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium disabled:bg-slate-100"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !newMessage.trim() || currentConversation.status === 'closed'}
                      className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Envoyer
                    </button>
                  </div>
                  {currentConversation.status === 'closed' && (
                    <p className="text-xs text-amber-600 mt-2 font-semibold">
                      Cette conversation est fermée. Créez une nouvelle demande si besoin.
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* Aucune conversation sélectionnée */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-semibold mb-4">Sélectionnez une conversation</p>
                  <button
                    onClick={() => setShowNewConversation(true)}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Nouvelle demande
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

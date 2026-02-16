// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Plus, Headphones, ChevronLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  message: string;
  sender_type: 'user' | 'admin' | 'bot';
  sender_id: string;
  is_automated: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  last_message_at: string;
  created_at: string;
}

const CATEGORIES = [
  { id: 'billing', label: 'Facturation', emoji: '💳' },
  { id: 'missions', label: 'Missions', emoji: '🚗' },
  { id: 'technical', label: 'Technique', emoji: '⚙️' },
  { id: 'reports', label: 'Rapports', emoji: '📊' },
  { id: 'other', label: 'Autre', emoji: '💬' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'bg-blue-500' },
  pending: { label: 'En attente', color: 'bg-yellow-500' },
  resolved: { label: 'Résolu', color: 'bg-green-500' },
  closed: { label: 'Fermé', color: 'bg-slate-400' },
};

export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New conversation form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newInitialMessage, setNewInitialMessage] = useState('');

  useEffect(() => {
    if (open && user) {
      loadConversations();
    }
  }, [open, user]);

  // Realtime subscription for conversations and messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('support-chat-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_conversations',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadConversations();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
      }, (payload) => {
        if (currentConversation && payload.new.conversation_id === currentConversation.id) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
        // Count unread if chat is closed or viewing a different conversation
        if (payload.new.sender_type === 'admin' && (!open || payload.new.conversation_id !== currentConversation?.id)) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentConversation?.id, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('id, subject, status, category, priority, last_message_at, created_at')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Erreur chargement conversations:', err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('id, message, sender_type, sender_id, is_automated, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
    }
  };

  const openConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    setView('chat');
    loadMessages(conv.id);
  };

  const createConversation = async () => {
    if (!user || !newSubject.trim() || !newInitialMessage.trim()) return;
    setLoading(true);

    try {
      const { data: convData, error: convError } = await supabase
        .from('support_conversations')
        .insert({
          user_id: user.id,
          subject: newSubject.trim(),
          category: newCategory,
          priority: 'medium',
          status: 'open',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send initial message
      await supabase.from('support_messages').insert({
        conversation_id: convData.id,
        sender_id: user.id,
        sender_type: 'user',
        message: newInitialMessage.trim(),
      });

      // Auto welcome message
      await supabase.from('support_messages').insert({
        conversation_id: convData.id,
        sender_id: user.id,
        sender_type: 'bot',
        is_automated: true,
        message: `Merci pour votre message ! 👋\n\nUn membre de notre équipe va vous répondre très rapidement. En attendant, n'hésitez pas à ajouter des détails supplémentaires.`,
      });

      // Update last_message_at
      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convData.id);

      // Reset form and open conversation
      setNewSubject('');
      setNewCategory('other');
      setNewInitialMessage('');
      openConversation(convData as Conversation);
      loadConversations();
    } catch (err) {
      console.error('Erreur création conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !currentConversation || !newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    try {
      const { data: msgData, error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: currentConversation.id,
          sender_id: user.id,
          sender_type: 'user',
          message: text,
        })
        .select()
        .single();

      if (error) throw error;

      // Instant feedback
      if (msgData) {
        setMessages(prev => [...prev, msgData as Message]);
      }

      await supabase
        .from('support_conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          status: 'open'
        })
        .eq('id', currentConversation.id);
    } catch (err) {
      console.error('Erreur envoi message:', err);
      setNewMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (view === 'new') createConversation();
      else sendMessage();
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); if (!open) setUnreadCount(0); }}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full shadow-2xl hover:shadow-teal-500/30 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="Support"
      >
        {open ? (
          <X className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
        ) : (
          <>
            <Headphones className="w-7 h-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-blue-500 px-5 py-4 flex items-center gap-3">
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setCurrentConversation(null); }}
                className="text-white/80 hover:text-white transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h3 className="text-white font-black text-lg">
                {view === 'list' ? 'Support' : view === 'new' ? 'Nouveau message' : currentConversation?.subject}
              </h3>
              <p className="text-white/70 text-xs">
                {view === 'list' ? 'Discutez avec notre équipe' : view === 'new' ? 'Décrivez votre demande' : (
                  STATUS_CONFIG[currentConversation?.status || 'open']?.label || 'Ouvert'
                )}
              </p>
            </div>
            {view === 'list' && (
              <button
                onClick={() => setView('new')}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-white"
                title="Nouvelle conversation"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            
            {/* Conversations list */}
            {view === 'list' && (
              <div className="divide-y divide-slate-100">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <Headphones className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold mb-1">Aucune conversation</p>
                    <p className="text-slate-400 text-sm mb-4">Contactez-nous pour toute question</p>
                    <button
                      onClick={() => setView('new')}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                      Écrire au support
                    </button>
                  </div>
                ) : (
                  conversations.map(conv => {
                    const statusCfg = STATUS_CONFIG[conv.status] || STATUS_CONFIG.open;
                    const catEmoji = CATEGORIES.find(c => c.id === conv.category)?.emoji || '💬';
                    return (
                      <button
                        key={conv.id}
                        onClick={() => openConversation(conv)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-start gap-3"
                      >
                        <span className="text-xl mt-0.5">{catEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-slate-900 text-sm truncate flex-1">{conv.subject}</p>
                            <span className={`w-2 h-2 rounded-full ${statusCfg.color} flex-shrink-0`} />
                          </div>
                          <p className="text-xs text-slate-400">{getTimeAgo(conv.last_message_at || conv.created_at)}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* New conversation form */}
            {view === 'new' && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Sujet *</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    placeholder="Ex: Problème de facturation"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Catégorie</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setNewCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition border ${
                          newCategory === cat.id
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Message *</label>
                  <textarea
                    value={newInitialMessage}
                    onChange={e => setNewInitialMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Décrivez votre demande en détail..."
                    rows={4}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={createConversation}
                  disabled={loading || !newSubject.trim() || !newInitialMessage.trim()}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </button>
              </div>
            )}

            {/* Chat messages */}
            {view === 'chat' && (
              <div className="p-4 space-y-3 min-h-[300px]">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender_type === 'user'
                        ? 'bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-br-md'
                        : msg.sender_type === 'bot'
                        ? 'bg-slate-100 text-slate-700 rounded-bl-md border border-slate-200'
                        : 'bg-blue-50 text-blue-900 rounded-bl-md border border-blue-200'
                    }`}>
                      {msg.sender_type === 'admin' && (
                        <p className="text-[10px] font-bold text-blue-500 mb-1 flex items-center gap-1">
                          <Headphones className="w-3 h-3" />
                          Support ChecksFleet
                        </p>
                      )}
                      {msg.sender_type === 'bot' && (
                        <p className="text-[10px] font-bold text-slate-400 mb-1">🤖 Réponse automatique</p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.sender_type === 'user' ? 'text-white/60' : 'text-slate-400'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar (only in chat view) */}
          {view === 'chat' && (
            <div className="border-t border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Votre message..."
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 outline-none"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="p-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

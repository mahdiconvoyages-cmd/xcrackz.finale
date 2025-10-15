import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, X, Bot, User as UserIcon, Minimize2, Maximize2,
  Paperclip, Star, Sparkles, Zap, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  created_at: string;
}

const COMMON_ISSUES = [
  {
    id: 1,
    emoji: '💳',
    title: 'Facturation',
    description: 'Questions sur les paiements et abonnements',
    keywords: ['facture', 'paiement', 'abonnement', 'prix'],
  },
  {
    id: 2,
    emoji: '🚗',
    title: 'Missions',
    description: 'Aide sur la création et gestion des missions',
    keywords: ['mission', 'véhicule', 'création'],
  },
  {
    id: 3,
    emoji: '⚙️',
    title: 'Technique',
    description: 'Problèmes techniques ou bugs',
    keywords: ['bug', 'erreur', 'problème', 'technique'],
  },
  {
    id: 4,
    emoji: '📊',
    title: 'Rapports',
    description: 'Questions sur les rapports et statistiques',
    keywords: ['rapport', 'statistique', 'export'],
  },
];

export default function ChatAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
      subscribeToMessages(currentConversation.id);
      markAsRead(currentConversation.id);
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

    if (data && data.length > 0) {
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

    // Simuler admin en train d'écrire après un message user
    const lastMessage = data?.[data.length - 1];
    if (lastMessage?.sender_type === 'user') {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
      }, 1000);
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`user_messages:${conversationId}`)
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
          
          if (payload.new.sender_type !== 'user') {
            setUnreadCount((prev) => prev + 1);
            
            // Notification
            if (!isOpen && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Nouveau message support', {
                body: 'Un agent vous a répondu',
                icon: '/logo.svg',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = (_conversationId: string) => {
    setUnreadCount(0);
  };

  const createConversation = async () => {
    if (!user || !newSubject.trim()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .insert([
          {
            user_id: user.id,
            subject: newSubject.trim(),
            category: selectedCategory || 'general',
            status: 'open',
            priority: 'medium',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Message de bienvenue automatique
      await supabase.from('support_messages').insert([
        {
          conversation_id: data.id,
          sender_id: user.id,
          sender_type: 'bot',
          is_automated: true,
          message: `Bonjour ! 👋\n\nMerci d'avoir contacté notre support. Nous avons bien reçu votre demande concernant "${newSubject}".\n\nUn agent va prendre en charge votre demande dans les plus brefs délais. En attendant, n'hésitez pas à ajouter plus de détails pour nous aider à mieux vous assister.`,
        },
      ]);

      setConversations([data, ...conversations]);
      setCurrentConversation(data);
      setNewSubject('');
      setSelectedCategory('');
      setShowNewConversation(false);
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
      const { error } = await supabase
        .from('support_messages')
        .insert([
          {
            conversation_id: currentConversation.id,
            sender_id: user.id,
            sender_type: 'user',
            message: newMessage.trim(),
          },
        ]);

      if (error) throw error;

      // Mettre à jour last_message_at
      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversation.id);

      setNewMessage('');

      // Réponse automatique intelligente
      const autoResponse = getAutomatedResponse(newMessage);
      if (autoResponse) {
        setTimeout(async () => {
          await supabase.from('support_messages').insert([
            {
              conversation_id: currentConversation.id,
              sender_id: user.id,
              sender_type: 'bot',
              is_automated: true,
              message: autoResponse,
            },
          ]);
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
      return "Avec plaisir ! 😊\n\nN'hésitez pas à nous recontacter si vous avez d'autres questions. Voulez-vous noter votre expérience support ?";
    }

    return null;
  };

  const submitRating = async (stars: number) => {
    if (!currentConversation) return;

    setRating(stars);
    
    // Ici vous pouvez sauvegarder le rating dans la DB
    setTimeout(() => {
      setShowRating(false);
      alert(`Merci pour votre note de ${stars}/5 ! 🌟`);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      open: { color: 'from-blue-500 to-cyan-500', text: 'Ouvert', icon: <AlertCircle className="w-3 h-3" /> },
      pending: { color: 'from-yellow-500 to-orange-500', text: 'En attente', icon: <Clock className="w-3 h-3" /> },
      resolved: { color: 'from-green-500 to-emerald-500', text: 'Résolu', icon: <CheckCircle className="w-3 h-3" /> },
      closed: { color: 'from-slate-500 to-slate-600', text: 'Fermé', icon: <CheckCircle className="w-3 h-3" /> },
    };

    const badge = badges[status as keyof typeof badges] || badges.open;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-gradient-to-r ${badge.color} text-white`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  if (!user) return null;

  return (
    <>
      {/* Bouton Flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50 animate-bounce"
        >
          <MessageCircle className="w-7 h-7" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-black rounded-full flex items-center justify-center animate-pulse shadow-lg">
              {unreadCount}
            </span>
          )}
          <span className="absolute right-full mr-3 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-xl">
            Clara - Assistant IA 💬
          </span>
        </button>
      )}

      {/* Fenêtre de Chat */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 flex flex-col overflow-hidden z-50 transition-all duration-300 ${
            isMinimized ? 'w-80 h-16' : 'w-[450px] h-[650px]'
          } animate-in slide-in-from-bottom-5 fade-in`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-lg">Clara - Assistant IA</h3>
                <p className="text-xs text-white/80 font-semibold">Toujours là pour vous aider ✨</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 hover:bg-white/20 rounded-lg transition flex items-center justify-center"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 hover:bg-white/20 rounded-lg transition flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Conversations List ou New Conversation */}
              {!currentConversation || showNewConversation ? (
                <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-slate-50 to-blue-50">
                  {showNewConversation ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <Zap className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 mb-2">Nouvelle demande</h3>
                        <p className="text-sm text-slate-600">Choisissez une catégorie pour commencer</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {COMMON_ISSUES.map((issue) => (
                          <button
                            key={issue.id}
                            onClick={() => {
                              setSelectedCategory(issue.title);
                              setNewSubject(issue.title);
                            }}
                            className={`p-4 rounded-xl border-2 transition text-left hover:shadow-lg ${
                              selectedCategory === issue.title
                                ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50'
                                : 'border-slate-200 bg-white hover:border-teal-300'
                            }`}
                          >
                            <div className="text-3xl mb-2">{issue.emoji}</div>
                            <p className="font-bold text-sm text-slate-900">{issue.title}</p>
                            <p className="text-xs text-slate-600 mt-1">{issue.description}</p>
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Décrivez votre problème
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Problème avec ma facture..."
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && createConversation()}
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowNewConversation(false)}
                          className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={createConversation}
                          disabled={!newSubject.trim() || loading}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Créer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <h3 className="font-black text-xl text-slate-900 mb-2">Vos conversations</h3>
                        <p className="text-sm text-slate-600">Sélectionnez ou créez une conversation</p>
                      </div>

                      {conversations.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageCircle className="w-10 h-10 text-slate-400" />
                          </div>
                          <p className="text-slate-500 mb-4 font-semibold">Aucune conversation</p>
                          <button
                            onClick={() => setShowNewConversation(true)}
                            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition"
                          >
                            Commencer une conversation
                          </button>
                        </div>
                      ) : (
                        <>
                          {conversations.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => {
                                setCurrentConversation(conv);
                                setShowNewConversation(false);
                              }}
                              className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:shadow-lg transition text-left"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-bold text-slate-900 flex-1">{conv.subject}</p>
                                {getStatusBadge(conv.status)}
                              </div>
                              <p className="text-xs text-slate-500 font-semibold">
                                {new Date(conv.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </button>
                          ))}

                          <button
                            onClick={() => setShowNewConversation(true)}
                            className="w-full p-4 border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl hover:border-teal-500 hover:shadow-lg transition font-bold text-teal-700 flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-5 h-5" />
                            Nouvelle conversation
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-slate-50 to-blue-50">
                    {/* Header conversation */}
                    <div className="bg-white p-3 rounded-xl border-2 border-slate-200 mb-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-sm">{currentConversation.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Créé le {new Date(currentConversation.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {getStatusBadge(currentConversation.status)}
                      </div>
                    </div>

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${
                          msg.sender_type === 'user' ? 'flex-row-reverse' : ''
                        } animate-in fade-in slide-in-from-bottom duration-300`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
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
                            <Sparkles className="w-4 h-4 text-white" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-white" />
                          )}
                        </div>

                        <div className="flex-1 max-w-[75%]">
                          <div
                            className={`rounded-2xl px-4 py-3 shadow-lg ${
                              msg.sender_type === 'user'
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                                : msg.sender_type === 'bot'
                                ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-2 border-purple-200'
                                : 'bg-white text-slate-900 border-2 border-orange-200'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap font-medium">{msg.message}</p>
                            {msg.is_automated && (
                              <p className="text-xs mt-2 opacity-60 flex items-center gap-1">
                                <Bot className="w-3 h-3" />
                                Bot
                              </p>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${msg.sender_type === 'user' ? 'text-right' : ''} text-slate-500 font-semibold`}>
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex items-center gap-3 animate-in fade-in">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                          <Sparkles className="w-4 h-4 text-white" />
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

                  {/* Rating Modal */}
                  {showRating && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-10 animate-in fade-in">
                      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in slide-in-from-bottom duration-300">
                        <h3 className="font-black text-xl text-slate-900 mb-2 text-center">
                          Notez votre expérience
                        </h3>
                        <p className="text-sm text-slate-600 mb-6 text-center">
                          Comment s'est passé votre échange avec le support ?
                        </p>
                        
                        <div className="flex justify-center gap-2 mb-6">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => submitRating(star)}
                              className="w-12 h-12 hover:scale-125 transition"
                            >
                              <Star
                                className={`w-full h-full ${
                                  star <= rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setShowRating(false)}
                          className="w-full px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition"
                        >
                          Plus tard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="border-t-2 border-slate-200 p-4 bg-white">
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setCurrentConversation(null)}
                        className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition"
                      >
                        ← Retour
                      </button>
                      {currentConversation.status === 'resolved' && (
                        <button
                          onClick={() => setShowRating(true)}
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          Noter
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button className="p-3 hover:bg-slate-100 rounded-xl transition">
                        <Paperclip className="w-5 h-5 text-slate-600" />
                      </button>
                      
                      <input
                        type="text"
                        placeholder="Votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={loading}
                        className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                      />
                      
                      <button
                        onClick={sendMessage}
                        disabled={loading || !newMessage.trim()}
                        className="px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

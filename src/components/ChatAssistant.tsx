import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Trash2, Plus, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { askXcrackzAssistant, analyzeIntent, AIMessage } from '../services/aiService';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && user) {
      loadConversations();
    }
  }, [open, user]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);

      const messagesChannel = supabase
        .channel(`ai-messages-${currentConversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ai_messages',
            filter: `conversation_id=eq.${currentConversationId}`
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as AIMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (data) {
      setConversations(data);
      if (data.length > 0 && !currentConversationId) {
        setCurrentConversationId(data[0].id);
      }
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as AIMessage[]);
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        title: 'Nouvelle conversation',
      })
      .select()
      .single();

    if (data) {
      setCurrentConversationId(data.id);
      setMessages([]);
      loadConversations();
    }
  };

  const deleteConversation = async (id: string) => {
    if (!confirm('Supprimer cette conversation ?')) return;

    await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id);

    if (id === currentConversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    loadConversations();
  };

  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
      });
  };

  const updateConversationTitle = async (conversationId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    await supabase
      .from('ai_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    loadConversations();
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    let conversationId = currentConversationId;

    // Créer conversation si besoin
    if (!conversationId) {
      const { data } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
        })
        .select()
        .single();

      if (data) {
        conversationId = data.id;
        setCurrentConversationId(conversationId);
        loadConversations();
      }
    }

    const userMessage = input;
    setInput('');
    setLoading(true);

    // Ajouter message utilisateur
    const newUserMsg: AIMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMsg]);

    if (conversationId) {
      await saveMessage(conversationId, 'user', userMessage);

      // Mettre à jour titre si premier message
      if (messages.length === 0) {
        await updateConversationTitle(conversationId, userMessage);
      }
    }

    try {
      // Vérifier si demande support humain
      const wantsHumanSupport = userMessage.toLowerCase().includes('humain') ||
                                userMessage.toLowerCase().includes('support') ||
                                userMessage.toLowerCase().includes('aide human') ||
                                userMessage.toLowerCase().includes('parler avec');

      if (wantsHumanSupport) {
        // Demander détails
        const detailsMsg: AIMessage = {
          role: 'assistant',
          content: `Je comprends que vous souhaitez parler avec notre équipe support.\n\n` +
                   `Pour vous aider au mieux, pouvez-vous me donner plus de détails sur votre demande ?\n\n` +
                   `📋 Décrivez précisément :\n` +
                   `• Le problème rencontré\n` +
                   `• Ce que vous avez déjà essayé\n` +
                   `• Le résultat attendu\n\n` +
                   `Une fois que vous aurez fourni ces informations, je transmettrai votre demande à notre équipe qui vous recontactera rapidement.`
        };
        setMessages(prev => [...prev, detailsMsg]);
        if (conversationId) {
          await saveMessage(conversationId, 'assistant', detailsMsg.content);
        }
        setLoading(false);
        return;
      }

      // Vérifier si c'est une réponse détaillée après demande support
      const lastMessages = messages.slice(-2);
      const askedForDetails = lastMessages.some(m =>
        m.role === 'assistant' && m.content.includes('décrivez précisément')
      );

      if (askedForDetails && userMessage.length > 50) {
        // Créer ticket support
        await createSupportTicket(userMessage, conversationId);

        const ticketMsg: AIMessage = {
          role: 'assistant',
          content: `✅ Parfait ! J'ai bien transmis votre demande à notre équipe support.\n\n` +
                   `📩 Votre ticket a été créé avec priorité MOYENNE.\n\n` +
                   `⏱️ Notre équipe vous répondra dans les plus brefs délais (généralement sous 2h pendant les heures ouvrables).\n\n` +
                   `En attendant, je reste disponible pour répondre à vos autres questions !`
        };
        setMessages(prev => [...prev, ticketMsg]);
        if (conversationId) {
          await saveMessage(conversationId, 'assistant', ticketMsg.content);
        }
        setLoading(false);
        return;
      }

      // Analyser l'intention
      const intent = await analyzeIntent(userMessage);

      // Exécuter action si nécessaire
      if (intent.intent !== 'question' && intent.confidence > 0.7) {
        await handleAction(intent);
      }

      // Obtenir réponse IA
      const response = await askXcrackzAssistant(userMessage, {}, messages);
      const assistantMsg: AIMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMsg]);

      if (conversationId) {
        await saveMessage(conversationId, 'assistant', response);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: AIMessage = {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const createSupportTicket = async (description: string, conversationId: string | null) => {
    if (!user) return;

    try {
      // Créer le titre depuis la description
      const title = description.slice(0, 100) + (description.length > 100 ? '...' : '');

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          title,
          description,
          conversation_id: conversationId,
          priority: 'medium',
          category: 'general',
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating support ticket:', error);
    }
  };

  const handleAction = async (intent: any) => {
    // Exécuter action basée sur l'intention
    if (intent.intent === 'create_mission') {
      setTimeout(() => {
        navigate('/missions/create', {
          state: intent.entities
        });
      }, 2000);
    } else if (intent.intent === 'generate_invoice') {
      setTimeout(() => {
        navigate('/billing');
      }, 2000);
    }
  };

  const quickActions = [
    { label: 'Créer une mission', prompt: 'Je veux créer une nouvelle mission de transport' },
    { label: 'Mes factures', prompt: 'Montre-moi mes factures en attente de paiement' },
    { label: 'Optimiser tournées', prompt: 'Comment optimiser mes tournées cette semaine ?' },
    { label: '👤 Parler à un humain', prompt: 'Je souhaite parler avec le support humain' },
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 z-50 group animate-bounce hover:animate-none"
      >
        <MessageCircle className="w-7 h-7 text-white" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full"></div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[450px] h-[650px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            xCrackz Agent
          </h3>
          <p className="text-xs opacity-90">Assistant IA xcrackz</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createNewConversation}
            className="p-2 hover:bg-white/20 rounded-lg transition"
            title="Nouvelle conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conversations list (sidebar) */}
      {conversations.length > 1 && (
        <div className="flex gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setCurrentConversationId(conv.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-2 transition ${
                conv.id === currentConversationId
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="max-w-[100px] truncate">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-blue-600" />
            </div>
            <p className="mb-4 font-semibold text-slate-700">Comment puis-je vous aider ?</p>
            <div className="space-y-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(action.prompt);
                  }}
                  className="block w-full text-left px-4 py-3 bg-white hover:bg-blue-50 rounded-xl text-xs border border-slate-200 hover:border-blue-300 transition shadow-sm hover:shadow"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-br-sm'
                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>En train de réfléchir...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Posez votre question..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-cyan-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Appuyez sur Entrée pour envoyer
        </p>
      </div>
    </div>
  );
}

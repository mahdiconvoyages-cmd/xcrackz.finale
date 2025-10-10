import { useEffect, useState, useRef } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  trip_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
    email: string;
  };
}

interface CarpoolingMessagingProps {
  tripId: string;
  otherUserId: string;
  otherUserName: string;
  onClose: () => void;
}

export default function CarpoolingMessaging({ tripId, otherUserId, otherUserName, onClose }: CarpoolingMessagingProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tripId, otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('carpooling_messages')
        .select(`
          *,
          sender:profiles!carpooling_messages_sender_id_fkey(full_name, email)
        `)
        .eq('trip_id', tripId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('carpooling_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('trip_id', tripId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!user) return;

    channelRef.current = supabase
      .channel(`carpooling_messages_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'carpooling_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            const { data: senderData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newMsg.sender_id)
              .single();

            setMessages((prev) => [...prev, { ...newMsg, sender: senderData }]);

            if (newMsg.receiver_id === user.id) {
              await supabase
                .from('carpooling_messages')
                .update({ is_read: true })
                .eq('id', newMsg.id);
            }
          }
        }
      )
      .subscribe();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('carpooling_messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: otherUserId,
            trip_id: tripId,
            message: newMessage.trim(),
          },
        ]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' +
             date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{otherUserName}</h3>
              <p className="text-sm text-slate-500">Messagerie sécurisée</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500">Aucun message pour le moment</p>
              <p className="text-sm text-slate-400 mt-2">Commencez la conversation !</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      isOwn
                        ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-br-sm'
                        : 'bg-white text-slate-900 rounded-bl-sm shadow-sm border border-slate-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                    <p
                      className={`text-xs mt-2 ${
                        isOwn ? 'text-white/70' : 'text-slate-400'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {newMessage.length}/500 caractères
          </p>
        </form>
      </div>
    </div>
  );
}

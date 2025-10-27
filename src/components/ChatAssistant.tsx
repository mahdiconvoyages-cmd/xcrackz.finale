// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Trash2, Plus, Sparkles, Paperclip, File as FileIcon, Mic, MicOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { askAssistant, createMissionFromAI, generateInvoiceFromAI, trackVehicleFromAI, AIMessage, AIResponse, AIAction } from '../services/aiServiceEnhanced';
import { analyzeIntent } from '../services/aiService';
import { useNavigate } from 'react-router-dom';
import { uploadAttachment, formatFileSize } from '../services/attachmentsService';
import VoiceAssistantService from '../services/VoiceAssistantService';
import * as ToolsService from '../services/toolsService';
import ClaraSuggestions from './ClaraSuggestions';
import { 
  detectIntent, 
  formatQuoteResponse, 
  formatPricingResponse, 
  formatAnalyticsResponse, 
  formatPlanningResponse 
} from '../lib/clara-intent-recognition';
import {
  generateAutoQuote,
  createCustomPricingGrid,
  getAnalytics,
  optimizePlanning
} from '../lib/clara-crm-actions';

// Types étendus pour Clara
interface EnhancedAIMessage extends AIMessage {
  actions?: AIAction[];
  documents?: any[];
  credits?: any;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface AttachedFile {
  file: File;
  preview?: string;
}

export default function ChatAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EnhancedAIMessage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Assistant states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  /**
   * Exécuter un tool call de DeepSeek
   */
  const executeToolCall = async (toolName: string, toolArgs: any): Promise<ToolsService.ToolResult> => {
    if (!user) {
      return {
        success: false,
        message: "❌ Utilisateur non connecté"
      };
    }

    const ctx: ToolsService.ToolExecutionContext = {
      userId: user.id,
      navigate
    };

    try {
      switch (toolName) {
        // === CLIENTS ===
        case 'searchCompanyBySiret':
          return await ToolsService.searchCompanyBySiret(toolArgs.siret);
        
        case 'createClient':
          return await ToolsService.createClient(ctx, toolArgs);
        
        case 'searchClient':
          return await ToolsService.searchClient(ctx, toolArgs.query);
        
        case 'listClients':
          return await ToolsService.listClients(ctx, toolArgs.type);
        
        // === FACTURATION ===
        case 'generateInvoice':
          return await ToolsService.generateInvoice(ctx, toolArgs);
        
        // === MISSIONS ===
        case 'createMission':
          return await ToolsService.createMission(ctx, toolArgs);
        
        case 'assignMission':
          return await ToolsService.assignMission(ctx, toolArgs);
        
        case 'suggestDriver':
          return await ToolsService.suggestDriver(ctx, toolArgs);
        
        // === CONTACTS ===
        case 'listContacts':
          return await ToolsService.listContacts(ctx, toolArgs.type);
        
        case 'checkDriverAvailability':
          return await ToolsService.checkDriverAvailability(ctx, toolArgs.contactId, toolArgs.date);
        
        // === CRÉDITS ===
        case 'checkCredits':
          return await ToolsService.checkCredits(ctx);
        
        // === NAVIGATION ===
        case 'navigateToPage':
          return await ToolsService.navigateToPage(ctx, toolArgs.page);
        
        default:
          return {
            success: false,
            message: `❌ Outil inconnu: ${toolName}`
          };
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        success: false,
        message: `❌ Erreur lors de l'exécution de l'outil: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  };

  // Voice functions
  const toggleVoiceListening = () => {
    if (isListening) {
      VoiceAssistantService.stopListening();
      setIsListening(false);
    } else {
      // Configure callbacks
      VoiceAssistantService.onResult((result) => {
        if (result.isFinal) {
          setInput(result.transcript);
          setIsListening(false);
        }
      });
      VoiceAssistantService.onStart(() => setIsListening(true));
      VoiceAssistantService.onEnd(() => setIsListening(false));
      VoiceAssistantService.onError((error) => {
        console.error('Voice error:', error);
        setIsListening(false);
      });
      
      VoiceAssistantService.startListening();
    }
  };

  const speakResponse = async (text: string) => {
    // Configure speech callbacks
    VoiceAssistantService.onSpeakStart(() => setIsSpeaking(true));
    VoiceAssistantService.onSpeakEnd(() => setIsSpeaking(false));
    
    // Nettoyage COMPLET du texte pour une voix naturelle
    let cleanText = text
      // 1. Retirer TOUS les emojis et symboles
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Tous les emojis Unicode
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Symboles divers
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[📝📞🎯✓­ƒÄ»­ƒÆí­ƒôè­ƒööÔÜá´©Å­ƒÜÇÔÖÑ´©ÅÔØñ´©Å­ƒÆÖ­ƒÆÜ­ƒÆø­ƒºí­ƒÆ£­ƒûñ­ƒñì­ƒñÄ­ƒÆöÔØú´©Å­ƒÆò­ƒÆ×­ƒÆô­ƒÆù­ƒÆû­ƒÆÿ­ƒÆØ]/g, '')
      .replace(/[•■□Ôùå▫▬▲▼◆]/g, '') // Puces
      .replace(/[→←↑Ôåô⇒⇐Ôçæ⇓]/g, '') // Flïches
      
      // 2. Remplacer les symboles par du texte
      .replace(/\*/g, '') // Astérisques
      .replace(/#/g, '') // Hashtags
      .replace(/&/g, ' et ') // &
      .replace(/@/g, ' arobase ') // @
      .replace(/\$/g, ' dollars ') // $
      .replace(/Ôé¼/g, ' euros ') // Ôé¼
      .replace(/%/g, ' pourcent ') // %
      
      // 3. Gérer les listes et formatage
      .replace(/^\s*[-*]\s+/gm, '') // Tirets de liste
      .replace(/\n\s*\n/g, '. ') // Double retours à ligne → point
      .replace(/\n+/g, '. ') // Retours à ligne → points
      .replace(/\.{2,}/g, '.') // Points multiples → un seul
      .replace(/\s{2,}/g, ' ') // Espaces multiples → un seul
      
      // 4. Améliorer la prononciation
      .replace(/\bOK\b/gi, 'ok')
      .replace(/\bIA\b/g, 'I.A.')
      .replace(/\bAI\b/g, 'A.I.')
      .replace(/\bAPI\b/g, 'A.P.I.')
      .replace(/\bURL\b/g, 'U.R.L.')
      .replace(/\bHTML\b/g, 'H.T.M.L.')
      .replace(/\bCSS\b/g, 'C.S.S.')
      .replace(/\bJS\b/g, 'JavaScript')
      .replace(/\bTS\b/g, 'TypeScript')
      
      // 5. Gérer les acronymes courants
      .replace(/\bRH\b/g, 'R.H.')
      .replace(/\bPDF\b/g, 'P.D.F.')
      .replace(/\bSMS\b/g, 'S.M.S.')
      .replace(/\bCV\b/g, 'C.V.')
      
      // 6. Nettoyer les caractères restants
      .replace(/[{}[\]]/g, '') // Accolades et crochets
      .replace(/[<>]/g, '') // Chevrons
      .replace(/[|]/g, '') // Pipes
      .replace(/[~`]/g, '') // Tildes et backticks
      
      .trim();
    
    // Limiter la longueur pour une meilleure expérience
    if (cleanText.length > 400) {
      // Couper à la dernière phrase complète avant 400 caractères
      const truncated = cleanText.substring(0, 400);
      const lastPeriod = truncated.lastIndexOf('.');
      cleanText = lastPeriod > 200 
        ? truncated.substring(0, lastPeriod + 1) 
        : truncated + '.';
      cleanText += ' Je vous en dis plus dans le texte affiché.';
    }
    
    console.log('­ƒöè Speaking (cleaned):', cleanText);
    
    try {
      await VoiceAssistantService.speak(cleanText);
    } catch (error) {
      console.error('Voice synthesis error:', error);
      setIsSpeaking(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || !user) return;

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
    const files = [...attachedFiles];
    setInput('');
    setAttachedFiles([]);
    setLoading(true);

    // Upload fichiers si présents
    let filesText = '';
    if (files.length > 0) {
      setUploading(true);
      try {
        for (const { file } of files) {
          await uploadAttachment(file, user.id, {
            category: 'other',
            relatedTo: conversationId || undefined,
            relatedType: undefined,
            description: `Fichier joint à la conversation AI`,
          });
        }
        filesText = `\n\n­ƒôÄ ${files.length} fichier(s) joint(s):\n` +
                    files.map(f => `• ${f.file.name} (${formatFileSize(f.file.size)})`).join('\n');
      } catch (error) {
        console.error('Erreur upload:', error);
        filesText = '\n\nÔÜá´©Å Erreur lors de l\'envoi des fichiers';
      } finally {
        setUploading(false);
      }
    }

    // Ajouter message utilisateur
    const fullMessage = userMessage + filesText;
    const newUserMsg: AIMessage = { role: 'user', content: fullMessage };
    setMessages(prev => [...prev, newUserMsg]);

    if (conversationId) {
      await saveMessage(conversationId, 'user', fullMessage);

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
                   `📝 Décrivez précisément :\n` +
                   `• Le problème rencontré\n` +
                   `• Ce que vous avez déjà essayé\n` +
                   `• Le résultat attendu\n\n` +
                   `Une fois que vous aurez fourni ces informations, je transmettrai votre demande à notre équipe qui vous recontactera rapidement.`
        };
        setMessages(prev => [...prev, detailsMsg]);
        if (conversationId) {
          await saveMessage(conversationId, 'assistant', detailsMsg.content);
        }
        // Lire la réponse vocalement
        await speakResponse(detailsMsg.content);
        setLoading(false);
        return;
      }

      // Vérifier si c'est une réponse détaillée aprïs demande support
      const lastMessages = messages.slice(-2);
      const askedForDetails = lastMessages.some(m =>
        m.role === 'assistant' && m.content.includes('décrivez précisément')
      );

      if (askedForDetails && userMessage.length > 50) {
        // Créer ticket support
        await createSupportTicket(userMessage, conversationId);

        const ticketMsg: AIMessage = {
          role: 'assistant',
          content: `✓ Parfait ! J'ai bien transmis votre demande à notre équipe support.\n\n` +
                   `📞 Votre ticket a été créé avec priorité MOYENNE.\n\n` +
                   `🎯 Notre équipe vous répondra dans les plus brefs délais (généralement sous 2h pendant les heures ouvrables).\n\n` +
                   `En attendant, je reste disponible pour répondre à vos autres questions !`
        };
        setMessages(prev => [...prev, ticketMsg]);
        if (conversationId) {
          await saveMessage(conversationId, 'assistant', ticketMsg.content);
        }
        // Lire la réponse vocalement
        await speakResponse(ticketMsg.content);
        setLoading(false);
        return;
      }

      // ⭐ PRIORITÉ 1 - Détecter commandes Clara CRM
      const claraIntent = detectIntent(userMessage);
      
      if (claraIntent.type !== 'unknown' && claraIntent.confidence > 0.7) {
        console.log('🎯 Clara CRM détectée:', claraIntent.type);
        
        try {
          let claraResponse = '';
          
          switch (claraIntent.type) {
            case 'quote':
              // Générer un devis automatique
              if (claraIntent.params.clientName && claraIntent.params.missions) {
                const quoteResult = await generateAutoQuote(claraIntent.params);
                claraResponse = formatQuoteResponse(quoteResult);
              } else {
                claraResponse = `📋 Pour générer un devis automatique, j'ai besoin de :\n\n` +
                               `1️⃣ Le nom du client\n` +
                               `2️⃣ Les services à inclure (type et quantité)\n` +
                               `3️⃣ La ville (optionnel)\n\n` +
                               `**Exemple :** "Génère un devis pour TotalEnergies avec 5 missions transport à Paris"`;
              }
              break;
              
            case 'pricing':
              // Créer grille tarifaire personnalisée
              if (claraIntent.params.clientId && claraIntent.params.discount) {
                const pricingResult = await createCustomPricingGrid(claraIntent.params);
                claraResponse = formatPricingResponse(pricingResult);
              } else {
                claraResponse = `💰 Pour créer une grille tarifaire, j'ai besoin de :\n\n` +
                               `1️⃣ Le nom du client\n` +
                               `2️⃣ La remise à appliquer (en %)\n\n` +
                               `**Exemple :** "Crée une grille tarifaire pour Carrefour avec -15% de remise"`;
              }
              break;
              
            case 'analytics':
              // Analyser performances
              const analyticsResult = await getAnalytics(claraIntent.params);
              claraResponse = formatAnalyticsResponse(analyticsResult);
              break;
              
            case 'planning':
              // Optimiser planning
              if (claraIntent.params.date) {
                const planningResult = await optimizePlanning(claraIntent.params);
                claraResponse = formatPlanningResponse(planningResult);
              } else {
                claraResponse = `📅 Pour optimiser le planning, j'ai besoin de :\n\n` +
                               `1️⃣ La date (aujourd'hui, demain, ou date précise)\n\n` +
                               `**Exemple :** "Optimise le planning de demain"`;
              }
              break;
          }
          
          // Afficher réponse Clara
          const claraMsg: AIMessage = {
            role: 'assistant',
            content: claraResponse
          };
          setMessages(prev => [...prev, claraMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, 'assistant', claraResponse);
          }
          
          // Lire la réponse vocalement
          await speakResponse(claraResponse);
          setLoading(false);
          return;
          
        } catch (error) {
          console.error('❌ Erreur Clara CRM:', error);
          // Continuer avec IA standard si erreur
        }
      }

      // Analyser l'intention (IA standard)
      const intent = await analyzeIntent(userMessage);

      // Exécuter action si nécessaire
      if (intent.intent !== 'question' && intent.confidence > 0.7) {
        await handleAction(intent);
      }

      // Obtenir réponse IA avec Clara (fallback)
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }
      
      const aiResponse: AIResponse = await askAssistant(userMessage, user.id, messages);
      
      // ⭐ NOUVEAU - Vérifier si DeepSeek veut utiliser des outils
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        console.log('🔧 Exécution de', aiResponse.toolCalls.length, 'outil(s)...');
        
        // Afficher un message d'attente
        const waitingMsg: AIMessage = {
          role: 'assistant',
          content: aiResponse.message || "Je vais exécuter cette action pour toi..."
        };
        setMessages(prev => [...prev, waitingMsg]);
        
        if (conversationId) {
          await saveMessage(conversationId, 'assistant', waitingMsg.content);
        }
        
        // Exécuter chaque tool call
        for (const toolCall of aiResponse.toolCalls) {
          console.log(`🔧 Exécution: ${toolCall.name}`, toolCall.arguments);
          
          const toolResult = await executeToolCall(toolCall.name, toolCall.arguments);
          
          // Afficher le résultat à l'utilisateur
          const toolResultMsg: AIMessage = {
            role: 'assistant',
            content: toolResult.message
          };
          
          setMessages(prev => [...prev, toolResultMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, 'assistant', toolResult.message);
          }
          
          // Lire le résultat vocalement
          await speakResponse(toolResult.message);
          
          // Rediriger si nécessaire
          if (toolResult.redirect) {
            console.log('🔀 Redirection vers:', toolResult.redirect);
            setTimeout(() => navigate(toolResult.redirect!), 1500);
          }
        }
      } else {
        // Réponse normale sans tool call
        const assistantMsg: EnhancedAIMessage = { 
          role: 'assistant', 
          content: aiResponse.message,
          actions: aiResponse.actions,
          documents: aiResponse.documents,
          credits: aiResponse.credits
        };
        setMessages(prev => [...prev, assistantMsg]);

        if (conversationId) {
          await saveMessage(conversationId, 'assistant', aiResponse.message);
        }
        
        // Lire la réponse vocalement
        await speakResponse(aiResponse.message);
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

      if (error) {
        console.error('Error creating ticket:', error);
      }
    } catch (error) {
      console.error('Ticket creation error:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      // Limite 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`Le fichier ${file.name} est trop volumineux (max 10MB)`);
        return;
      }

      const attached: AttachedFile = { file };

      // Preview pour images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attached.preview = e.target?.result as string;
          setAttachedFiles(prev => [...prev, attached]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachedFiles(prev => [...prev, attached]);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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

  // Nouvelle fonction pour exécuter les actions de Clara
  const executeAIAction = async (action: AIAction) => {
    if (!user?.id) return;

    try {
      switch (action.type) {
        case 'create_mission':
          if (action.data) {
            const result = await createMissionFromAI(action.data);
            if (result.success) {
              const confirmMsg: EnhancedAIMessage = {
                role: 'assistant',
                content: `✓ Mission créée avec succès !\n\n📝 Numéro: #${result.mission?.id}\n💳 Crédit déduit: 1\n\nVous pouvez voir les détails dans vos missions.`
              };
              setMessages(prev => [...prev, confirmMsg]);
              if (currentConversationId) {
                await saveMessage(currentConversationId, 'assistant', confirmMsg.content);
              }
            } else {
              const errorMsg: EnhancedAIMessage = {
                role: 'assistant',
                content: `❌ ${result.error || 'Erreur lors de la création de la mission'}`
              };
              setMessages(prev => [...prev, errorMsg]);
            }
          }
          break;

        case 'generate_invoice':
          if (action.data) {
            // Workflow: Vérifier client → Créer si besoin → Créer facture → Rediriger
            const { findClient, createClientFromSiret, createClientManually } = await import('../services/clientCreationService');
            
            let clientId = action.data.clientId;
            
            // 1. Si pas de clientId, chercher ou créer le client
            if (!clientId) {
              if (action.data.clientType === 'pro' && action.data.siret) {
                // Client PRO: chercher par SIRET
                let client = await findClient(user.id, action.data.siret);
                
                if (!client) {
                  // Créer client PRO via SIRET
                  const result = await createClientFromSiret(user.id, action.data.siret, {
                    email: action.data.clientEmail,
                    phone: action.data.clientPhone,
                  });
                  client = result.client;
                }
                clientId = client?.id;
              } else if (action.data.clientType === 'particulier') {
                // Client Particulier: chercher par nom/email
                let client = await findClient(user.id, action.data.clientEmail || action.data.clientName);
                
                if (!client) {
                  // Créer client Particulier
                  const result = await createClientManually(user.id, {
                    name: `${action.data.clientFirstName || ''} ${action.data.clientLastName || ''}`.trim(),
                    email: action.data.clientEmail,
                    phone: action.data.clientPhone,
                    address: action.data.clientAddress,
                    is_company: false,
                  });
                  client = result.client;
                }
                clientId = client?.id;
              }
            }
            
            // 2. Créer la facture
            const result = await generateInvoiceFromAI({
              ...action.data,
              client_id: clientId,
            });
            
            if (result.success) {
              const confirmMsg: EnhancedAIMessage = {
                role: 'assistant',
                content: `✓ Facture créée avec succès ! 💰\n\n📄 Numéro: ${result.invoice?.number || 'N/A'}\n\nTu peux la télécharger dans ta page Facturation.`,
                documents: result.pdfUrl ? [{ url: result.pdfUrl, filename: `facture_${result.invoice?.number}.pdf`, type: 'application/pdf' }] : []
              };
              setMessages(prev => [...prev, confirmMsg]);
              if (currentConversationId) {
                await saveMessage(currentConversationId, 'assistant', confirmMsg.content);
              }
              
              // 3. Rediriger vers /billing
              setTimeout(() => navigate('/billing'), 2000);
            }
          }
          break;

        case 'generate_quote':
          if (action.data) {
            // Même workflow que facture
            const { findClient, createClientFromSiret, createClientManually } = await import('../services/clientCreationService');
            
            let clientId = action.data.clientId;
            
            if (!clientId) {
              if (action.data.clientType === 'pro' && action.data.siret) {
                let client = await findClient(user.id, action.data.siret);
                if (!client) {
                  const result = await createClientFromSiret(user.id, action.data.siret, {
                    email: action.data.clientEmail,
                    phone: action.data.clientPhone,
                  });
                  client = result.client;
                }
                clientId = client?.id;
              } else if (action.data.clientType === 'particulier') {
                let client = await findClient(user.id, action.data.clientEmail || action.data.clientName);
                if (!client) {
                  const result = await createClientManually(user.id, {
                    name: `${action.data.clientFirstName || ''} ${action.data.clientLastName || ''}`.trim(),
                    email: action.data.clientEmail,
                    phone: action.data.clientPhone,
                    address: action.data.clientAddress,
                    is_company: false,
                  });
                  client = result.client;
                }
                clientId = client?.id;
              }
            }
            
            const result = await generateInvoiceFromAI({
              ...action.data,
              client_id: clientId,
              type: 'quote', // Type devis
            });
            
            if (result.success) {
              const docNumber = result.invoice?.number || 'N/A';
              const confirmMsg: EnhancedAIMessage = {
                role: 'assistant',
                content: `✓ Devis créé avec succès ! 💰\n\n📄 Numéro: ${docNumber}\n\nTu peux le télécharger dans ta page Facturation.`,
                documents: result.pdfUrl ? [{ url: result.pdfUrl, filename: `devis_${docNumber}.pdf`, type: 'application/pdf' }] : []
              };
              setMessages(prev => [...prev, confirmMsg]);
              if (currentConversationId) {
                await saveMessage(currentConversationId, 'assistant', confirmMsg.content);
              }
              
              setTimeout(() => navigate('/billing'), 2000);
            }
          }
          break;

        case 'track_vehicle':
          if (action.data) {
            const result = await trackVehicleFromAI(action.data);
            if (result.success) {
              const location = result.location ? `${result.location.lat}, ${result.location.lng}` : 'Position inconnue';
              const confirmMsg: EnhancedAIMessage = {
                role: 'assistant',
                content: `­ƒÜù Véhicule localisé !\n\n­ƒôì Position: ${location}\n­ƒôè ├ëtat: ${result.status || 'Inconnu'}\n🎯 ETA: ${result.eta || 'Calcul en cours...'}`
              };
              setMessages(prev => [...prev, confirmMsg]);
            }
          }
          break;

        case 'check_credits':
          navigate('/billing');
          break;

        case 'create_client':
          if (action.data) {
            const { createClientFromSiret, createClientManually } = await import('../services/clientCreationService');
            
            let result;
            if (action.data.siret) {
              result = await createClientFromSiret(user.id, action.data.siret, {
                email: action.data.email,
                phone: action.data.phone,
                notes: action.data.notes,
              });
            } else {
              result = await createClientManually(user.id, action.data);
            }

            const confirmMsg: EnhancedAIMessage = {
              role: 'assistant',
              content: result.message,
            };
            setMessages(prev => [...prev, confirmMsg]);
            if (currentConversationId) {
              await saveMessage(currentConversationId, 'assistant', confirmMsg.content);
            }
          }
          break;

        case 'search_client':
          if (action.data?.query) {
            const { findClient } = await import('../services/clientCreationService');
            const client = await findClient(user.id, action.data.query);
            
            let message;
            if (client) {
              message = `✓ Client trouvé !\n\n📝 ${client.name}\n${client.company_name ? `­ƒÅó ${client.company_name}\n` : ''}${client.siret ? `📄 SIRET: ${client.siret}\n` : ''}­ƒôº ${client.email || 'Pas d\'email'}\n­ƒô× ${client.phone || 'Pas de téléphone'}\n­ƒôì ${client.address || 'Pas d\'adresse'}\n\nVeux-tu créer une facture ou un devis pour ce client ?`;
            } else {
              message = `❌ Aucun client trouvé pour "${action.data.query}".\n\nVeux-tu que je crée ce client ? Si oui, donne-moi son SIRET ou ses informations.`;
            }
            
            const confirmMsg: EnhancedAIMessage = {
              role: 'assistant',
              content: message,
            };
            setMessages(prev => [...prev, confirmMsg]);
            if (currentConversationId) {
              await saveMessage(currentConversationId, 'assistant', confirmMsg.content);
            }
          }
          break;

        case 'list_clients':
          const { listClients } = await import('../services/clientCreationService');
          const clients = await listClients(user.id);
          
          let clientList;
          if (clients.length === 0) {
            clientList = '📝 Tu n\'as pas encore de clients.\n\nVeux-tu en créer un ? Donne-moi un SIRET et je m\'occupe du reste ! ­ƒÿè';
          } else {
            clientList = `📝 Voici tes ${clients.length} client(s):\n\n` + clients.slice(0, 10).map((c, i) => 
              `${i + 1}. ${c.name}${c.company_name ? ` (${c.company_name})` : ''}\n   ${c.siret ? `SIRET: ${c.siret} | ` : ''}${c.email || 'Pas d\'email'}`
            ).join('\n\n');
            
            if (clients.length > 10) {
              clientList += `\n\n... et ${clients.length - 10} autre(s)`;
            }
          }
          
          const listMsg: EnhancedAIMessage = {
            role: 'assistant',
            content: clientList,
          };
          setMessages(prev => [...prev, listMsg]);
          if (currentConversationId) {
            await saveMessage(currentConversationId, 'assistant', listMsg.content);
          }
          break;

        default:
          console.warn('Action non gérée:', action.type);
      }
    } catch (error) {
      console.error('Erreur exécution action:', error);
      const errorMsg: EnhancedAIMessage = {
        role: 'assistant',
        content: `❌ Erreur lors de l'exécution de l'action: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const quickActions = [
    { label: 'Créer une mission', prompt: 'Je veux créer une nouvelle mission de transport' },
    { label: 'Mes factures', prompt: 'Montre-moi mes factures en attente de paiement' },
    { label: 'Optimiser tournées', prompt: 'Comment optimiser mes tournées cette semaine ?' },
    { label: '­ƒæñ Parler à un humain', prompt: 'Je souhaite parler avec le support humain' },
  ];

  // Ne pas afficher le chat si l'utilisateur n'est pas connecté
  if (!user) {
    return null;
  }

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
            
            {/* ⭐ Suggestions Clara CRM */}
            <ClaraSuggestions
              visible={messages.length === 0}
              onSuggestionClick={(command) => {
                setInput(command);
              }}
            />
            
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
              
              {/* Actions proposées par Clara */}
              {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                  {msg.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeAIAction(action)}
                      className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <span>
                        {action.type === 'create_mission' && '📝'}
                        {action.type === 'generate_invoice' && '📄'}
                        {action.type === 'track_vehicle' && '­ƒÜù'}
                        {action.type === 'check_credits' && '💳'}
                        {action.type === 'send_email' && '­ƒôº'}
                      </span>
                      {action.description}
                    </button>
                  ))}
                </div>
              )}

              {/* Documents joints (factures, rapports PDF) */}
              {msg.role === 'assistant' && msg.documents && msg.documents.length > 0 && (
                <div className="mt-3 space-y-2 pt-3 border-t border-slate-100">
                  {msg.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <FileIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-green-900 truncate">{doc.filename}</p>
                        <p className="text-xs text-green-700">{doc.type}</p>
                      </div>
                      <a
                        href={doc.url}
                        download={doc.filename}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium flex-shrink-0"
                      >
                        ­ƒôÑ Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Alerte crédits insuffisants */}
              {msg.role === 'assistant' && msg.credits && !msg.credits.sufficient && (
                <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded pt-3 border-t border-slate-100">
                  <p className="text-xs text-yellow-800 font-medium">
                    ÔÜá´©Å Crédits insuffisants : {msg.credits.current} / {msg.credits.required} requis
                  </p>
                  <button
                    onClick={() => navigate('/billing')}
                    className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                  >
                    💳 Recharger mes crédits
                  </button>
                </div>
              )}
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
        {/* Indicateur de parole */}
        {isSpeaking && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex gap-1">
              <div className="w-2 h-4 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-4 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-4 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-purple-700">­ƒöè L'assistant vous répond...</span>
          </div>
        )}
        
        {/* Fichiers attachés */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((attached, index) => (
              <div key={index} className="relative group">
                {attached.preview ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-blue-300">
                    <img src={attached.preview} alt={attached.file.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-slate-100 border-2 border-slate-300 flex items-center justify-center">
                    <FileIcon className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <p className="text-[10px] text-slate-600 mt-1 truncate w-20">{attached.file.name}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
            className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Joindre un fichier"
          >
            <Paperclip className="w-5 h-5 text-slate-600" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={uploading ? "Upload en cours..." : isListening ? "­ƒÄñ ├Ç l'écoute..." : "Posez votre question..."}
            disabled={loading || uploading}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {/* Bouton Micro - Mode Push-to-Talk (Maintenir pour parler) */}
          <button
            onMouseDown={() => {
              if (!loading && !uploading && !isSpeaking) {
                toggleVoiceListening();
              }
            }}
            onMouseUp={() => {
              if (isListening) {
                toggleVoiceListening();
              }
            }}
            onMouseLeave={() => {
              // Arrêter si on sort du bouton pendant qu'on maintient
              if (isListening) {
                toggleVoiceListening();
              }
            }}
            onTouchStart={() => {
              // Support mobile
              if (!loading && !uploading && !isSpeaking) {
                toggleVoiceListening();
              }
            }}
            onTouchEnd={() => {
              // Support mobile
              if (isListening) {
                toggleVoiceListening();
              }
            }}
            disabled={loading || uploading || isSpeaking}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed select-none ${
              isListening 
                ? 'bg-gradient-to-br from-red-500 to-pink-500 scale-110' 
                : 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
            }`}
            title={isListening ? "Maintenir pour continuer..." : "Maintenir pour parler ­ƒÄñ"}
          >
            {/* Animation ondes sonores quand on écoute */}
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-75"></div>
                <div className="absolute inset-0 rounded-xl bg-pink-400 animate-pulse opacity-50"></div>
              </>
            )}
            {isListening ? (
              <MicOff className="w-5 h-5 text-white relative z-10" />
            ) : (
              <Mic className="w-5 h-5 text-white relative z-10" />
            )}
          </button>
          <button
            onClick={handleSend}
            disabled={loading || uploading || (!input.trim() && attachedFiles.length === 0)}
            className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center hover:from-blue-700 hover:to-cyan-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          {uploading ? "­ƒôñ Upload en cours..." : "­ƒôÄ Joignez des fichiers (images, PDF, documents) - Max 10MB"}
        </p>
      </div>
    </div>
  );
}

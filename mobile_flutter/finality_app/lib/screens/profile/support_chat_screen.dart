import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../theme/premium_theme.dart';

class SupportChatScreen extends StatefulWidget {
  const SupportChatScreen({super.key});

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final _supabase = Supabase.instance.client;
  final _messageController = TextEditingController();
  final _subjectController = TextEditingController();
  final _scrollController = ScrollController();

  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _messages = [];
  Map<String, dynamic>? _currentConversation;
  bool _isLoading = true;
  bool _showNewForm = false;
  String _category = 'other';
  RealtimeChannel? _channel;

  String get _userId => _supabase.auth.currentUser?.id ?? '';

  @override
  void initState() {
    super.initState();
    _loadConversations();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    _messageController.dispose();
    _subjectController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _subscribeRealtime() {
    if (_userId.isEmpty) return;
    _channel = _supabase
        .channel('support_chat_$_userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'support_messages',
          callback: (payload) {
            final newMsg = payload.newRecord;
            if (_currentConversation != null &&
                newMsg['conversation_id'] == _currentConversation!['id']) {
              if (mounted) {
                setState(() => _messages.add(newMsg));
                _scrollToBottom();
              }
            }
          },
        )
        .subscribe();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _loadConversations() async {
    if (_userId.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      final data = await _supabase
          .from('support_conversations')
          .select('id, subject, status, category, priority, last_message_at, created_at')
          .eq('user_id', _userId)
          .order('last_message_at', ascending: false);

      if (mounted) {
        setState(() {
          _conversations = List<Map<String, dynamic>>.from(data as List);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      debugPrint('Error loading conversations: $e');
    }
  }

  Future<void> _loadMessages(String conversationId) async {
    try {
      final data = await _supabase
          .from('support_messages')
          .select('id, message, sender_type, sender_id, is_automated, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', ascending: true);

      if (mounted) {
        setState(() => _messages = List<Map<String, dynamic>>.from(data as List));
        _scrollToBottom();
      }
    } catch (e) {
      debugPrint('Error loading messages: $e');
    }
  }

  Future<void> _createConversation() async {
    final subject = _subjectController.text.trim();
    final message = _messageController.text.trim();
    if (subject.isEmpty || message.isEmpty) return;

    try {
      final convData = await _supabase
          .from('support_conversations')
          .insert({
            'user_id': _userId,
            'subject': subject,
            'category': _category,
            'priority': 'medium',
            'status': 'open',
          })
          .select()
          .single();

      // Send initial message
      await _supabase.from('support_messages').insert({
        'conversation_id': convData['id'],
        'sender_id': _userId,
        'sender_type': 'user',
        'message': message,
      });

      // Auto welcome
      await _supabase.from('support_messages').insert({
        'conversation_id': convData['id'],
        'sender_id': _userId,
        'sender_type': 'bot',
        'is_automated': true,
        'message':
            'Merci pour votre message ! 👋\n\nUn membre de notre équipe va vous répondre très rapidement.',
      });

      await _supabase
          .from('support_conversations')
          .update({'last_message_at': DateTime.now().toUtc().toIso8601String()})
          .eq('id', convData['id']);

      _subjectController.clear();
      _messageController.clear();
      setState(() {
        _showNewForm = false;
        _currentConversation = convData;
      });
      _loadMessages(convData['id']);
      _loadConversations();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: PremiumTheme.accentRed,
          ),
        );
      }
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _currentConversation == null) return;

    _messageController.clear();

    try {
      await _supabase.from('support_messages').insert({
        'conversation_id': _currentConversation!['id'],
        'sender_id': _userId,
        'sender_type': 'user',
        'message': text,
      });

      await _supabase
          .from('support_conversations')
          .update({'last_message_at': DateTime.now().toUtc().toIso8601String()})
          .eq('id', _currentConversation!['id']);
    } catch (e) {
      debugPrint('Error sending message: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: PremiumTheme.textPrimary),
          onPressed: () {
            if (_currentConversation != null) {
              setState(() {
                _currentConversation = null;
                _messages = [];
              });
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Text(
          _currentConversation != null
              ? _currentConversation!['subject'] ?? 'Conversation'
              : 'Support',
          style: PremiumTheme.heading4.copyWith(fontSize: 18),
        ),
        actions: [
          if (_currentConversation == null)
            IconButton(
              icon: const Icon(Icons.add_comment_rounded, color: PremiumTheme.primaryBlue),
              onPressed: () => setState(() => _showNewForm = true),
            ),
        ],
      ),
      body: _currentConversation != null
          ? _buildChat()
          : _showNewForm
              ? _buildNewConversationForm()
              : _buildConversationList(),
    );
  }

  // ── Conversation list ─────────────────────────
  Widget _buildConversationList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_conversations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: PremiumTheme.primaryBlue.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.support_agent_rounded,
                  size: 48, color: PremiumTheme.primaryBlue),
            ),
            const SizedBox(height: 16),
            Text('Aucune conversation',
                style: PremiumTheme.heading4.copyWith(color: PremiumTheme.textSecondary)),
            const SizedBox(height: 8),
            Text('Créez une conversation pour contacter le support',
                style: PremiumTheme.bodySmall.copyWith(color: PremiumTheme.textTertiary)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => setState(() => _showNewForm = true),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Nouveau message'),
              style: ElevatedButton.styleFrom(
                backgroundColor: PremiumTheme.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadConversations,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _conversations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final conv = _conversations[i];
          final status = conv['status'] ?? 'open';
          final isOpen = status == 'open';
          return Card(
            color: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CircleAvatar(
                backgroundColor: isOpen
                    ? PremiumTheme.primaryBlue.withValues(alpha: 0.1)
                    : Colors.grey.shade100,
                child: Icon(
                  isOpen ? Icons.chat_bubble_rounded : Icons.check_circle_rounded,
                  color: isOpen ? PremiumTheme.primaryBlue : PremiumTheme.accentGreen,
                  size: 20,
                ),
              ),
              title: Text(
                conv['subject'] ?? 'Sans objet',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              subtitle: Text(
                _formatDate(conv['last_message_at'] ?? conv['created_at']),
                style: const TextStyle(fontSize: 12, color: PremiumTheme.textTertiary),
              ),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isOpen
                      ? PremiumTheme.accentGreen.withValues(alpha: 0.1)
                      : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isOpen ? 'Ouvert' : 'Fermé',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isOpen ? PremiumTheme.accentGreen : PremiumTheme.textTertiary,
                  ),
                ),
              ),
              onTap: () {
                setState(() => _currentConversation = conv);
                _loadMessages(conv['id']);
              },
            ),
          );
        },
      ),
    );
  }

  // ── New conversation form ─────────────────────
  Widget _buildNewConversationForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Sujet', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextField(
            controller: _subjectController,
            decoration: InputDecoration(
              hintText: 'Ex: Question sur les crédits',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Catégorie', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _categoryChip('technique', 'Technique'),
              _categoryChip('billing', 'Facturation'),
              _categoryChip('bug', 'Bug'),
              _categoryChip('other', 'Autre'),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Message', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextField(
            controller: _messageController,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: 'Décrivez votre problème ou question...',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _createConversation,
              style: ElevatedButton.styleFrom(
                backgroundColor: PremiumTheme.primaryBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Envoyer', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _categoryChip(String value, String label) {
    final selected = _category == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _category = value),
      selectedColor: PremiumTheme.primaryBlue.withValues(alpha: 0.15),
      labelStyle: TextStyle(
        color: selected ? PremiumTheme.primaryBlue : PremiumTheme.textSecondary,
        fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
      ),
    );
  }

  // ── Chat view ─────────────────────────────────
  Widget _buildChat() {
    return Column(
      children: [
        Expanded(
          child: _messages.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (_, i) => _buildMessageBubble(_messages[i]),
                ),
        ),
        _buildInputBar(),
      ],
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg) {
    final isUser = msg['sender_type'] == 'user';
    final isBot = msg['sender_type'] == 'bot';

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isUser
              ? PremiumTheme.primaryBlue
              : isBot
                  ? Colors.grey.shade100
                  : const Color(0xFFE8F5E9),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isUser)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  isBot ? '🤖 Bot' : '👤 Support',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isBot ? PremiumTheme.textTertiary : PremiumTheme.accentGreen,
                  ),
                ),
              ),
            Text(
              msg['message'] ?? '',
              style: TextStyle(
                color: isUser ? Colors.white : PremiumTheme.textPrimary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(msg['created_at']),
              style: TextStyle(
                fontSize: 10,
                color: isUser
                    ? Colors.white.withValues(alpha: 0.7)
                    : PremiumTheme.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2)),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                decoration: InputDecoration(
                  hintText: 'Votre message...',
                  hintStyle: const TextStyle(color: PremiumTheme.textTertiary),
                  filled: true,
                  fillColor: PremiumTheme.lightBg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: const BoxDecoration(
                gradient: PremiumTheme.primaryGradient,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                onPressed: _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (_) {
      return dateStr;
    }
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return DateFormat('HH:mm').format(date);
    } catch (_) {
      return '';
    }
  }
}

// MatchChatSheet — chat entre conducteur et passager pour un match de lift

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _kTeal   = Color(0xFF0D9488);
const _kTealBg = Color(0xFFE6FFFA);
const _kDark   = Color(0xFF0F172A);
const _kGray   = Color(0xFF64748B);
const _kBorder = Color(0xFFE2E8F0);

class MatchChatSheet extends StatefulWidget {
  final Map<String, dynamic> match;
  final String myUid;

  const MatchChatSheet({super.key, required this.match, required this.myUid});

  @override
  State<MatchChatSheet> createState() => _MatchChatSheetState();
}

class _MatchChatSheetState extends State<MatchChatSheet> {
  final _sb     = Supabase.instance.client;
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  List<Map<String, dynamic>> _messages = [];
  bool _sending = false;
  bool _loadingMessages = true;
  RealtimeChannel? _channel;

  String get _matchId => widget.match['id'] as String? ?? '';

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeMessages();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    if (_matchId.isEmpty) return;
    setState(() => _loadingMessages = true);
    try {
      final res = await _sb.from('ride_messages')
          .select('*')
          .eq('match_id', _matchId)
          .order('created_at');
      if (!mounted) return;
      setState(() {
        _messages = List<Map<String, dynamic>>.from(res);
        _loadingMessages = false;
      });
      _scrollToBottom();
      // Marquer les messages reçus comme lus
      _markMessagesAsRead();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMessages = false);
      debugPrint('Erreur chargement messages: $e');
    }
  }

  void _subscribeMessages() {
    _channel = _sb.channel('chat_$_matchId')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'ride_messages',
        filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'match_id', value: _matchId),
        callback: (payload) {
          if (!mounted) return;
          final newMsg = payload.newRecord;
          // Éviter les doublons (le message envoyé par moi peut arriver aussi via realtime)
          final newId = newMsg['id'] as String?;
          if (newId != null && _messages.any((m) => m['id'] == newId)) return;
          setState(() => _messages.add(Map<String, dynamic>.from(newMsg)));
          _scrollToBottom();
          // Marquer comme lu si c'est un message reçu
          if (newMsg['sender_id'] != widget.myUid) {
            _markSingleMessageAsRead(newId);
          }
        },
      )
      ..onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'ride_messages',
        filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'match_id', value: _matchId),
        callback: (payload) {
          if (!mounted) return;
          final updated = payload.newRecord;
          final updatedId = updated['id'] as String?;
          if (updatedId == null) return;
          setState(() {
            final idx = _messages.indexWhere((m) => m['id'] == updatedId);
            if (idx != -1) {
              _messages[idx] = Map<String, dynamic>.from(updated);
            }
          });
        },
      )
      ..subscribe();
  }

  /// Marque tous les messages reçus (non lus) comme lus
  Future<void> _markMessagesAsRead() async {
    try {
      final unreadIds = _messages
          .where((m) => m['sender_id'] != widget.myUid && m['is_read'] != true)
          .map((m) => m['id'] as String)
          .toList();
      if (unreadIds.isEmpty) return;
      await _sb.from('ride_messages')
          .update({'is_read': true})
          .inFilter('id', unreadIds);
      // Mettre à jour localement aussi
      if (!mounted) return;
      setState(() {
        for (var i = 0; i < _messages.length; i++) {
          if (unreadIds.contains(_messages[i]['id'])) {
            _messages[i] = {..._messages[i], 'is_read': true};
          }
        }
      });
    } catch (_) {}
  }

  /// Marque un message comme lu
  Future<void> _markSingleMessageAsRead(String? messageId) async {
    if (messageId == null) return;
    try {
      await _sb.from('ride_messages')
          .update({'is_read': true})
          .eq('id', messageId);
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _msgCtrl.clear();
    try {
      // Ajouter en local immédiatement (optimistic UI)
      final tempMsg = {
        'id': 'temp_${DateTime.now().millisecondsSinceEpoch}',
        'match_id': _matchId,
        'sender_id': widget.myUid,
        'content': text,
        'is_read': false,
        'created_at': DateTime.now().toUtc().toIso8601String(),
        '_pending': true,
      };
      setState(() => _messages.add(tempMsg));
      _scrollToBottom();

      final res = await _sb.from('ride_messages').insert({
        'match_id':  _matchId,
        'sender_id': widget.myUid,
        'content':   text,
      }).select().single();

      // Remplacer le message temporaire par le vrai
      if (mounted) {
        setState(() {
          final idx = _messages.indexWhere((m) => m['id'] == tempMsg['id']);
          if (idx != -1) {
            _messages[idx] = Map<String, dynamic>.from(res);
          }
        });
      }

      // Envoyer notification push au partenaire
      try {
        final driverId = widget.match['driver_id'] as String?;
        final passengerId = widget.match['passenger_id'] as String?;
        final partnerId = widget.myUid == driverId ? passengerId : driverId;
        if (partnerId != null && partnerId.isNotEmpty) {
          await _sb.functions.invoke('send-notification', body: {
            'userId': partnerId,
            'type': 'chat_message',
            'title': '💬 Message Entraide',
            'message': text.length > 80 ? '${text.substring(0, 80)}…' : text,
            'data': {'type': 'chat_message', 'match_id': _matchId},
          });
        }
      } catch (_) {}
    } catch (e) {
      // Retirer le message temporaire en cas d'erreur
      if (mounted) {
        setState(() {
          _messages.removeWhere((m) => m['_pending'] == true);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur envoi: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final offer  = (widget.match['ride_offers']   as Map?) ?? {};
    final origin = offer['origin_city']      as String? ?? '—';
    final dest   = offer['destination_city'] as String? ?? '—';
    final isDriver = widget.match['driver_id'] == widget.myUid;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final navPad = MediaQuery.of(context).padding.bottom;

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
      padding: EdgeInsets.only(bottom: bottom > 0 ? bottom : navPad),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Center(child: Container(
              width: 36, height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            )),
          ),
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: _kBorder)),
            ),
            child: Row(children: [
              const Icon(Icons.chat_bubble_outline, color: _kTeal),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$origin → $dest',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15, color: _kDark)),
                    Text(
                      isDriver ? 'Tu conduis ce passager' : 'Le conducteur te répond',
                      style: const TextStyle(fontSize: 12, color: _kGray),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: _kGray),
              ),
            ]),
          ),
          // Messages
          Expanded(
            child: _loadingMessages
                ? const Center(child: CircularProgressIndicator(color: _kTeal))
                : _messages.isEmpty
                    ? const Center(
                        child: Text('Dites bonjour ! 👋',
                            style: TextStyle(color: _kGray, fontSize: 15)))
                    : ListView.builder(
                        controller: _scrollCtrl,
                        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                        padding: const EdgeInsets.all(12),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) => _MessageBubble(
                          message: _messages[i],
                          isMe: _messages[i]['sender_id'] == widget.myUid,
                          isLast: i == _messages.length - 1,
                          isPending: _messages[i]['_pending'] == true,
                        ),
                      ),
          ),
          // Input
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: _kBorder)),
            ),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _msgCtrl,
                  maxLines: 3,
                  minLines: 1,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    hintText: 'Écris un message…',
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: const BorderSide(color: _kBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: const BorderSide(color: _kBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: const BorderSide(color: _kTeal),
                    ),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _sendMessage,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(
                    color: _kTeal,
                    shape: BoxShape.circle,
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Map<String, dynamic> message;
  final bool isMe;
  final bool isLast;
  final bool isPending;

  const _MessageBubble({
    required this.message,
    required this.isMe,
    this.isLast = false,
    this.isPending = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = message['content'] as String? ?? '';
    final createdAt = message['created_at'] as String?;
    final isRead = message['is_read'] == true;
    String time = '';
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt).toLocal();
        time = DateFormat('HH:mm').format(dt);
      } catch (_) {}
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: _kTealBg,
              child: const Icon(Icons.person, size: 14, color: _kTeal),
            ),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Opacity(
              opacity: isPending ? 0.6 : 1.0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isMe ? _kTeal : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(isMe ? 16 : 4),
                    bottomRight: Radius.circular(isMe ? 4 : 16),
                  ),
                ),
                child: Column(
                  crossAxisAlignment:
                      isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    Text(content,
                        style: TextStyle(
                            color: isMe ? Colors.white : _kDark, fontSize: 14)),
                    if (time.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(time,
                              style: TextStyle(
                                  fontSize: 10,
                                  color: isMe ? Colors.white60 : _kGray)),
                          // Indicateur Vu / Envoyé pour mes messages
                          if (isMe) ...[
                            const SizedBox(width: 4),
                            Icon(
                              isPending
                                  ? Icons.access_time
                                  : isRead
                                      ? Icons.done_all
                                      : Icons.done,
                              size: 13,
                              color: isPending
                                  ? Colors.white38
                                  : isRead
                                      ? const Color(0xFF60E0FF)
                                      : Colors.white60,
                            ),
                          ],
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          if (isMe) const SizedBox(width: 6),
        ],
      ),
    );
  }
}

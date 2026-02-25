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
    final res = await _sb.from('ride_messages')
        .select('*')
        .eq('match_id', _matchId)
        .order('created_at');
    if (!mounted) return;
    setState(() => _messages = List<Map<String, dynamic>>.from(res));
    _scrollToBottom();
  }

  void _subscribeMessages() {
    _channel = _sb.channel('chat_$_matchId')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'ride_messages',
        filter: PostgresChangeFilter(type: FilterType.eq, column: 'match_id', value: _matchId),
        callback: (payload) {
          if (!mounted) return;
          final newMsg = payload.newRecord;
          setState(() => _messages.add(Map<String, dynamic>.from(newMsg)));
          _scrollToBottom();
        },
      )
      ..subscribe();
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
      await _sb.from('ride_messages').insert({
        'match_id':  _matchId,
        'sender_id': widget.myUid,
        'content':   text,
      });
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

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
      padding: EdgeInsets.only(bottom: bottom),
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
            child: _messages.isEmpty
                ? const Center(
                    child: Text('Dites bonjour ! 👋',
                        style: TextStyle(color: _kGray, fontSize: 15)))
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _MessageBubble(
                      message: _messages[i],
                      isMe: _messages[i]['sender_id'] == widget.myUid,
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

  const _MessageBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final content = message['content'] as String? ?? '';
    final createdAt = message['created_at'] as String?;
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
                    Text(time,
                        style: TextStyle(
                            fontSize: 10,
                            color: isMe ? Colors.white60 : _kGray)),
                  ],
                ],
              ),
            ),
          ),
          if (isMe) const SizedBox(width: 6),
        ],
      ),
    );
  }
}

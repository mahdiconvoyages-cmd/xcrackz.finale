import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/premium_theme.dart';

/// Écran d'historique des notifications
class NotificationHistoryScreen extends StatefulWidget {
  const NotificationHistoryScreen({super.key});

  @override
  State<NotificationHistoryScreen> createState() =>
      _NotificationHistoryScreenState();
}

class _NotificationHistoryScreenState extends State<NotificationHistoryScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _notifications = [];
  String _filter = 'all'; // all, missions, invoices, system

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    final List<Map<String, dynamic>> allNotifs = [];

    // Run all 3 queries in parallel, each with its own error handling.
    await Future.wait([
      _loadMissionNotifications(userId, allNotifs),
      _loadInvoiceNotifications(userId, allNotifs),
      _loadInspectionNotifications(userId, allNotifs),
    ]);

    // Sort all by date descending
    allNotifs.sort((a, b) {
      final dateA = DateTime.tryParse(a['date']?.toString() ?? '') ?? DateTime(2000);
      final dateB = DateTime.tryParse(b['date']?.toString() ?? '') ?? DateTime(2000);
      return dateB.compareTo(dateA);
    });

    if (mounted) {
      setState(() {
        _notifications = allNotifs;
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMissionNotifications(String userId, List<Map<String, dynamic>> out) async {
    try {
      final missions = await Supabase.instance.client
          .from('missions')
          .select('id, title, reference, status, created_at, updated_at, pickup_city, delivery_city')
          .or('user_id.eq.$userId,assigned_user_id.eq.$userId')
          .order('updated_at', ascending: false)
          .limit(30);

      for (final m in (missions as List)) {
        final status = (m['status'] ?? '').toString();
        final (message, icon, color) = switch (status) {
          'completed' => ('Mission terminée', Icons.check_circle, PremiumTheme.accentGreen),
          'in_progress' => ('Mission en cours', Icons.local_shipping, PremiumTheme.primaryBlue),
          'cancelled' => ('Mission annulée', Icons.cancel, Colors.red as Color),
          _ => ('Nouvelle mission', Icons.assignment, PremiumTheme.primaryPurple),
        };

        final title = m['title'] ?? m['reference'] ??
            '${m['pickup_city'] ?? '?'} → ${m['delivery_city'] ?? '?'}';

        out.add({
          'type': 'mission', 'title': message, 'subtitle': title,
          'icon': icon, 'color': color,
          'date': m['updated_at'] ?? m['created_at'], 'id': m['id'],
        });
      }
    } catch (e) {
      debugPrint('Error loading mission notifications: $e');
    }
  }

  Future<void> _loadInvoiceNotifications(String userId, List<Map<String, dynamic>> out) async {
    try {
      final invoices = await Supabase.instance.client
          .from('invoices')
          .select('id, invoice_number, status, total, client_name, created_at, updated_at')
          .eq('user_id', userId)
          .order('updated_at', ascending: false)
          .limit(20);

      for (final inv in (invoices as List)) {
        final status = (inv['status'] ?? '').toString().toLowerCase();
        final (message, icon, color) = switch (status) {
          'paid' || 'payée' || 'payé' => ('Facture payée', Icons.payments, PremiumTheme.accentGreen),
          'overdue' || 'en retard' => ('Facture en retard', Icons.warning_amber_rounded, Colors.red as Color),
          _ => ('Facture créée', Icons.receipt_long, PremiumTheme.primaryBlue),
        };

        final amount = (inv['total'] ?? 0).toDouble();
        out.add({
          'type': 'invoice', 'title': message,
          'subtitle': '${inv['invoice_number'] ?? 'Facture'} — ${amount.toStringAsFixed(2)} €',
          'icon': icon, 'color': color,
          'date': inv['updated_at'] ?? inv['created_at'], 'id': inv['id'],
        });
      }
    } catch (e) {
      debugPrint('Error loading invoice notifications: $e');
    }
  }

  Future<void> _loadInspectionNotifications(String userId, List<Map<String, dynamic>> out) async {
    try {
      final inspections = await Supabase.instance.client
          .from('vehicle_inspections')
          .select('id, inspection_type, status, created_at, vehicle_brand, vehicle_model')
          .eq('inspector_id', userId)
          .order('created_at', ascending: false)
          .limit(20);

      for (final insp in (inspections as List)) {
        final type = (insp['inspection_type'] ?? '').toString();
        final status = (insp['status'] ?? '').toString();
        final vehicle = '${insp['vehicle_brand'] ?? ''} ${insp['vehicle_model'] ?? ''}'.trim();

        final (message, icon, color) = status == 'completed'
            ? (type == 'departure' ? 'Inspection départ terminée' : 'Inspection arrivée terminée',
               Icons.fact_check, PremiumTheme.accentGreen)
            : (type == 'departure' ? 'Inspection départ créée' : 'Inspection arrivée créée',
               Icons.car_repair, PremiumTheme.primaryTeal);

        out.add({
          'type': 'system', 'title': message,
          'subtitle': vehicle.isNotEmpty ? vehicle : 'Véhicule',
          'icon': icon, 'color': color,
          'date': insp['created_at'], 'id': insp['id'],
        });
      }
    } catch (e) {
      debugPrint('Error loading inspection notifications: $e');
    }
  }

  List<Map<String, dynamic>> get _filteredNotifications {
    if (_filter == 'all') return _notifications;
    if (_filter == 'missions') {
      return _notifications.where((n) => n['type'] == 'mission').toList();
    }
    if (_filter == 'invoices') {
      return _notifications.where((n) => n['type'] == 'invoice').toList();
    }
    return _notifications.where((n) => n['type'] == 'system').toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredNotifications;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: Colors.white,
        foregroundColor: PremiumTheme.textPrimary,
        elevation: 0,
        actions: [
          if (_notifications.isNotEmpty)
            TextButton(
              onPressed: () {
                // Mark all as seen (visual only since we don't persist read state)
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Toutes les notifications sont marquées comme lues'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              child: Text(
                'Tout lire',
                style: TextStyle(color: PremiumTheme.primaryBlue, fontSize: 13),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('Tout', 'all'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Missions', 'missions'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Factures', 'invoices'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Système', 'system'),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadNotifications,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) =>
                              _buildNotificationCard(filtered[index]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? PremiumTheme.primaryBlue
              : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : PremiumTheme.textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notif) {
    final icon = notif['icon'] as IconData;
    final color = notif['color'] as Color;
    final title = notif['title'] as String;
    final subtitle = notif['subtitle'] as String;
    final dateStr = notif['date']?.toString();
    final timeAgo = _formatTimeAgo(dateStr);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: PremiumTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: PremiumTheme.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            timeAgo,
            style: TextStyle(
              fontSize: 11,
              color: PremiumTheme.textSecondary.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_none,
            size: 64,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            'Aucune notification',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: PremiumTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Vos activités récentes apparaîtront ici',
            style: TextStyle(
              fontSize: 13,
              color: PremiumTheme.textSecondary.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimeAgo(String? dateStr) {
    if (dateStr == null) return '';
    final date = DateTime.tryParse(dateStr);
    if (date == null) return '';
    
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return "à l'instant";
    if (diff.inMinutes < 60) return 'il y a ${diff.inMinutes}min';
    if (diff.inHours < 24) return 'il y a ${diff.inHours}h';
    if (diff.inDays < 7) return 'il y a ${diff.inDays}j';
    if (diff.inDays < 30) return 'il y a ${diff.inDays ~/ 7}sem';
    return '${date.day}/${date.month}/${date.year}';
  }
}

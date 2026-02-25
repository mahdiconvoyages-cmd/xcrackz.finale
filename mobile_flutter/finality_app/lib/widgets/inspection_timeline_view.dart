import 'package:flutter/material.dart';
import '../models/inspection_timeline.dart';
import '../theme/premium_theme.dart';

class InspectionTimelineView extends StatelessWidget {
  final InspectionTimelineReport report;

  const InspectionTimelineView({
    super.key,
    required this.report,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header avec infos mission
          _buildHeader(context),
          const SizedBox(height: 24),

          // Timeline
          if (report.timeline.isNotEmpty)
            _buildTimeline(context)
          else
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Text(
                  'Aucun événement',
                  style: PremiumTheme.body.copyWith(
                    color: PremiumTheme.textSecondary,
                  ),
                ),
              ),
            ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final mission = report.mission;
    final vehicle = report.vehicle;

    return Container(
      padding: const EdgeInsets.all(20),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
        border: Border.all(
          color: PremiumTheme.primaryTeal.withValues(alpha: 0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Mission ref & status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Référence',
                    style: PremiumTheme.bodySmall.copyWith(
                      color: PremiumTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    mission['reference'] as String? ?? 'N/A',
                    style: PremiumTheme.body.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getStatusColor(mission['status'] as String? ?? '').withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _getStatusText(mission['status'] as String? ?? ''),
                  style: PremiumTheme.bodySmall.copyWith(
                    color: _getStatusColor(mission['status'] as String? ?? ''),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),

          // Vehicle info
          Row(
            children: [
              Icon(
                Icons.directions_car,
                color: PremiumTheme.primaryTeal,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${vehicle['brand']} ${vehicle['model']}',
                      style: PremiumTheme.body.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Immatriculation: ${vehicle['plate']}',
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (mission['driver_name'] != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.person,
                  color: PremiumTheme.primaryBlue,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Text(
                  mission['driver_name'] as String,
                  style: PremiumTheme.body,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimeline(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Text(
            'Historique des événements',
            style: PremiumTheme.heading3,
          ),
          const SizedBox(height: 20),
          ..._buildTimelineEvents(context),
        ],
      ),
    );
  }

  List<Widget> _buildTimelineEvents(BuildContext context) {
    return List.generate(
      report.timeline.length,
      (index) {
        final event = report.timeline[index];
        final isLast = index == report.timeline.length - 1;

        return Padding(
          padding: const EdgeInsets.only(bottom: 20),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Timeline dot & line
              Column(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _getEventColor(event.eventType),
                        width: 3,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: _getEventColor(event.eventType)
                              .withValues(alpha: 0.2),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        event.eventIcon,
                        style: const TextStyle(fontSize: 20),
                      ),
                    ),
                  ),
                  if (!isLast)
                    Container(
                      width: 3,
                      height: 40,
                      color: Colors.grey[300],
                    ),
                ],
              ),

              const SizedBox(width: 16),

              // Event content
              Expanded(
                child: _buildEventContent(event, context),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEventContent(
    InspectionTimelineEvent event,
    BuildContext context,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.grey[200]!,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Text(
            event.eventTitle,
            style: PremiumTheme.body.copyWith(
              fontWeight: FontWeight.w600,
              color: _getEventColor(event.eventType),
            ),
          ),

          const SizedBox(height: 4),

          // Time
          Text(
            '${event.formattedDate} à ${event.formattedTime}',
            style: PremiumTheme.bodySmall.copyWith(
              color: PremiumTheme.textSecondary,
            ),
          ),

          const SizedBox(height: 10),

          // Event-specific content
          _buildEventSpecificContent(event),
        ],
      ),
    );
  }

  Widget _buildEventSpecificContent(InspectionTimelineEvent event) {
    switch (event.eventType) {
      case 'departure_inspection':
      case 'arrival_inspection':
        return _buildInspectionContent(event);

      case 'document_scanned':
        return _buildDocumentContent(event);

      case 'expense_recorded':
        return _buildExpenseContent(event);

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildInspectionContent(InspectionTimelineEvent event) {
    final data = event.data;
    final mileage = data['mileage_km'];
    final fuel = data['fuel_level'];
    final notes = data['notes'];
    final driverName = data['driver_name'];
    final clientName = data['client_name'];
    final photosCount = (data['photos'] as List?)?.length ?? 0;
    final damagesCount = (data['damages'] as List?)?.length ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (driverName != null)
          _buildInfoRow('Conducteur', driverName as String),
        if (clientName != null)
          _buildInfoRow('Client', clientName as String),
        if (mileage != null)
          _buildInfoRow('Kilométrage', '$mileage km'),
        if (fuel != null)
          _buildInfoRow('Carburant', fuel as String),
        if (notes != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Notes',
                  style: PremiumTheme.bodySmall.copyWith(
                    color: PremiumTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  notes as String,
                  style: PremiumTheme.bodySmall,
                ),
              ],
            ),
          ),
        if (photosCount > 0 || damagesCount > 0)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                if (photosCount > 0)
                  Chip(
                    label: Text('$photosCount photo(s)'),
                    avatar: const Icon(Icons.photo, size: 18),
                    backgroundColor:
                        PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                  ),
                if (damagesCount > 0) ...[
                  const SizedBox(width: 8),
                  Chip(
                    label: Text('$damagesCount dégât(s)'),
                    avatar: const Icon(Icons.warning, size: 18),
                    backgroundColor:
                        PremiumTheme.accentRed.withValues(alpha: 0.1),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildDocumentContent(InspectionTimelineEvent event) {
    final data = event.data;
    final title = data['title'] as String?;
    final mimeType = data['mime_type'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Text(
            title,
            style: PremiumTheme.body.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        if (mimeType != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Chip(
              label: Text(mimeType),
              backgroundColor:
                  PremiumTheme.primaryBlue.withValues(alpha: 0.1),
            ),
          ),
      ],
    );
  }

  Widget _buildExpenseContent(InspectionTimelineEvent event) {
    final data = event.data;
    final description = data['description'] as String?;
    final amount = data['amount'] as num?;
    final expenseType = data['expense_type'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (description != null)
          Text(
            description,
            style: PremiumTheme.body.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (expenseType != null)
              Chip(
                label: Text(expenseType),
                backgroundColor: Colors.grey[200],
              ),
            if (amount != null)
              Text(
                '${amount.toStringAsFixed(2)} €',
                style: PremiumTheme.body.copyWith(
                  fontWeight: FontWeight.bold,
                  color: PremiumTheme.accentGreen,
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: PremiumTheme.bodySmall.copyWith(
              color: PremiumTheme.textSecondary,
            ),
          ),
          Text(
            value,
            style: PremiumTheme.bodySmall.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getEventColor(String eventType) {
    switch (eventType) {
      case 'departure_inspection':
        return PremiumTheme.accentAmber;
      case 'arrival_inspection':
        return PremiumTheme.accentGreen;
      case 'document_scanned':
        return PremiumTheme.primaryBlue;
      case 'expense_recorded':
        return const Color(0xFFEF4444);
      default:
        return Colors.grey;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return PremiumTheme.accentAmber;
      case 'in_progress':
        return PremiumTheme.primaryTeal;
      case 'completed':
        return PremiumTheme.accentGreen;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      default:
        return status;
    }
  }
}

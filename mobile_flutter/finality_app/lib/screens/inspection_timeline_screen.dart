import 'package:flutter/material.dart';
import '../models/inspection_timeline.dart';
import '../services/inspection_timeline_service.dart';
import '../widgets/inspection_timeline_view.dart';
import '../theme/premium_theme.dart';

class InspectionTimelineScreen extends StatefulWidget {
  final String token;

  const InspectionTimelineScreen({
    super.key,
    required this.token,
  });

  @override
  State<InspectionTimelineScreen> createState() =>
      _InspectionTimelineScreenState();
}

class _InspectionTimelineScreenState extends State<InspectionTimelineScreen> {
  late Future<InspectionTimelineReport> _reportFuture;
  final _service = InspectionTimelineService();

  @override
  void initState() {
    super.initState();
    _reportFuture = _service.getTimelineReport(widget.token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rapport d\'inspection'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: FutureBuilder<InspectionTimelineReport>(
        future: _reportFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return _buildErrorWidget(
              context,
              snapshot.error.toString(),
            );
          }

          if (!snapshot.hasData) {
            return _buildErrorWidget(
              context,
              'Aucun rapport trouvé',
            );
          }

          return InspectionTimelineView(report: snapshot.data!);
        },
      ),
    );
  }

  Widget _buildErrorWidget(BuildContext context, String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red[300],
          ),
          const SizedBox(height: 16),
          Text(
            'Erreur',
            style: PremiumTheme.heading3,
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: PremiumTheme.body.copyWith(
                color: PremiumTheme.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back),
            label: const Text('Retour'),
          ),
        ],
      ),
    );
  }
}

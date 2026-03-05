import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../utils/error_helper.dart';
import '../../models/inspection.dart';
import '../../services/inspection_service.dart';
import '../../providers/service_providers.dart';
import '../../widgets/app_drawer.dart';
import '../../theme/premium_theme.dart';

class InspectionsScreen extends ConsumerStatefulWidget {
  const InspectionsScreen({super.key});

  @override
  ConsumerState<InspectionsScreen> createState() => _InspectionsScreenState();
}

class _InspectionsScreenState extends ConsumerState<InspectionsScreen> {
  InspectionService get _inspectionService => ref.read(inspectionServiceProvider);
  List<Inspection> _inspections = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadInspections();
  }

  Future<void> _loadInspections() async {
    setState(() => _isLoading = true);

    try {
      final inspections = await _inspectionService.getUserInspections();
      if (!mounted) return;
      setState(() {
        _inspections = inspections;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      drawer: const AppDrawer(),
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF14b8a6), Color(0xFF0d9488)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF14b8a6).withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Image.asset(
                'assets/images/logo.png',
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Inspections',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 20,
                shadows: [
                  Shadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    offset: const Offset(0, 2),
                    blurRadius: 4,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildContent(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showInspectionTypeDialog(),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle inspection'),
      ),
    );
  }

  Widget _buildContent() {
    if (_inspections.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF14b8a6).withValues(alpha: 0.1),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF14b8a6).withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.checklist_outlined,
                size: 64,
                color: Color(0xFF14b8a6),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Aucune inspection',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1A1A1A),
                shadows: [
                  Shadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    offset: const Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Créez une inspection pour commencer',
              style: TextStyle(
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadInspections,
      child: ListView.builder(
        key: const ValueKey('inspections-list'),
        padding: const EdgeInsets.all(16),
        cacheExtent: 500.0,
        addAutomaticKeepAlives: true,
        itemCount: _inspections.length,
        itemBuilder: (context, index) {
          final inspection = _inspections[index];
          return Card(
            key: ValueKey('inspection-${inspection.id}'),
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: Icon(
                inspection.type == 'departure'
                    ? Icons.logout
                    : Icons.login,
              ),
              title: Text(
                inspection.type == 'departure'
                    ? 'Inspection Départ'
                    : 'Inspection Arrivée',
              ),
              subtitle: Text(
                DateFormat('dd/MM/yyyy \u00e0 HH:mm').format(inspection.createdAt),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                // TODO: Navigate to inspection details
              },
            ),
          );
        },
      ),
    );
  }

  void _showInspectionTypeDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        icon: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: PremiumTheme.primaryBlue.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.info_outline_rounded, color: PremiumTheme.primaryBlue, size: 28),
        ),
        title: const Text('Démarrer une inspection'),
        content: const Text(
          'Les inspections sont liées à une mission de convoyage.\n\n'
          'Pour créer une inspection :\n'
          '1. Allez dans « Mes Convoyages »\n'
          '2. Ouvrez une mission en attente\n'
          '3. Tapez « Démarrer » pour lancer l\'inspection de départ',
          style: TextStyle(fontSize: 14, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Compris'),
          ),
        ],
      ),
    );
  }
}

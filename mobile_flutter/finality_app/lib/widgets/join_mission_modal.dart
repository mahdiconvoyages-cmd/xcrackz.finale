import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class JoinMissionModal extends StatefulWidget {
  final VoidCallback onSuccess;

  const JoinMissionModal({
    super.key,
    required this.onSuccess,
  });

  @override
  State<JoinMissionModal> createState() => _JoinMissionModalState();
}

class _JoinMissionModalState extends State<JoinMissionModal> {
  final TextEditingController _codeController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  String _formatShareCode(String text) {
    // Supprimer tous les caractères non alphanumériques
    final cleaned = text.replaceAll(RegExp(r'[^A-Z0-9]'), '').toUpperCase();
    
    // Formater XX-XXX-XXX
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return '${cleaned.substring(0, 2)}-${cleaned.substring(2)}';
    return '${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5, cleaned.length > 8 ? 8 : cleaned.length)}';
  }

  bool _validateShareCode(String code) {
    final cleaned = code.replaceAll(RegExp(r'[^A-Z0-9]'), '');
    return cleaned.length == 8;
  }

  Future<void> _handleJoinMission() async {
    final code = _codeController.text;
    
    if (!_validateShareCode(code)) {
      setState(() {
        _error = 'Code invalide. Format attendu: XZ-ABC-123 (8 caractères)';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Utilisateur non connecté');
      }

      final cleanedCode = code.replaceAll(RegExp(r'[^A-Z0-9]'), '');

      // Appeler la fonction RPC claim_mission
      final response = await Supabase.instance.client.rpc(
        'claim_mission',
        params: {
          'p_code': cleanedCode,
          'p_user_id': userId,
        },
      );

      // Normaliser la réponse
      dynamic result = response;
      if (result is String) {
        try {
          result = response;
        } catch (_) {}
      }
      if (result is List && result.isNotEmpty) {
        result = result[0];
      }

      // Vérifier le résultat
      if (result is Map) {
        if (result['success'] == true) {
          final alreadyJoined = result['alreadyJoined'] == true;
          
          if (!mounted) return;
          
          Navigator.pop(context);
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                alreadyJoined 
                    ? 'Cette mission est déjà dans votre liste'
                    : 'Mission ajoutée avec succès !',
              ),
              backgroundColor: Colors.green,
            ),
          );
          
          widget.onSuccess();
        } else {
          setState(() {
            _error = result['message'] ?? result['error'] ?? 'Impossible de rejoindre la mission';
            _isLoading = false;
          });
        }
      } else if (result == true) {
        if (!mounted) return;
        
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Mission ajoutée avec succès !'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onSuccess();
      } else {
        throw Exception('Réponse invalide du serveur');
      }
    } catch (e) {
      setState(() {
        _error = 'Erreur: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 400),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.add_circle_outline,
                    color: Theme.of(context).colorScheme.primary,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Text(
                    'Rejoindre une mission',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Instructions
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Colors.blue.shade700,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Entrez le code au format XZ-ABC-123 (8 caractères)',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.blue.shade900,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Code Input
            const Text(
              'Code de partage',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _codeController,
              decoration: InputDecoration(
                hintText: 'XZ-ABC-123',
                prefixIcon: const Icon(Icons.key),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
                counterText: '${_codeController.text.replaceAll(RegExp(r'[^A-Z0-9]'), '').length}/8',
              ),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
              textAlign: TextAlign.center,
              textCapitalization: TextCapitalization.characters,
              maxLength: 10,
              onChanged: (value) {
                final formatted = _formatShareCode(value);
                if (formatted != value) {
                  _codeController.value = TextEditingValue(
                    text: formatted,
                    selection: TextSelection.collapsed(offset: formatted.length),
                  );
                }
                setState(() => _error = null);
              },
              enabled: !_isLoading,
            ),
            const SizedBox(height: 16),

            // Error Message
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.error_outline,
                      color: Colors.red.shade700,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _error!,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.red.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            if (_error != null) const SizedBox(height: 16),

            // Actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isLoading ? null : () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Annuler'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _isLoading || !_validateShareCode(_codeController.text)
                        ? null
                        : _handleJoinMission,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_circle, size: 20),
                              SizedBox(width: 8),
                              Text('Rejoindre'),
                            ],
                          ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Tip
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    color: Colors.orange.shade700,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Astuce: Vous pouvez coller le code depuis votre presse-papier',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

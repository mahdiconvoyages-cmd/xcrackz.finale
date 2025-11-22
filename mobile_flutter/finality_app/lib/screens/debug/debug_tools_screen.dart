import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DebugToolsScreen extends StatelessWidget {
  const DebugToolsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Outils de Debug'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Utilisateur',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text('ID: ${user?.id ?? 'Non connecté'}'),
                  Text('Email: ${user?.email ?? 'N/A'}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Supabase',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text('Connexion: Supabase Cloud'),
                  const SizedBox(height: 8),
                  Text('Auth Status: ${user != null ? 'Connecté' : 'Déconnecté'}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Debug info copied')),
              );
            },
            icon: const Icon(Icons.copy),
            label: const Text('Copier les infos'),
          ),
        ],
      ),
    );
  }
}

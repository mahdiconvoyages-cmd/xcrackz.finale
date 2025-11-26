import 'package:flutter/material.dart';
import '../models/client.dart';
import '../services/client_service.dart';
import '../screens/crm/client_detail_screen.dart';

/// Widget de sélection de client avec recherche et création rapide
class ClientSelector extends StatefulWidget {
  final Client? selectedClient;
  final Function(Client) onClientSelected;
  final bool showCreateButton;

  const ClientSelector({
    super.key,
    this.selectedClient,
    required this.onClientSelected,
    this.showCreateButton = true,
  });

  @override
  State<ClientSelector> createState() => _ClientSelectorState();
}

class _ClientSelectorState extends State<ClientSelector> {
  final ClientService _clientService = ClientService();
  final TextEditingController _searchController = TextEditingController();
  
  List<Client> _clients = [];
  List<Client> _filteredClients = [];
  bool _isLoading = true;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _loadClients();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadClients() async {
    try {
      final clients = await _clientService.getClients();
      setState(() {
        _clients = clients;
        _filteredClients = clients;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _filterClients(String query) {
    if (query.isEmpty) {
      setState(() => _filteredClients = _clients);
      return;
    }

    final lowQuery = query.toLowerCase();
    setState(() {
      _filteredClients = _clients.where((client) {
        return client.name.toLowerCase().contains(lowQuery) ||
            client.email.toLowerCase().contains(lowQuery) ||
            (client.companyName?.toLowerCase().contains(lowQuery) ?? false) ||
            (client.phone?.contains(query) ?? false);
      }).toList();
    });
  }

  void _selectClient(Client client) {
    widget.onClientSelected(client);
    setState(() => _isExpanded = false);
    _searchController.clear();
  }

  Future<void> _createNewClient() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => const ClientDetailScreen(),
      ),
    );

    if (result == true) {
      await _loadClients();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // En-tête avec client sélectionné ou bouton de sélection
        InkWell(
          onTap: () => setState(() => _isExpanded = !_isExpanded),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(12),
              color: widget.selectedClient != null 
                  ? Theme.of(context).primaryColor.withOpacity(0.05)
                  : Colors.white,
            ),
            child: Row(
              children: [
                if (widget.selectedClient != null) ...[
                  _buildClientAvatar(widget.selectedClient!),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.selectedClient!.displayName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        Text(
                          widget.selectedClient!.email,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () {
                      // Deselect - on passe un client vide pour signaler la désélection
                      // L'appelant devrait gérer cela
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ] else ...[
                  Icon(
                    Icons.person_add_outlined,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Sélectionner un client',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ],
                Icon(
                  _isExpanded ? Icons.expand_less : Icons.expand_more,
                  color: Colors.grey.shade600,
                ),
              ],
            ),
          ),
        ),

        // Panel de sélection étendu
        if (_isExpanded)
          Container(
            margin: const EdgeInsets.only(top: 8),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(12),
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                // Barre de recherche
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Rechercher...',
                            prefixIcon: const Icon(Icons.search, size: 20),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: Colors.grey.shade100,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            isDense: true,
                          ),
                          onChanged: _filterClients,
                        ),
                      ),
                      if (widget.showCreateButton) ...[
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: _createNewClient,
                          icon: const Icon(Icons.add_circle),
                          color: Theme.of(context).primaryColor,
                          tooltip: 'Nouveau client',
                        ),
                      ],
                    ],
                  ),
                ),

                const Divider(height: 1),

                // Liste des clients
                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_filteredClients.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Icon(
                          Icons.person_search,
                          size: 48,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _searchController.text.isNotEmpty
                              ? 'Aucun client trouvé'
                              : 'Aucun client',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                        if (widget.showCreateButton) ...[
                          const SizedBox(height: 12),
                          TextButton.icon(
                            onPressed: _createNewClient,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Créer un client'),
                          ),
                        ],
                      ],
                    ),
                  )
                else
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 250),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: _filteredClients.length,
                      itemBuilder: (context, index) {
                        final client = _filteredClients[index];
                        final isSelected = widget.selectedClient?.id == client.id;
                        
                        return ListTile(
                          leading: _buildClientAvatar(client),
                          title: Text(
                            client.displayName,
                            style: TextStyle(
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            ),
                          ),
                          subtitle: Text(
                            client.email,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          trailing: isSelected
                              ? Icon(
                                  Icons.check_circle,
                                  color: Theme.of(context).primaryColor,
                                )
                              : client.isFavorite
                                  ? const Icon(
                                      Icons.star,
                                      color: Colors.amber,
                                      size: 18,
                                    )
                                  : null,
                          selected: isSelected,
                          onTap: () => _selectClient(client),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildClientAvatar(Client client) {
    final color = _getAvatarColor(client.name);
    return CircleAvatar(
      radius: 18,
      backgroundColor: color.withOpacity(0.15),
      child: Text(
        client.initials,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  Color _getAvatarColor(String name) {
    final colors = [
      Colors.blue,
      Colors.purple,
      Colors.teal,
      Colors.orange,
      Colors.pink,
      Colors.indigo,
      Colors.green,
      Colors.red,
    ];
    return colors[name.hashCode.abs() % colors.length];
  }
}

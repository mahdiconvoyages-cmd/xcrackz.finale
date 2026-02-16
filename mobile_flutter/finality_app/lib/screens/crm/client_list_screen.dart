import 'package:flutter/material.dart';
import '../../models/client.dart';
import '../../services/client_service.dart';
import 'client_detail_screen.dart';

/// Écran de liste des clients style TimeInvoice
class ClientListScreen extends StatefulWidget {
  final VoidCallback? onClientCreated;

  const ClientListScreen({super.key, this.onClientCreated});

  @override
  State<ClientListScreen> createState() => _ClientListScreenState();
}

class _ClientListScreenState extends State<ClientListScreen> {
  final ClientService _clientService = ClientService();
  final TextEditingController _searchController = TextEditingController();

  List<Client> _clients = [];
  Map<String, int> _stats = {'total': 0, 'favorites': 0, 'companies': 0};
  bool _isLoading = true;
  String _filter = 'all'; // all, favorites, companies

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
    setState(() => _isLoading = true);
    try {
      final clients = await _clientService.getClients(
        searchQuery: _searchController.text.isNotEmpty ? _searchController.text : null,
        isFavorite: _filter == 'favorites' ? true : null,
        isCompany: _filter == 'companies' ? true : null,
      );
      final stats = await _clientService.getClientsCount();
      
      if (!mounted) return;
      setState(() {
        _clients = clients;
        _stats = stats;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: ${e.toString()}')),
        );
      }
    }
  }

  void _openClientDetail([Client? client]) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => ClientDetailScreen(client: client),
      ),
    );
    
    if (result == true) {
      _loadClients();
      widget.onClientCreated?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Stats Cards
        _buildStatsSection(),
        
        // Search & Filter Bar
        _buildSearchBar(),
        
        // Client List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _clients.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadClients,
                      child: ListView.builder(
                        padding: const EdgeInsets.only(bottom: 80),
                        itemCount: _clients.length,
                        itemBuilder: (context, index) {
                          return _buildClientCard(_clients[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildStatsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              'Total',
              _stats['total']?.toString() ?? '0',
              Icons.people_outline,
              Colors.blue,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildStatCard(
              'Favoris',
              _stats['favorites']?.toString() ?? '0',
              Icons.star_outline,
              Colors.amber,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildStatCard(
              'Entreprises',
              _stats['companies']?.toString() ?? '0',
              Icons.business_outlined,
              Colors.purple,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          // Search Field
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Rechercher un client...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _loadClients();
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              filled: true,
              fillColor: Colors.grey.shade100,
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
            onChanged: (_) => _loadClients(),
          ),
          
          const SizedBox(height: 12),
          
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('all', 'Tous', Icons.people),
                const SizedBox(width: 8),
                _buildFilterChip('favorites', 'Favoris', Icons.star),
                const SizedBox(width: 8),
                _buildFilterChip('companies', 'Entreprises', Icons.business),
              ],
            ),
          ),
          
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, IconData icon) {
    final isSelected = _filter == value;
    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: isSelected ? Colors.white : Colors.grey.shade600,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.grey.shade600,
            ),
          ),
        ],
      ),
      selectedColor: Theme.of(context).primaryColor,
      backgroundColor: Colors.grey.shade100,
      onSelected: (_) {
        setState(() => _filter = value);
        _loadClients();
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            _searchController.text.isNotEmpty
                ? 'Aucun client trouvé'
                : 'Aucun client',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _searchController.text.isNotEmpty
                ? 'Essayez une autre recherche'
                : 'Créez votre premier client',
            style: TextStyle(
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _openClientDetail(),
            icon: const Icon(Icons.add),
            label: const Text('Nouveau Client'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClientCard(Client client) {
    return Dismissible(
      key: Key(client.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _confirmDelete(client),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.grey.shade200),
        ),
        child: InkWell(
          onTap: () => _openClientDetail(client),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Avatar
                _buildAvatar(client),
                const SizedBox(width: 16),
                
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              client.displayName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (client.isFavorite)
                            const Icon(
                              Icons.star,
                              color: Colors.amber,
                              size: 18,
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      if (client.email.isNotEmpty)
                        Text(
                          client.email,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          if (client.isCompany)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.purple.shade50,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Entreprise',
                                style: TextStyle(
                                  color: Colors.purple.shade700,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          if (client.isCompany && client.city != null)
                            const SizedBox(width: 8),
                          if (client.city != null)
                            Expanded(
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.location_on_outlined,
                                    size: 14,
                                    color: Colors.grey.shade500,
                                  ),
                                  const SizedBox(width: 2),
                                  Expanded(
                                    child: Text(
                                      client.city!,
                                      style: TextStyle(
                                        color: Colors.grey.shade500,
                                        fontSize: 12,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Arrow
                Icon(
                  Icons.chevron_right,
                  color: Colors.grey.shade400,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(Client client) {
    final initials = client.initials;
    final color = _getAvatarColor(client.name);
    
    return CircleAvatar(
      radius: 24,
      backgroundColor: color.withOpacity(0.15),
      child: Text(
        initials,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 16,
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

  Future<bool?> _confirmDelete(Client client) async {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer ce client ?'),
        content: Text(
          'Êtes-vous sûr de vouloir supprimer "${client.displayName}" ?\n\nCette action est irréversible.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context, true);
              await _clientService.deleteClient(client.id);
              _loadClients();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Client supprimé')),
                );
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}

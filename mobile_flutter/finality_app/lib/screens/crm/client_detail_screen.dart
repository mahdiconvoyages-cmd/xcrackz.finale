import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/client.dart';
import '../../services/client_service.dart';

/// Écran de création/édition de client style TimeInvoice
class ClientDetailScreen extends StatefulWidget {
  final Client? client;

  const ClientDetailScreen({super.key, this.client});

  bool get isEditing => client != null;

  @override
  State<ClientDetailScreen> createState() => _ClientDetailScreenState();
}

class _ClientDetailScreenState extends State<ClientDetailScreen> {
  final _formKey = GlobalKey<FormState>();
  final ClientService _clientService = ClientService();

  // Controllers
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _siretController = TextEditingController();
  final _sirenController = TextEditingController();
  final _addressController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _cityController = TextEditingController();
  final _countryController = TextEditingController();
  final _notesController = TextEditingController();

  bool _isCompany = false;
  bool _isFavorite = false;
  bool _isSaving = false;
  bool _isSearchingSiret = false;
  ClientStats? _stats;

  @override
  void initState() {
    super.initState();
    if (widget.client != null) {
      _loadClientData(widget.client!);
      _loadStats();
    } else {
      _countryController.text = 'France';
    }
  }

  void _loadClientData(Client client) {
    _nameController.text = client.name;
    _emailController.text = client.email;
    _phoneController.text = client.phone ?? '';
    _companyNameController.text = client.companyName ?? '';
    _siretController.text = client.siret ?? '';
    _sirenController.text = client.siren ?? '';
    _addressController.text = client.address ?? '';
    _postalCodeController.text = client.postalCode ?? '';
    _cityController.text = client.city ?? '';
    _countryController.text = client.country ?? 'France';
    _notesController.text = client.notes ?? '';
    _isCompany = client.isCompany;
    _isFavorite = client.isFavorite;
  }

  Future<void> _loadStats() async {
    if (widget.client == null) return;
    try {
      final stats = await _clientService.getClientStats(widget.client!.id);
      if (!mounted) return;
      setState(() => _stats = stats);
    } catch (e) {
      // Ignorer les erreurs de stats
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _companyNameController.dispose();
    _siretController.dispose();
    _sirenController.dispose();
    _addressController.dispose();
    _postalCodeController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _searchSiret() async {
    final siret = _siretController.text.replaceAll(RegExp(r'\s'), '');
    if (siret.length < 9) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entrez au moins 9 chiffres')),
      );
      return;
    }

    setState(() => _isSearchingSiret = true);
    
    try {
      // API gouvernementale recherche-entreprises
      // Pour l'instant, juste extraire le SIREN du SIRET
      if (siret.length >= 9) {
        final siren = siret.substring(0, 9);
        _sirenController.text = siren;
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SIREN extrait du SIRET')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: ${e.toString()}')),
      );
    } finally {
      setState(() => _isSearchingSiret = false);
    }
  }

  Future<void> _saveClient() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final clientData = Client(
        id: widget.client?.id ?? '',
        userId: '',
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim().isNotEmpty 
            ? _phoneController.text.trim() 
            : null,
        companyName: _companyNameController.text.trim().isNotEmpty 
            ? _companyNameController.text.trim() 
            : null,
        siret: _siretController.text.trim().isNotEmpty 
            ? _siretController.text.trim() 
            : null,
        siren: _sirenController.text.trim().isNotEmpty 
            ? _sirenController.text.trim() 
            : null,
        address: _addressController.text.trim().isNotEmpty 
            ? _addressController.text.trim() 
            : null,
        postalCode: _postalCodeController.text.trim().isNotEmpty 
            ? _postalCodeController.text.trim() 
            : null,
        city: _cityController.text.trim().isNotEmpty 
            ? _cityController.text.trim() 
            : null,
        country: _countryController.text.trim().isNotEmpty 
            ? _countryController.text.trim() 
            : null,
        notes: _notesController.text.trim().isNotEmpty 
            ? _notesController.text.trim() 
            : null,
        isCompany: _isCompany,
        isFavorite: _isFavorite,
        createdAt: widget.client?.createdAt ?? DateTime.now(),
      );

      if (widget.isEditing) {
        await _clientService.updateClient(clientData);
      } else {
        await _clientService.createClient(clientData);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.isEditing 
                ? 'Client modifié avec succès' 
                : 'Client créé avec succès'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Modifier le client' : 'Nouveau client'),
        actions: [
          IconButton(
            icon: Icon(
              _isFavorite ? Icons.star : Icons.star_border,
              color: _isFavorite ? Colors.amber : null,
            ),
            onPressed: () => setState(() => _isFavorite = !_isFavorite),
          ),
          if (widget.isEditing)
            PopupMenuButton(
              itemBuilder: (context) => [
                PopupMenuItem(
                  onTap: _deleteClient,
                  child: const Row(
                    children: [
                      Icon(Icons.delete, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Supprimer', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Stats (en mode édition uniquement)
              if (widget.isEditing && _stats != null)
                _buildStatsSection(),

              // Type de client
              _buildTypeSection(),
              const SizedBox(height: 24),

              // Informations principales
              _buildSectionTitle('Informations'),
              _buildTextField(
                controller: _nameController,
                label: 'Nom *',
                icon: Icons.person_outline,
                validator: (v) => v?.trim().isEmpty == true ? 'Nom requis' : null,
                textCapitalization: TextCapitalization.words,
              ),
              _buildTextField(
                controller: _emailController,
                label: 'Email *',
                icon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                validator: (v) {
                  if (v?.trim().isEmpty == true) return 'Email requis';
                  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(v!)) {
                    return 'Email invalide';
                  }
                  return null;
                },
              ),
              _buildTextField(
                controller: _phoneController,
                label: 'Téléphone',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),

              // Informations entreprise
              if (_isCompany) ...[
                const SizedBox(height: 24),
                _buildSectionTitle('Entreprise'),
                _buildTextField(
                  controller: _companyNameController,
                  label: 'Raison sociale',
                  icon: Icons.business_outlined,
                  textCapitalization: TextCapitalization.words,
                ),
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _siretController,
                        label: 'SIRET',
                        icon: Icons.numbers,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(14),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isSearchingSiret ? null : _searchSiret,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey.shade200,
                          foregroundColor: Colors.grey.shade700,
                        ),
                        child: _isSearchingSiret
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.search),
                      ),
                    ),
                  ],
                ),
                _buildTextField(
                  controller: _sirenController,
                  label: 'SIREN',
                  icon: Icons.numbers,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(9),
                  ],
                ),
              ],

              // Adresse
              const SizedBox(height: 24),
              _buildSectionTitle('Adresse'),
              _buildTextField(
                controller: _addressController,
                label: 'Adresse',
                icon: Icons.location_on_outlined,
                maxLines: 2,
              ),
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: _buildTextField(
                      controller: _postalCodeController,
                      label: 'Code postal',
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(5),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 2,
                    child: _buildTextField(
                      controller: _cityController,
                      label: 'Ville',
                      textCapitalization: TextCapitalization.words,
                    ),
                  ),
                ],
              ),
              _buildTextField(
                controller: _countryController,
                label: 'Pays',
                icon: Icons.public_outlined,
                textCapitalization: TextCapitalization.words,
              ),

              // Notes
              const SizedBox(height: 24),
              _buildSectionTitle('Notes'),
              _buildTextField(
                controller: _notesController,
                label: 'Notes internes',
                icon: Icons.note_outlined,
                maxLines: 4,
              ),

              const SizedBox(height: 32),

              // Bouton sauvegarder
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveClient,
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          widget.isEditing ? 'Enregistrer' : 'Créer le client',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsSection() {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).primaryColor.withOpacity(0.1),
            Theme.of(context).primaryColor.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).primaryColor.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Statistiques',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatItem(
                  'Factures',
                  _stats!.totalInvoices.toString(),
                  Icons.receipt_long_outlined,
                ),
              ),
              Expanded(
                child: _buildStatItem(
                  'Devis',
                  _stats!.totalQuotes.toString(),
                  Icons.description_outlined,
                ),
              ),
              Expanded(
                child: _buildStatItem(
                  'CA Total',
                  '${_stats!.totalRevenue.toStringAsFixed(0)}€',
                  Icons.euro_outlined,
                ),
              ),
            ],
          ),
          if (_stats!.pendingAmount > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.pending_outlined, color: Colors.orange.shade700, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'En attente: ${_stats!.pendingAmount.toStringAsFixed(2)}€',
                    style: TextStyle(
                      color: Colors.orange.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Theme.of(context).primaryColor),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
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
    );
  }

  Widget _buildTypeSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Type de client',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildTypeOption(
                  title: 'Particulier',
                  icon: Icons.person,
                  isSelected: !_isCompany,
                  onTap: () => setState(() => _isCompany = false),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTypeOption(
                  title: 'Entreprise',
                  icon: Icons.business,
                  isSelected: _isCompany,
                  onTap: () => setState(() => _isCompany = true),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTypeOption({
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? Theme.of(context).primaryColor : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).primaryColor
                : Colors.grey.shade300,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : Colors.grey.shade600,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.grey.shade700,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    IconData? icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    int maxLines = 1,
    TextCapitalization textCapitalization = TextCapitalization.none,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        maxLines: maxLines,
        textCapitalization: textCapitalization,
        inputFormatters: inputFormatters,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: icon != null ? Icon(icon) : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: Theme.of(context).primaryColor,
              width: 2,
            ),
          ),
          filled: true,
          fillColor: Colors.white,
        ),
      ),
    );
  }

  Future<void> _deleteClient() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer ce client ?'),
        content: const Text(
          'Cette action est irréversible. Toutes les données associées à ce client seront supprimées.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirm == true && widget.client != null) {
      try {
        await _clientService.deleteClient(widget.client!.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Client supprimé'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context, true);
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

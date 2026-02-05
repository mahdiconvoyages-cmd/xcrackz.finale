import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_helper.dart';
import '../../models/invoice.dart';
import '../../models/client.dart';
import '../../services/invoice_service.dart';
import '../../services/insee_service.dart';
import '../../widgets/siret_autocomplete_field.dart';
import '../../widgets/client_selector.dart';

/// Version optimisée de la page de création/édition de facture
/// Améliorations: Performance, UX, Validation, Design moderne
class InvoiceFormScreen extends StatefulWidget {
  final Invoice? invoice;

  const InvoiceFormScreen({super.key, this.invoice});

  @override
  State<InvoiceFormScreen> createState() => _InvoiceFormScreenState();
}

class _InvoiceFormScreenState extends State<InvoiceFormScreen> 
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final InvoiceService _invoiceService = InvoiceService();
  final InseeService _inseeService = InseeService();
  
  // Controllers
  final _clientNameController = TextEditingController();
  final _clientEmailController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _clientAddressController = TextEditingController();
  final _clientSiretController = TextEditingController();
  final _clientVatController = TextEditingController();
  final _notesController = TextEditingController();
  final _paymentTermsController = TextEditingController();
  
  // État
  InseeCompanyInfo? _selectedCompany;
  Client? _selectedClient;
  bool _useExistingClient = true;
  DateTime _invoiceDate = DateTime.now();
  DateTime? _dueDate;
  double _taxRate = 20.0;
  List<_InvoiceItemForm> _items = [];
  bool _isSaving = false;
  bool _isSiretLoading = false;
  String? _siretError;
  
  // Performance: Debounce timer pour SIRET
  Timer? _siretDebounce;
  
  // Animation controller
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  
  // Autovalidate après première tentative
  AutovalidateMode _autovalidateMode = AutovalidateMode.disabled;
  
  // Section expansion states
  bool _clientSectionExpanded = true;
  bool _datesSectionExpanded = true;
  bool _itemsSectionExpanded = true;
  
  @override
  void initState() {
    super.initState();
    
    _animController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeIn),
    );
    _animController.forward();
    
    if (widget.invoice != null) {
      _loadExistingInvoice();
    } else {
      _initializeNewInvoice();
    }
    
    // Listener pour debounce SIRET
    _clientSiretController.addListener(_onSiretChanged);
  }

  void _loadExistingInvoice() {
    final clientInfo = widget.invoice!.clientInfo ?? {};
    _clientNameController.text = clientInfo['name'] ?? '';
    _clientEmailController.text = clientInfo['email'] ?? '';
    _clientPhoneController.text = clientInfo['phone'] ?? '';
    _clientAddressController.text = clientInfo['address'] ?? '';
    _clientSiretController.text = clientInfo['siret'] ?? '';
    _clientVatController.text = clientInfo['vat_number'] ?? '';
    _notesController.text = widget.invoice!.notes ?? '';
    _paymentTermsController.text = clientInfo['payment_terms'] ?? 'Paiement à 30 jours';
    _invoiceDate = widget.invoice!.invoiceDate;
    _dueDate = widget.invoice!.dueDate;
    _taxRate = widget.invoice!.taxRate;
    _items = widget.invoice!.items
        .map((item) => _InvoiceItemForm(
              description: item.description,
              quantity: item.quantity.toDouble(),
              unitPrice: item.unitPrice,
            ))
        .toList();
  }

  void _initializeNewInvoice() {
    _dueDate = DateTime.now().add(const Duration(days: 30));
    _paymentTermsController.text = 'Paiement à 30 jours';
    _addItem();
  }

  void _onSiretChanged() {
    // Annuler le précédent timer
    _siretDebounce?.cancel();

    // Si le SIRET est vide, reset
    if (_clientSiretController.text.isEmpty) {
      setState(() {
        _siretError = null;
        _selectedCompany = null;
      });
      return;
    }

    // Nouveau timer de 800ms (debounce)
    _siretDebounce = Timer(const Duration(milliseconds: 800), () {
      _searchCompanyBySiret(_clientSiretController.text);
    });
  }

  Future<void> _searchCompanyBySiret(String siret) async {
    if (siret.length < 14) {
      setState(() {
        _siretError = 'Le SIRET doit contenir 14 chiffres';
        _isSiretLoading = false;
      });
      return;
    }

    setState(() {
      _isSiretLoading = true;
      _siretError = null;
    });

    try {
      final company = await _inseeService.getCompanyBySiret(siret);
      
      if (!mounted) return;
      
      if (company != null) {
        setState(() {
          _selectedCompany = company;
          _clientNameController.text = company.companyName ?? '';
          _clientAddressController.text = company.fullAddress;
          _clientVatController.text = company.vatNumber ?? '';
          _isSiretLoading = false;
          _siretError = null;
        });
        
        _showSuccessSnackbar('✅ Entreprise trouvée: ${company.companyName}');
      } else {
        setState(() {
          _siretError = 'Aucune entreprise trouvée pour ce SIRET';
          _isSiretLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _siretError = 'Erreur lors de la recherche';
        _isSiretLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _siretDebounce?.cancel();
    _animController.dispose();
    _clientNameController.dispose();
    _clientEmailController.dispose();
    _clientPhoneController.dispose();
    _clientAddressController.dispose();
    _clientSiretController.dispose();
    _clientVatController.dispose();
    _notesController.dispose();
    _paymentTermsController.dispose();
    super.dispose();
  }

  void _addItem() {
    setState(() {
      _items.add(_InvoiceItemForm(
        description: '',
        quantity: 1,
        unitPrice: 0,
      ));
    });
  }

  void _removeItem(int index) {
    if (_items.length == 1) {
      _showErrorSnackbar('⚠️ Au moins un article est requis');
      return;
    }
    setState(() {
      _items.removeAt(index);
    });
  }

  double _calculateSubtotal() {
    return _items.fold(
        0.0, (sum, item) => sum + (item.quantity * item.unitPrice));
  }

  double _calculateTax() {
    return _calculateSubtotal() * (_taxRate / 100);
  }

  double _calculateTotal() {
    return _calculateSubtotal() + _calculateTax();
  }

  void _showSuccessSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showErrorSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _saveInvoice() async {
    print('🔵 DEBUG: _saveInvoice appelée');
    
    setState(() => _autovalidateMode = AutovalidateMode.always);
    
    if (!_formKey.currentState!.validate()) {
      print('⚠️ DEBUG: Validation du formulaire échouée');
      _showErrorSnackbar('⚠️ Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    print('✅ DEBUG: Validation réussie');

    if (_items.isEmpty || _items.any((item) => item.description.trim().isEmpty)) {
      print('⚠️ DEBUG: Articles invalides');
      _showErrorSnackbar('⚠️ Veuillez ajouter au moins un article valide avec description');
      return;
    }
    
    print('✅ DEBUG: Articles valides (${_items.length} articles)');

    if (!_useExistingClient && _clientNameController.text.trim().isEmpty) {
      print('⚠️ DEBUG: Nom client manquant');
      _showErrorSnackbar('⚠️ Le nom du client est requis');
      return;
    }
    
    print('✅ DEBUG: Client valide');

    setState(() => _isSaving = true);
    print('🔄 DEBUG: Début de l\'enregistrement...');

    try {
      final subtotal = _calculateSubtotal();
      final taxAmount = _calculateTax();
      final total = _calculateTotal();
      
      print('💰 DEBUG: Calculs - Subtotal: $subtotal, Tax: $taxAmount, Total: $total');

      // Récupérer le userId depuis l'authentification
      final currentUserId = Supabase.instance.client.auth.currentUser?.id;
      if (currentUserId == null) {
        throw Exception('Utilisateur non connecté');
      }
      
      final invoice = Invoice(
        id: widget.invoice?.id,
        invoiceNumber: widget.invoice?.invoiceNumber ??
            await _invoiceService.generateInvoiceNumber(),
        userId: currentUserId,
        missionId: widget.invoice?.missionId,
        invoiceDate: _invoiceDate,
        dueDate: _dueDate,
        items: _items
            .map((item) => InvoiceItem(
                  description: item.description.trim(),
                  quantity: item.quantity.toInt(),
                  unitPrice: item.unitPrice,
                  total: item.quantity * item.unitPrice,
                ))
            .toList(),
        subtotal: subtotal,
        taxRate: _taxRate,
        taxAmount: taxAmount,
        total: total,
        status: widget.invoice?.status ?? 'draft',
        notes: _notesController.text.trim(),
        clientInfo: {
          'name': _clientNameController.text.trim(),
          'email': _clientEmailController.text.trim(),
          'phone': _clientPhoneController.text.trim(),
          'address': _clientAddressController.text.trim(),
          'siret': _clientSiretController.text.trim(),
          'vat_number': _clientVatController.text.trim(),
          'payment_terms': _paymentTermsController.text.trim(),
          if (_selectedCompany != null) ...{
            'company_name': _selectedCompany!.companyName,
            'legal_form': _selectedCompany!.legalForm,
            'activity_code': _selectedCompany!.activityCode,
            'activity_label': _selectedCompany!.activityLabel,
            'is_headquarters': _selectedCompany!.isHeadquarters,
            'is_active': _selectedCompany!.isActive,
          },
        },
        createdAt: widget.invoice?.createdAt,
        updatedAt: DateTime.now(),
      );
      
      print('📄 DEBUG: Objet Invoice créé - N°: ${invoice.invoiceNumber}');
      print('🔍 DEBUG: widget.invoice?.id = ${widget.invoice?.id}');

      if (widget.invoice?.id == null) {
        print('➕ DEBUG: Création d\'une nouvelle facture (id est null)...');
        await _invoiceService.createInvoice(invoice);
        print('✅ DEBUG: Facture créée avec succès');
      } else {
        print('📝 DEBUG: Mise à jour de la facture ${widget.invoice!.id}...');
        await _invoiceService.updateInvoice(widget.invoice!.id!, invoice);
        print('✅ DEBUG: Facture mise à jour avec succès');
      }

      if (!mounted) {
        print('⚠️ DEBUG: Widget non monté, abandon');
        return;
      }
      
      print('🎉 DEBUG: Succès ! Fermeture de l\'écran...');

      // Afficher le message AVANT de fermer l'écran
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  widget.invoice?.id == null
                      ? '✅ Facture créée avec succès'
                      : '✅ Facture mise à jour avec succès',
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          duration: const Duration(seconds: 2),
        ),
      );
      
      // Attendre un peu pour que la snackbar s'affiche, puis fermer
      await Future.delayed(const Duration(milliseconds: 500));
      
      if (!mounted) return;
      Navigator.of(context).pop(true);
      
    } catch (e) {
      print('❌ DEBUG: Erreur lors de l\'enregistrement: $e');
      if (!mounted) return;
      _showErrorSnackbar('❌ Erreur: ${ErrorHelper.cleanError(e)}');
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
        print('🔄 DEBUG: État _isSaving réinitialisé');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFF8FAFC),
              Color(0xFFE2E8F0),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildModernAppBar(),
              Expanded(
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Form(
                    key: _formKey,
                    autovalidateMode: _autovalidateMode,
                    child: ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        _buildProgressIndicator(),
                        const SizedBox(height: 20),
                        _buildClientSection(),
                        const SizedBox(height: 20),
                        _buildDateSection(),
                        const SizedBox(height: 20),
                        _buildItemsSection(),
                        const SizedBox(height: 20),
                        _buildTotalsSection(),
                        const SizedBox(height: 20),
                        _buildNotesSection(),
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: _buildSaveButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildModernAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF14B8A6), Color(0xFF06B6D4)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.invoice == null 
                      ? 'Nouvelle Facture' 
                      : 'Modifier Facture',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                if (widget.invoice?.invoiceNumber != null)
                  Text(
                    'N° ${widget.invoice!.invoiceNumber}',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                    ),
                  ),
              ],
            ),
          ),
          if (_isSaving)
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    int completedSteps = 0;
    int totalSteps = 4;

    // Client
    if (_clientNameController.text.isNotEmpty) completedSteps++;
    // Dates
    if (_invoiceDate != null && _dueDate != null) completedSteps++;
    // Items
    if (_items.isNotEmpty && _items.any((i) => i.description.isNotEmpty)) {
      completedSteps++;
    }
    // Total
    if (_calculateTotal() > 0) completedSteps++;

    final progress = completedSteps / totalSteps;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Progression',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF14B8A6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 10,
              backgroundColor: const Color(0xFFE2E8F0),
              valueColor: const AlwaysStoppedAnimation<Color>(
                Color(0xFF14B8A6),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClientSection() {
    return _buildSection(
      title: 'Informations Client',
      icon: Icons.person,
      iconColor: const Color(0xFF8B5CF6),
      isExpanded: _clientSectionExpanded,
      onToggle: () => setState(() =>
          _clientSectionExpanded = !_clientSectionExpanded),
      child: Column(
        children: [
          // Toggle Existant/Manuel
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(
                value: true,
                icon: Icon(Icons.person_search, size: 18),
                label: Text('Client existant'),
              ),
              ButtonSegment(
                value: false,
                icon: Icon(Icons.edit, size: 18),
                label: Text('Saisie manuelle'),
              ),
            ],
            selected: {_useExistingClient},
            onSelectionChanged: (value) {
              setState(() => _useExistingClient = value.first);
            },
            style: ButtonStyle(
              visualDensity: VisualDensity.comfortable,
            ),
          ),
          const SizedBox(height: 20),

          if (_useExistingClient) ...[
            ClientSelector(
              selectedClient: _selectedClient,
              onClientSelected: (client) {
                setState(() {
                  _selectedClient = client;
                  _clientNameController.text = client.displayName;
                  _clientEmailController.text = client.email;
                  _clientPhoneController.text = client.phone ?? '';
                  _clientAddressController.text = client.fullAddress;
                  _clientSiretController.text = client.siret ?? '';
                  _clientVatController.text = client.tvaNumber ?? '';
                });
                _showSuccessSnackbar('✅ Client sélectionné: ${client.displayName}');
              },
            ),
            if (_selectedClient != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF10B981).withValues(alpha: 0.1),
                      const Color(0xFF059669).withValues(alpha: 0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFF10B981).withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.check_circle,
                          color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Client sélectionné',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF059669),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _selectedClient!.displayName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF065F46),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ] else ...[
            // Saisie manuelle
            _buildModernTextField(
              controller: _clientSiretController,
              label: 'SIRET (optionnel)',
              hint: '14 chiffres - Recherche automatique',
              icon: Icons.business,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(14),
              ],
              suffixIcon: _isSiretLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : (_siretError != null
                      ? const Icon(Icons.error, color: Color(0xFFEF4444))
                      : (_selectedCompany != null
                          ? const Icon(Icons.check_circle,
                              color: Color(0xFF10B981))
                          : null)),
              errorText: _siretError,
              helperText:
                  'Saisissez un SIRET pour auto-compléter les informations',
            ),
            const SizedBox(height: 16),
            _buildModernTextField(
              controller: _clientNameController,
              label: 'Nom du client / Entreprise *',
              hint: 'Nom complet ou raison sociale',
              icon: Icons.person,
              validator: (value) {
                if (!_useExistingClient &&
                    (value == null || value.trim().isEmpty)) {
                  return '⚠️ Le nom du client est requis';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            _buildModernTextField(
              controller: _clientEmailController,
              label: 'Email',
              hint: 'email@exemple.com',
              icon: Icons.email,
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value != null &&
                    value.isNotEmpty &&
                    !RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                        .hasMatch(value)) {
                  return '⚠️ Email invalide';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            _buildModernTextField(
              controller: _clientPhoneController,
              label: 'Téléphone',
              hint: '06 12 34 56 78',
              icon: Icons.phone,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            _buildModernTextField(
              controller: _clientAddressController,
              label: 'Adresse',
              hint: 'Adresse complète du client',
              icon: Icons.location_on,
              maxLines: 3,
            ),
            if (_clientVatController.text.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildModernTextField(
                controller: _clientVatController,
                label: 'Numéro de TVA intracommunautaire',
                hint: 'FR12345678901',
                icon: Icons.receipt_long,
                enabled: false,
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildDateSection() {
    return _buildSection(
      title: 'Dates & Conditions',
      icon: Icons.calendar_today,
      iconColor: const Color(0xFFF59E0B),
      isExpanded: _datesSectionExpanded,
      onToggle: () =>
          setState(() => _datesSectionExpanded = !_datesSectionExpanded),
      child: Column(
        children: [
          _buildDateTile(
            icon: Icons.calendar_today,
            label: 'Date de la facture',
            date: _invoiceDate,
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: _invoiceDate,
                firstDate: DateTime(2020),
                lastDate: DateTime(2030),
                builder: (context, child) {
                  return Theme(
                    data: Theme.of(context).copyWith(
                      colorScheme: const ColorScheme.light(
                        primary: Color(0xFF14B8A6),
                      ),
                    ),
                    child: child!,
                  );
                },
              );
              if (date != null) {
                setState(() => _invoiceDate = date);
              }
            },
          ),
          const SizedBox(height: 12),
          _buildDateTile(
            icon: Icons.event,
            label: 'Date d\'échéance',
            date: _dueDate,
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate:
                    _dueDate ?? _invoiceDate.add(const Duration(days: 30)),
                firstDate: _invoiceDate,
                lastDate: DateTime(2030),
                builder: (context, child) {
                  return Theme(
                    data: Theme.of(context).copyWith(
                      colorScheme: const ColorScheme.light(
                        primary: Color(0xFF14B8A6),
                      ),
                    ),
                    child: child!,
                  );
                },
              );
              if (date != null) {
                setState(() => _dueDate = date);
              }
            },
          ),
          const SizedBox(height: 16),
          _buildModernTextField(
            controller: _paymentTermsController,
            label: 'Conditions de paiement',
            hint: 'Ex: Paiement à 30 jours',
            icon: Icons.payment,
            maxLines: 2,
          ),
          const SizedBox(height: 16),
          _buildTaxRateTile(),
        ],
      ),
    );
  }

  Widget _buildDateTile({
    required IconData icon,
    required String label,
    required DateTime? date,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              const Color(0xFFF59E0B).withValues(alpha: 0.1),
              const Color(0xFFD97706).withValues(alpha: 0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF92400E),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    date != null
                        ? "${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}"
                        : 'Non défini',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF78350F),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFFF59E0B)),
          ],
        ),
      ),
    );
  }

  Widget _buildTaxRateTile() {
    return InkWell(
      onTap: () async {
        final rate = await showDialog<double>(
          context: context,
          builder: (context) => _TaxRateDialog(initialRate: _taxRate),
        );
        if (rate != null) {
          setState(() => _taxRate = rate);
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              const Color(0xFF3B82F6).withValues(alpha: 0.1),
              const Color(0xFF2563EB).withValues(alpha: 0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: const Color(0xFF3B82F6).withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF3B82F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.percent, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Taux de TVA',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF1E40AF),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_taxRate.toStringAsFixed(1)}%',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E3A8A),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF3B82F6)),
          ],
        ),
      ),
    );
  }

  Widget _buildItemsSection() {
    return _buildSection(
      title: 'Articles / Prestations',
      icon: Icons.shopping_cart,
      iconColor: const Color(0xFF10B981),
      isExpanded: _itemsSectionExpanded,
      onToggle: () =>
          setState(() => _itemsSectionExpanded = !_itemsSectionExpanded),
      trailing: IconButton(
        icon: const Icon(Icons.add_circle),
        onPressed: _addItem,
        color: const Color(0xFF10B981),
        iconSize: 28,
        tooltip: 'Ajouter un article',
      ),
      child: Column(
        children: [
          if (_items.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFFCBD5E1),
                  style: BorderStyle.solid,
                ),
              ),
              child: const Column(
                children: [
                  Icon(Icons.inbox, size: 48, color: Color(0xFF94A3B8)),
                  SizedBox(height: 12),
                  Text(
                    'Aucun article ajouté',
                    style: TextStyle(
                      fontSize: 16,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Appuyez sur + pour ajouter un article',
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            )
          else
            ..._items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              return _buildItemRow(index, item);
            }),
        ],
      ),
    );
  }

  Widget _buildItemRow(int index, _InvoiceItemForm item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            const Color(0xFFF8FAFC),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF10B981), Color(0xFF059669)],
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Article ${index + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.white),
                  onPressed: () => _removeItem(index),
                  iconSize: 22,
                ),
              ],
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildModernTextField(
                  initialValue: item.description,
                  label: 'Description de l\'article *',
                  hint: 'Décrivez le produit ou la prestation',
                  icon: Icons.description,
                  onChanged: (value) => item.description = value,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '⚠️ Description requise';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: _buildModernTextField(
                        initialValue: item.quantity.toString(),
                        label: 'Qté',
                        hint: '1',
                        icon: Icons.add_shopping_cart,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                              RegExp(r'^\d+\.?\d{0,2}')),
                        ],
                        onChanged: (value) {
                          setState(() {
                            item.quantity = double.tryParse(value) ?? 1;
                          });
                        },
                        validator: (value) {
                          final qty = double.tryParse(value ?? '0');
                          if (qty == null || qty <= 0) {
                            return '⚠️ Qté > 0';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 3,
                      child: _buildModernTextField(
                        initialValue: item.unitPrice.toStringAsFixed(2),
                        label: 'Prix unitaire',
                        hint: '0.00',
                        icon: Icons.euro,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                              RegExp(r'^\d+\.?\d{0,2}')),
                        ],
                        onChanged: (value) {
                          setState(() {
                            item.unitPrice = double.tryParse(value) ?? 0;
                          });
                        },
                        validator: (value) {
                          final price = double.tryParse(value ?? '0');
                          if (price == null || price < 0) {
                            return '⚠️ Prix ≥ 0';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Total ligne
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF10B981).withValues(alpha: 0.1),
                        const Color(0xFF059669).withValues(alpha: 0.05),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF10B981).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total ligne',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF065F46),
                        ),
                      ),
                      Text(
                        '${(item.quantity * item.unitPrice).toStringAsFixed(2)} €',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF047857),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalsSection() {
    final subtotal = _calculateSubtotal();
    final tax = _calculateTax();
    final total = _calculateTotal();

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1E293B),
            Color(0xFF0F172A),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E293B).withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.calculate,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              const Text(
                'Récapitulatif',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildTotalRow('Sous-total HT', subtotal, Colors.white70),
          const SizedBox(height: 12),
          _buildTotalRow(
            'TVA (${_taxRate.toStringAsFixed(1)}%)',
            tax,
            Colors.white70,
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF14B8A6).withValues(alpha: 0.3),
                  const Color(0xFF06B6D4).withValues(alpha: 0.3),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'TOTAL TTC',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                ),
                Text(
                  '${total.toStringAsFixed(2)} €',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalRow(String label, double amount, Color textColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 16,
            color: textColor,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          '${amount.toStringAsFixed(2)} €',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: textColor,
          ),
        ),
      ],
    );
  }

  Widget _buildNotesSection() {
    return _buildSection(
      title: 'Notes additionnelles',
      icon: Icons.note,
      iconColor: const Color(0xFF64748B),
      isExpanded: true,
      onToggle: null,
      child: _buildModernTextField(
        controller: _notesController,
        label: 'Notes (optionnel)',
        hint: 'Informations supplémentaires pour le client...',
        icon: Icons.edit_note,
        maxLines: 4,
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required Color iconColor,
    required bool isExpanded,
    required VoidCallback? onToggle,
    Widget? trailing,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    iconColor.withValues(alpha: 0.1),
                    iconColor.withValues(alpha: 0.05),
                  ],
                ),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: iconColor,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: iconColor.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(icon, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  if (trailing != null) trailing,
                  if (onToggle != null)
                    Icon(
                      isExpanded
                          ? Icons.keyboard_arrow_up
                          : Icons.keyboard_arrow_down,
                      color: iconColor,
                    ),
                ],
              ),
            ),
          ),
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.all(20),
              child: child,
            ),
        ],
      ),
    );
  }

  Widget _buildModernTextField({
    TextEditingController? controller,
    String? initialValue,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
    void Function(String)? onChanged,
    int maxLines = 1,
    bool enabled = true,
    Widget? suffixIcon,
    String? errorText,
    String? helperText,
  }) {
    return TextFormField(
      controller: controller,
      initialValue: initialValue,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        helperText: helperText,
        errorText: errorText,
        prefixIcon: Icon(icon, color: const Color(0xFF14B8A6)),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: enabled ? Colors.white : const Color(0xFFF8FAFC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFEF4444), width: 2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFEF4444), width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      validator: validator,
      onChanged: onChanged,
      maxLines: maxLines,
      enabled: enabled,
    );
  }

  Widget _buildSaveButton() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      width: double.infinity,
      height: 60,
      child: ElevatedButton(
        onPressed: _isSaving ? null : _saveInvoice,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          padding: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Ink(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF14B8A6), Color(0xFF06B6D4)],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF14B8A6).withValues(alpha: 0.5),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Container(
            alignment: Alignment.center,
            child: _isSaving
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                      SizedBox(width: 16),
                      Text(
                        'Enregistrement...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.save, color: Colors.white, size: 24),
                      const SizedBox(width: 12),
                      Text(
                        widget.invoice == null
                            ? 'Créer la facture'
                            : 'Enregistrer',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// CLASSES AUXILIAIRES
// ============================================================================

class _InvoiceItemForm {
  String description;
  double quantity;
  double unitPrice;

  _InvoiceItemForm({
    required this.description,
    required this.quantity,
    required this.unitPrice,
  });
}

class _TaxRateDialog extends StatefulWidget {
  final double initialRate;

  const _TaxRateDialog({required this.initialRate});

  @override
  State<_TaxRateDialog> createState() => _TaxRateDialogState();
}

class _TaxRateDialogState extends State<_TaxRateDialog> {
  late double _selectedRate;

  final List<Map<String, dynamic>> _commonRates = [
    {'rate': 0.0, 'label': '0% (Exonéré)'},
    {'rate': 5.5, 'label': '5,5% (Taux réduit)'},
    {'rate': 10.0, 'label': '10% (Taux intermédiaire)'},
    {'rate': 20.0, 'label': '20% (Taux normal)'},
  ];

  @override
  void initState() {
    super.initState();
    _selectedRate = widget.initialRate;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.percent, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 12),
          const Text(
            'Taux de TVA',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: _commonRates.map((rateInfo) {
          return RadioListTile<double>(
            title: Text(
              rateInfo['label'],
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            value: rateInfo['rate'],
            groupValue: _selectedRate,
            onChanged: (value) {
              setState(() => _selectedRate = value!);
            },
            activeColor: const Color(0xFF14B8A6),
          );
        }).toList(),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text(
            'Annuler',
            style: TextStyle(color: Color(0xFF64748B)),
          ),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(_selectedRate),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF14B8A6),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          child: const Text(
            'Valider',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}

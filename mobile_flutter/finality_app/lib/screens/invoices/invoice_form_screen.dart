import 'package:flutter/material.dart';
import '../../utils/error_helper.dart';
import '../../models/invoice.dart';
import '../../models/client.dart';
import '../../services/invoice_service.dart';
import '../../services/insee_service.dart';
import '../../widgets/siret_autocomplete_field.dart';
import '../../widgets/client_selector.dart';

class InvoiceFormScreen extends StatefulWidget {
  final Invoice? invoice;

  const InvoiceFormScreen({super.key, this.invoice});

  @override
  State<InvoiceFormScreen> createState() => _InvoiceFormScreenState();
}

class _InvoiceFormScreenState extends State<InvoiceFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final InvoiceService _invoiceService = InvoiceService();
  
  final _clientNameController = TextEditingController();
  final _clientEmailController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _clientAddressController = TextEditingController();
  final _clientSiretController = TextEditingController();
  final _clientVatController = TextEditingController();
  final _notesController = TextEditingController();
  final _paymentTermsController = TextEditingController();
  
  CompanyInfo? _selectedCompany;
  Client? _selectedClient;
  bool _useExistingClient = true; // Nouveau: toggle entre client existant et saisie manuelle
  DateTime _invoiceDate = DateTime.now();
  DateTime? _dueDate;
  double _taxRate = 20.0;
  List<_InvoiceItemForm> _items = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    
    if (widget.invoice != null) {
      // Charger depuis clientInfo JSONB
      final clientInfo = widget.invoice!.clientInfo ?? {};
      _clientNameController.text = clientInfo['name'] ?? '';
      _clientEmailController.text = clientInfo['email'] ?? '';
      _clientPhoneController.text = clientInfo['phone'] ?? '';
      _clientAddressController.text = clientInfo['address'] ?? '';
      _notesController.text = widget.invoice!.notes ?? '';
      _invoiceDate = widget.invoice!.invoiceDate;
      _dueDate = widget.invoice!.dueDate;
      _taxRate = widget.invoice!.taxRate;
      _items = widget.invoice!.items.map((item) => _InvoiceItemForm(
        description: item.description,
        quantity: item.quantity.toDouble(),
        unitPrice: item.unitPrice,
      )).toList();
    } else {
      _dueDate = DateTime.now().add(const Duration(days: 30));
      _paymentTermsController.text = 'Paiement à 30 jours';
      _addItem();
    }
  }

  @override
  void dispose() {
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
    setState(() {
      _items.removeAt(index);
    });
  }

  double _calculateSubtotal() {
    return _items.fold(0.0, (sum, item) => sum + (item.quantity * item.unitPrice));
  }

  double _calculateTax() {
    return _calculateSubtotal() * (_taxRate / 100);
  }

  double _calculateTotal() {
    return _calculateSubtotal() + _calculateTax();
  }

  Future<void> _saveInvoice() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_items.isEmpty || _items.any((item) => item.description.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez ajouter au moins un article valide')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final subtotal = _calculateSubtotal();
      final taxAmount = _calculateTax();
      final total = _calculateTotal();

      final invoice = Invoice(
        id: widget.invoice?.id,
        invoiceNumber: widget.invoice?.invoiceNumber ?? await _invoiceService.generateInvoiceNumber(),
        userId: widget.invoice?.userId ?? '', // Sera rempli par le service
        missionId: widget.invoice?.missionId,
        invoiceDate: _invoiceDate,
        dueDate: _dueDate,
        items: _items.map((item) => InvoiceItem(
          description: item.description,
          quantity: item.quantity.toInt(),
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        )).toList(),
        subtotal: subtotal,
        taxRate: _taxRate,
        taxAmount: taxAmount,
        total: total,
        status: widget.invoice?.status ?? 'draft',
        notes: _notesController.text,
        // Utiliser clientInfo pour stocker toutes les données client
        clientInfo: {
          'name': _clientNameController.text,
          'email': _clientEmailController.text,
          'phone': _clientPhoneController.text,
          'address': _clientAddressController.text,
          'siret': _clientSiretController.text,
          'vat_number': _clientVatController.text,
          'payment_terms': _paymentTermsController.text,
          // Informations INSEE supplémentaires si disponibles
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

      if (widget.invoice == null) {
        await _invoiceService.createInvoice(invoice);
      } else {
        await _invoiceService.updateInvoice(widget.invoice!.id!, invoice);
      }

      if (!mounted) return;

      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.invoice == null
              ? 'Facture créée avec succès'
              : 'Facture mise à jour'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.invoice == null ? 'Nouvelle facture' : 'Modifier facture'),
        actions: [
          if (_isSaving)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.save),
              onPressed: _saveInvoice,
              tooltip: 'Enregistrer',
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildClientSection(),
            const SizedBox(height: 24),
            _buildDateSection(),
            const SizedBox(height: 24),
            _buildItemsSection(),
            const SizedBox(height: 24),
            _buildTotalsSection(),
            const SizedBox(height: 24),
            _buildNotesSection(),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildClientSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Informations client',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                // Toggle entre client existant et saisie manuelle
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(
                      value: true,
                      icon: Icon(Icons.person_search, size: 16),
                      label: Text('Existant'),
                    ),
                    ButtonSegment(
                      value: false,
                      icon: Icon(Icons.edit, size: 16),
                      label: Text('Manuel'),
                    ),
                  ],
                  selected: {_useExistingClient},
                  onSelectionChanged: (value) {
                    setState(() => _useExistingClient = value.first);
                  },
                  style: ButtonStyle(
                    visualDensity: VisualDensity.compact,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            if (_useExistingClient) ...[
              // Sélecteur de client existant
              ClientSelector(
                selectedClient: _selectedClient,
                onClientSelected: (client) {
                  setState(() {
                    _selectedClient = client;
                    // Auto-remplir les champs avec les données du client
                    _clientNameController.text = client.displayName;
                    _clientEmailController.text = client.email;
                    _clientPhoneController.text = client.phone ?? '';
                    _clientAddressController.text = client.fullAddress;
                    _clientSiretController.text = client.siret ?? '';
                    _clientVatController.text = client.tvaNumber ?? '';
                  });
                },
              ),
              if (_selectedClient != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Client "${_selectedClient!.displayName}" sélectionné',
                          style: TextStyle(color: Colors.green.shade700),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ] else ...[
              // Saisie manuelle
              // Champ SIRET avec autocomplétion INSEE
              SiretAutocompleteField(
                controller: _clientSiretController,
                onCompanySelected: (company) {
                  setState(() {
                    _selectedCompany = company;
                    if (company != null) {
                      // Auto-remplir les champs avec les données INSEE
                      _clientNameController.text = company.companyName ?? '';
                      _clientAddressController.text = company.fullAddress;
                      _clientVatController.text = company.vatNumber ?? '';
                    }
                  });
                },
                label: 'SIRET (optionnel)',
                hint: 'Recherche automatique via API INSEE',
                required: false,
              ),
              
              const SizedBox(height: 16),
              TextFormField(
                controller: _clientNameController,
                decoration: const InputDecoration(
                  labelText: 'Nom du client / Entreprise *',
                  prefixIcon: Icon(Icons.person),
                  helperText: 'Auto-rempli si SIRET saisi',
                ),
                validator: (value) {
                  if (!_useExistingClient && (value == null || value.isEmpty)) {
                    return 'Veuillez entrer le nom du client';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _clientEmailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _clientPhoneController,
                decoration: const InputDecoration(
                  labelText: 'Téléphone',
                  prefixIcon: Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _clientAddressController,
                decoration: const InputDecoration(
                  labelText: 'Adresse',
                  prefixIcon: Icon(Icons.location_on),
                  helperText: 'Auto-rempli si SIRET saisi',
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _clientVatController,
                decoration: const InputDecoration(
                  labelText: 'Numéro de TVA intracommunautaire',
                  prefixIcon: Icon(Icons.receipt_long),
                  helperText: 'Auto-calculé si SIRET saisi',
                ),
                readOnly: true,
                enabled: false,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDateSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dates et conditions',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today),
              title: const Text('Date de la facture'),
              subtitle: Text(_invoiceDate.toString().split(' ')[0]),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _invoiceDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2030),
                );
                if (date != null) {
                  setState(() => _invoiceDate = date);
                }
              },
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.event),
              title: const Text('Date d\'échéance'),
              subtitle: Text(_dueDate?.toString().split(' ')[0] ?? 'Non défini'),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 30)),
                  firstDate: _invoiceDate,
                  lastDate: DateTime(2030),
                );
                if (date != null) {
                  setState(() => _dueDate = date);
                }
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _paymentTermsController,
              decoration: const InputDecoration(
                labelText: 'Conditions de paiement',
                prefixIcon: Icon(Icons.payment),
                hintText: 'Ex: Paiement à 30 jours',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.percent),
              title: const Text('Taux de TVA'),
              subtitle: Text('${_taxRate.toStringAsFixed(0)}%'),
              onTap: () async {
                final rate = await showDialog<double>(
                  context: context,
                  builder: (context) => _TaxRateDialog(initialRate: _taxRate),
                );
                if (rate != null) {
                  setState(() => _taxRate = rate);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildItemsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Prestations / Articles',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle),
                  onPressed: _addItem,
                  color: Colors.green,
                ),
              ],
            ),
            const SizedBox(height: 16),
            ..._items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              return _buildItemRow(index, item);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildItemRow(int index, _InvoiceItemForm item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                Text('Article ${index + 1}',
                    style: Theme.of(context).textTheme.titleSmall),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () => _removeItem(index),
                  color: Colors.red,
                  iconSize: 20,
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextFormField(
              initialValue: item.description,
              decoration: const InputDecoration(
                labelText: 'Description',
                isDense: true,
              ),
              onChanged: (value) => item.description = value,
              validator: (value) =>
                  value?.isEmpty ?? true ? 'Requis' : null,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    initialValue: item.quantity.toString(),
                    decoration: const InputDecoration(
                      labelText: 'Qté',
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      setState(() {
                        item.quantity = double.tryParse(value) ?? 1;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    initialValue: item.unitPrice.toStringAsFixed(2),
                    decoration: const InputDecoration(
                      labelText: 'Prix unitaire €',
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      setState(() {
                        item.unitPrice = double.tryParse(value) ?? 0;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${(item.quantity * item.unitPrice).toStringAsFixed(2)} €',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalsSection() {
    final subtotal = _calculateSubtotal();
    final tax = _calculateTax();
    final total = _calculateTotal();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildTotalRow('Sous-total HT', subtotal),
            const Divider(),
            _buildTotalRow('TVA (${_taxRate.toStringAsFixed(0)}%)', tax),
            const Divider(thickness: 2),
            _buildTotalRow('Total TTC', total, isTotal: true),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalRow(String label, double amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 18 : 16,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            '${amount.toStringAsFixed(2)} €',
            style: TextStyle(
              fontSize: isTotal ? 20 : 16,
              fontWeight: FontWeight.bold,
              color: isTotal ? Theme.of(context).primaryColor : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotesSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Notes additionnelles',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notes (optionnel)',
                hintText: 'Informations supplémentaires pour le client...',
                border: OutlineInputBorder(),
              ),
              maxLines: 4,
            ),
          ],
        ),
      ),
    );
  }
}

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

  final List<double> _commonRates = [0, 5.5, 10, 20];

  @override
  void initState() {
    super.initState();
    _selectedRate = widget.initialRate;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Taux de TVA'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ..._commonRates.map((rate) => RadioListTile<double>(
                title: Text('${rate.toStringAsFixed(1)}%'),
                value: rate,
                groupValue: _selectedRate,
                onChanged: (value) {
                  setState(() => _selectedRate = value!);
                },
              )),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(_selectedRate),
          child: const Text('Valider'),
        ),
      ],
    );
  }
}

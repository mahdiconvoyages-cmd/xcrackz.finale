import 'package:flutter/material.dart';
import '../../utils/error_helper.dart';
import '../../models/quote.dart';
import '../../models/client.dart';
import '../../services/quote_service.dart';
import '../../widgets/siret_autocomplete_field.dart';
import '../../widgets/client_selector.dart';

class QuoteFormScreen extends StatefulWidget {
  final Quote? quote;

  const QuoteFormScreen({super.key, this.quote});

  @override
  State<QuoteFormScreen> createState() => _QuoteFormScreenState();
}

class _QuoteFormScreenState extends State<QuoteFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final QuoteService _quoteService = QuoteService();
  
  final _clientNameController = TextEditingController();
  final _clientEmailController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _clientAddressController = TextEditingController();
  final _clientSiretController = TextEditingController();
  final _clientVatController = TextEditingController();
  final _notesController = TextEditingController();
  final _termsController = TextEditingController();
  
  Client? _selectedClient;
  bool _useExistingClient = true;
  
  DateTime _quoteDate = DateTime.now();
  DateTime? _validUntil;
  double _taxRate = 20.0;
  List<_QuoteItemForm> _items = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    
    if (widget.quote != null) {
      _clientNameController.text = widget.quote!.clientName ?? '';
      _clientEmailController.text = widget.quote!.clientEmail ?? '';
      _clientPhoneController.text = widget.quote!.clientPhone ?? '';
      _clientAddressController.text = widget.quote!.clientAddress ?? '';
      _notesController.text = widget.quote!.notes ?? '';
      _termsController.text = widget.quote!.terms ?? '';
      _quoteDate = widget.quote!.quoteDate;
      _validUntil = widget.quote!.validUntil;
      _taxRate = widget.quote!.taxRate;
      _items = widget.quote!.items.map((item) => _QuoteItemForm(
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      )).toList();
    } else {
      _validUntil = DateTime.now().add(const Duration(days: 30));
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
    _termsController.dispose();
    super.dispose();
  }

  void _addItem() {
    setState(() {
      _items.add(_QuoteItemForm(
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.quote == null ? 'Nouveau devis' : 'Modifier devis'),
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
              onPressed: _saveQuote,
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
            const SizedBox(height: 24),
            _buildTermsSection(),
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
              SiretAutocompleteField(
                controller: _clientSiretController,
                onCompanySelected: (company) {
                  setState(() {
                    if (company != null) {
                      _clientNameController.text = company.companyName ?? '';
                      _clientAddressController.text = company.fullAddress;
                      _clientVatController.text = company.vatNumber ?? '';
                    }
                  });
                },
                label: 'SIRET (optionnel)',
                hint: 'Recherche automatique via INSEE',
                required: false,
              ),
              
              const SizedBox(height: 16),
              TextFormField(
                controller: _clientNameController,
                decoration: const InputDecoration(
                  labelText: 'Nom du client / Entreprise',
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
              'Dates',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today),
              title: const Text('Date du devis'),
              subtitle: Text(_quoteDate.toString().split(' ')[0]),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _quoteDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2030),
                );
                if (date != null) {
                  setState(() => _quoteDate = date);
                }
              },
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.event),
              title: const Text('Valide jusqu\'au'),
              subtitle: Text(_validUntil?.toString().split(' ')[0] ?? 'Non défini'),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _validUntil ?? DateTime.now().add(const Duration(days: 30)),
                  firstDate: _quoteDate,
                  lastDate: DateTime(2030),
                );
                if (date != null) {
                  setState(() => _validUntil = date);
                }
              },
            ),
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
                  'Articles / Services',
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

  Widget _buildItemRow(int index, _QuoteItemForm item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.grey[50],
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Article ${index + 1}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _removeItem(index),
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
              onChanged: (value) {
                setState(() => item.description = value);
              },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Description requise';
                }
                return null;
              },
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    initialValue: item.quantity.toString(),
                    decoration: const InputDecoration(
                      labelText: 'Quantité',
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      setState(() {
                        item.quantity = double.tryParse(value) ?? 1;
                      });
                    },
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Requis';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Nombre invalide';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    initialValue: item.unitPrice.toString(),
                    decoration: const InputDecoration(
                      labelText: 'Prix unitaire (€)',
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      setState(() {
                        item.unitPrice = double.tryParse(value) ?? 0;
                      });
                    },
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Requis';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Nombre invalide';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${(item.quantity * item.unitPrice).toStringAsFixed(2)} €',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                      textAlign: TextAlign.right,
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
            _buildTotalRow('Sous-total HT', '${subtotal.toStringAsFixed(2)} €', false),
            const SizedBox(height: 8),
            _buildTotalRow('TVA (${_taxRate.toStringAsFixed(0)}%)', '${tax.toStringAsFixed(2)} €', false),
            const Divider(height: 24),
            _buildTotalRow('Total TTC', '${total.toStringAsFixed(2)} €', true),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalRow(String label, String value, bool isBold) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 18 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 20 : 14,
            fontWeight: FontWeight.bold,
            color: isBold ? Colors.green : Colors.black,
          ),
        ),
      ],
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
              'Notes',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                hintText: 'Notes internes ou pour le client...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTermsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Conditions générales',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _termsController,
              decoration: const InputDecoration(
                hintText: 'Conditions de paiement, garanties...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveQuote() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ajoutez au moins un article')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final userId = '00000000-0000-0000-0000-000000000000'; // Replace with actual user ID
      
      final quoteItems = _items.map((item) => QuoteItem(
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      )).toList();

      final subtotal = _calculateSubtotal();
      final taxAmount = _calculateTax();
      final total = _calculateTotal();

      final quote = Quote(
        id: widget.quote?.id,
        quoteNumber: widget.quote?.quoteNumber ?? await _quoteService.generateQuoteNumber(),
        userId: userId,
        clientName: _clientNameController.text.isNotEmpty ? _clientNameController.text : null,
        clientEmail: _clientEmailController.text.isNotEmpty ? _clientEmailController.text : null,
        clientPhone: _clientPhoneController.text.isNotEmpty ? _clientPhoneController.text : null,
        clientAddress: _clientAddressController.text.isNotEmpty ? _clientAddressController.text : null,
        quoteDate: _quoteDate,
        validUntil: _validUntil,
        items: quoteItems,
        subtotal: subtotal,
        taxRate: _taxRate,
        taxAmount: taxAmount,
        total: total,
        status: widget.quote?.status ?? 'draft',
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
        terms: _termsController.text.isNotEmpty ? _termsController.text : null,
      );

      if (widget.quote == null) {
        await _quoteService.createQuote(quote);
      } else {
        await _quoteService.updateQuote(quote);
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.quote == null ? 'Devis créé' : 'Devis mis à jour',
          ),
        ),
      );
      Navigator.pop(context);
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
}

class _QuoteItemForm {
  String description;
  double quantity;
  double unitPrice;

  _QuoteItemForm({
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
          RadioListTile<double>(
            title: const Text('0%'),
            value: 0.0,
            groupValue: _selectedRate,
            onChanged: (value) => setState(() => _selectedRate = value!),
          ),
          RadioListTile<double>(
            title: const Text('5.5%'),
            value: 5.5,
            groupValue: _selectedRate,
            onChanged: (value) => setState(() => _selectedRate = value!),
          ),
          RadioListTile<double>(
            title: const Text('10%'),
            value: 10.0,
            groupValue: _selectedRate,
            onChanged: (value) => setState(() => _selectedRate = value!),
          ),
          RadioListTile<double>(
            title: const Text('20%'),
            value: 20.0,
            groupValue: _selectedRate,
            onChanged: (value) => setState(() => _selectedRate = value!),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _selectedRate),
          child: const Text('Valider'),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/insee_service.dart';
import 'dart:async';

/// Widget d'autocomplétion SIRET avec recherche API INSEE
class SiretAutocompleteField extends StatefulWidget {
  final String? initialValue;
  final Function(InseeCompanyInfo?) onCompanySelected;
  final String? label;
  final String? hint;
  final bool required;
  final TextEditingController? controller;

  const SiretAutocompleteField({
    super.key,
    this.initialValue,
    required this.onCompanySelected,
    this.label = 'SIRET',
    this.hint = 'Entrez le SIRET (14 chiffres)',
    this.required = false,
    this.controller,
  });

  @override
  State<SiretAutocompleteField> createState() => _SiretAutocompleteFieldState();
}

class _SiretAutocompleteFieldState extends State<SiretAutocompleteField> {
  final InseeService _inseeService = InseeService();
  late TextEditingController _controller;
  Timer? _debounce;
  InseeCompanyInfo? _selectedCompany;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController(text: widget.initialValue);
    _controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    if (widget.controller == null) {
      _controller.dispose();
    }
    super.dispose();
  }

  void _onTextChanged() {
    // Annuler le timer précédent
    _debounce?.cancel();

    // Reset des états
    setState(() {
      _errorMessage = null;
      _selectedCompany = null;
    });

    final text = _controller.text.replaceAll(RegExp(r'[^0-9]'), '');

    // Attendre que l'utilisateur ait fini de taper (500ms)
    if (text.length >= 9) {
      _debounce = Timer(const Duration(milliseconds: 500), () {
        _searchCompany(text);
      });
    }
  }

  Future<void> _searchCompany(String siretOrSiren) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      InseeCompanyInfo? company;

      if (siretOrSiren.length == 14) {
        // SIRET complet
        if (!InseeService.validateSiret(siretOrSiren)) {
          throw Exception('SIRET invalide (échec validation Luhn)');
        }
        company = await _inseeService.getCompanyBySiret(siretOrSiren);
      } else if (siretOrSiren.length == 9) {
        // SIREN uniquement
        if (!InseeService.validateSiren(siretOrSiren)) {
          throw Exception('SIREN invalide (échec validation Luhn)');
        }
        company = await _inseeService.getCompanyBySiren(siretOrSiren);
      } else {
        throw Exception('Le numéro doit contenir 9 (SIREN) ou 14 (SIRET) chiffres');
      }

      if (company == null) {
        throw Exception('Entreprise non trouvée dans la base INSEE');
      }

      if (!company.isActive) {
        setState(() {
          _errorMessage = 'Cette entreprise est fermée ou radiée';
        });
      }

      setState(() {
        _selectedCompany = company;
        _isLoading = false;
        
        // Formater le SIRET dans le champ
        if (company!.siret.length == 14) {
          _controller.text = InseeService.formatSiret(company.siret);
        }
      });

      // Notifier le parent
      widget.onCompanySelected(company);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });

      widget.onCompanySelected(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: _controller,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hint,
            prefixIcon: const Icon(Icons.business),
            suffixIcon: _isLoading
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : _selectedCompany != null
                    ? Icon(
                        Icons.check_circle,
                        color: _selectedCompany!.isActive ? Colors.green : Colors.orange,
                      )
                    : null,
            errorText: _errorMessage,
            border: const OutlineInputBorder(),
            helperText: _selectedCompany != null 
                ? '${_selectedCompany!.companyName} - ${_selectedCompany!.city}'
                : 'Format: XXX XXX XXX XXXXX',
          ),
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(14),
            _SiretFormatter(),
          ],
          validator: widget.required
              ? (value) {
                  if (value == null || value.isEmpty) {
                    return 'Ce champ est requis';
                  }
                  if (_selectedCompany == null) {
                    return 'Veuillez saisir un SIRET valide';
                  }
                  return null;
                }
              : null,
        ),
        
        // Carte d'informations de l'entreprise
        if (_selectedCompany != null) ...[
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        _selectedCompany!.isHeadquarters
                            ? Icons.home_work
                            : Icons.business,
                        color: Theme.of(context).primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _selectedCompany!.companyName ?? 'N/A',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  _buildInfoRow(
                    'SIRET',
                    InseeService.formatSiret(_selectedCompany!.siret),
                  ),
                  _buildInfoRow(
                    'SIREN',
                    InseeService.formatSiren(_selectedCompany!.siren),
                  ),
                  if (_selectedCompany!.vatNumber != null)
                    _buildInfoRow('TVA', _selectedCompany!.vatNumber!),
                  if (_selectedCompany!.legalForm != null)
                    _buildInfoRow('Forme juridique', _selectedCompany!.legalForm!),
                  if (_selectedCompany!.activityCode != null)
                    _buildInfoRow(
                      'Code NAF',
                      '${_selectedCompany!.activityCode}${_selectedCompany!.activityLabel != null ? ' - ${_selectedCompany!.activityLabel}' : ''}',
                    ),
                  const Divider(height: 24),
                  _buildInfoRow('Adresse', _selectedCompany!.address ?? 'N/A'),
                  _buildInfoRow(
                    'Ville',
                    '${_selectedCompany!.postalCode ?? ''} ${_selectedCompany!.city ?? ''}',
                  ),
                  if (_selectedCompany!.isHeadquarters)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.blue.shade200),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.star, size: 16, color: Colors.blue.shade700),
                            const SizedBox(width: 4),
                            Text(
                              'Siège social',
                              style: TextStyle(
                                color: Colors.blue.shade700,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (!_selectedCompany!.isActive)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.orange.shade200),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.warning, size: 16, color: Colors.orange.shade700),
                            const SizedBox(width: 4),
                            Text(
                              'Établissement fermé',
                              style: TextStyle(
                                color: Colors.orange.shade700,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

/// Formateur pour SIRET avec espaces automatiques
class _SiretFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(' ', '');
    
    if (text.length <= 3) {
      return newValue;
    }

    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      if (i == 3 || i == 6 || i == 9) {
        buffer.write(' ');
      }
      buffer.write(text[i]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../utils/logger.dart';
import '../config/api_config.dart';

/// Service d'autocomplétion d'adresses utilisant l'API Adresse du gouvernement français
class AddressAutocompleteService {
  static const String _baseUrl = ApiConfig.adresseGouvBase;
  
  /// Recherche d'adresses avec autocomplétion
  static Future<List<AddressSuggestion>> searchAddresses(String query) async {
    if (query.isEmpty || query.length < 3) {
      return [];
    }

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/search/?q=${Uri.encodeComponent(query)}&limit=10'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final features = data['features'] as List<dynamic>?;

        if (features == null) return [];

        return features.map((feature) {
          final properties = feature['properties'] as Map<String, dynamic>;
          final geometry = feature['geometry'] as Map<String, dynamic>;
          final coordinates = geometry['coordinates'] as List<dynamic>;

          return AddressSuggestion(
            label: properties['label'] as String,
            name: properties['name'] as String? ?? '',
            city: properties['city'] as String? ?? '',
            postcode: properties['postcode'] as String? ?? '',
            context: properties['context'] as String? ?? '',
            latitude: (coordinates[1] as num).toDouble(),
            longitude: (coordinates[0] as num).toDouble(),
          );
        }).toList();
      }
    } catch (e) {
      logger.e('Error fetching address suggestions: $e');
    }

    return [];
  }

  /// Recherche de villes uniquement
  static Future<List<CitySuggestion>> searchCities(String query) async {
    if (query.isEmpty || query.length < 2) {
      return [];
    }

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/search/?q=${Uri.encodeComponent(query)}&type=municipality&limit=10'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final features = data['features'] as List<dynamic>?;

        if (features == null) return [];

        return features.map((feature) {
          final properties = feature['properties'] as Map<String, dynamic>;
          final geometry = feature['geometry'] as Map<String, dynamic>;
          final coordinates = geometry['coordinates'] as List<dynamic>;

          return CitySuggestion(
            name: properties['city'] as String,
            postcode: properties['postcode'] as String? ?? '',
            department: properties['context'] as String? ?? '',
            latitude: (coordinates[1] as num).toDouble(),
            longitude: (coordinates[0] as num).toDouble(),
          );
        }).toList();
      }
    } catch (e) {
      logger.e('Error fetching city suggestions: $e');
    }

    return [];
  }

  /// Géocodage inverse (coordonnées -> adresse)
  static Future<AddressSuggestion?> reverseGeocode(double latitude, double longitude) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/reverse/?lon=$longitude&lat=$latitude'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final features = data['features'] as List<dynamic>?;

        if (features == null || features.isEmpty) return null;

        final feature = features.first as Map<String, dynamic>;
        final properties = feature['properties'] as Map<String, dynamic>;
        final geometry = feature['geometry'] as Map<String, dynamic>;
        final coordinates = geometry['coordinates'] as List<dynamic>;

        return AddressSuggestion(
          label: properties['label'] as String,
          name: properties['name'] as String? ?? '',
          city: properties['city'] as String? ?? '',
          postcode: properties['postcode'] as String? ?? '',
          context: properties['context'] as String? ?? '',
          latitude: (coordinates[1] as num).toDouble(),
          longitude: (coordinates[0] as num).toDouble(),
        );
      }
    } catch (e) {
      logger.e('Error reverse geocoding: $e');
    }

    return null;
  }
}

/// Modèle pour une suggestion d'adresse
class AddressSuggestion {
  final String label;
  final String name;
  final String city;
  final String postcode;
  final String context;
  final double latitude;
  final double longitude;

  AddressSuggestion({
    required this.label,
    required this.name,
    required this.city,
    required this.postcode,
    required this.context,
    required this.latitude,
    required this.longitude,
  });

  @override
  String toString() => label;
}

/// Modèle pour une suggestion de ville
class CitySuggestion {
  final String name;
  final String postcode;
  final String department;
  final double latitude;
  final double longitude;

  CitySuggestion({
    required this.name,
    required this.postcode,
    required this.department,
    required this.latitude,
    required this.longitude,
  });

  String get displayName => '$name ($postcode)';

  @override
  String toString() => displayName;
}

/// Widget d'autocomplétion pour les adresses
class AddressAutocompleteField extends StatefulWidget {
  final String? initialValue;
  final String label;
  final Function(AddressSuggestion) onSelected;
  final bool citiesOnly;
  final String? hintText;
  final IconData? prefixIcon;

  const AddressAutocompleteField({
    super.key,
    this.initialValue,
    required this.label,
    required this.onSelected,
    this.citiesOnly = false,
    this.hintText,
    this.prefixIcon,
  });

  @override
  State<AddressAutocompleteField> createState() => _AddressAutocompleteFieldState();
}

class _AddressAutocompleteFieldState extends State<AddressAutocompleteField> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounce;
  List<dynamic> _suggestions = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialValue != null) {
      _controller.text = widget.initialValue!;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();

    if (query.length < (widget.citiesOnly ? 2 : 3)) {
      setState(() {
        _suggestions = [];
        _isLoading = false;
      });
      return;
    }

    setState(() => _isLoading = true);

    _debounce = Timer(const Duration(milliseconds: 500), () async {
      if (widget.citiesOnly) {
        final cities = await AddressAutocompleteService.searchCities(query);
        setState(() {
          _suggestions = cities;
          _isLoading = false;
        });
      } else {
        final addresses = await AddressAutocompleteService.searchAddresses(query);
        setState(() {
          _suggestions = addresses;
          _isLoading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _controller,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hintText ?? 'Commencez à taper...',
            prefixIcon: Icon(widget.prefixIcon ?? Icons.location_on),
            suffixIcon: _isLoading
                ? const Padding(
                    padding: EdgeInsets.all(12.0),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : _controller.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _suggestions = []);
                        },
                      )
                    : null,
            border: const OutlineInputBorder(),
          ),
          onChanged: _onSearchChanged,
        ),
        if (_suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            constraints: const BoxConstraints(maxHeight: 250),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: _suggestions.length,
              itemBuilder: (context, index) {
                final suggestion = _suggestions[index];
                
                if (widget.citiesOnly && suggestion is CitySuggestion) {
                  return ListTile(
                    leading: const Icon(Icons.location_city),
                    title: Text(suggestion.name),
                    subtitle: Text('${suggestion.postcode} - ${suggestion.department}'),
                    onTap: () {
                      _controller.text = suggestion.displayName;
                      setState(() => _suggestions = []);
                      
                      // Convert CitySuggestion to AddressSuggestion
                      widget.onSelected(AddressSuggestion(
                        label: suggestion.displayName,
                        name: suggestion.name,
                        city: suggestion.name,
                        postcode: suggestion.postcode,
                        context: suggestion.department,
                        latitude: suggestion.latitude,
                        longitude: suggestion.longitude,
                      ));
                    },
                  );
                } else if (suggestion is AddressSuggestion) {
                  return ListTile(
                    leading: const Icon(Icons.place),
                    title: Text(suggestion.name),
                    subtitle: Text('${suggestion.city} ${suggestion.postcode}'),
                    onTap: () {
                      _controller.text = suggestion.label;
                      setState(() => _suggestions = []);
                      widget.onSelected(suggestion);
                    },
                  );
                }
                
                return const SizedBox.shrink();
              },
            ),
          ),
      ],
    );
  }
}
